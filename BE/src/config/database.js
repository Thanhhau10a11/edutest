require('dotenv').config();
const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

const dbHost = process.env.DB_HOST || '127.0.0.1';
const dbPort = process.env.DB_PORT || 3306;
const dbName = process.env.DB_NAME || 'edutest_db';
const dbUser = process.env.DB_USER || 'root';
const dbPass = process.env.DB_PASSWORD || '';

const sequelize = new Sequelize(dbName, dbUser, dbPass, {
  host: dbHost,
  port: dbPort,
  dialect: 'mysql',
  logging: process.env.NODE_ENV === 'development' ? (msg) => logger.debug(msg) : false,
  dialectOptions: {
    charset: 'utf8mb4'
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updated_at: 'updated_at'
  }
});

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info(`Successfully connected to MySQL database: ${dbName} on ${dbHost}:${dbPort}`);
  } catch (error) {
    logger.error('Unable to connect to the database:', error.message);
  }
};

module.exports = {
  sequelize,
  testConnection
};
