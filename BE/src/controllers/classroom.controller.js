const ClassroomService = require('../services/classroom.service');
const { Teacher } = require('../models');
const ApiResponse = require('../utils/apiResponse');

class ClassroomController {
  /**
   * Lấy cây thư mục phân loại lớp và danh sách học sinh
   * GET /api/v1/classrooms/tree
   */
  static async getClassTree(req, res, next) {
    try {
      const tree = await ClassroomService.getClassroomTree();
      return ApiResponse.success(res, tree, 'Lấy danh sách cây phân loại lớp học thành công');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lấy danh sách phẳng tất cả các lớp học
   * GET /api/v1/classrooms
   */
  static async getAllClassrooms(req, res, next) {
    try {
      const classrooms = await ClassroomService.getAllClassrooms();
      return ApiResponse.success(res, classrooms, 'Lấy danh sách lớp học thành công');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lấy danh sách các khối lớp
   * GET /api/v1/classrooms/grades
   */
  static async getGrades(req, res, next) {
    try {
      const grades = await ClassroomService.getGrades();
      return ApiResponse.success(res, grades, 'Lấy danh sách khối lớp thành công');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lấy danh sách giáo viên để chọn GVCN
   * GET /api/v1/classrooms/teachers-list
   */
  static async getTeachers(req, res, next) {
    try {
      const teachers = await Teacher.findAll({
        attributes: ['id', 'teacher_code', 'full_name', 'email'],
        where: { status: 'active' },
        order: [['full_name', 'ASC']]
      });
      return ApiResponse.success(res, teachers, 'Lấy danh sách giáo viên thành công');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lấy thông tin chi tiết một lớp học
   * GET /api/v1/classrooms/:id
   */
  static async getClassroomDetail(req, res, next) {
    try {
      const { id } = req.params;
      const classroom = await ClassroomService.getClassroomDetail(id);
      return ApiResponse.success(res, classroom, 'Lấy chi tiết lớp học thành công');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Tạo một lớp học mới
   * POST /api/v1/classrooms
   */
  static async createClassroom(req, res, next) {
    try {
      const newClass = await ClassroomService.createClassroom(req.body);
      return ApiResponse.success(res, newClass, 'Tạo lớp học mới thành công', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cập nhật thông tin lớp học
   * PUT /api/v1/classrooms/:id
   */
  static async updateClassroom(req, res, next) {
    try {
      const { id } = req.params;
      const updated = await ClassroomService.updateClassroom(id, req.body);
      return ApiResponse.success(res, updated, 'Cập nhật thông tin lớp học thành công');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Xóa một lớp học
   * DELETE /api/v1/classrooms/:id
   */
  static async deleteClassroom(req, res, next) {
    try {
      const { id } = req.params;
      const result = await ClassroomService.deleteClassroom(id);
      return ApiResponse.success(res, result, 'Xóa lớp học thành công');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ClassroomController;
