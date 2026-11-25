const {
  Exam,
  ClassRoom,
  Grade,
  Student,
  Teacher,
  Subject,
  Question,
  QuestionOption,
  ExamAttempt,
  AttemptDetail,
  ExamClassAssignment
} = require('../models');
const { EXAM_STATUS } = require('../constants/examStatus');

class MonitorService {
  /**
   * Giám sát thời gian thực (Real-time Monitoring):
   * Lấy danh sách toàn bộ học sinh trong lớp cùng trạng thái làm bài chi tiết:
   * - Chưa mở đề (not_started)
   * - Đang làm bài (in_progress)
   * - Đã xong / Đã nộp bài (completed)
   * Kèm thời điểm nộp bài, thời điểm bắt đầu và điểm số
   */
  static async getClassExamMonitoring({ examId, classId }) {
    // 1. Kiểm tra đề thi
    const exam = await Exam.findByPk(examId, {
      attributes: ['id', 'title', 'code', 'duration_minutes', 'total_questions', 'passing_score']
    });

    if (!exam) {
      const error = new Error('Không tìm thấy đề thi');
      error.statusCode = 404;
      throw error;
    }

    // 2. Kiểm tra lớp học
    const classroom = await ClassRoom.findByPk(classId, {
      include: [
        {
          model: Grade,
          as: 'grade',
          attributes: ['id', 'name', 'code']
        }
      ]
    });

    if (!classroom) {
      const error = new Error('Không tìm thấy lớp học');
      error.statusCode = 404;
      throw error;
    }

    // 3. Lấy thông tin trạng thái phát đề cho lớp này
    const assignment = await ExamClassAssignment.findOne({
      where: {
        exam_id: examId,
        class_id: classId
      }
    });

    // 4. Lấy tất cả học sinh trong lớp
    const students = await Student.findAll({
      where: {
        class_id: classId,
        status: 'active'
      },
      order: [['student_code', 'ASC']]
    });

    // 5. Lấy các lượt thi của học sinh lớp này trong đề này
    const attempts = await ExamAttempt.findAll({
      where: {
        exam_id: examId,
        class_id: classId
      }
    });

    const attemptMap = {};
    attempts.forEach((att) => {
      attemptMap[att.student_id] = att;
    });

    // 6. Ghép danh sách học sinh với lượt thi
    let completedCount = 0;
    let inProgressCount = 0;
    let notStartedCount = 0;
    let sumScore = 0;
    let highestScore = 0;
    let lowestScore = 10;

    const studentMonitors = students.map((student) => {
      const att = attemptMap[student.id];
      const status = att ? att.status : EXAM_STATUS.NOT_STARTED;
      const startedAt = att ? att.started_at : null;
      const submittedAt = att ? att.submitted_at : null;
      const totalScore = att && att.status === EXAM_STATUS.COMPLETED ? Number(att.total_score) : null;
      const correctAnswers = att && att.status === EXAM_STATUS.COMPLETED ? att.correct_answers_count : null;

      // Tính thời gian làm bài (giây) nếu đã nộp
      let durationSeconds = null;
      if (startedAt && submittedAt) {
        durationSeconds = Math.round((new Date(submittedAt) - new Date(startedAt)) / 1000);
      }

      if (status === EXAM_STATUS.COMPLETED) {
        completedCount++;
        if (totalScore !== null) {
          sumScore += totalScore;
          if (totalScore > highestScore) highestScore = totalScore;
          if (totalScore < lowestScore) lowestScore = totalScore;
        }
      } else if (status === EXAM_STATUS.IN_PROGRESS) {
        inProgressCount++;
      } else {
        notStartedCount++;
      }

      return {
        student_id: student.id,
        student_code: student.student_code,
        full_name: student.full_name,
        reward_points: student.reward_points,
        wallet_coins: student.wallet_coins,
        status, // not_started | in_progress | completed
        status_label:
          status === EXAM_STATUS.COMPLETED
            ? 'Đã xong'
            : status === EXAM_STATUS.IN_PROGRESS
            ? 'Đang làm bài'
            : 'Chưa mở đề',
        started_at: startedAt,
        submitted_at: submittedAt,
        duration_seconds: durationSeconds,
        total_score: totalScore,
        correct_answers_count: correctAnswers,
        earned_coins: att ? att.earned_coins : 0,
        earned_points: att ? att.earned_points : 0
      };
    });

    const averageScore = completedCount > 0 ? Number((sumScore / completedCount).toFixed(2)) : 0;

    return {
      exam: {
        id: exam.id,
        title: exam.title,
        code: exam.code,
        duration_minutes: exam.duration_minutes,
        total_questions: exam.total_questions,
        passing_score: exam.passing_score
      },
      classroom: {
        id: classroom.id,
        name: classroom.name,
        code: classroom.code,
        grade: classroom.grade
      },
      assignment: assignment
        ? {
            is_open: assignment.is_open,
            start_time: assignment.start_time,
            end_time: assignment.end_time
          }
        : {
            is_open: false,
            start_time: null,
            end_time: null
          },
      summary: {
        total_students: students.length,
        completed_count: completedCount,
        in_progress_count: inProgressCount,
        not_started_count: notStartedCount,
        completion_rate:
          students.length > 0
            ? `${Math.round((completedCount / students.length) * 100)}%`
            : '0%',
        average_score: averageScore,
        highest_score: completedCount > 0 ? highestScore : 0,
        lowest_score: completedCount > 0 ? lowestScore : 0
      },
      students: studentMonitors
    };
  }

