const { sequelize } = require('../config/database');
const Teacher = require('./Teacher');
const Grade = require('./Grade');
const ClassRoom = require('./ClassRoom');
const Student = require('./Student');
const Exam = require('./Exam');
const Question = require('./Question');
const QuestionOption = require('./QuestionOption');
const ExamClassAssignment = require('./ExamClassAssignment');
const ExamAttempt = require('./ExamAttempt');
const AttemptDetail = require('./AttemptDetail');
const WalletTransaction = require('./WalletTransaction');
const Subject = require('./Subject');

// 0. Subject <-> Exam & Question
Subject.hasMany(Exam, { foreignKey: 'subject_id', as: 'exams', onDelete: 'SET NULL' });
Exam.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });

Subject.hasMany(Question, { foreignKey: 'subject_id', as: 'questions', onDelete: 'SET NULL' });
Question.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });

// 1. Grade <-> ClassRoom
Grade.hasMany(ClassRoom, { foreignKey: 'grade_id', as: 'classrooms', onDelete: 'CASCADE' });
ClassRoom.belongsTo(Grade, { foreignKey: 'grade_id', as: 'grade' });

// 2. Teacher <-> ClassRoom (Chủ nhiệm / Quản lý)
Teacher.hasMany(ClassRoom, { foreignKey: 'teacher_id', as: 'homeroom_classes', onDelete: 'SET NULL' });
ClassRoom.belongsTo(Teacher, { foreignKey: 'teacher_id', as: 'teacher' });

// 3. ClassRoom <-> Student
ClassRoom.hasMany(Student, { foreignKey: 'class_id', as: 'students', onDelete: 'CASCADE' });
Student.belongsTo(ClassRoom, { foreignKey: 'class_id', as: 'classroom' });

// 4. Teacher <-> Exam
Teacher.hasMany(Exam, { foreignKey: 'teacher_id', as: 'exams', onDelete: 'CASCADE' });
Exam.belongsTo(Teacher, { foreignKey: 'teacher_id', as: 'teacher' });

// 5. Exam <-> Question <-> QuestionOption
Exam.hasMany(Question, { foreignKey: 'exam_id', as: 'questions', onDelete: 'CASCADE' });
Question.belongsTo(Exam, { foreignKey: 'exam_id', as: 'exam' });

Question.hasMany(QuestionOption, { foreignKey: 'question_id', as: 'options', onDelete: 'CASCADE' });
QuestionOption.belongsTo(Question, { foreignKey: 'question_id', as: 'question' });

// 6. Exam <-> ClassRoom (Giao đề theo lớp)
Exam.belongsToMany(ClassRoom, {
  through: ExamClassAssignment,
  foreignKey: 'exam_id',
  otherKey: 'class_id',
  as: 'assigned_classes'
});
ClassRoom.belongsToMany(Exam, {
  through: ExamClassAssignment,
  foreignKey: 'class_id',
  otherKey: 'exam_id',
  as: 'assigned_exams'
});

Exam.hasMany(ExamClassAssignment, { foreignKey: 'exam_id', as: 'assignments', onDelete: 'CASCADE' });
ExamClassAssignment.belongsTo(Exam, { foreignKey: 'exam_id', as: 'exam' });

ClassRoom.hasMany(ExamClassAssignment, { foreignKey: 'class_id', as: 'assignments', onDelete: 'CASCADE' });
ExamClassAssignment.belongsTo(ClassRoom, { foreignKey: 'class_id', as: 'classroom' });

// 7. ExamAttempt (Lượt làm bài)
Student.hasMany(ExamAttempt, { foreignKey: 'student_id', as: 'attempts', onDelete: 'CASCADE' });
ExamAttempt.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });

Exam.hasMany(ExamAttempt, { foreignKey: 'exam_id', as: 'attempts', onDelete: 'CASCADE' });
ExamAttempt.belongsTo(Exam, { foreignKey: 'exam_id', as: 'exam' });

ClassRoom.hasMany(ExamAttempt, { foreignKey: 'class_id', as: 'attempts', onDelete: 'CASCADE' });
ExamAttempt.belongsTo(ClassRoom, { foreignKey: 'class_id', as: 'classroom' });

// 8. AttemptDetail (Chi tiết câu làm)
ExamAttempt.hasMany(AttemptDetail, { foreignKey: 'attempt_id', as: 'details', onDelete: 'CASCADE' });
AttemptDetail.belongsTo(ExamAttempt, { foreignKey: 'attempt_id', as: 'attempt' });

Question.hasMany(AttemptDetail, { foreignKey: 'question_id', as: 'attempt_details', onDelete: 'CASCADE' });
AttemptDetail.belongsTo(Question, { foreignKey: 'question_id', as: 'question' });

QuestionOption.hasMany(AttemptDetail, { foreignKey: 'selected_option_id', as: 'chosen_in_details', onDelete: 'SET NULL' });
AttemptDetail.belongsTo(QuestionOption, { foreignKey: 'selected_option_id', as: 'selected_option' });

// 9. WalletTransaction (Ví điểm / xu)
Student.hasMany(WalletTransaction, { foreignKey: 'student_id', as: 'wallet_transactions', onDelete: 'CASCADE' });
WalletTransaction.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });

module.exports = {
  sequelize,
  Teacher,
  Grade,
  ClassRoom,
  Student,
  Exam,
  Question,
  QuestionOption,
  ExamClassAssignment,
  ExamAttempt,
  AttemptDetail,
  WalletTransaction,
  Subject
};
