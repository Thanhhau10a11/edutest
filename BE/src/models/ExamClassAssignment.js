const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ExamClassAssignment = sequelize.define('ExamClassAssignment', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  exam_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  class_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  is_assigned: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  is_open: {
    type: DataTypes.BOOLEAN,
    defaultValue: false // 1: Đang mở đề cho học sinh làm, 0: Đang tắt
  },
  start_time: {
    type: DataTypes.DATE,
    allowNull: true
  },
  end_time: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'exam_class_assignments',
  timestamps: true
});

module.exports = ExamClassAssignment;
