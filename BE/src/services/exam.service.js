const { Op } = require('sequelize');
const {
  sequelize,
  Exam,
  Question,
  QuestionOption,
  ExamClassAssignment,
  ClassRoom,
  Grade,
  Teacher,
  Subject
} = require('../models');
const { emitExamAssignmentStatus } = require('../config/socket');
const { getExamPinConfig } = require('../utils/examSecurityStore');

class ExamService {
  /**
   * Tạo đề thi trực tuyến kèm câu hỏi và phương án trả lời (Dùng Transaction để đảm bảo tính toàn vẹn)
   */
  static async createExam(examData, teacherId) {
    const {
      code,
      title,
      subject_id,
      description,
      duration_minutes = 15,
      passing_score = 5.0,
      questions = [],
      question_ids = [],
      class_ids = [],
      is_open = false
    } = examData;

    // Kiểm tra trùng mã đề
    const existingExam = await Exam.findOne({ where: { code } });
    if (existingExam) {
      const error = new Error(`Mã đề thi '${code}' đã tồn tại trong hệ thống`);
      error.statusCode = 409;
      throw error;
    }

    const transaction = await sequelize.transaction();

    try {
      // 1. Tạo bản ghi đề thi
      const createdExam = await Exam.create(
        {
          teacher_id: teacherId,
          subject_id: subject_id || null,
          code,
          title,
          description,
          duration_minutes: Number(duration_minutes),
          total_questions: 0,
          passing_score: Number(passing_score),
          is_active: true
        },
        { transaction }
      );

      // 2. Tạo danh sách câu hỏi nếu FE truyền vào trực tiếp
      if (Array.isArray(questions) && questions.length > 0) {
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          const createdQuestion = await Question.create(
            {
              exam_id: createdExam.id,
              subject_id: subject_id || null,
              content: q.content,
              image_url: q.image_url || null,
              question_type: q.question_type || 'single_choice',
              points: q.points !== undefined ? Number(q.points) : 2.0,
              order_index: q.order_index !== undefined ? Number(q.order_index) : i + 1,
              explanation: q.explanation || null,
              explanation_image_url: q.explanation_image_url || null
            },
            { transaction }
          );

          if (Array.isArray(q.options) && q.options.length > 0) {
            const optionsData = q.options.map((opt) => ({
              question_id: createdQuestion.id,
              option_key: opt.option_key || opt.key,
              content: opt.content,
              is_correct: Boolean(opt.is_correct !== undefined ? opt.is_correct : opt.isCorrect)
            }));

            await QuestionOption.bulkCreate(optionsData, { transaction });
          }
        }
      } else if (Array.isArray(question_ids) && question_ids.length > 0) {
        // Sao chép các câu hỏi từ ngân hàng câu hỏi vào đề thi kèm options
        const bankQuestions = await Question.findAll({
          where: { id: { [Op.in]: question_ids } },
          include: [{ model: QuestionOption, as: 'options' }]
        });

        for (let i = 0; i < bankQuestions.length; i++) {
          const bq = bankQuestions[i];
          const clonedQ = await Question.create(
            {
              exam_id: createdExam.id,
              subject_id: bq.subject_id || subject_id || null,
              content: bq.content,
              image_url: bq.image_url,
              question_type: bq.question_type || 'single_choice',
              points: bq.points || 1.0,
              order_index: i + 1,
              explanation: bq.explanation,
              explanation_image_url: bq.explanation_image_url
            },
            { transaction }
          );

          if (bq.options && bq.options.length > 0) {
            const optionsData = bq.options.map((opt) => ({
              question_id: clonedQ.id,
              option_key: opt.option_key,
              content: opt.content,
              is_correct: Boolean(opt.is_correct)
            }));
            await QuestionOption.bulkCreate(optionsData, { transaction });
          }
        }
      }

      // 3. Giao đề theo các lớp nếu người dùng chọn
      if (Array.isArray(class_ids) && class_ids.length > 0) {
        for (const cId of class_ids) {
          await ExamClassAssignment.create(
            {
              exam_id: createdExam.id,
              class_id: cId,
              is_assigned: true,
              is_open: Boolean(is_open),
              start_time: is_open ? new Date() : null
            },
            { transaction }
          );
        }
      }

      // Cập nhật tổng số câu hỏi thực tế của đề thi
      const actualCount = await Question.count({
        where: { exam_id: createdExam.id },
        transaction
      });
      await createdExam.update({ total_questions: actualCount }, { transaction });

      await transaction.commit();

      // Lấy lại dữ liệu đầy đủ sau khi tạo thành công
      return await this.getExamById(createdExam.id, true);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Lấy danh sách đề thi (Kho đề thi) có phân trang và tìm kiếm
   */
  static async getExams({ teacherId = null, search = '', page = 1, limit = 10 }) {
    const offset = (Number(page) - 1) * Number(limit);
    const where = {};

    if (teacherId) {
      where.teacher_id = teacherId;
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { code: { [Op.like]: `%${search}%` } }
      ];
    }

    const { rows, count } = await Exam.findAndCountAll({
      where,
      limit: Number(limit),
      offset,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: Teacher,
          as: 'teacher',
          attributes: ['id', 'teacher_code', 'full_name']
        },
        {
          model: Subject,
          as: 'subject',
          attributes: ['id', 'name', 'code', 'color']
        },
        {
          model: ExamClassAssignment,
          as: 'assignments',
          include: [
            {
              model: ClassRoom,
              as: 'classroom',
              attributes: ['id', 'name', 'code']
            }
          ]
        }
      ]
    });

    const enrichedExams = rows.map((row) => {
      const plain = row.toJSON ? row.toJSON() : row;
      if (Array.isArray(plain.assignments)) {
        plain.assignments = plain.assignments.map((ass) => {
          const pinCfg = getExamPinConfig(plain.id, ass.class_id);
          return {
            ...ass,
            pin_code: pinCfg.pinCode,
            is_pin_required: pinCfg.isPinRequired
          };
        });
      }
      return plain;
    });

    return {
      exams: enrichedExams,
      total: count,
      page: Number(page),
      limit: Number(limit)
    };
  }

  /**
   * Lấy chi tiết một đề thi theo ID
   * @param {number} examId
   * @param {boolean} includeCorrectAnswers - True nếu là giáo viên (xem đáp án đúng), False nếu là học sinh lúc làm bài
   */
  static async getExamById(examId, includeCorrectAnswers = true) {
    const optionAttributes = includeCorrectAnswers
      ? ['id', 'question_id', 'option_key', 'content', 'is_correct']
      : ['id', 'question_id', 'option_key', 'content'];

    const questionAttributes = includeCorrectAnswers
      ? ['id', 'exam_id', 'content', 'image_url', 'question_type', 'points', 'order_index', 'explanation', 'explanation_image_url']
      : ['id', 'exam_id', 'content', 'image_url', 'question_type', 'points', 'order_index'];

    const exam = await Exam.findByPk(examId, {
      include: [
        {
          model: Teacher,
          as: 'teacher',
          attributes: ['id', 'teacher_code', 'full_name', 'email']
        },
        {
          model: Question,
          as: 'questions',
          attributes: questionAttributes,
          include: [
            {
              model: QuestionOption,
              as: 'options',
              attributes: optionAttributes
            }
          ]
        },
        {
          model: ExamClassAssignment,
          as: 'assignments',
          include: [
            {
              model: ClassRoom,
              as: 'classroom',
              attributes: ['id', 'name', 'code'],
              include: [
                {
                  model: Grade,
                  as: 'grade',
                  attributes: ['id', 'name']
                }
              ]
            }
          ]
        }
      ],
      order: [
        [{ model: Question, as: 'questions' }, 'order_index', 'ASC'],
        [{ model: Question, as: 'questions' }, { model: QuestionOption, as: 'options' }, 'option_key', 'ASC']
      ]
    });

    if (!exam) {
      const error = new Error('Không tìm thấy đề thi này');
      error.statusCode = 404;
      throw error;
    }

    return exam;
  }

  /**
   * Xóa đề thi
   */
  static async deleteExam(examId, teacherId) {
    const exam = await Exam.findByPk(examId);
    if (!exam) {
      const error = new Error('Không tìm thấy đề thi cần xóa');
      error.statusCode = 404;
      throw error;
    }

    if (exam.teacher_id !== teacherId) {
      const error = new Error('Bạn không có quyền xóa đề thi của giáo viên khác');
      error.statusCode = 403;
      throw error;
    }

    await exam.destroy();
    return { message: 'Đã xóa đề thi thành công' };
  }

  /**
   * Giao đề thi theo lớp (Chọn danh sách lớp cụ thể hoặc tất cả các lớp)
   */
  static async assignExamToClasses({ examId, classIds = [], assignAll = false, isOpen = true, startTime = null, endTime = null }) {
    const exam = await Exam.findByPk(examId);
    if (!exam) {
      const error = new Error('Không tìm thấy đề thi');
      error.statusCode = 404;
      throw error;
    }

    let targetClassIds = classIds;

    // Nếu chọn giao cho tất cả các lớp
    if (assignAll) {
      const allClasses = await ClassRoom.findAll({ attributes: ['id'] });
      targetClassIds = allClasses.map((c) => c.id);
    }

    // Nếu người dùng bỏ chọn tất cả các lớp
    if (!assignAll && Array.isArray(classIds) && classIds.length === 0) {
      await ExamClassAssignment.destroy({
        where: { exam_id: examId }
      });
      return [];
    }

    // Xóa những lớp không còn nằm trong danh sách được chọn
    if (!assignAll && Array.isArray(classIds)) {
      await ExamClassAssignment.destroy({
        where: {
          exam_id: examId,
          class_id: { [Op.notIn]: targetClassIds }
        }
      });
    }

    if (!targetClassIds || targetClassIds.length === 0) {
      return [];
    }

    const assignments = [];
    for (const cId of targetClassIds) {
      let [assignment, created] = await ExamClassAssignment.findOrCreate({
        where: { exam_id: examId, class_id: cId },
        defaults: {
          is_assigned: true,
          is_open: Boolean(isOpen),
          start_time: startTime || new Date(),
          end_time: endTime || null
        }
      });

      if (!created) {
        assignment.is_assigned = true;
        assignment.is_open = Boolean(isOpen);
        if (startTime) assignment.start_time = startTime;
        if (endTime) assignment.end_time = endTime;
        await assignment.save();
      }

      // Thông báo real-time socket tới lớp
      emitExamAssignmentStatus(examId, cId, Boolean(isOpen));
      assignments.push(assignment);
    }

    return assignments;
  }

  /**
   * Bật / Tắt trạng thái phát đề thi cho 1 lớp cụ thể
   */
  static async toggleClassAssignment({ examId, classId, isOpen }) {
    const exam = await Exam.findByPk(examId);
    if (!exam) {
      const error = new Error('Không tìm thấy đề thi');
      error.statusCode = 404;
      throw error;
    }

    let assignment = await ExamClassAssignment.findOne({
      where: { exam_id: examId, class_id: classId }
    });

    if (!assignment) {
      // Nếu chưa có quan hệ thì tạo mới
      assignment = await ExamClassAssignment.create({
        exam_id: examId,
        class_id: classId,
        is_assigned: true,
        is_open: Boolean(isOpen),
        start_time: isOpen ? new Date() : null
      });
    } else {
      assignment.is_open = Boolean(isOpen);
      if (isOpen && !assignment.start_time) {
        assignment.start_time = new Date();
      }
      await assignment.save();
    }

    // Phát tín hiệu Real-time cập nhật trạng thái mở đề
    emitExamAssignmentStatus(examId, classId, Boolean(isOpen));

    return assignment;
  }

  /**
   * Lấy danh sách trạng thái giao đề theo các lớp của một bài thi
   */
  static async getExamAssignments(examId) {
    const assignments = await ExamClassAssignment.findAll({
      where: { exam_id: examId },
      include: [
        {
          model: ClassRoom,
          as: 'classroom',
          include: [
            {
              model: Grade,
              as: 'grade',
              attributes: ['id', 'name']
            }
          ]
        }
      ]
    });

    return assignments;
  }
}

module.exports = ExamService;
