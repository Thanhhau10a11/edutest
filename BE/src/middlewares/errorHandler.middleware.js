const ApiResponse = require('../utils/apiResponse');
const HTTP_STATUS = require('../constants/httpStatus');
const logger = require('../utils/logger');

/**
 * Middleware xử lý khi không tìm thấy route (404)
 */
const notFoundHandler = (req, res, next) => {
  return ApiResponse.error(
    res,
    `Không tìm thấy tài nguyên API tại đường dẫn: ${req.method} ${req.originalUrl}`,
    HTTP_STATUS.NOT_FOUND
  );
};

/**
 * Middleware bắt lỗi toàn cục (Global Error Handler)
 */
const globalErrorHandler = (err, req, res, next) => {
  logger.error(`[Error] ${err.message}`, err.stack);

  // Xử lý lỗi từ Sequelize
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const errorMessages = err.errors.map((e) => ({
      field: e.path,
      message: e.message
    }));
    return ApiResponse.error(
      res,
      'Lỗi ràng buộc dữ liệu cơ sở dữ liệu',
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
      errorMessages
    );
  }

  // Xử lý lỗi JSON body không đúng định dạng
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return ApiResponse.error(
      res,
      'Định dạng JSON gửi lên không hợp lệ',
      HTTP_STATUS.BAD_REQUEST
    );
  }

  const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const message = err.message || 'Đã xảy ra lỗi máy chủ nội bộ';

  return ApiResponse.error(
    res,
    message,
    statusCode,
    process.env.NODE_ENV === 'development' ? err.stack : null
  );
};

module.exports = {
  notFoundHandler,
  globalErrorHandler
};
