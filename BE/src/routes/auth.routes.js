const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const authenticate = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validator.middleware');
const { teacherLoginRules, studentLoginRules } = require('../validators/auth.validator');

// Đăng nhập giáo viên bằng Mã số và Họ tên
router.post('/teacher/login', teacherLoginRules, validate, AuthController.loginTeacher);

// Đăng nhập học sinh bằng Mã số và Họ tên
router.post('/student/login', studentLoginRules, validate, AuthController.loginStudent);

// Đăng nhập quản trị viên
router.post('/admin/login', AuthController.loginAdmin);

// Lấy thông tin user hiện tại
router.get('/me', authenticate, AuthController.getMe);

module.exports = router;
