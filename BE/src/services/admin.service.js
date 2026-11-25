const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { Teacher, Student, ClassRoom, Grade } = require('../models');

class AdminService {
  /**
   * Tạo tài khoản Giáo viên
   */
  static async createTeacher({ teacher_code, full_name, email, password, phone }) {
    // Kiểm tra trùng mã giáo viên
    const existing = await Teacher.findOne({
      where: {
        [Op.or]: [
          { teacher_code },
          ...(email ? [{ email }] : [])
        ]
      }
    });

    if (existing) {
      const error = new Error('Mã giáo viên hoặc email đã tồn tại trong hệ thống');
      error.statusCode = 409;
      throw error;
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    const teacher = await Teacher.create({
      teacher_code,
      full_name,
      email: email || null,
      password: hashedPassword,
      phone: phone || null,
      status: 'active'
    });

    return {
      id: teacher.id,
      teacher_code: teacher.teacher_code,
      full_name: teacher.full_name,
      email: teacher.email,
      phone: teacher.phone,
      status: teacher.status
    };
  }

  /**
   * Tạo tài khoản Học sinh
   */
  static async createStudent({ student_code, full_name, email, password, class_id }) {
    const existing = await Student.findOne({
      where: {
        [Op.or]: [
          { student_code },
          ...(email ? [{ email }] : [])
        ]
      }
    });

    if (existing) {
      const error = new Error('Mã học sinh hoặc email đã tồn tại trong hệ thống');
      error.statusCode = 409;
      throw error;
    }

    // Kiểm tra class_id tồn tại
    if (class_id) {
      const classroom = await ClassRoom.findByPk(class_id);
      if (!classroom) {
        const error = new Error('Lớp học không tồn tại');
        error.statusCode = 404;
        throw error;
      }
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    const student = await Student.create({
      student_code,
      full_name,
      email: email || null,
      password: hashedPassword,
      class_id: class_id || 1,
      status: 'active'
    });

    return {
      id: student.id,
      student_code: student.student_code,
      full_name: student.full_name,
      email: student.email,
      class_id: student.class_id,
      status: student.status
    };
  }

  /**
   * Lấy danh sách tất cả Giáo viên
   */
  static async getTeachers({ search = '', page = 1, limit = 50 }) {
    const offset = (Number(page) - 1) * Number(limit);
    const where = {};
    if (search) {
      where[Op.or] = [
        { full_name: { [Op.like]: `%${search}%` } },
        { teacher_code: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    const { rows, count } = await Teacher.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      limit: Number(limit),
      offset,
      order: [['created_at', 'DESC']]
    });

    return { teachers: rows, total: count, page: Number(page), limit: Number(limit) };
  }

  /**
   * Lấy danh sách tất cả Học sinh
   */
  static async getStudents({ search = '', class_id, page = 1, limit = 50 }) {
    const offset = (Number(page) - 1) * Number(limit);
    const where = {};
    if (search) {
      where[Op.or] = [
        { full_name: { [Op.like]: `%${search}%` } },
        { student_code: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }
    if (class_id) {
      where.class_id = class_id;
    }

    const { rows, count } = await Student.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      include: [
        {
          model: ClassRoom,
          as: 'classroom',
          attributes: ['id', 'name', 'code'],
          include: [{ model: Grade, as: 'grade', attributes: ['id', 'name'] }]
        }
      ],
      limit: Number(limit),
      offset,
      order: [['created_at', 'DESC']]
    });

    return { students: rows, total: count, page: Number(page), limit: Number(limit) };
  }

  /**
   * Xếp học sinh vào lớp
   */
  static async assignStudentToClass(studentId, classId) {
    const student = await Student.findByPk(studentId);
    if (!student) {
      const error = new Error('Không tìm thấy học sinh');
      error.statusCode = 404;
      throw error;
    }

    const classroom = await ClassRoom.findByPk(classId);
    if (!classroom) {
      const error = new Error('Không tìm thấy lớp học');
      error.statusCode = 404;
      throw error;
    }

    student.class_id = classId;
    await student.save();

    return {
      student_id: student.id,
      full_name: student.full_name,
      class_id: classId,
      class_name: classroom.name
    };
  }

  /**
   * Xếp nhiều học sinh vào một lớp
   */
  static async assignMultipleStudentsToClass(studentIds, classId) {
    const classroom = await ClassRoom.findByPk(classId);
    if (!classroom) {
      const error = new Error('Không tìm thấy lớp học');
      error.statusCode = 404;
      throw error;
    }

    await Student.update(
      { class_id: classId },
      { where: { id: { [Op.in]: studentIds } } }
    );

    return {
      updated_count: studentIds.length,
      class_id: classId,
      class_name: classroom.name
    };
  }

  /**
   * Xóa giáo viên
   */
  static async deleteTeacher(teacherId) {
    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) {
      const error = new Error('Không tìm thấy giáo viên');
      error.statusCode = 404;
      throw error;
    }
    await teacher.destroy();
    return { message: 'Đã xóa giáo viên thành công' };
  }

  /**
   * Xóa học sinh
   */
  static async deleteStudent(studentId) {
    const student = await Student.findByPk(studentId);
    if (!student) {
      const error = new Error('Không tìm thấy học sinh');
      error.statusCode = 404;
      throw error;
    }
    await student.destroy();
    return { message: 'Đã xóa học sinh thành công' };
  }

  /**
   * Cập nhật thông tin Giáo viên
   */
  static async updateTeacher(teacherId, { teacher_code, full_name, email, phone, status, password }) {
    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) {
      const error = new Error('Không tìm thấy giáo viên');
      error.statusCode = 404;
      throw error;
    }

    if (teacher_code && teacher_code !== teacher.teacher_code) {
      const exists = await Teacher.findOne({ where: { teacher_code, id: { [Op.ne]: teacherId } } });
      if (exists) {
        const error = new Error('Mã giáo viên đã tồn tại trong hệ thống');
        error.statusCode = 409;
        throw error;
      }
      teacher.teacher_code = teacher_code;
    }

    if (email && email !== teacher.email) {
      const exists = await Teacher.findOne({ where: { email, id: { [Op.ne]: teacherId } } });
      if (exists) {
        const error = new Error('Email đã tồn tại trong hệ thống');
        error.statusCode = 409;
        throw error;
      }
      teacher.email = email;
    }

    if (full_name) teacher.full_name = full_name;
    if (phone !== undefined) teacher.phone = phone || null;
    if (status && ['active', 'inactive'].includes(status)) teacher.status = status;
    if (password) {
      teacher.password = await bcrypt.hash(password, 10);
    }

    await teacher.save();

    return {
      id: teacher.id,
      teacher_code: teacher.teacher_code,
      full_name: teacher.full_name,
      email: teacher.email,
      phone: teacher.phone,
      status: teacher.status
    };
  }

  /**
   * Đổi trạng thái Khóa / Mở khóa Giáo viên
   */
  static async toggleTeacherStatus(teacherId) {
    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) {
      const error = new Error('Không tìm thấy giáo viên');
      error.statusCode = 404;
      throw error;
    }

    teacher.status = teacher.status === 'active' ? 'inactive' : 'active';
    await teacher.save();

    return {
      id: teacher.id,
      teacher_code: teacher.teacher_code,
      full_name: teacher.full_name,
      status: teacher.status,
      message: teacher.status === 'active' ? 'Đã mở khóa tài khoản giáo viên' : 'Đã khóa tài khoản giáo viên'
    };
  }

