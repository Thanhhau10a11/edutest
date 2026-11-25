import { io, Socket } from 'socket.io-client'

const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000'

let socket: Socket | null = null

export interface TeacherBroadcastPayload {
  id?: string
  examId?: number | null
  classId?: number | null
  studentId?: number | null
  studentName?: string | null
  title?: string
  message: string
  level?: 'info' | 'warning' | 'urgent'
  senderName?: string
  timestamp?: string
}

export const getSocket = (): Socket => {
  if (!socket && typeof window !== 'undefined') {
    socket = io(SOCKET_SERVER_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling']
    })

    socket.on('connect', () => {
      console.log('[Socket.IO] Connected to server, id:', socket?.id)
    })

    socket.on('disconnect', () => {
      console.log('[Socket.IO] Disconnected from server')
    })
  }

  return socket as Socket
}

export const joinMonitorRoom = (
  examId: number,
  classId: number,
  role: string = 'teacher',
  name: string = '',
  studentId?: number
) => {
  const s = getSocket()
  if (s) {
    s.emit('join_monitor_room', { examId, classId, studentId, role, name })
  }
}

export const joinStudentChannel = (
  classId: number,
  studentId: number,
  examId?: number,
  name: string = ''
) => {
  const s = getSocket()
  if (s) {
    s.emit('join_student_channel', { classId, studentId, examId, name })
  }
}

export const sendTeacherBroadcastSocket = (payload: TeacherBroadcastPayload) => {
  const s = getSocket()
  if (s) {
    s.emit('teacher_broadcast', payload)
  }
}

export const emitStudentCheatWarning = (payload: {
  examId: number
  classId: number
  student_id?: number
  student_code?: string
  full_name?: string
  reason?: string
  warningCount?: number
}) => {
  const s = getSocket()
  if (s) {
    s.emit('student_cheat_warning', payload)
  }
}

export const leaveMonitorRoom = (examId: number, classId: number) => {
  const s = getSocket()
  if (s) {
    s.emit('leave_monitor_room', { examId, classId })
  }
}
