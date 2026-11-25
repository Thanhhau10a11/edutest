const {
  sequelize,
  Exam,
  Question,
  QuestionOption,
  ExamAttempt,
  AttemptDetail,
  Student,
  WalletTransaction
} = require('../models');
const { EXAM_STATUS, WALLET_TYPES } = require('../constants/examStatus');
const { emitStudentStatusUpdate } = require('../config/socket');
const { releaseDeviceLock, recordStudentMistakes } = require('../utils/examSecurityStore');

class AttemptService {
  /**
   * Nộp bài thi, tự động chấm điểm, tính thưởng xu/điểm và phát Socket Real-time
   */
  static async submitExam({ studentId, examId, classId, answers = [] }) {
    const exam = await Exam.findByPk(examId, {
      include: [
        {
          model: Question,
          as: 'questions',
          include: [
            {
              model: QuestionOption,
              as: 'options'
            }
          ]
        }
      ]
    });

    if (!exam) {
      const error = new Error('Không tìm thấy đề thi');
      error.statusCode = 404;
      throw error;
    }

    const student = await Student.findByPk(studentId);
    if (!student) {
      const error = new Error('Không tìm thấy thông tin học sinh');
      error.statusCode = 404;
      throw error;
    }

    // Lấy danh sách câu hỏi của đề (hoặc từ Ngân hàng câu hỏi nếu đề thi chưa được tạo câu hỏi riêng)
    let questionsList = exam.questions || [];
    if (questionsList.length === 0) {
      let bankWhere = {};
      if (exam.subject_id) bankWhere.subject_id = exam.subject_id;
      questionsList = await Question.findAll({
        where: bankWhere,
        include: [{ model: QuestionOption, as: 'options' }]
      });
      if (!questionsList || questionsList.length === 0) {
        questionsList = await Question.findAll({
          include: [{ model: QuestionOption, as: 'options' }]
        });
      }
    }

    // Tạo map cho câu hỏi và đáp án đúng
    const questionMap = {};
    questionsList.forEach((q) => {
      const correctOption = (q.options || []).find((opt) => opt.is_correct);
      questionMap[q.id] = {
        question: q,
        correctOptionId: correctOption ? correctOption.id : null,
        points: Number(q.points) || 1.0
      };
    });

    // Tạo map câu trả lời của học sinh
    const answerMap = {};
    answers.forEach((ans) => {
      answerMap[ans.question_id] = ans.selected_option_id;
    });

    let totalScore = 0;
    let correctCount = 0;
    const detailRecords = [];
    const evaluationResults = [];

    // Chấm từng câu hỏi (theo đúng thứ tự câu hỏi mà học sinh vừa làm nếu có, hoặc toàn bộ questionsList)
    const answerOrderIds = answers.map((a) => Number(a.question_id));
    const orderedQuestionsForGrading = [...questionsList].sort((a, b) => {
      const idxA = answerOrderIds.indexOf(Number(a.id));
      const idxB = answerOrderIds.indexOf(Number(b.id));
      if (idxA === -1 && idxB === -1) return 0;
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });

    orderedQuestionsForGrading.forEach((q) => {
      const qMeta = questionMap[q.id];
      const selectedOptionId = answerMap[q.id] || null;
      const isCorrect = Boolean(selectedOptionId && selectedOptionId === qMeta.correctOptionId);

      const pointsEarned = isCorrect ? qMeta.points : 0;
      if (isCorrect) {
        correctCount += 1;
        totalScore += pointsEarned;
      }

      detailRecords.push({
        question_id: q.id,
        selected_option_id: selectedOptionId,
        is_correct: isCorrect,
        points_earned: pointsEarned
      });

      evaluationResults.push({
        question_id: q.id,
        content: q.content,
        image_url: q.image_url || null,
        selected_option_id: selectedOptionId,
        correct_option_id: qMeta.correctOptionId,
        is_correct: isCorrect,
        points_earned: pointsEarned,
        explanation: q.explanation || null,
        explanation_image_url: q.explanation_image_url || null,
        options: (q.options || []).map((opt) => {
          const rawOpt = typeof opt.toJSON === 'function' ? opt.toJSON() : opt;
          return {
            id: rawOpt.id,
            question_id: rawOpt.question_id,
            option_key: rawOpt.option_key,
            content: rawOpt.content,
            is_correct: Boolean(rawOpt.is_correct || rawOpt.id === qMeta.correctOptionId)
          };
        })
      });
    });

    const totalQuestionsCount = orderedQuestionsForGrading.length;

    // Quy định tích điểm và thưởng xu
    const coinsPerCorrect = Number(process.env.COINS_PER_CORRECT_ANSWER) || 10;
    const pointsPerCorrect = Number(process.env.POINTS_PER_CORRECT_ANSWER) || 5;
    const bonusFullCoins = Number(process.env.BONUS_FULL_SCORE_COINS) || 50;

    let earnedCoins = correctCount * coinsPerCorrect;
    const earnedPoints = correctCount * pointsPerCorrect;

    // Thưởng thêm xu nếu trả lời đúng 100% câu hỏi
    if (totalQuestionsCount > 0 && correctCount === totalQuestionsCount) {
      earnedCoins += bonusFullCoins;
    }

    // Thực hiện lưu giao dịch an toàn với Transaction
    const transaction = await sequelize.transaction();

    try {
      // 1. Tìm hoặc tạo ExamAttempt
      let attempt = await ExamAttempt.findOne({
        where: {
          exam_id: examId,
          student_id: studentId,
          class_id: classId
        },
        transaction
      });

      const now = new Date();

      if (!attempt) {
        attempt = await ExamAttempt.create(
          {
            exam_id: examId,
            student_id: studentId,
            class_id: classId,
            status: EXAM_STATUS.COMPLETED,
            started_at: now,
            submitted_at: now,
            total_score: totalScore,
            correct_answers_count: correctCount,
            earned_coins: earnedCoins,
            earned_points: earnedPoints
          },
          { transaction }
        );
      } else {
        attempt.status = EXAM_STATUS.COMPLETED;
        attempt.submitted_at = now;
        attempt.total_score = totalScore;
        attempt.correct_answers_count = correctCount;
        attempt.earned_coins = earnedCoins;
        attempt.earned_points = earnedPoints;
        await attempt.save({ transaction });
      }

      // 2. Xóa các chi tiết cũ nếu có và lưu AttemptDetail mới
      await AttemptDetail.destroy({
        where: { attempt_id: attempt.id },
        transaction
      });

      const detailsToInsert = detailRecords.map((d) => ({
        attempt_id: attempt.id,
        ...d
      }));
      await AttemptDetail.bulkCreate(detailsToInsert, { transaction });

      // 3. Tích điểm và xu vào ví học sinh
      await student.increment(
        {
          reward_points: earnedPoints,
          wallet_coins: earnedCoins
        },
        { transaction }
      );

      // 4. Ghi nhận lịch sử giao dịch ví (Wallet Transactions)
      if (earnedCoins > 0) {
        await WalletTransaction.create(
          {
            student_id: studentId,
            type: WALLET_TYPES.COINS,
            amount: earnedCoins,
            reason: `Thưởng hoàn thành đề thi: ${exam.title} (${correctCount}/${totalQuestionsCount} câu đúng)`,
            reference_id: attempt.id
          },
          { transaction }
        );
      }

      if (earnedPoints > 0) {
        await WalletTransaction.create(
          {
            student_id: studentId,
            type: WALLET_TYPES.POINTS,
            amount: earnedPoints,
            reason: `Điểm tích lũy đề thi: ${exam.title}`,
            reference_id: attempt.id
          },
          { transaction }
        );
      }

      await transaction.commit();

      // Giải phóng khóa 1 thiết bị khi học sinh nộp bài xong & ghi nhận các câu sai vào Kho Phục hồi Kiến thức
      releaseDeviceLock({ studentId, examId });
      const wrongQIds = detailRecords.filter((d) => !d.is_correct).map((d) => d.question_id);
      if (wrongQIds.length > 0) {
        recordStudentMistakes(studentId, wrongQIds);
      }

      // 5. PHÁT SỰ KIỆN SOCKET REAL-TIME TỚI GIÁO VIÊN ĐANG GIÁM SÁT
      emitStudentStatusUpdate(examId, classId, {
        student_id: studentId,
        student_code: student.student_code,
        full_name: student.full_name,
        status: EXAM_STATUS.COMPLETED,
        started_at: attempt.started_at,
        submitted_at: attempt.submitted_at,
        total_score: totalScore,
        correct_answers_count: correctCount,
        total_questions: totalQuestionsCount,
        earned_coins: earnedCoins,
        earned_points: earnedPoints
      });

      return {
        attempt_id: attempt.id,
        exam_id: exam.id,
        exam_title: exam.title,
        status: EXAM_STATUS.COMPLETED,
        submitted_at: attempt.submitted_at,
        total_score: totalScore,
        correct_answers_count: correctCount,
        total_questions: totalQuestionsCount,
        is_passed: totalScore >= Number(exam.passing_score),
        earned_coins: earnedCoins,
        earned_points: earnedPoints,
        questions_result: evaluationResults
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Xem kết quả chi tiết của một lượt thi
   */
  static async getAttemptResult(attemptId, studentId = null) {
    const where = { id: attemptId };
    if (studentId) {
      where.student_id = studentId;
    }

    const attempt = await ExamAttempt.findOne({
      where,
      include: [
        {
          model: Exam,
          as: 'exam',
          attributes: ['id', 'title', 'code', 'passing_score', 'duration_minutes']
        },
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'student_code', 'full_name']
        },
        {
          model: AttemptDetail,
          as: 'details',
          include: [
            {
              model: Question,
              as: 'question',
              include: [
                {
                  model: QuestionOption,
                  as: 'options'
                }
              ]
            },
            {
              model: QuestionOption,
              as: 'selected_option'
            }
          ]
        }
      ]
    });

    if (!attempt) {
      const error = new Error('Không tìm thấy kết quả làm bài');
      error.statusCode = 404;
      throw error;
    }

    return attempt;
  }
}

module.exports = AttemptService;
