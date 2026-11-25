-- ==============================================================
-- EDUTEST DATABASE SCHEMA & SAMPLE DATA
-- Designed for MySQL / MariaDB (Compatible with phpMyAdmin)
-- Charset: utf8mb4_unicode_ci
-- ==============================================================

CREATE DATABASE IF NOT EXISTS `edutest_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `edutest_db`;

SET FOREIGN_KEY_CHECKS = 0;

-- Drop tables if exists
DROP TABLE IF EXISTS `wallet_transactions`;
DROP TABLE IF EXISTS `attempt_details`;
DROP TABLE IF EXISTS `exam_attempts`;
DROP TABLE IF EXISTS `exam_class_assignments`;
DROP TABLE IF EXISTS `question_options`;
DROP TABLE IF EXISTS `questions`;
DROP TABLE IF EXISTS `exams`;
DROP TABLE IF EXISTS `subjects`;
DROP TABLE IF EXISTS `students`;
DROP TABLE IF EXISTS `classrooms`;
DROP TABLE IF EXISTS `grades`;
DROP TABLE IF EXISTS `teachers`;

SET FOREIGN_KEY_CHECKS = 1;

-- ==============================================================
-- 1. TABLE: teachers (Giáo viên)
-- ==============================================================
CREATE TABLE `teachers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `teacher_code` VARCHAR(50) NOT NULL UNIQUE,
  `full_name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(150) DEFAULT NULL,
  `password` VARCHAR(255) DEFAULT '$2a$10$wK0w2BqQ7yH7oN1GcLw4teY7mOQ9hP4YtW8s6JkH9g8g8g8g8g8g8', -- Mật khẩu mặc định: 123456
  `phone` VARCHAR(20) DEFAULT NULL,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_teacher_code` (`teacher_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================
-- 2. TABLE: grades (Khối lớp)
-- ==============================================================
CREATE TABLE `grades` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `order_index` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================
-- 3. TABLE: classrooms (Lớp học)
-- ==============================================================
CREATE TABLE `classrooms` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `grade_id` INT NOT NULL,
  `teacher_id` INT DEFAULT NULL,
  `name` VARCHAR(100) NOT NULL,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `academic_year` VARCHAR(50) DEFAULT '2025-2026',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_classroom_grade` FOREIGN KEY (`grade_id`) REFERENCES `grades` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_classroom_teacher` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE SET NULL,
  INDEX `idx_classroom_grade` (`grade_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================
-- 4. TABLE: students (Học sinh)
-- ==============================================================
CREATE TABLE `students` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_code` VARCHAR(50) NOT NULL UNIQUE,
  `full_name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(150) DEFAULT NULL UNIQUE,
  `password` VARCHAR(255) DEFAULT '$2a$10$nX5dfS99AQ8pFjSV0M/lr.RKezr3is5sfiI18kAHMOOpmSvsxAz2C', -- Mật khẩu mặc định: studentpassword
  `class_id` INT NOT NULL,
  `reward_points` INT NOT NULL DEFAULT 0,
  `wallet_coins` INT NOT NULL DEFAULT 0,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_student_classroom` FOREIGN KEY (`class_id`) REFERENCES `classrooms` (`id`) ON DELETE CASCADE,
  INDEX `idx_student_code` (`student_code`),
  INDEX `idx_student_class` (`class_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================
-- 5. TABLE: subjects (Môn học / Chủ đề)
-- ==============================================================
CREATE TABLE `subjects` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `description` TEXT DEFAULT NULL,
  `icon` VARCHAR(50) DEFAULT 'book',
  `color` VARCHAR(50) DEFAULT '#8b7cf6',
  `order_index` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_subject_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================
-- 6. TABLE: exams (Đề thi / Đề luyện tập)
-- ==============================================================
CREATE TABLE `exams` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `teacher_id` INT NOT NULL,
  `subject_id` INT DEFAULT NULL,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `duration_minutes` INT NOT NULL DEFAULT 15,
  `total_questions` INT NOT NULL DEFAULT 0,
  `passing_score` DECIMAL(4,2) NOT NULL DEFAULT 5.00,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_exam_teacher` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_exam_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE SET NULL,
  INDEX `idx_exam_code` (`code`),
  INDEX `idx_exam_teacher` (`teacher_id`),
  INDEX `idx_exam_subject` (`subject_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================
-- 7. TABLE: questions (Câu hỏi trắc nghiệm)
-- ==============================================================
CREATE TABLE `questions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `exam_id` INT NOT NULL,
  `subject_id` INT DEFAULT NULL,
  `content` TEXT NOT NULL,
  `image_url` TEXT DEFAULT NULL,
  `question_type` ENUM('single_choice', 'multiple_choice') NOT NULL DEFAULT 'single_choice',
  `points` DECIMAL(4,2) NOT NULL DEFAULT 2.00,
  `order_index` INT NOT NULL DEFAULT 0,
  `explanation` TEXT DEFAULT NULL,
  `explanation_image_url` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_question_exam` FOREIGN KEY (`exam_id`) REFERENCES `exams` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_question_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE SET NULL,
  INDEX `idx_question_exam` (`exam_id`),
  INDEX `idx_question_subject` (`subject_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================
-- 7. TABLE: question_options (Phương án trả lời)
-- ==============================================================
CREATE TABLE `question_options` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `question_id` INT NOT NULL,
  `option_key` VARCHAR(10) NOT NULL, -- A, B, C, D
  `content` TEXT NOT NULL,
  `is_correct` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_option_question` FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE CASCADE,
  INDEX `idx_option_question` (`question_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================
-- 8. TABLE: exam_class_assignments (Phát đề / Giao đề theo lớp)
-- ==============================================================
CREATE TABLE `exam_class_assignments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `exam_id` INT NOT NULL,
  `class_id` INT NOT NULL,
  `is_assigned` TINYINT(1) NOT NULL DEFAULT 1,
  `is_open` TINYINT(1) NOT NULL DEFAULT 0, -- 1: Đang mở đề cho học sinh làm, 0: Đang tắt
  `start_time` DATETIME DEFAULT NULL,
  `end_time` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_assign_exam` FOREIGN KEY (`exam_id`) REFERENCES `exams` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_assign_class` FOREIGN KEY (`class_id`) REFERENCES `classrooms` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_exam_class` (`exam_id`, `class_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================
-- 9. TABLE: exam_attempts (Lượt làm bài thi của học sinh)
-- ==============================================================
CREATE TABLE `exam_attempts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `exam_id` INT NOT NULL,
  `student_id` INT NOT NULL,
  `class_id` INT NOT NULL,
  `status` ENUM('not_started', 'in_progress', 'completed') NOT NULL DEFAULT 'not_started',
  `started_at` DATETIME DEFAULT NULL,
  `submitted_at` DATETIME DEFAULT NULL,
  `total_score` DECIMAL(4,2) NOT NULL DEFAULT 0.00,
  `correct_answers_count` INT NOT NULL DEFAULT 0,
  `earned_coins` INT NOT NULL DEFAULT 0,
  `earned_points` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_attempt_exam` FOREIGN KEY (`exam_id`) REFERENCES `exams` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_attempt_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_attempt_class` FOREIGN KEY (`class_id`) REFERENCES `classrooms` (`id`) ON DELETE CASCADE,
  INDEX `idx_attempt_exam_class` (`exam_id`, `class_id`),
  INDEX `idx_attempt_student` (`student_id`),
  INDEX `idx_attempt_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================
-- 10. TABLE: attempt_details (Chi tiết câu trả lời)
-- ==============================================================
CREATE TABLE `attempt_details` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `attempt_id` INT NOT NULL,
  `question_id` INT NOT NULL,
  `selected_option_id` INT DEFAULT NULL,
  `is_correct` TINYINT(1) NOT NULL DEFAULT 0,
  `points_earned` DECIMAL(4,2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_detail_attempt` FOREIGN KEY (`attempt_id`) REFERENCES `exam_attempts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_detail_question` FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_detail_option` FOREIGN KEY (`selected_option_id`) REFERENCES `question_options` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================
-- 11. TABLE: wallet_transactions (Lịch sử biến động điểm / xu)
-- ==============================================================
CREATE TABLE `wallet_transactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT NOT NULL,
  `type` ENUM('points', 'coins') NOT NULL,
  `amount` INT NOT NULL,
  `reason` VARCHAR(255) NOT NULL,
  `reference_id` INT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_wallet_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  INDEX `idx_wallet_student` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ==============================================================
-- DỮ LIỆU MẪU (MOCK DATA)
-- ==============================================================

-- 1. GIÁO VIÊN
INSERT INTO `teachers` (`id`, `teacher_code`, `full_name`, `email`, `password`, `phone`, `status`) VALUES
(1, 'GV001', 'Thầy Nguyễn Văn Tuấn', 'tuan.nguyen@edutest.vn', '$2a$10$wK0w2BqQ7yH7oN1GcLw4teY7mOQ9hP4YtW8s6JkH9g8g8g8g8g8g8', '0912345678', 'active'),
(2, 'GV002', 'Cô Lê Thị Mai', 'mai.le@edutest.vn', '$2a$10$wK0w2BqQ7yH7oN1GcLw4teY7mOQ9hP4YtW8s6JkH9g8g8g8g8g8g8', '0987654321', 'active'),
(3, 'GV_TEACHER', 'Teacher Demo', 'teacher@gmail.com', '$2a$10$xzIdHFDVgCzd72mLeZoEiuctWmyr9dgvf3w1lipEDDVqV3WTd0ZGK', '0901234567', 'active');

-- 2. KHỐI LỚP
INSERT INTO `grades` (`id`, `name`, `code`, `order_index`) VALUES
(1, 'Khối 10', 'K10', 1),
(2, 'Khối 11', 'K11', 2),
(3, 'Khối 12', 'K12', 3);

-- 3. LỚP HỌC
INSERT INTO `classrooms` (`id`, `grade_id`, `teacher_id`, `name`, `code`, `academic_year`) VALUES
(1, 1, 1, 'Lớp 10A1', '10A1_2026', '2025-2026'),
(2, 1, 1, 'Lớp 10A2', '10A2_2026', '2025-2026'),
(3, 2, 2, 'Lớp 11A1', '11A1_2026', '2025-2026'),
(4, 3, 2, 'Lớp 12A1', '12A1_2026', '2025-2026');

-- 4. HỌC SINH
INSERT INTO `students` (`id`, `student_code`, `full_name`, `email`, `password`, `class_id`, `reward_points`, `wallet_coins`, `status`) VALUES
(1, 'HS001', 'Nguyễn Văn An', 'an.nguyen@edutest.vn', '$2a$10$nX5dfS99AQ8pFjSV0M/lr.RKezr3is5sfiI18kAHMOOpmSvsxAz2C', 1, 40, 80, 'active'),
(2, 'HS002', 'Lê Thị Bích', 'bich.le@edutest.vn', '$2a$10$nX5dfS99AQ8pFjSV0M/lr.RKezr3is5sfiI18kAHMOOpmSvsxAz2C', 1, 0, 0, 'active'),
(3, 'HS003', 'Trần Hoàng Cường', 'cuong.tran@edutest.vn', '$2a$10$nX5dfS99AQ8pFjSV0M/lr.RKezr3is5sfiI18kAHMOOpmSvsxAz2C', 1, 0, 0, 'active'),
(4, 'HS004', 'Phạm Ngọc Dung', 'dung.pham@edutest.vn', '$2a$10$nX5dfS99AQ8pFjSV0M/lr.RKezr3is5sfiI18kAHMOOpmSvsxAz2C', 1, 0, 0, 'active'),
(5, 'HS005', 'Đỗ Quang Em', 'em.do@edutest.vn', '$2a$10$nX5dfS99AQ8pFjSV0M/lr.RKezr3is5sfiI18kAHMOOpmSvsxAz2C', 1, 0, 0, 'active'),
(6, 'HS006', 'Vũ Thị Giang', 'giang.vu@edutest.vn', '$2a$10$nX5dfS99AQ8pFjSV0M/lr.RKezr3is5sfiI18kAHMOOpmSvsxAz2C', 2, 15, 30, 'active'),
(7, 'HS007', 'Hoàng Minh Hải', 'hai.hoang@edutest.vn', '$2a$10$nX5dfS99AQ8pFjSV0M/lr.RKezr3is5sfiI18kAHMOOpmSvsxAz2C', 2, 0, 0, 'active'),
(8, 'HS008', 'Đinh Khánh Huyền', 'huyen.dinh@edutest.vn', '$2a$10$nX5dfS99AQ8pFjSV0M/lr.RKezr3is5sfiI18kAHMOOpmSvsxAz2C', 3, 25, 50, 'active'),
(9, 'HS009', 'Bùi Anh Khoa', 'khoa.bui@edutest.vn', '$2a$10$nX5dfS99AQ8pFjSV0M/lr.RKezr3is5sfiI18kAHMOOpmSvsxAz2C', 3, 0, 0, 'active'),
(10, 'HS010', 'Ngô Bảo Long', 'long.ngo@edutest.vn', '$2a$10$nX5dfS99AQ8pFjSV0M/lr.RKezr3is5sfiI18kAHMOOpmSvsxAz2C', 4, 50, 100, 'active'),
(11, 'HS_STUDENT', 'Student Demo', 'student@gmail.com', '$2a$10$nX5dfS99AQ8pFjSV0M/lr.RKezr3is5sfiI18kAHMOOpmSvsxAz2C', 1, 100, 200, 'active');

-- 5. MÔN HỌC / CHỦ ĐỀ
INSERT INTO `subjects` (`id`, `name`, `code`, `description`, `color`, `order_index`) VALUES
(1, 'Toán học 10', 'TOAN10', 'Đại số & Hình học lớp 10', '#8b7cf6', 1),
(2, 'Vật Lý 10', 'LY10', 'Cơ học & Nhiệt học lớp 10', '#38bdf8', 2),
(3, 'Hóa học 10', 'HOA10', 'Cấu tạo nguyên tử & Bảng tuần hoàn', '#34d399', 3),
(4, 'Sinh học 10', 'SINH10', 'Sinh học tế bào và vi sinh vật', '#10b981', 4),
(5, 'Tiếng Anh 10', 'ANH10', 'Từ vựng & Ngữ pháp tiếng Anh 10', '#f59e0b', 5),
(6, 'Ngữ Văn 10', 'VAN10', 'Văn học dân gian và trung đại', '#f43f5e', 6),
(7, 'Lịch Sử 10', 'SU10', 'Lịch sử văn minh nhân loại', '#ec4899', 7),
(8, 'Địa Lý 10', 'DIA10', 'Địa lý tự nhiên và kinh tế xã hội', '#06b6d4', 8),
(9, 'Tin học 10', 'TIN10', 'Lập trình Python và thuật toán cơ bản', '#6366f1', 9),
(10, 'Toán học 11', 'TOAN11', 'Lượng giác, xác suất & giải tích 11', '#8b7cf6', 10),
(11, 'Vật Lý 11', 'LY11', 'Điện từ học & Quang hình học 11', '#38bdf8', 11),
(12, 'Tiếng Anh 11', 'ANH11', 'Ngữ pháp và bài đọc chuyên sâu 11', '#f59e0b', 12),
(13, 'Toán học 12', 'TOAN12', 'Khảo sát hàm số & Tích phân 12', '#8b7cf6', 13);

-- 6. ĐỀ THI
INSERT INTO `exams` (`id`, `teacher_id`, `subject_id`, `code`, `title`, `description`, `duration_minutes`, `total_questions`, `passing_score`, `is_active`) VALUES
(1, 1, 1, 'DE_TOAN_10_01', 'Kiểm tra 15 phút: Hàm số bậc hai và đồ thị', 'Bài kiểm tra trắc nghiệm 5 câu hỏi nhanh môn Toán lớp 10 chương Hàm số.', 15, 5, 5.00, 1),
(2, 1, 2, 'DE_LY_10_01', 'Ôn tập Vật Lý 10: Chuyển động thẳng biến đổi đều', 'Đề kiểm tra củng cố kiến thức động học chất điểm.', 20, 3, 5.00, 1),
(3, 2, 12, 'DE_ANH_11_01', 'English Grade 11: Unit 1 The Generation Gap', 'Vocabulary and grammar quiz for Grade 11 students.', 25, 4, 6.00, 1);

-- 6. CÂU HỎI CHO ĐỀ 1 (Toán 10)
INSERT INTO `questions` (`id`, `exam_id`, `content`, `image_url`, `question_type`, `points`, `order_index`, `explanation`, `explanation_image_url`) VALUES
(1, 1, 'Đỉnh I của parabol (P): y = -x² + 4x - 3 có tọa độ là:', 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=900&auto=format&fit=crop&q=80', 'single_choice', 2.00, 1, 'Tọa độ đỉnh x = -b/(2a) = -4/(2*(-1)) = 2. Khi x = 2 thì y = -(2)^2 + 4*(2) - 3 = 1. Do đó I(2; 1).', 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800&auto=format&fit=crop&q=80'),
(2, 1, 'Trục đối xứng của parabol y = 2x² + 4x + 1 là đường thẳng:', NULL, 'single_choice', 2.00, 2, 'Trục đối xứng có phương trình x = -b/(2a) = -4/(2*2) = -1.', NULL),
(3, 1, 'Hàm số y = x² - 4x + 3 đồng biến trên khoảng nào sau đây?', NULL, 'single_choice', 2.00, 3, 'Hệ số a = 1 > 0, bề lõm quay lên trên, đỉnh x = 2. Hàm số đồng biến trên khoảng (2; + vô cùng).', NULL),
(4, 1, 'Tập xác định của hàm số y = √(x - 3) là:', NULL, 'single_choice', 2.00, 4, 'Điều kiện xác định: x - 3 >= 0 <=> x >= 3. Vậy D = [3; + vô cùng).', NULL),
(5, 1, 'Giá trị nhỏ nhất của hàm số y = x² - 2x + 5 đạt được khi x bằng:', NULL, 'single_choice', 2.00, 5, 'y = (x - 1)² + 4 >= 4 với mọi x. Giá trị nhỏ nhất là 4 khi x = 1.', NULL);

-- PHƯƠNG ÁN TRẢ LỜI CHO CÂU HỎI ĐỀ 1
-- Câu 1: Đúng là A
INSERT INTO `question_options` (`id`, `question_id`, `option_key`, `content`, `is_correct`) VALUES
(1, 1, 'A', 'I(2; 1)', 1),
(2, 1, 'B', 'I(-2; -15)', 0),
(3, 1, 'C', 'I(2; -1)', 0),
(4, 1, 'D', 'I(-2; 1)', 0);

-- Câu 2: Đúng là C
INSERT INTO `question_options` (`id`, `question_id`, `option_key`, `content`, `is_correct`) VALUES
(5, 2, 'A', 'x = 1', 0),
(6, 2, 'B', 'x = 2', 0),
(7, 2, 'C', 'x = -1', 1),
(8, 2, 'D', 'x = -2', 0);

-- Câu 3: Đúng là B
INSERT INTO `question_options` (`id`, `question_id`, `option_key`, `content`, `is_correct`) VALUES
(9, 3, 'A', '(-∞; 2)', 0),
(10, 3, 'B', '(2; +∞)', 1),
(11, 3, 'C', '(0; +∞)', 0),
(12, 3, 'D', '(-∞; -2)', 0);

-- Câu 4: Đúng là D
INSERT INTO `question_options` (`id`, `question_id`, `option_key`, `content`, `is_correct`) VALUES
(13, 4, 'A', 'R', 0),
(14, 4, 'B', '(3; +∞)', 0),
(15, 4, 'C', '(-∞; 3]', 0),
(16, 4, 'D', '[3; +∞)', 1);

-- Câu 5: Đúng là A
INSERT INTO `question_options` (`id`, `question_id`, `option_key`, `content`, `is_correct`) VALUES
(17, 5, 'A', 'x = 1', 1),
(18, 5, 'B', 'x = -1', 0),
(19, 5, 'C', 'x = 2', 0),
(20, 5, 'D', 'x = 5', 0);

-- CÂU HỎI CHO ĐỀ 2 (Vật Lý 10)
INSERT INTO `questions` (`id`, `exam_id`, `content`, `image_url`, `question_type`, `points`, `order_index`, `explanation`, `explanation_image_url`) VALUES
(6, 2, 'Công thức tính vận tốc trong chuyển động thẳng biến đổi đều là:', 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=80', 'single_choice', 3.33, 1, 'v = v0 + at', NULL),
(7, 2, 'Đơn vị đo gia tốc trong hệ SI là:', NULL, 'single_choice', 3.33, 2, 'Gia tốc đo bằng mét trên giây bình phương: m/s²', NULL),
(8, 2, 'Một vật bắt đầu chuyển động nhanh dần đều với gia tốc 2 m/s². Sau 3s vận tốc của vật là:', NULL, 'single_choice', 3.34, 3, 'v = v0 + at = 0 + 2*3 = 6 m/s', NULL);

INSERT INTO `question_options` (`id`, `question_id`, `option_key`, `content`, `is_correct`) VALUES
(21, 6, 'A', 'v = v0 + at', 1),
(22, 6, 'B', 'v = v0 + at²', 0),
(23, 6, 'C', 'v = at', 0),
(24, 6, 'D', 'v = v0 - at²', 0),
(25, 7, 'A', 'm/s', 0),
(26, 7, 'B', 'm/s²', 1),
(27, 7, 'C', 'km/h', 0),
(28, 7, 'D', 'm.s', 0),
(29, 8, 'A', '4 m/s', 0),
(30, 8, 'B', '5 m/s', 0),
(31, 8, 'C', '6 m/s', 1),
(32, 8, 'D', '8 m/s', 0);

-- 7. GIAO ĐỀ THEO LỚP (ExamClassAssignments)
-- Đề 1 (Toán 10): Giao cho lớp 10A1 và ĐANG MỞ (is_open = 1), giao cho 10A2 nhưng ĐANG TẮT (is_open = 0)
INSERT INTO `exam_class_assignments` (`id`, `exam_id`, `class_id`, `is_assigned`, `is_open`, `start_time`, `end_time`) VALUES
(1, 1, 1, 1, 1, NOW() - INTERVAL 1 HOUR, NOW() + INTERVAL 2 HOUR),
(2, 1, 2, 1, 0, NULL, NULL),
(3, 2, 1, 1, 0, NULL, NULL),
(4, 3, 3, 1, 1, NOW() - INTERVAL 30 MINUTE, NOW() + INTERVAL 1 HOUR);

-- 8. LƯỢT LÀM BÀI MẪU (ExamAttempts) - Để phục vụ test Real-time Monitor cho Giáo viên
-- Tại lớp 10A1, Đề 1:
-- HS001 (Nguyễn Văn An): ĐÃ HOÀN THÀNH (completed) - 8.0 điểm
INSERT INTO `exam_attempts` (`id`, `exam_id`, `student_id`, `class_id`, `status`, `started_at`, `submitted_at`, `total_score`, `correct_answers_count`, `earned_coins`, `earned_points`) VALUES
(1, 1, 1, 1, 'completed', NOW() - INTERVAL 25 MINUTE, NOW() - INTERVAL 10 MINUTE, 8.00, 4, 40, 20),
-- HS002 (Lê Thị Bích): ĐANG LÀM BÀI (in_progress)
(2, 1, 2, 1, 'in_progress', NOW() - INTERVAL 8 MINUTE, NULL, 0.00, 0, 0, 0),
-- HS003 (Trần Hoàng Cường): CHƯA MỞ ĐỀ (not_started)
(3, 1, 3, 1, 'not_started', NULL, NULL, 0.00, 0, 0, 0);
-- Các bạn HS004, HS005 chưa có bản ghi lượt thi, khi giám sát sẽ tự động nhận diện là 'not_started' / 'chưa mở đề'

-- 9. CHI TIẾT CÂU TRẢ LỜI CỦA HS001 (Đã làm đúng 4/5 câu)
INSERT INTO `attempt_details` (`attempt_id`, `question_id`, `selected_option_id`, `is_correct`, `points_earned`) VALUES
(1, 1, 1, 1, 2.00), -- Chọn A (Đúng)
(1, 2, 7, 1, 2.00), -- Chọn C (Đúng)
(1, 3, 10, 1, 2.00), -- Chọn B (Đúng)
(1, 4, 15, 0, 0.00), -- Chọn C (Sai, đáp án đúng là D)
(1, 5, 17, 1, 2.00); -- Chọn A (Đúng)

-- 10. LỊCH SỬ TÍCH ĐIỂM / XU CHO HS001
INSERT INTO `wallet_transactions` (`student_id`, `type`, `amount`, `reason`, `reference_id`, `created_at`) VALUES
(1, 'coins', 40, 'Thưởng hoàn thành đề thi DE_TOAN_10_01 (4 câu đúng)', 1, NOW() - INTERVAL 10 MINUTE),
(1, 'points', 20, 'Điểm tích lũy đề thi DE_TOAN_10_01', 1, NOW() - INTERVAL 10 MINUTE);
