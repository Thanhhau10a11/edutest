const { body, param } = require('express-validator');

const submitExamRules = [
  param('id')
    .isInt()
    .withMessage('ID đề thi phải là số nguyên'),
  body('answers')
    .isArray()
    .withMessage('answers phải là danh sách câu trả lời'),
  body('answers.*.question_id')
    .isInt()
    .withMessage('question_id phải là số nguyên hợp lệ'),
  body('answers.*.selected_option_id')
    .optional({ nullable: true })
    .isInt()
    .withMessage('selected_option_id phải là số nguyên hợp lệ hoặc null')
];

module.exports = {
  submitExamRules
};
