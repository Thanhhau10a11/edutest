const { validationResult } = require('express-validator');
const ApiResponse = require('../utils/apiResponse');
const HTTP_STATUS = require('../constants/httpStatus');

/**
 * Middleware kiểm tra kết quả validation từ express-validator
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value
    }));

    return ApiResponse.error(
      res,
      'Dữ liệu yêu cầu không hợp lệ',
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
      formattedErrors
    );
  }
  next();
};

module.exports = validate;
