const { Server } = require('socket.io');
const logger = require('../utils/logger');

let io = null;

// Lưu tối đa 30 thông báo gần nhất theo lớp/đề thi trong bộ nhớ để đồng bộ tức thì
const broadcastHistory = [];

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    logger.info(`[Socket.io] New client connected: ${socket.id}`);

    // Giáo viên hoặc học sinh tham gia phòng theo dõi đề thi theo lớp
    socket.on('join_monitor_room', ({ examId, classId, studentId, role, name }) => {
      if (examId && classId) {
        const roomName = `exam_${examId}_class_${classId}`;
        socket.join(roomName);
        logger.info(`[Socket.io] Client ${socket.id} (${role || 'user'}: ${name || 'anonymous'}) joined room: ${roomName}`);

        socket.emit('joined_room_ack', {
          room: roomName,
          message: `Successfully joined room ${roomName}`
        });
      }

      if (classId) {
        socket.join(`class_${classId}`);
      }

      if (studentId) {
        socket.join(`student_${studentId}`);
      }
    });

    // Học sinh tham gia kênh nhận thông báo trực tiếp theo lớp & cá nhân
    socket.on('join_student_channel', ({ classId, studentId, examId, name }) => {
      if (classId) {
        socket.join(`class_${classId}`);
      }
      if (studentId) {
        socket.join(`student_${studentId}`);
      }
      if (examId && classId) {
        socket.join(`exam_${examId}_class_${classId}`);
      }
      logger.info(`[Socket.io] Student ${name || studentId || socket.id} joined broadcast channels (class_${classId}, student_${studentId})`);
    });

    // Giáo viên phát thông báo / cảnh báo trực tiếp qua Socket
    socket.on('teacher_broadcast', (payload = {}) => {
      emitTeacherBroadcast(payload);
    });

    // Học sinh rời màn hình / chuyển tab khi đang làm bài -> cảnh báo tức thì cho Giáo viên
    socket.on('student_cheat_warning', (payload = {}) => {
      const { examId, classId, student_id, student_code, full_name, reason, warningCount } = payload;
      const alertData = {
        id: `cheat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        examId: Number(examId) || 1,
        classId: Number(classId) || 1,
        student_id,
        student_code,
        full_name: full_name || 'Học sinh',
        reason: reason || 'Chuyển tab hoặc rời khỏi màn hình làm bài',
        warningCount: Number(warningCount) || 1,
        timestamp: new Date().toISOString()
      };

      logger.info(`[Socket.io] Cheat warning from ${alertData.full_name}:`, alertData.reason);
      if (examId && classId) {
        io.to(`exam_${examId}_class_${classId}`).emit('student_cheat_warning', alertData);
      }
      if (classId) {
        io.to(`class_${classId}`).emit('student_cheat_warning', alertData);
      }
      io.emit('student_cheat_warning', alertData);
    });

    // Rời phòng
    socket.on('leave_monitor_room', ({ examId, classId }) => {
      if (examId && classId) {
        const roomName = `exam_${examId}_class_${classId}`;
        socket.leave(roomName);
        logger.info(`[Socket.io] Client ${socket.id} left room: ${roomName}`);
      }
    });

    socket.on('disconnect', () => {
      logger.info(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    logger.warn('[Socket.io] Attempted to get IO instance before initialization');
  }
  return io;
};

/**
 * Phát tín hiệu cập nhật trạng thái làm bài của học sinh tới phòng giám sát của giáo viên
 */
const emitStudentStatusUpdate = (examId, classId, payload) => {
  if (!io) return;
  const roomName = `exam_${examId}_class_${classId}`;
  logger.info(`[Socket.io] Emitting 'student_status_update' to ${roomName}:`, payload);
  io.to(roomName).emit('student_status_update', {
    examId,
    classId,
    ...payload,
    timestamp: new Date().toISOString()
  });
};

/**
 * Phát tín hiệu giáo viên đã Bật/Tắt đề thi cho lớp
 */
const emitExamAssignmentStatus = (examId, classId, isOpen) => {
  if (!io) return;
  const roomName = `exam_${examId}_class_${classId}`;
  logger.info(`[Socket.io] Emitting 'exam_assignment_toggled' to ${roomName}: isOpen = ${isOpen}`);
  io.to(roomName).emit('exam_assignment_toggled', {
    examId,
    classId,
    isOpen,
    timestamp: new Date().toISOString()
  });
  // Cũng phát ra thông báo chung cho lớp đó
  io.to(`class_${classId}`).emit('exam_assignment_toggled', {
    examId,
    classId,
    isOpen,
    timestamp: new Date().toISOString()
  });
};

/**
 * Phát thông báo / cảnh báo tức thì từ Giáo viên tới toàn lớp hoặc 1 học sinh cụ thể
 */
const emitTeacherBroadcast = ({
  examId,
  classId,
  studentId = null,
  studentName = null,
  title,
  message,
  level = 'info', // 'info' | 'warning' | 'urgent'
  senderName = 'Giáo viên giám sát'
}) => {
  const broadcastItem = {
    id: `bc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    examId: examId ? Number(examId) : null,
    classId: classId ? Number(classId) : null,
    studentId: studentId ? Number(studentId) : null,
    studentName: studentName || null,
    title:
      title ||
      (level === 'urgent'
        ? 'Cảnh báo khẩn từ Giáo viên'
        : level === 'warning'
        ? 'Nhắc nhở phòng thi'
        : 'Thông báo từ Giáo viên'),
    message: String(message || '').trim(),
    level,
    senderName,
    timestamp: new Date().toISOString()
  };

  broadcastHistory.unshift(broadcastItem);
  if (broadcastHistory.length > 50) {
    broadcastHistory.pop();
  }

  if (!io) return broadcastItem;

  logger.info(`[Socket.io] Broadcasting message (${level}) from ${senderName}:`, broadcastItem.message);

  if (broadcastItem.studentId) {
    // Gửi tới riêng học sinh được chỉ định VÀ phòng giám sát của giáo viên
    io.to(`student_${broadcastItem.studentId}`).emit('teacher_broadcast', broadcastItem);
    if (broadcastItem.examId && broadcastItem.classId) {
      io.to(`exam_${broadcastItem.examId}_class_${broadcastItem.classId}`).emit('teacher_broadcast', broadcastItem);
    }
    // Emit chung kèm trường studentId để client học sinh tự lọc nếu chưa kịp join room riêng
    io.emit('teacher_broadcast', broadcastItem);
  } else {
    // Phát toàn phòng thi / toàn lớp
    io.emit('teacher_broadcast', broadcastItem);
  }

  return broadcastItem;
};

const getBroadcastHistory = ({ examId, classId, studentId } = {}) => {
  return broadcastHistory.filter((item) => {
    if (classId && item.classId && Number(item.classId) !== Number(classId)) return false;
    if (examId && item.examId && Number(item.examId) !== Number(examId)) return false;
    if (item.studentId && studentId && Number(item.studentId) !== Number(studentId)) return false;
    return true;
  });
};

module.exports = {
  initSocket,
  getIO,
  emitStudentStatusUpdate,
  emitExamAssignmentStatus,
  emitTeacherBroadcast,
  getBroadcastHistory
};
