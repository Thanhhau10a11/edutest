const { Question, QuestionOption, Subject, Exam, sequelize } = require('../models');
const { Op } = require('sequelize');

class QuestionService {
  /**
   * Lấy danh sách câu hỏi trong ngân hàng câu hỏi
   */
  static async getAllQuestions({ subjectId = null, search = '', examId = null }) {
    const where = {};

    if (subjectId) {
      where.subject_id = subjectId;
    }

    if (examId) {
      where.exam_id = examId;
    }

    if (search) {
      where.content = { [Op.like]: `%${search}%` };
    }

    const questions = await Question.findAll({
      where,
      include: [
        {
          model: QuestionOption,
          as: 'options',
          attributes: ['id', 'question_id', 'option_key', 'content', 'is_correct']
        },
        {
          model: Subject,
          as: 'subject',
          attributes: ['id', 'name', 'code', 'color']
        },
        {
          model: Exam,
          as: 'exam',
          attributes: ['id', 'code', 'title']
        }
      ],
      order: [
        ['id', 'DESC'],
        [{ model: QuestionOption, as: 'options' }, 'option_key', 'ASC']
      ]
    });

    return questions;
  }

  /**
   * Tạo câu hỏi mới trong ngân hàng câu hỏi
   */
  static async createQuestion(data) {
    const {
      subject_id,
      subject_name,
      exam_id,
      content,
      image_url,
      question_type = 'single_choice',
      points = 2.0,
      explanation,
      explanation_image_url,
      options = []
    } = data;

    if (!content || !content.trim()) {
      const error = new Error('Nội dung câu hỏi không được để trống');
      error.statusCode = 400;
      throw error;
    }

    // Xác định subject_id
    let resolvedSubjectId = subject_id;
    if (!resolvedSubjectId && subject_name) {
      const sub = await Subject.findOne({
        where: { name: subject_name.trim() }
      });
      if (sub) {
        resolvedSubjectId = sub.id;
      } else {
        const newSub = await Subject.create({
          name: subject_name.trim(),
          code: `SUB_${Date.now().toString().slice(-4)}`,
          color: '#8b7cf6'
        });
        resolvedSubjectId = newSub.id;
      }
    }

    // Xác định exam_id (mặc định lấy exam đầu tiên nếu chưa truyền)
    let resolvedExamId = exam_id;
    if (!resolvedExamId) {
      const firstExam = await Exam.findOne();
      resolvedExamId = firstExam ? firstExam.id : 1;
    }

    const transaction = await sequelize.transaction();
    try {
      const createdQuestion = await Question.create({
        exam_id: resolvedExamId,
        subject_id: resolvedSubjectId || null,
        content: content.trim(),
        image_url: image_url ? image_url.trim() : null,
        question_type: question_type || 'single_choice',
        points: Number(points) || 2.0,
        explanation: explanation ? explanation.trim() : null,
        explanation_image_url: explanation_image_url ? explanation_image_url.trim() : null,
        order_index: 0
      }, { transaction });

      // Tạo các options
      if (Array.isArray(options) && options.length > 0) {
        const optionRows = options.map((opt, idx) => ({
          question_id: createdQuestion.id,
          option_key: opt.key || opt.option_key || String.fromCharCode(65 + idx),
          content: (opt.content || '').trim(),
          is_correct: Boolean(opt.isCorrect !== undefined ? opt.isCorrect : opt.is_correct)
        }));

        await QuestionOption.bulkCreate(optionRows, { transaction });
      }

      await transaction.commit();

      // Lấy đầy đủ thông tin sau khi tạo
      return await Question.findByPk(createdQuestion.id, {
        include: [
          {
            model: QuestionOption,
            as: 'options'
          },
          {
            model: Subject,
            as: 'subject'
          }
        ]
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Cập nhật câu hỏi trong ngân hàng câu hỏi
   */
  static async updateQuestion(id, data) {
    const question = await Question.findByPk(id);
    if (!question) {
      const error = new Error('Không tìm thấy câu hỏi');
      error.statusCode = 404;
      throw error;
    }

    const {
      subject_id,
      subject_name,
      content,
      image_url,
      explanation,
      explanation_image_url,
      options = []
    } = data;

    let resolvedSubjectId = subject_id;
    if (!resolvedSubjectId && subject_name) {
      const sub = await Subject.findOne({ where: { name: subject_name.trim() } });
      if (sub) resolvedSubjectId = sub.id;
    }

    const transaction = await sequelize.transaction();
    try {
      await question.update({
        subject_id: resolvedSubjectId || question.subject_id,
        content: content ? content.trim() : question.content,
        image_url: image_url !== undefined ? (image_url ? image_url.trim() : null) : question.image_url,
        explanation: explanation !== undefined ? (explanation ? explanation.trim() : null) : question.explanation,
        explanation_image_url: explanation_image_url !== undefined ? (explanation_image_url ? explanation_image_url.trim() : null) : question.explanation_image_url,
      }, { transaction });

      if (Array.isArray(options) && options.length > 0) {
        await QuestionOption.destroy({ where: { question_id: id }, transaction });
        const optionRows = options.map((opt, idx) => ({
          question_id: id,
          option_key: opt.key || opt.option_key || String.fromCharCode(65 + idx),
          content: (opt.content || '').trim(),
          is_correct: Boolean(opt.isCorrect !== undefined ? opt.isCorrect : opt.is_correct)
        }));
        await QuestionOption.bulkCreate(optionRows, { transaction });
      }

      await transaction.commit();

      return await Question.findByPk(id, {
        include: [{ model: QuestionOption, as: 'options' }, { model: Subject, as: 'subject' }]
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Xóa câu hỏi khỏi ngân hàng câu hỏi
   */
  static async deleteQuestion(id) {
    const question = await Question.findByPk(id);
    if (!question) {
      const error = new Error('Không tìm thấy câu hỏi để xóa');
      error.statusCode = 404;
      throw error;
    }

    await question.destroy();
    return { id: Number(id) };
  }
}

module.exports = QuestionService;