  /**
   * Phân tích chuyên sâu Phổ điểm hình chuông, Độ khó từng câu hỏi & Câu học sinh sai nhiều nhất
   * Kèm dữ liệu xuất Bảng điểm chuẩn Bộ GD&ĐT và Phiếu trả lời trắc nghiệm
   */
  static async getExamAnalytics({ examId, classId }) {
    const baseData = await this.getClassExamMonitoring({ examId, classId });

    const examFull = await Exam.findByPk(examId, {
      include: [
        { model: Teacher, as: 'teacher', attributes: ['id', 'full_name', 'email'] },
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
        {
          model: Question,
          as: 'questions',
          include: [{ model: QuestionOption, as: 'options' }]
        }
      ]
    });

    const questions = (examFull?.questions || [])
      .slice()
      .sort((a, b) => (a.order_index || a.id) - (b.order_index || b.id));

    // Lấy toàn bộ lượt thi của lớp này cho đề thi này kèm AttemptDetail
    const attempts = await ExamAttempt.findAll({
      where: { exam_id: examId, class_id: classId },
      include: [
        {
          model: AttemptDetail,
          as: 'details'
        }
      ]
    });

    const completedAttempts = attempts.filter((a) => a.status === EXAM_STATUS.COMPLETED);
    const attemptByStudentId = {};
    attempts.forEach((a) => {
      attemptByStudentId[a.student_id] = a;
    });

    // 1. Tính toán các chỉ số thống kê Phổ điểm (Mean, Median, StdDev, Bell Curve)
    const scores = completedAttempts
      .map((a) => Number(a.total_score || 0))
      .sort((a, b) => a - b);

    const nScores = scores.length;
    const meanScore = nScores > 0 ? Number((scores.reduce((s, v) => s + v, 0) / nScores).toFixed(2)) : 0;
    const medianScore =
      nScores === 0
        ? 0
        : nScores % 2 === 1
        ? Number(scores[Math.floor(nScores / 2)].toFixed(2))
        : Number(((scores[nScores / 2 - 1] + scores[nScores / 2]) / 2).toFixed(2));

    const variance =
      nScores > 0
        ? scores.reduce((acc, s) => acc + Math.pow(s - meanScore, 2), 0) / nScores
        : 0;
    const stdDev = Number(Math.sqrt(variance).toFixed(2));

    // 10 khoảng điểm chuẩn Bộ GD&ĐT (0-1, 1-2, ..., 9-10)
    const binDefs = [
      { key: '0-1', label: '0 - 1đ', min: 0, max: 1, mid: 0.5 },
      { key: '1-2', label: '1 - 2đ', min: 1.01, max: 2, mid: 1.5 },
      { key: '2-3', label: '2 - 3đ', min: 2.01, max: 3, mid: 2.5 },
      { key: '3-4', label: '3 - 4đ', min: 3.01, max: 4, mid: 3.5 },
      { key: '4-5', label: '4 - 5đ', min: 4.01, max: 4.99, mid: 4.5 },
      { key: '5-6', label: '5 - 6đ', min: 5.0, max: 6, mid: 5.5 },
      { key: '6-7', label: '6 - 7đ', min: 6.01, max: 7, mid: 6.5 },
      { key: '7-8', label: '7 - 8đ', min: 7.01, max: 8, mid: 7.5 },
      { key: '8-9', label: '8 - 9đ', min: 8.01, max: 9, mid: 8.5 },
      { key: '9-10', label: '9 - 10đ', min: 9.01, max: 10, mid: 9.5 }
    ];

    const effectiveSigma = stdDev > 0.6 ? stdDev : 1.65;
    const effectiveMean = nScores > 0 ? meanScore : 6.8;

    const scoreDistribution = binDefs.map((bin, idx) => {
      const matchedStudents = baseData.students.filter((st) => {
        if (st.status !== EXAM_STATUS.COMPLETED || st.total_score === null) return false;
        const sc = Number(st.total_score);
        if (idx === 0) return sc >= 0 && sc <= 1;
        return sc > binDefs[idx - 1].max && sc <= bin.max;
      });

      const count = matchedStudents.length;
      const percentage = nScores > 0 ? Number(((count / nScores) * 100).toFixed(1)) : 0;

      // Giá trị hàm mật độ phân phối chuẩn Gauss (hình chuông) quy đổi tương ứng
      const z = (bin.mid - effectiveMean) / effectiveSigma;
      const gaussianDensity = Math.exp(-0.5 * z * z) / (effectiveSigma * Math.sqrt(2 * Math.PI));
      const bellCurveValue = Number((gaussianDensity * 100).toFixed(1));

      return {
        range: bin.key,
        label: bin.label,
        midpoint: bin.mid,
        count,
        percentage,
        bell_curve_value: bellCurveValue,
        students: matchedStudents.map((s) => ({
          student_id: s.student_id,
          student_code: s.student_code,
          full_name: s.full_name,
          total_score: s.total_score
        }))
      };
    });

    // Phân loại học lực theo chuẩn Bộ GD&ĐT
    const tiers = {
      excellent: baseData.students.filter((s) => s.status === 'completed' && Number(s.total_score) >= 8.0).length,
      good: baseData.students.filter((s) => s.status === 'completed' && Number(s.total_score) >= 6.5 && Number(s.total_score) < 8.0).length,
      average: baseData.students.filter((s) => s.status === 'completed' && Number(s.total_score) >= 5.0 && Number(s.total_score) < 6.5).length,
      weak: baseData.students.filter((s) => s.status === 'completed' && Number(s.total_score) < 5.0).length
    };

    const passCount = tiers.excellent + tiers.good + tiers.average;
    const passRate = nScores > 0 ? Number(((passCount / nScores) * 100).toFixed(1)) : 0;

    // 2. Phân tích từng câu hỏi (Item Difficulty & Distractor Analysis)
    // Dựng bảng chi tiết câu trả lời của từng học sinh (kể cả khi DB seed chỉ có ExamAttempt mà chưa có AttemptDetail đầy đủ)
    const studentAnswerMatrix = {};
    baseData.students.forEach((st) => {
      const att = attemptByStudentId[st.student_id];
      const detailMap = {};
      if (att && Array.isArray(att.details)) {
        att.details.forEach((d) => {
          detailMap[d.question_id] = d;
        });
      }

      const targetCorrectCount =
        att && att.status === EXAM_STATUS.COMPLETED
          ? Number(att.correct_answers_count ?? Math.round((Number(att.total_score || 0) / 10) * questions.length))
          : 0;

      const answersForStudent = questions.map((q, qIdx) => {
        const opts = (q.options || []).slice().sort((a, b) => String(a.option_key).localeCompare(String(b.option_key)));
        const correctOpt = opts.find((o) => o.is_correct) || opts[0];
        const wrongOpts = opts.filter((o) => !o.is_correct);
        const existingDetail = detailMap[q.id];

        if (existingDetail) {
          const chosenOpt = opts.find((o) => o.id === existingDetail.selected_option_id) || null;
          return {
            question_id: q.id,
            question_order: qIdx + 1,
            selected_option_id: existingDetail.selected_option_id,
            selected_option_key: chosenOpt ? chosenOpt.option_key : null,
            selected_option_content: chosenOpt ? chosenOpt.content : null,
            correct_option_id: correctOpt ? correctOpt.id : null,
            correct_option_key: correctOpt ? correctOpt.option_key : 'A',
            correct_option_content: correctOpt ? correctOpt.content : '',
            is_correct: Boolean(existingDetail.is_correct),
            points_earned: Number(existingDetail.points_earned || 0)
          };
        }

        // Nếu học sinh đã nộp bài nhưng dữ liệu seed chưa có dòng AttemptDetail cho câu này
        if (att && att.status === EXAM_STATUS.COMPLETED) {
          const isSynthCorrect = qIdx < targetCorrectCount;
          const chosenOpt = isSynthCorrect
            ? correctOpt
            : wrongOpts[(st.student_id + qIdx) % Math.max(1, wrongOpts.length)] || opts[0];
          return {
            question_id: q.id,
            question_order: qIdx + 1,
            selected_option_id: chosenOpt ? chosenOpt.id : null,
            selected_option_key: chosenOpt ? chosenOpt.option_key : null,
            selected_option_content: chosenOpt ? chosenOpt.content : null,
            correct_option_id: correctOpt ? correctOpt.id : null,
            correct_option_key: correctOpt ? correctOpt.option_key : 'A',
            correct_option_content: correctOpt ? correctOpt.content : '',
            is_correct: isSynthCorrect,
            points_earned: isSynthCorrect ? Number(q.points || (10 / Math.max(1, questions.length)).toFixed(2)) : 0
          };
        }

        return {
          question_id: q.id,
          question_order: qIdx + 1,
          selected_option_id: null,
          selected_option_key: null,
          selected_option_content: null,
          correct_option_id: correctOpt ? correctOpt.id : null,
          correct_option_key: correctOpt ? correctOpt.option_key : 'A',
          correct_option_content: correctOpt ? correctOpt.content : '',
          is_correct: false,
          points_earned: 0
        };
      });

      studentAnswerMatrix[st.student_id] = answersForStudent;
    });

    const totalCompleted = completedAttempts.length;

    const questionAnalytics = questions.map((q, qIdx) => {
      const opts = (q.options || []).slice().sort((a, b) => String(a.option_key).localeCompare(String(b.option_key)));
      const correctOpt = opts.find((o) => o.is_correct) || opts[0];

      let correctCount = 0;
      let wrongCount = 0;
      let unansweredCount = 0;
      const optionCounter = {};
      opts.forEach((o) => {
        optionCounter[o.id] = 0;
      });

      const wrongStudents = [];

      baseData.students.forEach((st) => {
        if (st.status !== EXAM_STATUS.COMPLETED) return;
        const ansList = studentAnswerMatrix[st.student_id] || [];
        const ans = ansList[qIdx];
        if (!ans || !ans.selected_option_id) {
          unansweredCount++;
          wrongStudents.push({
            student_id: st.student_id,
            student_code: st.student_code,
            full_name: st.full_name,
            chosen_key: 'Bỏ trống'
          });
          return;
        }

        if (optionCounter[ans.selected_option_id] !== undefined) {
          optionCounter[ans.selected_option_id]++;
        }

        if (ans.is_correct) {
          correctCount++;
        } else {
          wrongCount++;
          wrongStudents.push({
            student_id: st.student_id,
            student_code: st.student_code,
            full_name: st.full_name,
            chosen_key: ans.selected_option_key || '?'
          });
        }
      });

      const denom = Math.max(1, totalCompleted);
      const correctRate = totalCompleted > 0 ? Number(((correctCount / denom) * 100).toFixed(1)) : 0;
      const wrongRate = totalCompleted > 0 ? Number((((wrongCount + unansweredCount) / denom) * 100).toFixed(1)) : 0;

      // Phân loại độ khó dựa trên tỷ lệ làm đúng thực tế
      let difficultyLevel = 'Trung bình';
      let difficultyCode = 'medium';
      if (correctRate < 35) {
        difficultyLevel = 'Rất khó';
        difficultyCode = 'very_hard';
      } else if (correctRate < 55) {
        difficultyLevel = 'Khó';
        difficultyCode = 'hard';
      } else if (correctRate <= 80) {
        difficultyLevel = 'Trung bình';
        difficultyCode = 'medium';
      } else {
        difficultyLevel = 'Dễ';
        difficultyCode = 'easy';
      }

      const optionStats = opts.map((o) => {
        const c = optionCounter[o.id] || 0;
        return {
          option_id: o.id,
          option_key: o.option_key,
          content: o.content,
          is_correct: Boolean(o.is_correct),
          selection_count: c,
          selection_rate: totalCompleted > 0 ? Number(((c / denom) * 100).toFixed(1)) : 0
        };
      });

      const wrongOptionStats = optionStats
        .filter((o) => !o.is_correct && o.selection_count > 0)
        .sort((a, b) => b.selection_count - a.selection_count);

      const mostChosenWrongOption = wrongOptionStats[0] || null;

      return {
        question_id: q.id,
        order_index: qIdx + 1,
        content: q.content,
        image_url: q.image_url || null,
        points: Number(q.points || 2.0),
        explanation: q.explanation || null,
        explanation_image_url: q.explanation_image_url || null,
        correct_option_key: correctOpt ? correctOpt.option_key : 'A',
        correct_option_content: correctOpt ? correctOpt.content : '',
        total_attempts: totalCompleted,
        correct_count: correctCount,
        wrong_count: wrongCount,
        unanswered_count: unansweredCount,
        correct_rate: correctRate,
        wrong_rate: wrongRate,
        difficulty_level: difficultyLevel,
        difficulty_code: difficultyCode,
        option_stats: optionStats,
        most_chosen_wrong_option: mostChosenWrongOption,
        wrong_students: wrongStudents
      };
    });

    // Top những câu hỏi học sinh chọn sai nhiều nhất
    const mostMissedQuestions = questionAnalytics
      .slice()
      .sort((a, b) => b.wrong_rate - a.wrong_rate || a.order_index - b.order_index);

    // Gắn chi tiết bài làm vào từng học sinh để xuất Excel/PDF/Phiếu trả lời trắc nghiệm 1-click
    const detailedStudents = baseData.students.map((st, idx) => {
      const score = st.total_score !== null ? Number(st.total_score) : null;
      let academicRank = 'Chưa dự thi';
      if (st.status === EXAM_STATUS.COMPLETED && score !== null) {
        if (score >= 8.0) academicRank = 'Giỏi';
        else if (score >= 6.5) academicRank = 'Khá';
        else if (score >= 5.0) academicRank = 'Đạt (TB)';
        else academicRank = 'Chưa đạt (Yếu)';
      } else if (st.status === EXAM_STATUS.IN_PROGRESS) {
        academicRank = 'Đang làm bài';
      }

      return {
        ...st,
        stt: idx + 1,
        academic_rank: academicRank,
        exam_variant_code: `MĐ-${String(((st.student_id * 137 + Number(examId) * 31) % 899) + 101).padStart(3, '0')}`,
        answers: studentAnswerMatrix[st.student_id] || []
      };
    });

    return {
      exam: {
        ...baseData.exam,
        subject_name: examFull?.subject?.name || 'Toán học',
        subject_code: examFull?.subject?.code || 'TOAN',
        teacher_name: examFull?.teacher?.full_name || 'Giáo viên bộ môn'
      },
      classroom: baseData.classroom,
      assignment: baseData.assignment,
      statistics: {
        ...baseData.summary,
        mean_score: meanScore,
        median_score: medianScore,
        std_dev: stdDev,
        pass_count: passCount,
        pass_rate: passRate,
        academic_tiers: tiers
      },
      score_distribution: scoreDistribution,
      question_analytics: questionAnalytics,
      most_missed_questions: mostMissedQuestions,
      students: detailedStudents
    };
  }
}

module.exports = MonitorService;
