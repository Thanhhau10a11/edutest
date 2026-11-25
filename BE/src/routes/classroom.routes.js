const express = require('express');
const router = express.Router();
const ClassroomController = require('../controllers/classroom.controller');
const authenticate = require('../middlewares/auth.middleware');

// Lấy cây thư mục phân loại lớp và học sinh (Grades -> Classrooms -> Students)
router.get('/tree', authenticate, ClassroomController.getClassTree);

// Lấy danh sách các khối lớp
router.get('/grades', authenticate, ClassroomController.getGrades);

// Lấy danh sách giáo viên phục vụ chọn GVCN
router.get('/teachers-list', authenticate, ClassroomController.getTeachers);

// Lấy danh sách tất cả các lớp học
router.get('/', authenticate, ClassroomController.getAllClassrooms);

// Tạo lớp học mới
router.post('/', authenticate, ClassroomController.createClassroom);

// Cập nhật lớp học
router.put('/:id', authenticate, ClassroomController.updateClassroom);
router.patch('/:id', authenticate, ClassroomController.updateClassroom);

// Xóa lớp học
router.delete('/:id', authenticate, ClassroomController.deleteClassroom);

// Lấy chi tiết một lớp học
router.get('/:id', authenticate, ClassroomController.getClassroomDetail);

module.exports = router;
