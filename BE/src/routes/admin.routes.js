const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/admin.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const ROLES = require('../constants/roles');

// Tất cả routes yêu cầu đăng nhập với quyền Admin
router.use(authenticate);
router.use(authorize(ROLES.ADMIN));

// Giáo viên
router.get('/teachers', AdminController.getTeachers);
router.post('/teachers', AdminController.createTeacher);
router.patch('/teachers/:id', AdminController.updateTeacher);
router.patch('/teachers/:id/toggle-status', AdminController.toggleTeacherStatus);
router.patch('/teachers/:id/reset-password', AdminController.resetTeacherPassword);
router.delete('/teachers/:id', AdminController.deleteTeacher);

// Học sinh
router.get('/students', AdminController.getStudents);
router.post('/students', AdminController.createStudent);
router.patch('/students/:id', AdminController.updateStudent);
router.patch('/students/:id/toggle-status', AdminController.toggleStudentStatus);
router.patch('/students/:id/reset-password', AdminController.resetStudentPassword);
router.delete('/students/:id', AdminController.deleteStudent);

// Xếp lớp
router.patch('/students/:id/assign-class', AdminController.assignStudentToClass);
router.post('/students/assign-class', AdminController.assignMultipleStudentsToClass);

module.exports = router;
