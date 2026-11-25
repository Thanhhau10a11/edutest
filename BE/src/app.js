require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const path = require('path');
const routes = require('./routes');
const { notFoundHandler, globalErrorHandler } = require('./middlewares/errorHandler.middleware');

const app = express();

// Security HTTP headers (allow cross-origin images for frontend)
app.use(helmet({ crossOriginResourcePolicy: false }));

// CORS config
const allowedOrigins = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : '*';
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-device-id', 'x-device-name', 'x-exam-pin']
  })
);

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Request body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Root welcome route
app.get('/', (req, res) => {
  res.json({
    message: 'Chào mừng đến với EduTest API Server - Hệ thống Đề thi & Giám sát trực tuyến',
    version: '1.0.0',
    documentation: '/api/v1/health',
    endpoints: {
      auth: '/api/v1/auth',
      classrooms: '/api/v1/classrooms',
      exams: '/api/v1/exams',
      student: '/api/v1/student',
      monitor: '/api/v1/monitor'
    }
  });
});

// API Routes
app.use('/api/v1', routes);

// 404 Not Found Handler
app.use(notFoundHandler);

// Global Exception Handler
app.use(globalErrorHandler);

module.exports = app;