  /**
   * Đặt lại mật khẩu Giáo viên
   */
  static async resetTeacherPassword(teacherId, newPassword) {
    if (!newPassword || newPassword.length < 6) {
      const error = new Error('Mật khẩu mới phải có ít nhất 6 ký tự');
      error.statusCode = 400;
      throw error;
    }

    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) {
      const error = new Error('Không tìm thấy giáo viên');
      error.statusCode = 404;
      throw error;
    }

    teacher.password = await bcrypt.hash(newPassword, 10);
    await teacher.save();

    return { message: 'Cập nhật mật khẩu giáo viên thành công' };
  }

  /**
   * Cập nhật thông tin Học sinh
   */
  static async updateStudent(studentId, { student_code, full_name, email, class_id, status, password }) {
    const student = await Student.findByPk(studentId);
    if (!student) {
      const error = new Error('Không tìm thấy học sinh');
      error.statusCode = 404;
      throw error;
    }

    if (student_code && student_code !== student.student_code) {
      const exists = await Student.findOne({ where: { student_code, id: { [Op.ne]: studentId } } });
      if (exists) {
        const error = new Error('Mã học sinh đã tồn tại trong hệ thống');
        error.statusCode = 409;
        throw error;
      }
      student.student_code = student_code;
    }

    if (email && email !== student.email) {
      const exists = await Student.findOne({ where: { email, id: { [Op.ne]: studentId } } });
      if (exists) {
        const error = new Error('Email đã tồn tại trong hệ thống');
        error.statusCode = 409;
        throw error;
      }
      student.email = email;
    }

    if (class_id) {
      const classroom = await ClassRoom.findByPk(class_id);
      if (!classroom) {
        const error = new Error('Lớp học không tồn tại');
        error.statusCode = 404;
        throw error;
      }
      student.class_id = class_id;
    }

    if (full_name) student.full_name = full_name;
    if (status && ['active', 'inactive'].includes(status)) student.status = status;
    if (password) {
      student.password = await bcrypt.hash(password, 10);
    }

    await student.save();

    return await Student.findByPk(studentId, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: ClassRoom,
          as: 'classroom',
          attributes: ['id', 'name', 'code'],
          include: [{ model: Grade, as: 'grade', attributes: ['id', 'name'] }]
        }
      ]
    });
  }

  /**
   * Đổi trạng thái Khóa / Mở khóa Học sinh
   */
  static async toggleStudentStatus(studentId) {
    const student = await Student.findByPk(studentId);
    if (!student) {
      const error = new Error('Không tìm thấy học sinh');
      error.statusCode = 404;
      throw error;
    }

    student.status = student.status === 'active' ? 'inactive' : 'active';
    await student.save();

    return {
      id: student.id,
      student_code: student.student_code,
      full_name: student.full_name,
      status: student.status,
      message: student.status === 'active' ? 'Đã mở khóa tài khoản học sinh' : 'Đã khóa tài khoản học sinh'
    };
  }

  /**
   * Đặt lại mật khẩu Học sinh
   */
  static async resetStudentPassword(studentId, newPassword) {
    if (!newPassword || newPassword.length < 6) {
      const error = new Error('Mật khẩu mới phải có ít nhất 6 ký tự');
      error.statusCode = 400;
      throw error;
    }

    const student = await Student.findByPk(studentId);
    if (!student) {
      const error = new Error('Không tìm thấy học sinh');
      error.statusCode = 404;
      throw error;
    }

    student.password = await bcrypt.hash(newPassword, 10);
    await student.save();

    return { message: 'Cập nhật mật khẩu học sinh thành công' };
  }
}

module.exports = AdminService;
