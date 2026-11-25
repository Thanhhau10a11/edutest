const express = require('express');
const router = express.Router();
const QuestionController = require('../controllers/question.controller');
const authenticate = require('../middlewares/auth.middleware');

// GET /api/v1/questions - Lấy danh sách câu hỏi
router.get('/', QuestionController.getAll);

// POST /api/v1/questions - Tạo câu hỏi mới
router.post('/', authenticate, QuestionController.create);

// PUT /api/v1/questions/:id - Cập nhật câu hỏi
router.put('/:id', authenticate, QuestionController.update);

// DELETE /api/v1/questions/:id - Xóa câu hỏi
router.delete('/:id', authenticate, QuestionController.delete);

module.exports = router;
