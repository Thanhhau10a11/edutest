const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Question = sequelize.define('Question', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  exam_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null
  },
  subject_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  image_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  question_type: {
    type: DataTypes.ENUM('single_choice', 'multiple_choice'),
    defaultValue: 'single_choice'
  },
  points: {
    type: DataTypes.DECIMAL(4, 2),
    defaultValue: 1.00
  },
  order_index: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  explanation: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  explanation_image_url: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'questions',
  timestamps: true
});

module.exports = Question;
