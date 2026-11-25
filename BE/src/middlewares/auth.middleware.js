const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const ApiResponse = require('../utils/apiResponse');
const HTTP_STATUS = require('../constants/httpStatus');

const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ApiResponse.error(res, 'Vui lòng cung cấp token xác thực (Bearer token)', HTTP_STATUS.UNAUTHORIZED);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return ApiResponse.error(res, 'Token xác thực không hợp lệ', HTTP_STATUS.UNAUTHORIZED);
    }

    const decoded = jwt.verify(token, jwtConfig.secret);
    req.user = decoded; // { id, role, code, full_name, class_id? }
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return ApiResponse.error(res, 'Token xác thực đã hết hạn, vui lòng đăng nhập lại', HTTP_STATUS.UNAUTHORIZED);
    }
    return ApiResponse.error(res, 'Token xác thực không hợp lệ hoặc đã bị chỉnh sửa', HTTP_STATUS.UNAUTHORIZED);
  }
};

module.exports = authenticate;
