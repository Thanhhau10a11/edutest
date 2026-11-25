const { Subject, Exam, Question } = require('../models');

class SubjectService {
  /**
   * Lấy danh sách tất cả môn học / chủ đề
   */
  static async getAllSubjects() {
    return await Subject.findAll({
      order: [
        ['order_index', 'ASC'],
        ['name', 'ASC']
      ]
    });
  }

  /**
   * Lấy chi tiết môn học theo ID
   */
  static async getSubjectById(id) {
    const subject = await Subject.findByPk(id, {
      include: [
        {
          model: Exam,
          as: 'exams',
          attributes: ['id', 'title', 'code', 'total_questions']
        }
      ]
    });

    if (!subject) {
      const error = new Error('Không tìm thấy môn học / chủ đề');
      error.statusCode = 404;
      throw error;
    }

    return subject;
  }

  /**
   * Tạo môn học / chủ đề mới
   */
  static async createSubject({ name, code, description = '', color = '#8b7cf6', icon = 'book' }) {
    if (!name || !name.trim()) {
      const error = new Error('Tên môn học / chủ đề không được để trống');
      error.statusCode = 400;
      throw error;
    }

    // Auto-generate code if not provided
    let finalCode = code ? code.trim().toUpperCase() : null;
    if (!finalCode) {
      const slug = name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase();
      finalCode = `${slug.substring(0, 8)}_${Date.now().toString().slice(-4)}`;
    }

    // Check duplicate code
    const existing = await Subject.findOne({ where: { code: finalCode } });
    if (existing) {
      finalCode = `${finalCode}_${Math.floor(Math.random() * 900 + 100)}`;
    }

    const maxOrder = await Subject.max('order_index') || 0;

    const newSubject = await Subject.create({
      name: name.trim(),
      code: finalCode,
      description: description ? description.trim() : null,
      color: color || '#8b7cf6',
      icon: icon || 'book',
      order_index: maxOrder + 1
    });

    return newSubject;
  }

  /**
   * Cập nhật môn học
   */
  static async updateSubject(id, { name, description, color, icon }) {
    const subject = await Subject.findByPk(id);
    if (!subject) {
      const error = new Error('Không tìm thấy môn học để cập nhật');
      error.statusCode = 404;
      throw error;
    }

    if (name) subject.name = name.trim();
    if (description !== undefined) subject.description = description;
    if (color) subject.color = color;
    if (icon) subject.icon = icon;

    await subject.save();
    return subject;
  }

  /**
   * Xóa môn học
   */
  static async deleteSubject(id) {
    const subject = await Subject.findByPk(id);
    if (!subject) {
      const error = new Error('Không tìm thấy môn học để xóa');
      error.statusCode = 404;
      throw error;
    }

    await subject.destroy();
    return { message: 'Đã xóa môn học / chủ đề thành công' };
  }
}

module.exports = SubjectService;
