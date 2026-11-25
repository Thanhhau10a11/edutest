const { body, param } = require('express-validator');

const createExamRules = [
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Mã đề thi là bắt buộc')
    .isLength({ max: 50 })
    .withMessage('Mã đề thi không được vượt quá 50 ký tự'),
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Tiêu đề đề thi là bắt buộc'),
  body('duration_minutes')
    .isInt({ min: 1, max: 300 })
    .withMessage('Thời lượng làm bài phải từ 1 đến 300 phút'),
  body('passing_score')
    .optional()
    .isFloat({ min: 0, max: 10 })
    .withMessage('Điểm đạt phải nằm trong khoảng từ 0 đến 10'),
  body('questions')
    .optional()
    .isArray()
    .withMessage('questions phải là một mảng'),
  body('question_ids')
    .optional()
    .isArray()
    .withMessage('question_ids phải là một mảng ID'),
  body('class_ids')
    .optional()
    .isArray()
    .withMessage('class_ids phải là một mảng ID lớp học'),
  body('is_open')
    .optional()
    .isBoolean()
    .withMessage('is_open phải là boolean'),
  body('questions.*.content')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Nội dung câu hỏi không được để trống'),
  body('questions.*.image_url')
    .optional({ nullable: true })
    .trim(),
  body('questions.*.explanation')
    .optional({ nullable: true })
    .trim(),
  body('questions.*.explanation_image_url')
    .optional({ nullable: true })
    .trim(),
  body('questions.*.options')
    .optional()
    .isArray({ min: 2 })
    .withMessage('Mỗi câu hỏi phải có ít nhất 2 phương án trả lời'),
  body('questions.*.options.*.content')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Nội dung đáp án không được để trống'),
  body('questions.*.options.*.option_key')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Ký hiệu đáp án (A, B, C, D) không được để trống')
];

const assignClassesRules = [
  param('id')
    .isInt()
    .withMessage('ID đề thi phải là số nguyên hợp lệ'),
  body('is_open')
    .optional()
    .isBoolean()
    .withMessage('Trạng thái mở đề (is_open) phải là kiểu boolean (true/false)'),
  body('class_ids')
    .optional()
    .isArray()
    .withMessage('Danh sách ID lớp học (class_ids) phải là một mảng số nguyên'),
  body('assign_all')
    .optional()
    .isBoolean()
    .withMessage('assign_all phải là kiểu boolean')
];

const toggleAssignmentRules = [
  param('id')
    .isInt()
    .withMessage('ID đề thi phải là số nguyên hợp lệ'),
  body('class_id')
    .isInt()
    .withMessage('class_id là bắt buộc và phải là số nguyên'),
  body('is_open')
    .isBoolean()
    .withMessage('is_open là bắt buộc và phải là kiểu boolean (true/false)')
];

module.exports = {
  createExamRules,
  assignClassesRules,
  toggleAssignmentRules
};
