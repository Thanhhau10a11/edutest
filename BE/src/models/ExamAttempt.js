const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ExamAttempt = sequelize.define('ExamAttempt', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  exam_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  class_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('not_started', 'in_progress', 'completed'),
    defaultValue: 'not_started'
  },
  started_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  submitted_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  total_score: {
    type: DataTypes.DECIMAL(4, 2),
    defaultValue: 0.00
  },
  correct_answers_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  earned_coins: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  earned_points: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'exam_attempts',
  timestamps: true
});

module.exports = ExamAttempt;
