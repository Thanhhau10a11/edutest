const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AttemptDetail = sequelize.define('AttemptDetail', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  attempt_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  question_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  selected_option_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  is_correct: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  points_earned: {
    type: DataTypes.DECIMAL(4, 2),
    defaultValue: 0.00
  }
}, {
  tableName: 'attempt_details',
  timestamps: true
});

module.exports = AttemptDetail;
