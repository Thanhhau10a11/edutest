const ExamService = require('../services/exam.service');
const ApiResponse = require('../utils/apiResponse');

class ExamController {
  /**
   * Tạo đề thi trực tuyến mới kèm câu hỏi và đáp án
   * POST /api/v1/exams
   */
  static async createExam(req, res, next) {
    try {
      const teacherId = req.user.id;
      const exam = await ExamService.createExam(req.body, teacherId);
      return ApiResponse.created(res, exam, 'Tạo đề thi trực tuyến thành công');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lấy danh sách đề thi (Quản lý kho đề thi)
   * GET /api/v1/exams
   */
  static async getExams(req, res, next) {
    try {
      const { search, page = 1, limit = 10, my_exams_only } = req.query;
      const teacherId = my_exams_only === 'true' ? req.user.id : null;

      const result = await ExamService.getExams({
        teacherId,
        search,
        page,
        limit
      });

      return ApiResponse.paginated(
        res,
        result.exams,
        { page: result.page, limit: result.limit, total: result.total },
        'Lấy danh sách kho đề thi thành công'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lấy chi tiết đề thi theo ID
   * GET /api/v1/exams/:id
   */
  static async getExamById(req, res, next) {
    try {
      const { id } = req.params;
      const exam = await ExamService.getExamById(id, true);
      return ApiResponse.success(res, exam, 'Lấy chi tiết đề thi thành công');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Xóa đề thi
   * DELETE /api/v1/exams/:id
   */
  static async deleteExam(req, res, next) {
    try {
      const { id } = req.params;
      const teacherId = req.user.id;
      const result = await ExamService.deleteExam(id, teacherId);
      return ApiResponse.success(res, result, 'Xóa đề thi thành công');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Giao đề thi theo lớp (Chọn lớp cụ thể hoặc tất cả các lớp)
   * POST /api/v1/exams/:id/assign
   */
  static async assignClasses(req, res, next) {
    try {
      const { id } = req.params;
      const { class_ids, assign_all, is_open, start_time, end_time } = req.body;

      const assignments = await ExamService.assignExamToClasses({
        examId: Number(id),
        classIds: class_ids,
        assignAll: Boolean(assign_all),
        isOpen: is_open !== undefined ? Boolean(is_open) : true,
        startTime: start_time,
        endTime: end_time
      });

      return ApiResponse.success(res, assignments, 'Giao đề thi cho lớp thành công');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bật / Tắt trạng thái phát đề theo lớp
   * PATCH /api/v1/exams/:id/toggle-class
   */
  static async toggleClassAssignment(req, res, next) {
    try {
      const { id } = req.params;
      const { class_id, is_open } = req.body;

      const assignment = await ExamService.toggleClassAssignment({
        examId: Number(id),
        classId: Number(class_id),
        isOpen: Boolean(is_open)
      });

      const message = is_open
        ? 'Đã bật phát đề thi cho lớp thành công'
        : 'Đã tắt phát đề thi cho lớp thành công';

      return ApiResponse.success(res, assignment, message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lấy danh sách các lớp đã được giao đề này
   * GET /api/v1/exams/:id/assignments
   */
  static async getExamAssignments(req, res, next) {
    try {
      const { id } = req.params;
      const assignments = await ExamService.getExamAssignments(id);
      return ApiResponse.success(res, assignments, 'Lấy danh sách lớp được giao đề thành công');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ExamController;
