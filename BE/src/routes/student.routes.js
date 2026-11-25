const express = require('express');
const router = express.Router();
const StudentController = require('../controllers/student.controller');
const AttemptController = require('../controllers/attempt.controller');
const WalletController = require('../controllers/wallet.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const validate = require('../middlewares/validator.middleware');
const ROLES = require('../constants/roles');
const { submitExamRules } = require('../validators/attempt.validator');

// Tất cả routes của học sinh yêu cầu đăng nhập
router.use(authenticate);

// 1. Tải danh sách đề luyện tập được mở theo lớp
router.get('/exams', authorize(ROLES.STUDENT), StudentController.getAvailableExams);

// 2. Lấy đề thi và bắt đầu làm bài (Không lộ đáp án đúng)
router.get('/exams/:id/start', authorize(ROLES.STUDENT), StudentController.getExamForTesting);

// 3. Nộp bài thi trắc nghiệm & Tích điểm thưởng / xu
router.post(
  '/exams/:id/submit',
  authorize(ROLES.STUDENT),
  submitExamRules,
  validate,
  AttemptController.submitExam
);

// 4. Lấy lịch sử làm bài thi
router.get('/history', authorize(ROLES.STUDENT), StudentController.getStudentHistory);

// 5. Xem kết quả chi tiết của 1 bài thi
router.get('/attempts/:id', AttemptController.getAttemptResult);

// 6. Lấy thông tin hồ sơ học sinh
router.get('/profile', authorize(ROLES.STUDENT), StudentController.getStudentProfile);

// 7. Lấy thông tin ví điểm thưởng và xu
router.get('/wallet', authorize(ROLES.STUDENT), WalletController.getStudentWallet);

// 8. Lọc các câu hỏi học sinh từng làm sai trong lịch sử để tạo bài Luyện tập Phục hồi Kiến thức
router.get('/recovery', authorize(ROLES.STUDENT), StudentController.getRecoveryQuestions);

// 9. Nộp bài Luyện tập Phục hồi Kiến thức & thưởng xu/điểm khích lệ
router.post('/recovery/submit', authorize(ROLES.STUDENT), StudentController.submitRecoveryPractice);

module.exports = router;
