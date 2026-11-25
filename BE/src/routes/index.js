const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const classroomRoutes = require('./classroom.routes');
const examRoutes = require('./exam.routes');
const studentRoutes = require('./student.routes');
const monitorRoutes = require('./monitor.routes');
const uploadRoutes = require('./upload.routes');
const subjectRoutes = require('./subject.routes');
const questionRoutes = require('./question.routes');
const adminRoutes = require('./admin.routes');
const chatRoutes = require('./chat.routes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/classrooms', classroomRoutes);
router.use('/exams', examRoutes);
router.use('/student', studentRoutes);
router.use('/monitor', monitorRoutes);
router.use('/upload', uploadRoutes);
router.use('/subjects', subjectRoutes);
router.use('/questions', questionRoutes);
router.use('/admin', adminRoutes);
router.use('/chat', chatRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'EduTest Backend API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
