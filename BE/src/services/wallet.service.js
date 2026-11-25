const { Student, WalletTransaction } = require('../models');

class WalletService {
  /**
   * Lấy thông tin số dư ví điểm thưởng / xu và lịch sử biến động giao dịch
   */
  static async getStudentWallet(studentId) {
    const student = await Student.findByPk(studentId, {
      attributes: ['id', 'student_code', 'full_name', 'reward_points', 'wallet_coins']
    });

    if (!student) {
      const error = new Error('Không tìm thấy thông tin học sinh');
      error.statusCode = 404;
      throw error;
    }

    const transactions = await WalletTransaction.findAll({
      where: { student_id: studentId },
      order: [['created_at', 'DESC']],
      limit: 50
    });

    return {
      balance: {
        reward_points: student.reward_points,
        wallet_coins: student.wallet_coins
      },
      transactions
    };
  }
}

module.exports = WalletService;
