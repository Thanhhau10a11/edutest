const { body } = require('express-validator');

const teacherLoginRules = [
  body().custom((value, { req }) => {
    const hasIdentifier = req.body.email || req.body.teacher_code;
    const hasAuth = req.body.password || req.body.full_name;
    if (!hasIdentifier || !hasAuth) {
      throw new Error('Vui lòng cung cấp Email & Mật khẩu hoặc Mã số & Họ tên giáo viên');
    }
    return true;
  })
];

const studentLoginRules = [
  body().custom((value, { req }) => {
    const hasIdentifier = req.body.email || req.body.student_code;
    const hasAuth = req.body.password || req.body.full_name;
    if (!hasIdentifier || !hasAuth) {
      throw new Error('Vui lòng cung cấp Email & Mật khẩu hoặc Mã số & Họ tên học sinh');
    }
    return true;
  })
];

module.exports = {
  teacherLoginRules,
  studentLoginRules
};
