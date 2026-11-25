const StudentService = require('../services/student.service');
const ApiResponse = require('../utils/apiResponse');

class StudentController {
  /**
   * Tải danh sách đề thi / đề luyện tập mở cho lớp của học sinh
   * GET /api/v1/student/exams
   */
  static async getAvailableExams(req, res, next) {
    try {
      const studentId = req.user.id;
      const classId = req.user.class_id;

      const exams = await StudentService.getAvailableExams(studentId, classId);
      return ApiResponse.success(res, exams, 'Lấy danh sách đề thi cho học sinh thành công');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lấy đề thi để học sinh làm bài (câu hỏi trắc nghiệm không lộ đáp án)
   * Kèm kiểm tra Mã PIN ca thi & Khóa 1 thiết bị duy nhất
   * GET /api/v1/student/exams/:id/start
   */
  static async getExamForTesting(req, res, next) {
    try {
      const { id } = req.params;
      const studentId = req.user.id;
      const classId = req.user.class_id;
      const pinCode = req.query.pin || req.headers['x-exam-pin'] || '';
      const deviceId = req.query.device_id || req.headers['x-device-id'] || '';
      const deviceName = req.query.device_name || req.headers['x-device-name'] || '';

      const examData = await StudentService.getExamForTesting(Number(id), studentId, classId, {
        pinCode,
        deviceId,
        deviceName
      });
      return ApiResponse.success(res, examData, 'Bắt đầu làm bài thi');
    } catch (error) {
      if (error.code === 'INVALID_EXAM_PIN' || error.code === 'DEVICE_LOCKED') {
        return res.status(error.statusCode || 403).json({
          success: false,
          code: error.code,
          message: error.message
        });
      }
      next(error);
    }
  }

  /**
   * Lấy lịch sử các đề đã làm của học sinh
   * GET /api/v1/student/history
   */
  static async getStudentHistory(req, res, next) {
    try {
      const studentId = req.user.id;
      const history = await StudentService.getStudentHistory(studentId);
      return ApiResponse.success(res, history, 'Lấy lịch sử làm bài thành công');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lấy thông tin tài khoản học sinh và lớp
   * GET /api/v1/student/profile
   */
  static async getStudentProfile(req, res, next) {
    try {
      const studentId = req.user.id;
      const profile = await StudentService.getStudentProfile(studentId);
      return ApiResponse.success(res, profile, 'Lấy thông tin học sinh thành công');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lọc các câu hỏi học sinh từng trả lời sai trong lịch sử để tạo Bài luyện tập Phục hồi Kiến thức
   * GET /api/v1/student/recovery
   */
  static async getRecoveryQuestions(req, res, next) {
    try {
      const studentId = req.user.id;
      const data = await StudentService.getRecoveryQuestions(studentId);
      return ApiResponse.success(
        res,
        data,
        'Lấy danh sách câu hỏi phục hồi kiến thức thành công'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Nộp bài luyện tập phục hồi kiến thức & cộng xu/điểm khích lệ
   * POST /api/v1/student/recovery/submit
   */
  static async submitRecoveryPractice(req, res, next) {
    try {
      const studentId = req.user.id;
      const { answers } = req.body;
      const result = await StudentService.submitRecoveryPractice(studentId, {
        answers: Array.isArray(answers) ? answers : []
      });
      return ApiResponse.success(
        res,
        result,
        'Chấm điểm bài luyện tập phục hồi kiến thức thành công'
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = StudentController;
