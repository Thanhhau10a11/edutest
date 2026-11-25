require('dotenv').config();
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {}
const http = require('http');
const app = require('./app');
const { testConnection } = require('./config/database');
const { initSocket } = require('./config/socket');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

// Tạo HTTP Server bọc ngoài Express app
const server = http.createServer(app);

// Khởi tạo Socket.IO cho Real-time monitoring
initSocket(server);

// Khởi động server
const startServer = async () => {
  try {
    // Kiểm tra kết nối Database MySQL
    await testConnection();

    server.listen(PORT, () => {
      logger.info(`=======================================================`);
      logger.info(`🚀 EduTest API Server is running on port: ${PORT}`);
      logger.info(`📡 Socket.IO real-time service is active`);
      logger.info(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 API Endpoint: http://localhost:${PORT}/api/v1`);
      logger.info(`=======================================================`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Xử lý đóng server an toàn (Graceful Shutdown)
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

startServer();
