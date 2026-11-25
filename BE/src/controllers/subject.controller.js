const SubjectService = require('../services/subject.service');

class SubjectController {
  static async getAll(req, res, next) {
    try {
      const subjects = await SubjectService.getAllSubjects();
      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách môn học thành công',
        data: subjects
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const subject = await SubjectService.getSubjectById(req.params.id);
      return res.status(200).json({
        success: true,
        message: 'Lấy chi tiết môn học thành công',
        data: subject
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const newSubject = await SubjectService.createSubject(req.body);
      return res.status(201).json({
        success: true,
        message: 'Tạo môn học / chủ đề mới thành công',
        data: newSubject
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const updated = await SubjectService.updateSubject(req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Cập nhật môn học thành công',
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req, res, next) {
    try {
      const result = await SubjectService.deleteSubject(req.params.id);
      return res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SubjectController;
