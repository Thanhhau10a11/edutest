const {
  sequelize,
  Exam,
  ExamClassAssignment,
  ExamAttempt,
  AttemptDetail,
  ClassRoom,
  Grade,
  Teacher,
  Student,
  Subject,
  Question,
  QuestionOption,
  WalletTransaction
} = require('../models');
const { EXAM_STATUS, WALLET_TYPES } = require('../constants/examStatus');
const { emitStudentStatusUpdate, getIO } = require('../config/socket');
const {
  getExamPinConfig,
  verifyOrAcquireDeviceLock,
  getStudentRecoveryState,
  markQuestionsRecovered,
  recordStudentMistakes
} = require('../utils/examSecurityStore');

/**
 * Bộ sinh số giả ngẫu nhiên theo Seed (Mulberry32) & thuật toán trộn Fisher-Yates
 * Giúp mỗi học sinh (studentId + attempt started_at) nhận một bộ thứ tự câu hỏi
 * và vị trí đáp án A-B-C-D hoàn toàn khác nhau, nhưng vẫn giữ nguyên nếu F5 giữa chừng.
 */
function createSeededRandom(seedStr) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 16777619);
  }
  return function () {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleArrayWithRng(array, rng) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

class StudentService {
  /**
   * Tải danh sách đề thi / đề luyện tập tương ứng với lớp học sinh được giáo viên MỞ (is_open = true)
   */
  static async getAvailableExams(studentId, classId) {
    // 1. Tìm các bài thi được giao cho lớp này và đang mở
    const assignments = await ExamClassAssignment.findAll({
      where: {
        class_id: classId,
        is_open: true
      },
      include: [
        {
          model: Exam,
          as: 'exam',
          where: { is_active: true },
          include: [
            {
              model: Teacher,
              as: 'teacher',
              attributes: ['id', 'teacher_code', 'full_name']
            }
          ]
        }
      ]
    });

    if (!assignments || assignments.length === 0) {
      return [];
    }

    const examIds = assignments.map((a) => a.exam_id);

    // 2. Lấy thông tin lượt làm bài (attempts) của học sinh đối với các đề này
    const studentAttempts = await ExamAttempt.findAll({
      where: {
        student_id: studentId,
        exam_id: examIds
      }
    });

    const attemptMap = {};
    studentAttempts.forEach((attempt) => {
      attemptMap[attempt.exam_id] = attempt;
    });

    // 3. Kết hợp thông tin đề thi và trạng thái làm bài của học sinh + Cấu hình Mã PIN ca thi
    const result = assignments.map((assign) => {
      const exam = assign.exam;
      const attempt = attemptMap[exam.id];
      const pinConfig = getExamPinConfig(exam.id, classId);

      return {
        assignment_id: assign.id,
        exam_id: exam.id,
        code: exam.code,
        title: exam.title,
        description: exam.description,
        duration_minutes: exam.duration_minutes,
        total_questions: exam.total_questions,
        teacher: exam.teacher,
        is_open: assign.is_open,
        requires_pin: Boolean(pinConfig.isPinRequired),
        start_time: assign.start_time,
        end_time: assign.end_time,
        student_attempt: attempt
          ? {
              status: attempt.status,
              started_at: attempt.started_at,
              submitted_at: attempt.submitted_at,
              total_score: attempt.status === EXAM_STATUS.COMPLETED ? attempt.total_score : null,
              correct_answers_count:
                attempt.status === EXAM_STATUS.COMPLETED ? attempt.correct_answers_count : null,
              earned_coins: attempt.earned_coins,
              earned_points: attempt.earned_points
            }
          : {
              status: EXAM_STATUS.NOT_STARTED,
              started_at: null,
              submitted_at: null,
              total_score: null,
              correct_answers_count: null,
              earned_coins: 0,
              earned_points: 0
            }
      };
    });

    return result;
  }

  /**
   * Lấy đề thi để học sinh bắt đầu làm bài
   * - Kiểm tra Mã PIN của ca thi do Giáo viên cung cấp
   * - Kiểm tra Khóa 1 thiết bị duy nhất (Single-Device Anti-Proxy Lock)
   * - Đảo ngẫu nhiên câu hỏi và đáp án A-B-C-D
   */
  static async getExamForTesting(examId, studentId, classId, options = {}) {
    const { pinCode, deviceId, deviceName } = options;

    // 1. Kiểm tra đề có đang mở cho lớp của học sinh không
    const assignment = await ExamClassAssignment.findOne({
      where: {
        exam_id: examId,
        class_id: classId,
        is_open: true
      }
    });

    if (!assignment) {
      const error = new Error('Đề thi này hiện đang đóng hoặc chưa được giao cho lớp của bạn');
      error.statusCode = 403;
      throw error;
    }

    // 2. Lấy thông tin học sinh
    const student = await Student.findByPk(studentId);

    // 2.1. KIỂM TRA MÃ PIN CỦA CA THI (nếu giáo viên bật bảo mật PIN cho ca thi)
    const pinConfig = getExamPinConfig(examId, classId);
    if (pinConfig && pinConfig.isPinRequired) {
      const submittedPin = String(pinCode || '').trim();
      if (!submittedPin || submittedPin !== String(pinConfig.pinCode).trim()) {
        const error = new Error(
          !submittedPin
            ? 'Ca thi này yêu cầu nhập Mã PIN bảo mật (6 chữ số) do Giáo viên cung cấp tại phòng thi!'
            : 'Mã PIN ca thi không chính xác! Vui lòng kiểm tra lại mã PIN 6 số từ Giáo viên coi thi.'
        );
        error.statusCode = 403;
        error.code = 'INVALID_EXAM_PIN';
        throw error;
      }
    }

    // 2.2. KIỂM TRA GIỚI HẠN 1 TÀI KHOẢN TRÊN 1 THIẾT BỊ DUY NHẤT (CHỐNG LÀM HỘ BÀI TỪ BÊN NGOÀI)
    if (deviceId) {
      const lockCheck = verifyOrAcquireDeviceLock({
        studentId,
        studentCode: student ? student.student_code : `HS${studentId}`,
        studentName: student ? student.full_name : 'Học sinh',
        examId,
        classId,
        deviceId,
        deviceName: deviceName || 'Thiết bị trình duyệt'
      });

      if (!lockCheck.allowed) {
        const io = getIO();
        if (io) {
          const cheatAlert = {
            id: `device-conflict-${Date.now()}`,
            examId: Number(examId),
            classId: Number(classId),
            student_id: studentId,
            student_code: student ? student.student_code : '',
            full_name: student ? student.full_name : 'Học sinh',
            reason: `🚨 CẢNH BÁO LÀM HỘ BÀI: Tài khoản đang thi trên [${lockCheck.lockedBy.deviceName}], vừa bị chặn đăng nhập làm bài từ thiết bị thứ 2 [${deviceName || 'Thiết bị lạ'}]!`,
            warningCount: 99,
            timestamp: new Date().toISOString()
          };
          io.to(`exam_${examId}_class_${classId}`).emit('student_cheat_warning', cheatAlert);
          io.emit('student_cheat_warning', cheatAlert);
        }

        const error = new Error(
          `Tài khoản của bạn hiện đang làm bài thi này trên một thiết bị khác (${lockCheck.lockedBy.deviceName})! Hệ thống giới hạn 1 tài khoản chỉ được thi trên 1 thiết bị duy nhất tại một thời điểm để chống làm hộ bài từ bên ngoài. Nếu bạn đổi máy tại phòng thi, vui lòng báo Giáo viên mở khóa thiết bị.`
        );
        error.statusCode = 423;
        error.code = 'DEVICE_LOCKED';
        throw error;
      }
    }

    // 3. Tìm hoặc khởi tạo lượt thi (ExamAttempt)
    let [attempt, created] = await ExamAttempt.findOrCreate({
      where: {
        exam_id: examId,
        student_id: studentId,
        class_id: classId
      },
      defaults: {
        status: EXAM_STATUS.IN_PROGRESS,
        started_at: new Date()
      }
    });

    // Nếu học sinh bắt đầu mở đề hoặc bấm "Làm lại đề thi" sau khi đã hoàn thành
    if (attempt.status === EXAM_STATUS.NOT_STARTED || attempt.status === EXAM_STATUS.COMPLETED) {
      attempt.status = EXAM_STATUS.IN_PROGRESS;
      attempt.started_at = new Date();
      await attempt.save();
    }

    // Phát tín hiệu Real-time báo giáo viên: Học sinh bắt đầu làm bài
    emitStudentStatusUpdate(examId, classId, {
      student_id: studentId,
      student_code: student ? student.student_code : '',
      full_name: student ? student.full_name : '',
      status: attempt.status,
      started_at: attempt.started_at,
      submitted_at: attempt.submitted_at
    });

    // 4. Lấy câu hỏi và các phương án (ẨN cột is_correct)
    const exam = await Exam.findByPk(examId, {
      attributes: ['id', 'title', 'code', 'description', 'duration_minutes', 'total_questions', 'subject_id'],
      include: [
        {
          model: Teacher,
          as: 'teacher',
          attributes: ['id', 'full_name']
        },
        {
          model: Question,
          as: 'questions',
          attributes: ['id', 'exam_id', 'content', 'image_url', 'question_type', 'points', 'order_index'],
          include: [
            {
              model: QuestionOption,
              as: 'options',
              attributes: ['id', 'question_id', 'option_key', 'content'] // Ẩn is_correct
            }
          ]
        }
      ],
      order: [
        [{ model: Question, as: 'questions' }, 'order_index', 'ASC'],
        [{ model: Question, as: 'questions' }, { model: QuestionOption, as: 'options' }, 'option_key', 'ASC']
      ]
    });

    const examObj = exam.toJSON();

    // Nếu đề thi chưa gán câu hỏi trực tiếp, tự động kéo tất cả câu hỏi trong Ngân hàng câu hỏi của môn học đó
    if (!examObj.questions || examObj.questions.length === 0) {
      let bankWhere = {};
      if (examObj.subject_id) {
        bankWhere.subject_id = examObj.subject_id;
      }
      let bankQuestions = await Question.findAll({
        where: bankWhere,
        attributes: ['id', 'exam_id', 'content', 'image_url', 'question_type', 'points', 'order_index'],
        include: [
          {
            model: QuestionOption,
            as: 'options',
            attributes: ['id', 'question_id', 'option_key', 'content']
          }
        ],
        order: [['id', 'DESC']]
      });

      if ((!bankQuestions || bankQuestions.length === 0) && examObj.subject_id) {
        bankQuestions = await Question.findAll({
          attributes: ['id', 'exam_id', 'content', 'image_url', 'question_type', 'points', 'order_index'],
          include: [
            {
              model: QuestionOption,
              as: 'options',
              attributes: ['id', 'question_id', 'option_key', 'content']
            }
          ],
          order: [['id', 'DESC']]
        });
      }

      examObj.questions = (bankQuestions || []).map((q) => q.toJSON());
      examObj.total_questions = examObj.questions.length;
    } else {
      examObj.total_questions = examObj.questions.length;
    }

    // 5. ĐẢO NGẪU NHIÊN THỨ TỰ CÂU HỎI VÀ VỊ TRÍ ĐÁP ÁN A-B-C-D CHO TỪNG HỌC SINH
    const seedKey = `student_${studentId}_exam_${examId}_attempt_${attempt.id}_start_${
      attempt.started_at ? new Date(attempt.started_at).getTime() : Date.now()
    }`;
    const rng = createSeededRandom(seedKey);
    const optionKeys = ['A', 'B', 'C', 'D', 'E', 'F'];

    // Trộn ngẫu nhiên danh sách câu hỏi
    const shuffledQuestions = shuffleArrayWithRng(examObj.questions || [], rng).map((q, qIdx) => {
      // Trộn ngẫu nhiên vị trí các phương án trả lời A, B, C, D của từng câu
      const shuffledOptions = shuffleArrayWithRng(q.options || [], rng).map((opt, optIdx) => ({
        ...opt,
        original_option_key: opt.option_key,
        option_key: optionKeys[optIdx] || String.fromCharCode(65 + optIdx)
      }));

      return {
        ...q,
        display_order: qIdx + 1,
        options: shuffledOptions
      };
    });

    const variantNumber = Math.floor(rng() * 900) + 100;
    examObj.questions = shuffledQuestions;
    examObj.is_shuffled = true;
    examObj.variant_code = `MĐ-${variantNumber}`;

    return {
      exam: examObj,
      attempt: {
        id: attempt.id,
        status: attempt.status,
        started_at: attempt.started_at,
        variant_code: examObj.variant_code
      }
    };
  }

  /**
   * Lấy lịch sử tất cả các bài thi học sinh đã nộp
   */
  static async getStudentHistory(studentId) {
    const attempts = await ExamAttempt.findAll({
      where: {
        student_id: studentId
      },
      order: [['created_at', 'DESC']],
      include: [
        {
          model: Exam,
          as: 'exam',
          attributes: ['id', 'code', 'title', 'duration_minutes', 'total_questions', 'passing_score']
        }
      ]
    });

    return attempts;
  }

  /**
   * Lấy hồ sơ học sinh kèm thông tin lớp và ví điểm/xu
   */
  static async getStudentProfile(studentId) {
    const student = await Student.findByPk(studentId, {
      include: [
        {
          model: ClassRoom,
          as: 'classroom',
          include: [
            {
              model: Grade,
              as: 'grade',
              attributes: ['id', 'name', 'code']
            }
          ]
        }
      ]
    });

    if (!student) {
      const error = new Error('Không tìm thấy học sinh');
      error.statusCode = 404;
      throw error;
    }

    return student;
  }

  /**
   * Lọc tự động các câu hỏi học sinh đã từng trả lời sai trong lịch sử
   * để tạo thành Bài luyện tập Phục hồi Kiến thức cá nhân hóa (Smart Knowledge Recovery)
   */
  static async getRecoveryQuestions(studentId) {
    const recoveryState = getStudentRecoveryState(studentId);
    const recoveredSet = new Set((recoveryState.recoveredQuestionIds || []).map(Number));

    // 1. Lấy tất cả các lượt thi của học sinh kèm AttemptDetail & Question
    const attempts = await ExamAttempt.findAll({
      where: { student_id: studentId },
      order: [['id', 'DESC']],
      include: [
        {
          model: Exam,
          as: 'exam',
          attributes: ['id', 'code', 'title', 'subject_id', 'total_questions'],
          include: [
            { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
            {
              model: Question,
              as: 'questions',
              include: [{ model: QuestionOption, as: 'options' }]
            }
          ]
        },
        {
          model: AttemptDetail,
          as: 'details',
          include: [
            {
              model: Question,
              as: 'question',
              include: [
                { model: QuestionOption, as: 'options' },
                { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] }
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

    const mistakeMap = new Map();

    // 2. Quét toàn bộ AttemptDetail có is_correct = false
    attempts.forEach((att) => {
      const examTitle = att.exam ? att.exam.title : 'Đề kiểm tra';
      const examCode = att.exam ? att.exam.code : 'DE_THI';
      const subjectName = att.exam?.subject?.name || 'Toán học';

      if (Array.isArray(att.details) && att.details.length > 0) {
        att.details.forEach((detail) => {
          if (!detail.is_correct && detail.question) {
            const q = detail.question;
            const existing = mistakeMap.get(q.id);
            const chosenOpt = detail.selected_option;
            const correctOpt = (q.options || []).find((o) => o.is_correct);

            mistakeMap.set(q.id, {
              question_id: q.id,
              content: q.content,
              image_url: q.image_url || null,
              points: Number(q.points || 2.0),
              explanation: q.explanation || null,
              explanation_image_url: q.explanation_image_url || null,
              exam_id: att.exam_id,
              exam_title: examTitle,
              exam_code: examCode,
              subject_name: q.subject?.name || subjectName,
              times_wrong: (existing ? existing.times_wrong : 0) + 1,
              last_wrong_at: att.submitted_at || att.updatedAt || new Date(),
              last_chosen_option_id: detail.selected_option_id || null,
              last_chosen_option_key: chosenOpt ? chosenOpt.option_key : 'Bỏ trống',
              last_chosen_option_content: chosenOpt ? chosenOpt.content : 'Chưa chọn đáp án',
              correct_option_key: correctOpt ? correctOpt.option_key : 'A',
              correct_option_content: correctOpt ? correctOpt.content : '',
              is_recovered: recoveredSet.has(Number(q.id)),
              raw_options: (q.options || []).map((o) => ({
                id: o.id,
                question_id: o.question_id,
                option_key: o.option_key,
                content: o.content
              }))
            });
          }
        });
      } else if (att.status === EXAM_STATUS.COMPLETED && att.exam && Array.isArray(att.exam.questions)) {
        // Nếu dữ liệu seed chỉ có ExamAttempt hoàn thành (vd 4/5 câu đúng) mà chưa tạo dòng AttemptDetail chi tiết
        const examQuestions = att.exam.questions;
        const correctCnt = Number(att.correct_answers_count ?? 0);
        if (correctCnt < examQuestions.length) {
          const missedQuestions = examQuestions.slice(correctCnt);
          missedQuestions.forEach((q) => {
            if (!mistakeMap.has(q.id)) {
              const opts = q.options || [];
              const wrongOpt = opts.find((o) => !o.is_correct) || opts[0];
              const correctOpt = opts.find((o) => o.is_correct) || opts[0];
              mistakeMap.set(q.id, {
                question_id: q.id,
                content: q.content,
                image_url: q.image_url || null,
                points: Number(q.points || 2.0),
                explanation: q.explanation || null,
                explanation_image_url: q.explanation_image_url || null,
                exam_id: att.exam_id,
                exam_title: examTitle,
                exam_code: examCode,
                subject_name: subjectName,
                times_wrong: recoveryState.mistakeCounts?.[q.id] || 1,
                last_wrong_at: att.submitted_at || new Date(),
                last_chosen_option_id: wrongOpt ? wrongOpt.id : null,
                last_chosen_option_key: wrongOpt ? wrongOpt.option_key : 'B',
                last_chosen_option_content: wrongOpt ? wrongOpt.content : '',
                correct_option_key: correctOpt ? correctOpt.option_key : 'A',
                correct_option_content: correctOpt ? correctOpt.content : '',
                is_recovered: recoveredSet.has(Number(q.id)),
                raw_options: opts.map((o) => ({
                  id: o.id,
                  question_id: o.question_id,
                  option_key: o.option_key,
                  content: o.content
                }))
              });
            }
          });
        }
      }
    });

    // 3. Đảo ngẫu nhiên vị trí phương án A-B-C-D cho bài luyện tập phục hồi kiến thức (tránh học vẹt vị trí đáp án cũ)
    const rng = createSeededRandom(`recovery_${studentId}_${Date.now()}`);
    const optionKeys = ['A', 'B', 'C', 'D', 'E', 'F'];

    const allMistakes = Array.from(mistakeMap.values()).map((item) => {
      const shuffledOptions = shuffleArrayWithRng(item.raw_options || [], rng).map((opt, idx) => ({
        id: opt.id,
        question_id: opt.question_id,
        original_option_key: opt.option_key,
        option_key: optionKeys[idx] || String.fromCharCode(65 + idx),
        content: opt.content
      }));

      return {
        ...item,
        options: shuffledOptions
      };
    });

    const pendingList = allMistakes.filter((m) => !m.is_recovered);
    const recoveredList = allMistakes.filter((m) => m.is_recovered);

    return {
      summary: {
        total_mistakes_found: allMistakes.length,
        pending_recovery_count: pendingList.length,
        recovered_count: recoveredList.length,
        sessions_completed: recoveryState.sessionsCount || 0,
        last_practiced_at: recoveryState.lastPracticedAt || null
      },
      questions: allMistakes
    };
  }

  /**
   * Chấm điểm Bài luyện tập Phục hồi Kiến thức & thưởng xu/điểm khích lệ khi học sinh sửa sai thành công
   */
  static async submitRecoveryPractice(studentId, { answers = [] }) {
    const student = await Student.findByPk(studentId);
    if (!student) {
      const error = new Error('Không tìm thấy học sinh');
      error.statusCode = 404;
      throw error;
    }

    const questionIds = answers.map((a) => Number(a.question_id)).filter(Boolean);
    const dbQuestions = await Question.findAll({
      where: { id: questionIds },
      include: [{ model: QuestionOption, as: 'options' }]
    });

    const qMap = {};
    dbQuestions.forEach((q) => {
      const correctOpt = (q.options || []).find((o) => o.is_correct);
      qMap[q.id] = {
        question: q,
        correctOptionId: correctOpt ? correctOpt.id : null
      };
    });

    let correctCount = 0;
    const newlyRecoveredIds = [];
    const stillWrongIds = [];
    const evaluationResults = [];

    answers.forEach((ans) => {
      const meta = qMap[ans.question_id];
      if (!meta) return;
      const q = meta.question;
      const selectedOptionId = ans.selected_option_id ? Number(ans.selected_option_id) : null;
      const isCorrect = Boolean(selectedOptionId && selectedOptionId === meta.correctOptionId);

      if (isCorrect) {
        correctCount++;
        newlyRecoveredIds.push(q.id);
      } else {
        stillWrongIds.push(q.id);
      }

      evaluationResults.push({
        question_id: q.id,
        content: q.content,
        image_url: q.image_url || null,
        selected_option_id: selectedOptionId,
        correct_option_id: meta.correctOptionId,
        is_correct: isCorrect,
        points_earned: isCorrect ? Number((10 / Math.max(1, answers.length)).toFixed(2)) : 0,
        explanation: q.explanation || null,
        explanation_image_url: q.explanation_image_url || null,
        options: q.options
      });
    });

    if (newlyRecoveredIds.length > 0) {
      markQuestionsRecovered(studentId, newlyRecoveredIds);
    }
    if (stillWrongIds.length > 0) {
      recordStudentMistakes(studentId, stillWrongIds);
    }

    const totalQuestions = Math.max(1, evaluationResults.length);
    const totalScore = Number(((correctCount / totalQuestions) * 10).toFixed(2));
    const earnedCoins = correctCount * 5;
    const earnedPoints = correctCount * 3;

    // Cộng xu và điểm rèn luyện khích lệ vào ví học sinh
    const transaction = await sequelize.transaction();
    try {
      if (earnedCoins > 0 || earnedPoints > 0) {
        await student.increment(
          {
            wallet_coins: earnedCoins,
            reward_points: earnedPoints
          },
          { transaction }
        );
      }

      if (earnedCoins > 0) {
        await WalletTransaction.create(
          {
            student_id: studentId,
            type: WALLET_TYPES.COINS,
            amount: earnedCoins,
            reason: `Thưởng Luyện tập Phục hồi Kiến thức (${correctCount}/${totalQuestions} câu sửa sai thành công)`
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
            reason: `Điểm rèn luyện Phục hồi Kiến thức (${correctCount} câu nắm vững)`
          },
          { transaction }
        );
      }

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      console.warn('[RecoveryPractice] Could not credit wallet:', err.message);
    }

    return {
      is_recovery_mode: true,
      exam_title: 'Bài luyện tập Phục hồi Kiến thức (Các câu từng làm sai)',
      total_score: totalScore,
      correct_answers_count: correctCount,
      total_questions: totalQuestions,
      newly_recovered_count: newlyRecoveredIds.length,
      earned_coins: earnedCoins,
      earned_points: earnedPoints,
      questions_result: evaluationResults
    };
  }
}

module.exports = StudentService;
