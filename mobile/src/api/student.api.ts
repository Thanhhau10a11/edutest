import { getApiClient } from './client'
import { getOrCreateDeviceId } from '../utils/device'

export const studentApi = {
  // 1. Xác thực đăng nhập
  login: async (credentials: { username?: string; student_code?: string; password: string }) => {
    const client = await getApiClient()
    const res = await client.post('/auth/student/login', credentials)
    return res.data
  },

  getProfile: async () => {
    const client = await getApiClient()
    const res = await client.get('/student/profile')
    return res.data
  },

  // 2. Danh sách bài thi được giao cho lớp học sinh
  getAvailableExams: async () => {
    const client = await getApiClient()
    const res = await client.get('/student/exams')
    return res.data
  },

  // 3. Bắt đầu ca thi (Kiểm tra PIN 6 số & Khóa 1 Thiết Bị Duy Nhất Anti-Proxy)
  startExam: async (examId: number, pinCode?: string) => {
    const client = await getApiClient()
    const deviceId = await getOrCreateDeviceId()
    const res = await client.get(`/student/exams/${examId}/start`, {
      params: {
        pin: pinCode || '',
        deviceId
      }
    })
    return res.data
  },

  // 4. Nộp bài thi
  submitExam: async (
    examId: number,
    payload: {
      attempt_id?: number
      answers: Array<{ question_id: number; selected_option_id: number }>
      duration_seconds?: number
      cheatWarnings?: number
    }
  ) => {
    const client = await getApiClient()
    const res = await client.post(`/student/exams/${examId}/submit`, payload)
    return res.data
  },

  // 5. Lịch sử bài thi
  getHistory: async () => {
    const client = await getApiClient()
    const res = await client.get('/student/history')
    return res.data
  },

  // 6. Chi tiết kết quả 1 lượt thi
  getAttemptDetail: async (attemptId: number) => {
    const client = await getApiClient()
    const res = await client.get(`/student/attempts/${attemptId}`)
    return res.data
  },

  // 7. Phục hồi kiến thức thông minh (Mistake Bank)
  getRecovery: async () => {
    const client = await getApiClient()
    const res = await client.get('/student/recovery')
    return res.data
  },

  // 8. Nộp bài luyện tập phục hồi kiến thức
  submitRecovery: async (payload: {
    answers: Array<{ question_id: number; selected_option_id: number }>
  }) => {
    const client = await getApiClient()
    const res = await client.post('/student/recovery/submit', payload)
    return res.data
  },

  // 9. Ví EduCoins & EduPoints
  getWallet: async () => {
    const client = await getApiClient()
    const res = await client.get('/student/wallet')
    return res.data
  },

  // 10. Chatbot Trợ lý AI Ôn thi
  sendChatMessage: async (params: string | { message: string; history?: any[]; userName?: string; userRole?: string }) => {
    const client = await getApiClient()
    const payload = typeof params === 'string'
      ? { message: params, userRole: 'student' }
      : {
          message: params.message,
          history: params.history || [],
          userRole: params.userRole || 'student',
          userName: params.userName || 'Học sinh'
        }
    const res = await client.post('/chat', payload)
    return res.data
  }
}

