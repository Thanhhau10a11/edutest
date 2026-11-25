const AdminService = require('../services/admin.service');
const ApiResponse = require('../utils/apiResponse');

class AdminController {
  /**
   * Tạo tài khoản Giáo viên
   * POST /api/v1/admin/teachers
   */
  static async createTeacher(req, res, next) {
    try {
      const result = await AdminService.createTeacher(req.body);
      return ApiResponse.success(res, result, 'Tạo tài khoản giáo viên thành công', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Tạo tài khoản Học sinh
   * POST /api/v1/admin/students
   */
  static async createStudent(req, res, next) {
    try {
      const result = await AdminService.createStudent(req.body);
      return ApiResponse.success(res, result, 'Tạo tài khoản học sinh thành công', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lấy danh sách Giáo viên
   * GET /api/v1/admin/teachers
   */
  static async getTeachers(req, res, next) {
    try {
      const { search, page, limit } = req.query;
      const result = await AdminService.getTeachers({ search, page, limit });
      return ApiResponse.success(res, result, 'Lấy danh sách giáo viên thành công');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lấy danh sách Học sinh
   * GET /api/v1/admin/students
   */
  static async getStudents(req, res, next) {
    try {
      const { search, class_id, page, limit } = req.query;
      const result = await AdminService.getStudents({ search, class_id, page, limit });
      return ApiResponse.success(res, result, 'Lấy danh sách học sinh thành công');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Xếp học sinh vào lớp
   * PATCH /api/v1/admin/students/:id/assign-class
   */
  static async assignStudentToClass(req, res, next) {
    try {
      const { id } = req.params;
      const { class_id } = req.body;
      const result = await AdminService.assignStudentToClass(Number(id), Number(class_id));
      return ApiResponse.success(res, result, 'Xếp học sinh vào lớp thành công');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Xếp nhiều học sinh vào lớp
   * POST /api/v1/admin/students/assign-class
   */
  static async assignMultipleStudentsToClass(req, res, next) {
    try {
      const { student_ids, class_id } = req.body;
      const result = await AdminService.assignMultipleStudentsToClass(student_ids, Number(class_id));
      return ApiResponse.success(res, result, 'Xếp học sinh vào lớp thành công');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Xóa giáo viên
   * DELETE /api/v1/admin/teachers/:id
   */
  static async deleteTeacher(req, res, next) {
    try {
      const result = await AdminService.deleteTeacher(Number(req.params.id));
      return ApiResponse.success(res, result, 'Xóa giáo viên thành công');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Xóa học sinh
   * DELETE /api/v1/admin/students/:id
   */
  static async deleteStudent(req, res, next) {
    try {
      const result = await AdminService.deleteStudent(Number(req.params.id));
      return ApiResponse.success(res, result, 'Xóa học sinh thành công');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cập nhật thông tin Giáo viên
   * PATCH /api/v1/admin/teachers/:id
   */
  static async updateTeacher(req, res, next) {
    try {
      const { id } = req.params;
      const result = await AdminService.updateTeacher(Number(id), req.body);
      return ApiResponse.success(res, result, 'Cập nhật thông tin giáo viên thành công');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Khóa / Mở khóa tài khoản Giáo viên
   * PATCH /api/v1/admin/teachers/:id/toggle-status
   */
  static async toggleTeacherStatus(req, res, next) {
    try {
      const { id } = req.params;
      const result = await AdminService.toggleTeacherStatus(Number(id));
      return ApiResponse.success(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Đặt lại mật khẩu Giáo viên
   * PATCH /api/v1/admin/teachers/:id/reset-password
   */
  static async resetTeacherPassword(req, res, next) {
    try {
      const { id } = req.params;
      const { password } = req.body;
      const result = await AdminService.resetTeacherPassword(Number(id), password);
      return ApiResponse.success(res, result, 'Đổi mật khẩu giáo viên thành công');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cập nhật thông tin Học sinh
   * PATCH /api/v1/admin/students/:id
   */
  static async updateStudent(req, res, next) {
    try {
      const { id } = req.params;
      const result = await AdminService.updateStudent(Number(id), req.body);
      return ApiResponse.success(res, result, 'Cập nhật thông tin học sinh thành công');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Khóa / Mở khóa tài khoản Học sinh
   * PATCH /api/v1/admin/students/:id/toggle-status
   */
  static async toggleStudentStatus(req, res, next) {
    try {
      const { id } = req.params;
      const result = await AdminService.toggleStudentStatus(Number(id));
      return ApiResponse.success(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Đặt lại mật khẩu Học sinh
   * PATCH /api/v1/admin/students/:id/reset-password
   */
  static async resetStudentPassword(req, res, next) {
    try {
      const { id } = req.params;
      const { password } = req.body;
      const result = await AdminService.resetStudentPassword(Number(id), password);
      return ApiResponse.success(res, result, 'Đổi mật khẩu học sinh thành công');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AdminController;
