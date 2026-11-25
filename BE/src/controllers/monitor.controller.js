const MonitorService = require('../services/monitor.service');
const ApiResponse = require('../utils/apiResponse');
const { emitTeacherBroadcast, getBroadcastHistory } = require('../config/socket');
const {
  getExamPinConfig,
  setExamPinConfig,
  regenerateExamPin,
  forceUnlockStudentDevice,
  getClassDeviceLocks
} = require('../utils/examSecurityStore');

class MonitorController {
  /**
   * Giám sát thời gian thực trạng thái làm bài của học sinh theo lớp
   * GET /api/v1/monitor/exams/:examId/classes/:classId
   */
  static async getClassExamMonitoring(req, res, next) {
    try {
      const { examId, classId } = req.params;

      const data = await MonitorService.getClassExamMonitoring({
        examId: Number(examId),
        classId: Number(classId)
      });

      return ApiResponse.success(res, data, 'Lấy dữ liệu giám sát thời gian thực thành công');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Phân tích phổ điểm hình chuông, độ khó từng câu hỏi & xuất dữ liệu báo cáo chuẩn Bộ GD&ĐT
   * GET /api/v1/monitor/exams/:examId/classes/:classId/analytics
   */
  static async getExamAnalytics(req, res, next) {
    try {
      const { examId, classId } = req.params;

      const data = await MonitorService.getExamAnalytics({
        examId: Number(examId),
        classId: Number(classId)
      });

      return ApiResponse.success(
        res,
        data,
        'Lấy dữ liệu phổ điểm, độ khó câu hỏi và báo cáo bảng điểm thành công'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Phát thông báo / cảnh báo tức thì từ Giáo viên tới phòng thi hoặc học sinh cụ thể
   * POST /api/v1/monitor/broadcast
   */
  static async sendBroadcast(req, res, next) {
    try {
      const { examId, classId, studentId, studentName, title, message, level } = req.body;

      if (!message || !String(message).trim()) {
        return ApiResponse.error(res, 'Vui lòng nhập nội dung thông báo hoặc cảnh báo', 400);
      }

      const senderName = req.user?.full_name || 'Giáo viên giám sát';
      const item = emitTeacherBroadcast({
        examId,
        classId,
        studentId,
        studentName,
        title,
        message,
        level: level || 'info',
        senderName
      });

      return ApiResponse.success(res, item, 'Đã phát thông báo tức thì tới phòng thi');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lấy lịch sử thông báo gần đây
   * GET /api/v1/monitor/broadcasts
   */
  static async getBroadcasts(req, res, next) {
    try {
      const { examId, classId, studentId } = req.query;
      const items = getBroadcastHistory({ examId, classId, studentId });
      return ApiResponse.success(res, items, 'Lấy danh sách thông báo thành công');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lấy cấu hình Mã PIN ca thi & Danh sách thiết bị đang khóa của lớp
   * GET /api/v1/monitor/exams/:examId/classes/:classId/security
   */
  static async getExamSecurity(req, res, next) {
    try {
      const { examId, classId } = req.params;
      const pinConfig = getExamPinConfig(Number(examId), Number(classId));
      const deviceLocks = getClassDeviceLocks({
        examId: Number(examId),
        classId: Number(classId)
      });
      return ApiResponse.success(
        res,
        { pin: pinConfig, deviceLocks },
        'Lấy cấu hình bảo mật PIN & khóa thiết bị thành công'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Giáo viên cập nhật Mã PIN ca thi, Bật/Tắt yêu cầu PIN hoặc Tạo mới PIN 6 số ngẫu nhiên
   * POST /api/v1/monitor/exams/:examId/classes/:classId/pin
   */
  static async updateExamPin(req, res, next) {
    try {
      const { examId, classId } = req.params;
      const { pinCode, isPinRequired, regenerate } = req.body;

      const updatedPin = regenerate
        ? regenerateExamPin(Number(examId), Number(classId))
        : setExamPinConfig({
            examId: Number(examId),
            classId: Number(classId),
            pinCode,
            isPinRequired
          });

      return ApiResponse.success(
        res,
        updatedPin,
        `Đã cập nhật mã PIN ca thi: ${updatedPin.pinCode}`
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Giáo viên mở khóa thiết bị (Reset Single-Device Lock) khi học sinh đổi máy hợp lệ tại phòng thi
   * POST /api/v1/monitor/exams/:examId/classes/:classId/unlock-device
   */
  static async unlockStudentDevice(req, res, next) {
    try {
      const { examId, classId } = req.params;
      const { studentId } = req.body;

      forceUnlockStudentDevice({
        studentId: studentId ? Number(studentId) : null,
        examId: Number(examId)
      });

      const deviceLocks = getClassDeviceLocks({
        examId: Number(examId),
        classId: Number(classId)
      });

      return ApiResponse.success(
        res,
        { deviceLocks },
        studentId
          ? 'Đã mở khóa thiết bị cho học sinh thành công'
          : 'Đã mở khóa thiết bị cho toàn bộ lớp học'
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = MonitorController;
