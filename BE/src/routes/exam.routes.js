const express = require('express');
const router = express.Router();
const ExamController = require('../controllers/exam.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const validate = require('../middlewares/validator.middleware');
const ROLES = require('../constants/roles');
const {
  createExamRules,
  assignClassesRules,
  toggleAssignmentRules
} = require('../validators/exam.validator');

// Tất cả các routes quản lý kho đề thi dưới đây yêu cầu đăng nhập
router.use(authenticate);

// 1. Tạo đề thi trực tuyến (Giáo viên)
router.post('/', authorize(ROLES.TEACHER), createExamRules, validate, ExamController.createExam);

// 2. Lấy danh sách kho đề thi (Giáo viên)
router.get('/', authorize(ROLES.TEACHER), ExamController.getExams);

// 3. Xem chi tiết đề thi kèm câu hỏi & đáp án
router.get('/:id', ExamController.getExamById);

// 4. Xóa đề thi
router.delete('/:id', authorize(ROLES.TEACHER), ExamController.deleteExam);

// 5. Giao đề theo lớp (chọn lớp cụ thể hoặc tất cả)
router.post(
  '/:id/assign',
  authorize(ROLES.TEACHER),
  assignClassesRules,
  validate,
  ExamController.assignClasses
);

// 6. Bật / Tắt trạng thái phát đề theo lớp
router.patch(
  '/:id/toggle-class',
  authorize(ROLES.TEACHER),
  toggleAssignmentRules,
  validate,
  ExamController.toggleClassAssignment
);

// 7. Lấy danh sách các lớp đã được giao đề
router.get('/:id/assignments', authorize(ROLES.TEACHER), ExamController.getExamAssignments);

module.exports = router;
