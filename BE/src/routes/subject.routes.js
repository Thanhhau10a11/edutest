const express = require('express');
const router = express.Router();
const SubjectController = require('../controllers/subject.controller');

// GET /api/v1/subjects - Lấy danh sách môn học
router.get('/', SubjectController.getAll);

// GET /api/v1/subjects/:id - Lấy chi tiết môn học
router.get('/:id', SubjectController.getById);

// POST /api/v1/subjects - Tạo môn học / chủ đề mới
router.post('/', SubjectController.create);

// PUT /api/v1/subjects/:id - Cập nhật môn học
router.put('/:id', SubjectController.update);

// DELETE /api/v1/subjects/:id - Xóa môn học
router.delete('/:id', SubjectController.delete);

module.exports = router;
