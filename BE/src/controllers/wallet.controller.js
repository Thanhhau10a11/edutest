const WalletService = require('../services/wallet.service');
const ApiResponse = require('../utils/apiResponse');

class WalletController {
  /**
   * Lấy số dư ví điểm thưởng / xu và lịch sử biến động
   * GET /api/v1/student/wallet
   */
  static async getStudentWallet(req, res, next) {
    try {
      const studentId = req.user.id;
      const walletData = await WalletService.getStudentWallet(studentId);
      return ApiResponse.success(res, walletData, 'Lấy thông tin ví điểm và xu thành công');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = WalletController;
