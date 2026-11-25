const ApiResponse = require('../utils/apiResponse');
const HTTP_STATUS = require('../constants/httpStatus');

/**
 * Phân quyền dựa trên role của người dùng (teacher, student, etc.)
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return ApiResponse.error(res, 'Người dùng chưa được phân quyền', HTTP_STATUS.FORBIDDEN);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return ApiResponse.error(
        res,
        `Bạn không có quyền thực hiện hành động này. Yêu cầu quyền: [${allowedRoles.join(', ')}]`,
        HTTP_STATUS.FORBIDDEN
      );
    }

    next();
  };
};

module.exports = authorize;
