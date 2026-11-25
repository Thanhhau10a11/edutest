const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { Teacher, Student, ClassRoom, Grade } = require('../models');
const jwtConfig = require('../config/jwt');
const ROLES = require('../constants/roles');

class AuthService {
  /**
   * Đăng nhập Giáo viên: Xác thực bằng Email & Mật khẩu hoặc Mã số & Họ tên giáo viên
   */
  static async loginTeacher({ teacher_code, full_name, email, password }) {
    const inputIdentifier = (email || teacher_code || '').trim();
    const cleanName = (full_name || '').trim();
    const inputPassword = (password || '').trim();

    const teacher = await Teacher.findOne({
      where: {
        [Op.or]: [
          { email: inputIdentifier },
          { teacher_code: inputIdentifier }
        ]
      }
    });

    if (!teacher) {
      const error = new Error('Không tìm thấy tài khoản giáo viên với thông tin này');
      error.statusCode = 404;
      throw error;
    }

    if (inputPassword) {
      const isMatch = teacher.password ? (
        teacher.password.startsWith('$2')
          ? await bcrypt.compare(inputPassword, teacher.password)
          : teacher.password === inputPassword
      ) : false;

      if (!isMatch) {
        const error = new Error('Mật khẩu không chính xác');
        error.statusCode = 400;
        throw error;
      }
    } else if (cleanName) {
      // So khớp họ tên (không phân biệt chữ hoa chữ thường)
      if (teacher.full_name.toLowerCase().trim() !== cleanName.toLowerCase()) {
        const error = new Error('Họ tên giáo viên không khớp với mã số đã đăng ký');
        error.statusCode = 400;
        throw error;
      }
    } else {
      const error = new Error('Vui lòng nhập mật khẩu hoặc họ tên để đăng nhập');
      error.statusCode = 400;
      throw error;
    }

    if (teacher.status !== 'active') {
      const error = new Error('Tài khoản giáo viên đã bị vô hiệu hóa');
      error.statusCode = 403;
      throw error;
    }

    // Ký JWT Token cho Giáo viên
    const payload = {
      id: teacher.id,
      code: teacher.teacher_code,
      full_name: teacher.full_name,
      email: teacher.email,
      role: ROLES.TEACHER
    };

    const token = jwt.sign(payload, jwtConfig.secret, {
      expiresIn: jwtConfig.expiresIn
    });

    return {
      token,
      user: {
        id: teacher.id,
        teacher_code: teacher.teacher_code,
        full_name: teacher.full_name,
        email: teacher.email,
        phone: teacher.phone,
        role: ROLES.TEACHER
      }
    };
  }

  /**
   * Đăng nhập Học sinh: Xác thực bằng Email & Mật khẩu hoặc Mã số & Họ tên
   */
  static async loginStudent({ student_code, full_name, email, password }) {
    const inputIdentifier = (email || student_code || '').trim();
    const cleanName = (full_name || '').trim();
    const inputPassword = (password || '').trim();

    const student = await Student.findOne({
      where: {
        [Op.or]: [
          { email: inputIdentifier },
          { student_code: inputIdentifier }
        ]
      },
      include: [
        {
          model: ClassRoom,
          as: 'classroom',
          attributes: ['id', 'name', 'code', 'academic_year', 'grade_id'],
          include: [
            {
              model: Grade,
              as: 'grade',
              attributes: ['id', 'name', 'code']
            }
          ]
        }
      ]
    });

    if (!student) {
      const error = new Error('Không tìm thấy tài khoản học sinh với thông tin này');
      error.statusCode = 404;
      throw error;
    }

    if (inputPassword) {
      const isMatch = student.password ? (
        student.password.startsWith('$2')
          ? await bcrypt.compare(inputPassword, student.password)
          : student.password === inputPassword
      ) : false;

      if (!isMatch) {
        const error = new Error('Mật khẩu không chính xác');
        error.statusCode = 400;
        throw error;
      }
    } else if (cleanName) {
      if (student.full_name.toLowerCase().trim() !== cleanName.toLowerCase()) {
        const error = new Error('Họ tên học sinh không khớp với mã số đã đăng ký');
        error.statusCode = 400;
        throw error;
      }
    } else {
      const error = new Error('Vui lòng nhập mật khẩu hoặc họ tên để đăng nhập');
      error.statusCode = 400;
      throw error;
    }

    if (student.status !== 'active') {
      const error = new Error('Tài khoản học sinh đã bị vô hiệu hóa');
      error.statusCode = 403;
      throw error;
    }

    // Ký JWT Token cho Học sinh kèm thông tin lớp học
    const payload = {
      id: student.id,
      code: student.student_code,
      full_name: student.full_name,
      email: student.email,
      class_id: student.class_id,
      role: ROLES.STUDENT
    };

    const token = jwt.sign(payload, jwtConfig.secret, {
      expiresIn: jwtConfig.expiresIn
    });

    return {
      token,
      user: {
        id: student.id,
        student_code: student.student_code,
        full_name: student.full_name,
        email: student.email,
        class_id: student.class_id,
        classroom: student.classroom,
        reward_points: student.reward_points,
        wallet_coins: student.wallet_coins,
        role: ROLES.STUDENT
      }
    };
  }

  /**
   * Đăng nhập Admin: Xác thực bằng Email & Mật khẩu cố định
   */
  static async loginAdmin({ email, password }) {
    const adminEmail = 'admin@gmail.com';
    const adminPassword = 'adminpassword';

    if (!email || !password) {
      const error = new Error('Vui lòng nhập email và mật khẩu');
      error.statusCode = 400;
      throw error;
    }

    if (email.trim() !== adminEmail || password.trim() !== adminPassword) {
      const error = new Error('Email hoặc mật khẩu Admin không chính xác');
      error.statusCode = 401;
      throw error;
    }

    const payload = {
      id: 0,
      code: 'ADMIN',
      full_name: 'Quản trị viên',
      email: adminEmail,
      role: ROLES.ADMIN
    };

    const token = jwt.sign(payload, jwtConfig.secret, {
      expiresIn: jwtConfig.expiresIn
    });

    return {
      token,
      user: {
        id: 0,
        code: 'ADMIN',
        full_name: 'Quản trị viên',
        email: adminEmail,
        role: ROLES.ADMIN
      }
    };
  }
}

module.exports = AuthService;
