const QuestionService = require('../services/question.service');
const ApiResponse = require('../utils/apiResponse');

class QuestionController {
  /**
   * Lấy danh sách câu hỏi trong ngân hàng câu hỏi
   * GET /api/v1/questions
   */
  static async getAll(req, res, next) {
    try {
      const { subject_id, search, exam_id } = req.query;
      const questions = await QuestionService.getAllQuestions({
        subjectId: subject_id ? Number(subject_id) : null,
        search: search || '',
        examId: exam_id ? Number(exam_id) : null
      });

      return ApiResponse.success(res, questions, 'Lấy danh sách câu hỏi thành công');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Tạo câu hỏi mới trong ngân hàng
   * POST /api/v1/questions
   */
  static async create(req, res, next) {
    try {
      const question = await QuestionService.createQuestion(req.body);
      return ApiResponse.created(res, question, 'Tạo câu hỏi thành công');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cập nhật câu hỏi trong ngân hàng
   * PUT /api/v1/questions/:id
   */
  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const question = await QuestionService.updateQuestion(id, req.body);
      return ApiResponse.success(res, question, 'Cập nhật câu hỏi thành công');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Xóa câu hỏi khỏi ngân hàng
   * DELETE /api/v1/questions/:id
   */
  static async delete(req, res, next) {
    try {
      const { id } = req.params;
      const result = await QuestionService.deleteQuestion(id);
      return ApiResponse.success(res, result, 'Xóa câu hỏi thành công');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = QuestionController;
