const AttemptService = require('../services/attempt.service');
const ApiResponse = require('../utils/apiResponse');

class AttemptController {
  /**
   * Nộp bài thi trắc nghiệm
   * POST /api/v1/student/exams/:id/submit
   */
  static async submitExam(req, res, next) {
    try {
      const { id } = req.params;
      const { answers } = req.body;
      const studentId = req.user.id;
      const classId = req.user.class_id;

      const result = await AttemptService.submitExam({
        studentId,
        examId: Number(id),
        classId,
        answers
      });

      return ApiResponse.success(res, result, 'Nộp bài thi thành công! Kết quả và ví điểm thưởng đã được cập nhật.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Xem kết quả chi tiết của một bài thi đã nộp
   * GET /api/v1/student/attempts/:id
   */
  static async getAttemptResult(req, res, next) {
    try {
      const { id } = req.params;
      const studentId = req.user.role === 'student' ? req.user.id : null;

      const result = await AttemptService.getAttemptResult(Number(id), studentId);
      return ApiResponse.success(res, result, 'Lấy kết quả bài thi thành công');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AttemptController;
