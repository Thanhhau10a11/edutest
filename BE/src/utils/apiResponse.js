const HTTP_STATUS = require('../constants/httpStatus');

/**
 * Standard API Response utilities
 */
class ApiResponse {
  /**
   * Success response
   * @param {Object} res - Express response object
   * @param {*} data - Payload data
   * @param {string} message - Human-readable success message
   * @param {number} statusCode - HTTP status code
   */
  static success(res, data = null, message = 'Success', statusCode = HTTP_STATUS.OK) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      errors: null,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Created response (201)
   */
  static created(res, data = null, message = 'Resource created successfully') {
    return this.success(res, data, message, HTTP_STATUS.CREATED);
  }

  /**
   * Paginated response
   */
  static paginated(res, items = [], pagination = {}, message = 'Data fetched successfully') {
    const { page = 1, limit = 10, total = 0 } = pagination;
    const totalPages = Math.ceil(total / limit) || 1;

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message,
      data: items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(total),
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      errors: null,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Error response
   */
  static error(res, message = 'An error occurred', statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, errors = null) {
    return res.status(statusCode).json({
      success: false,
      message,
      data: null,
      errors,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = ApiResponse;
