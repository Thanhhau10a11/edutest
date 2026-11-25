const AuthService = require('../services/auth.service');
const ApiResponse = require('../utils/apiResponse');

class AuthController {
  /**
   * Đăng nhập Giáo viên bằng Mã số và Họ tên
   * POST /api/v1/auth/teacher/login
   */
  static async loginTeacher(req, res, next) {
    try {
      const { teacher_code, full_name, email, password } = req.body;
      const result = await AuthService.loginTeacher({ teacher_code, full_name, email, password });
      return ApiResponse.success(res, result, 'Đăng nhập giáo viên thành công');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Đăng nhập Học sinh bằng Mã số hoặc Email
   * POST /api/v1/auth/student/login
   */
  static async loginStudent(req, res, next) {
    try {
      const { student_code, full_name, email, password } = req.body;
      const result = await AuthService.loginStudent({ student_code, full_name, email, password });
      return ApiResponse.success(res, result, 'Đăng nhập học sinh và đồng bộ lớp học thành công');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lấy thông tin tài khoản hiện tại từ Token
   * GET /api/v1/auth/me
   */
  static async getMe(req, res, next) {
    try {
      return ApiResponse.success(res, req.user, 'Lấy thông tin tài khoản thành công');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Đăng nhập Quản trị viên
   * POST /api/v1/auth/admin/login
   */
  static async loginAdmin(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.loginAdmin({ email, password });
      return ApiResponse.success(res, result, 'Đăng nhập quản trị viên thành công');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
