const express = require('express');
const router = express.Router();
const MonitorController = require('../controllers/monitor.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const ROLES = require('../constants/roles');

router.use(authenticate);

// Giám sát thời gian thực theo đề thi và lớp học cụ thể (Dành cho Giáo viên / Admin)
router.get(
  '/exams/:examId/classes/:classId',
  authorize(ROLES.TEACHER, ROLES.ADMIN),
  MonitorController.getClassExamMonitoring
);

// Phân tích phổ điểm hình chuông, độ khó từng câu hỏi & xuất bảng điểm chuẩn Bộ GD&ĐT
router.get(
  '/exams/:examId/classes/:classId/analytics',
  authorize(ROLES.TEACHER, ROLES.ADMIN),
  MonitorController.getExamAnalytics
);

// Phát thông báo / cảnh báo tức thì tới phòng thi hoặc học sinh
router.post(
  '/broadcast',
  authorize(ROLES.TEACHER, ROLES.ADMIN),
  MonitorController.sendBroadcast
);

// Lấy danh sách thông báo gần đây (Cho cả Giáo viên và Học sinh)
router.get('/broadcasts', MonitorController.getBroadcasts);

// Cấu hình Mã PIN ca thi & Khóa 1 thiết bị duy nhất (Single-Device Lock)
router.get(
  '/exams/:examId/classes/:classId/security',
  authorize(ROLES.TEACHER, ROLES.ADMIN),
  MonitorController.getExamSecurity
);

router.post(
  '/exams/:examId/classes/:classId/pin',
  authorize(ROLES.TEACHER, ROLES.ADMIN),
  MonitorController.updateExamPin
);

router.post(
  '/exams/:examId/classes/:classId/unlock-device',
  authorize(ROLES.TEACHER, ROLES.ADMIN),
  MonitorController.unlockStudentDevice
);

module.exports = router;
