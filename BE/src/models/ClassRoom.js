const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ClassRoom = sequelize.define('ClassRoom', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  grade_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  teacher_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  academic_year: {
    type: DataTypes.STRING(50),
    defaultValue: '2025-2026'
  }
}, {
  tableName: 'classrooms',
  timestamps: true
});

module.exports = ClassRoom;
