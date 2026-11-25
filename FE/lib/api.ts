/**
 * EduTest API Client
 * Connects directly to backend at http://localhost:5000/api/v1
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'

export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data: T
  errors: any
  timestamp: string
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('edutest_token')
}

export function setToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('edutest_token', token)
  }
}

export function removeToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('edutest_token')
  }
}

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server_device'
  let devId = localStorage.getItem('edutest_device_id')
  if (!devId) {
    devId = `DEV-${Math.random().toString(36).slice(2, 8).toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}`
    localStorage.setItem('edutest_device_id', devId)
  }
  return devId
}

export function getDeviceName(): string {
  if (typeof window === 'undefined') return 'Trình duyệt Web'
  const ua = navigator.userAgent || ''
  const browser = ua.includes('Edg')
    ? 'Edge'
    : ua.includes('Chrome')
    ? 'Chrome'
    : ua.includes('Firefox')
    ? 'Firefox'
    : ua.includes('Safari')
    ? 'Safari'
    : 'Browser'
  const os = ua.includes('Windows')
    ? 'Windows'
    : ua.includes('Mac')
    ? 'macOS'
    : ua.includes('Android')
    ? 'Android'
    : ua.includes('iPhone') || ua.includes('iPad')
    ? 'iOS'
    : 'PC'
  return `${browser} trên ${os} (${getDeviceId().slice(0, 10)})`
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const config: RequestInit = {
    ...options,
    headers,
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config)
  let result: ApiResponse<T>
  try {
    result = await response.json()
  } catch {
    result = {
      success: false,
      message: `Lỗi kết nối máy chủ (${response.status})`,
      data: null as any,
      errors: null,
      timestamp: new Date().toISOString(),
    }
  }

  if (!response.ok || !result.success) {
    if (response.status === 401) {
      const isLoginEndpoint =
        endpoint.includes('/auth/teacher/login') ||
        endpoint.includes('/auth/student/login') ||
        endpoint.includes('/auth/admin/login')

      if (!isLoginEndpoint) {
        removeToken()
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }
    }

    const errorMsg = result.message || `Lỗi yêu cầu: ${response.status} ${response.statusText}`
    const error: any = new Error(errorMsg)
    error.status = response.status
    error.code = (result as any).code
    error.errors = result.errors
    throw error
  }

  return result
}

export const api = {
  // 1. Authentication
  auth: {
    loginTeacher: (data: { teacher_code?: string; full_name?: string; email?: string; password?: string }) =>
      request<{ token: string; user: any }>('/auth/teacher/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    loginStudent: (data: { student_code?: string; full_name?: string; email?: string; password?: string }) =>
      request<{ token: string; user: any }>('/auth/student/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    loginAdmin: (data: { email: string; password: string }) =>
      request<{ token: string; user: any }>('/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getMe: () => request<any>('/auth/me'),
  },

  // 2. Classrooms & Tree
  classrooms: {
    getTree: () => request<any[]>('/classrooms/tree'),
    getAll: () => request<any[]>('/classrooms'),
    getGrades: () => request<any[]>('/classrooms/grades'),
    getTeachers: () => request<any[]>('/classrooms/teachers-list'),
    getDetail: (id: number) => request<any>(`/classrooms/${id}`),
    create: (data: { name: string; code?: string; grade_id: number; teacher_id?: number | null; academic_year?: string }) =>
      request<any>('/classrooms', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: { name?: string; code?: string; grade_id?: number; teacher_id?: number | null; academic_year?: string }) =>
      request<any>(`/classrooms/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request<any>(`/classrooms/${id}`, {
        method: 'DELETE',
      }),
  },

  // 3. Exams & Assignments (Teacher)
  exams: {
    getAll: (params?: { search?: string; page?: number; limit?: number }) => {
      const searchParams = new URLSearchParams()
      if (params?.search) searchParams.append('search', params.search)
      if (params?.page) searchParams.append('page', params.page.toString())
      if (params?.limit) searchParams.append('limit', params.limit.toString())
      const qs = searchParams.toString()
      return request<any[]>(`/exams${qs ? `?${qs}` : ''}`)
    },
    getDetail: (id: number) => request<any>(`/exams/${id}`),
    create: (data: any) =>
      request<any>('/exams', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request<any>(`/exams/${id}`, {
        method: 'DELETE',
      }),
    assign: (id: number, data: { class_ids?: number[]; assign_all?: boolean; is_open?: boolean; start_time?: any; end_time?: any }) =>
      request<any>(`/exams/${id}/assign`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    toggleClass: (id: number, data: { class_id: number; is_open: boolean }) =>
      request<any>(`/exams/${id}/toggle-class`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    getAssignments: (id: number) => request<any[]>(`/exams/${id}/assignments`),
  },

  // 4. Student Operations (with Exam PIN, Single-Device Lock & Knowledge Recovery)
  student: {
    getAvailableExams: () => request<any[]>('/student/exams'),
    startExam: (id: number, options?: { pin?: string; deviceId?: string; deviceName?: string }) => {
      const q = new URLSearchParams()
      if (options?.pin) q.set('pin', options.pin)
      q.set('device_id', options?.deviceId || getDeviceId())
      q.set('device_name', options?.deviceName || getDeviceName())
      return request<any>(`/student/exams/${id}/start?${q.toString()}`)
    },
    submitExam: (id: number, data: { answers: { question_id: number; selected_option_id: number | null }[] }) =>
      request<any>(`/student/exams/${id}/submit`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getRecoveryQuestions: () => request<any>('/student/recovery'),
    submitRecoveryPractice: (data: { answers: { question_id: number; selected_option_id: number | null }[] }) =>
      request<any>('/student/recovery/submit', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getHistory: () => request<any[]>('/student/history'),
    getWallet: () => request<any>('/student/wallet'),
    getProfile: () => request<any>('/student/profile'),
    getAttemptResult: (attemptId: number) => request<any>(`/student/attempts/${attemptId}`),
  },

  // 5. Real-time Monitoring, Analytics, PIN & Single-Device Lock (Teacher)
  monitor: {
    getClassExamMonitoring: (examId: number, classId: number) =>
      request<any>(`/monitor/exams/${examId}/classes/${classId}`),
    getExamAnalytics: (examId: number, classId: number) =>
      request<any>(`/monitor/exams/${examId}/classes/${classId}/analytics`),
    getExamSecurity: (examId: number, classId: number) =>
      request<any>(`/monitor/exams/${examId}/classes/${classId}/security`),
    updateExamPin: (
      examId: number,
      classId: number,
      data: { pinCode?: string; isPinRequired?: boolean; regenerate?: boolean }
    ) =>
      request<any>(`/monitor/exams/${examId}/classes/${classId}/pin`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    unlockStudentDevice: (examId: number, classId: number, data?: { studentId?: number }) =>
      request<any>(`/monitor/exams/${examId}/classes/${classId}/unlock-device`, {
        method: 'POST',
        body: JSON.stringify(data || {}),
      }),
    sendBroadcast: (data: {
      examId?: number | null
      classId?: number | null
      studentId?: number | null
      studentName?: string | null
      title?: string
      message: string
      level?: 'info' | 'warning' | 'urgent'
    }) =>
      request<any>('/monitor/broadcast', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getBroadcasts: (params?: { examId?: number; classId?: number; studentId?: number }) => {
      const q = new URLSearchParams()
      if (params?.examId) q.set('examId', String(params.examId))
      if (params?.classId) q.set('classId', String(params.classId))
      if (params?.studentId) q.set('studentId', String(params.studentId))
      const qs = q.toString() ? `?${q.toString()}` : ''
      return request<any[]>(`/monitor/broadcasts${qs}`)
    },
  },

  // 6. Media / Upload
  media: {
    uploadImage: (data: { image: string; name?: string }) =>
      request<{ file_name: string; url: string }>('/upload', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // 7. Subjects / Topics
  subjects: {
    getAll: () => request<any[]>('/subjects'),
    getDetail: (id: number) => request<any>(`/subjects/${id}`),
    create: (data: { name: string; code?: string; description?: string; color?: string; icon?: string }) =>
      request<any>('/subjects', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: any) =>
      request<any>(`/subjects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request<any>(`/subjects/${id}`, {
        method: 'DELETE',
      }),
  },

  // 8. Questions (Question Bank)
  questions: {
    getAll: (params?: { subject_id?: number; search?: string; exam_id?: number }) => {
      const q = new URLSearchParams()
      if (params?.subject_id) q.set('subject_id', String(params.subject_id))
      if (params?.search) q.set('search', params.search)
      if (params?.exam_id) q.set('exam_id', String(params.exam_id))
      const queryStr = q.toString() ? `?${q.toString()}` : ''
      return request<any[]>(`/questions${queryStr}`)
    },
    create: (data: any) =>
      request<any>('/questions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: any) =>
      request<any>(`/questions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request<any>(`/questions/${id}`, {
        method: 'DELETE',
      }),
  },

  // 9. Admin (User Management)
  admin: {
    getTeachers: (params?: { search?: string }) => {
      const q = new URLSearchParams()
      if (params?.search) q.set('search', params.search)
      const queryStr = q.toString() ? `?${q.toString()}` : ''
      return request<any>(`/admin/teachers${queryStr}`)
    },
    createTeacher: (data: { teacher_code: string; full_name: string; email?: string; password?: string; phone?: string }) =>
      request<any>('/admin/teachers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateTeacher: (id: number, data: { teacher_code?: string; full_name?: string; email?: string; phone?: string; status?: string; password?: string }) =>
      request<any>(`/admin/teachers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    toggleTeacherStatus: (id: number) =>
      request<any>(`/admin/teachers/${id}/toggle-status`, {
        method: 'PATCH',
      }),
    resetTeacherPassword: (id: number, password: string) =>
      request<any>(`/admin/teachers/${id}/reset-password`, {
        method: 'PATCH',
        body: JSON.stringify({ password }),
      }),
    deleteTeacher: (id: number) =>
      request<any>(`/admin/teachers/${id}`, {
        method: 'DELETE',
      }),
    getStudents: (params?: { search?: string; class_id?: number }) => {
      const q = new URLSearchParams()
      if (params?.search) q.set('search', params.search)
      if (params?.class_id) q.set('class_id', String(params.class_id))
      const queryStr = q.toString() ? `?${q.toString()}` : ''
      return request<any>(`/admin/students${queryStr}`)
    },
    createStudent: (data: { student_code: string; full_name: string; email?: string; password?: string; class_id?: number }) =>
      request<any>('/admin/students', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateStudent: (id: number, data: { student_code?: string; full_name?: string; email?: string; class_id?: number; status?: string; password?: string }) =>
      request<any>(`/admin/students/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    toggleStudentStatus: (id: number) =>
      request<any>(`/admin/students/${id}/toggle-status`, {
        method: 'PATCH',
      }),
    resetStudentPassword: (id: number, password: string) =>
      request<any>(`/admin/students/${id}/reset-password`, {
        method: 'PATCH',
        body: JSON.stringify({ password }),
      }),
    deleteStudent: (id: number) =>
      request<any>(`/admin/students/${id}`, {
        method: 'DELETE',
      }),
    assignStudentToClass: (studentId: number, classId: number) =>
      request<any>(`/admin/students/${studentId}/assign-class`, {
        method: 'PATCH',
        body: JSON.stringify({ class_id: classId }),
      }),
    assignMultipleStudentsToClass: (studentIds: number[], classId: number) =>
      request<any>('/admin/students/assign-class', {
        method: 'POST',
        body: JSON.stringify({ student_ids: studentIds, class_id: classId }),
      }),
  },

  // 10. AI Chatbox (Groq & Gemini)
  chat: {
    sendMessage: (data: {
      message: string
      history?: { role: 'user' | 'assistant'; content: string }[]
      userRole?: string | null
      userName?: string
    }) =>
      request<{ reply: string; model?: string }>('/chat', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
}
