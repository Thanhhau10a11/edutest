const { Grade, ClassRoom, Student, Teacher, ExamClassAssignment } = require('../models');

class ClassroomService {
  /**
   * Lấy cấu trúc cây thư mục phân loại lớp và danh sách học sinh
   * Hierarchy: Khối lớp (Grade) -> Lớp học (ClassRoom) -> Danh sách học sinh (Student)
   */
  static async getClassroomTree() {
    const grades = await Grade.findAll({
      order: [['order_index', 'ASC'], ['name', 'ASC']],
      include: [
        {
          model: ClassRoom,
          as: 'classrooms',
          include: [
            {
              model: Teacher,
              as: 'teacher',
              attributes: ['id', 'teacher_code', 'full_name', 'email']
            },
            {
              model: Student,
              as: 'students',
              attributes: ['id', 'student_code', 'full_name', 'reward_points', 'wallet_coins', 'status'],
              order: [['full_name', 'ASC']]
            }
          ]
        }
      ]
    });

    // Format dữ liệu cây thư mục đẹp mắt cho UI Tree View
    const tree = grades.map((grade) => ({
      id: `grade_${grade.id}`,
      grade_id: grade.id,
      name: grade.name,
      code: grade.code,
      type: 'grade',
      total_classes: grade.classrooms ? grade.classrooms.length : 0,
      total_students: grade.classrooms
        ? grade.classrooms.reduce((acc, c) => acc + (c.students ? c.students.length : 0), 0)
        : 0,
      children: (grade.classrooms || []).map((classroom) => ({
        id: `class_${classroom.id}`,
        class_id: classroom.id,
        name: classroom.name,
        code: classroom.code,
        academic_year: classroom.academic_year,
        type: 'classroom',
        teacher: classroom.teacher,
        student_count: classroom.students ? classroom.students.length : 0,
        children: (classroom.students || []).map((student) => ({
          id: `student_${student.id}`,
          student_id: student.id,
          student_code: student.student_code,
          full_name: student.full_name,
          reward_points: student.reward_points,
          wallet_coins: student.wallet_coins,
          status: student.status,
          type: 'student'
        }))
      }))
    }));

    return tree;
  }

  /**
   * Lấy danh sách tất cả các lớp học phẳng (Flat list) để phục vụ dropdown chọn lớp
   */
  static async getAllClassrooms() {
    const classrooms = await ClassRoom.findAll({
      include: [
        {
          model: Grade,
          as: 'grade',
          attributes: ['id', 'name', 'code']
        },
        {
          model: Teacher,
          as: 'teacher',
          attributes: ['id', 'teacher_code', 'full_name']
        },
        {
          model: Student,
          as: 'students',
          attributes: ['id']
        }
      ],
      order: [['name', 'ASC']]
    });

    return classrooms.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      academic_year: c.academic_year,
      grade: c.grade,
      teacher: c.teacher,
      student_count: c.students ? c.students.length : 0
    }));
  }

  /**
   * Lấy chi tiết một lớp học cùng danh sách học sinh
   */
  static async getClassroomDetail(classId) {
    const classroom = await ClassRoom.findByPk(classId, {
      include: [
        {
          model: Grade,
          as: 'grade'
        },
        {
          model: Teacher,
          as: 'teacher',
          attributes: ['id', 'teacher_code', 'full_name', 'email', 'phone']
        },
        {
          model: Student,
          as: 'students',
          attributes: ['id', 'student_code', 'full_name', 'reward_points', 'wallet_coins', 'status'],
          order: [['student_code', 'ASC']]
        }
      ]
    });

    if (!classroom) {
      const error = new Error('Không tìm thấy thông tin lớp học này');
      error.statusCode = 404;
      throw error;
    }

    return classroom;
  }

  /**
   * Lấy danh sách các khối lớp
   */
  static async getGrades() {
    return await Grade.findAll({
      order: [['order_index', 'ASC'], ['name', 'ASC']]
    });
  }

  /**
   * Tạo một lớp học mới
   */
  static async createClassroom(data) {
    const { name, code, grade_id, teacher_id, academic_year } = data;

    if (!name || !name.trim()) {
      const error = new Error('Vui lòng nhập tên lớp học (ví dụ: Lớp 10A3)');
      error.statusCode = 400;
      throw error;
    }

    if (!grade_id) {
      const error = new Error('Vui lòng chọn khối lớp cho lớp học này');
      error.statusCode = 400;
      throw error;
    }

    // Tự sinh mã lớp nếu không cung cấp
    const classroomCode = code && code.trim()
      ? code.trim().toUpperCase()
      : `${name.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}_${new Date().getFullYear()}`;

    // Kiểm tra trùng mã lớp
    const existing = await ClassRoom.findOne({ where: { code: classroomCode } });
    if (existing) {
      const error = new Error(`Mã lớp '${classroomCode}' đã tồn tại trong hệ thống. Vui lòng nhập mã lớp khác.`);
      error.statusCode = 409;
      throw error;
    }

    const created = await ClassRoom.create({
      name: name.trim(),
      code: classroomCode,
      grade_id: Number(grade_id),
      teacher_id: teacher_id ? Number(teacher_id) : null,
      academic_year: academic_year || '2025-2026'
    });

    return created;
  }

  /**
   * Cập nhật thông tin lớp học
   */
  static async updateClassroom(classId, data) {
    const classroom = await ClassRoom.findByPk(classId);
    if (!classroom) {
      const error = new Error('Không tìm thấy thông tin lớp học cần sửa');
      error.statusCode = 404;
      throw error;
    }

    const { name, code, grade_id, teacher_id, academic_year } = data;

    if (code && code.trim() && code.trim().toUpperCase() !== classroom.code) {
      const existing = await ClassRoom.findOne({ where: { code: code.trim().toUpperCase() } });
      if (existing && existing.id !== classroom.id) {
        const error = new Error(`Mã lớp '${code.trim().toUpperCase()}' đã được sử dụng bởi lớp khác`);
        error.statusCode = 409;
        throw error;
      }
      classroom.code = code.trim().toUpperCase();
    }

    if (name && name.trim()) classroom.name = name.trim();
    if (grade_id) classroom.grade_id = Number(grade_id);
    if (teacher_id !== undefined) classroom.teacher_id = teacher_id ? Number(teacher_id) : null;
    if (academic_year) classroom.academic_year = academic_year.trim();

    await classroom.save();
    return classroom;
  }

  /**
   * Xóa một lớp học
   */
  static async deleteClassroom(classId) {
    const classroom = await ClassRoom.findByPk(classId, {
      include: [{ model: Student, as: 'students' }]
    });

    if (!classroom) {
      const error = new Error('Không tìm thấy lớp học cần xóa');
      error.statusCode = 404;
      throw error;
    }

    // Xóa liên kết đề thi gán cho lớp này
    if (ExamClassAssignment) {
      await ExamClassAssignment.destroy({ where: { class_id: classId } });
    }

    // Xóa học sinh trong lớp (nếu có)
    if (classroom.students && classroom.students.length > 0) {
      const studentIds = classroom.students.map((s) => s.id);
      await Student.destroy({ where: { id: studentIds } });
    }

    await classroom.destroy();
    return { id: classId, name: classroom.name };
  }
}

module.exports = ClassroomService;
