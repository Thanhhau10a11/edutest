import React, { createContext, useContext, useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { getSocketUrl } from '../constants/config'
import { useAuth } from './AuthContext'

export interface BroadcastNotification {
  id?: string
  sender_name?: string
  message: string
  level?: 'info' | 'warning' | 'urgent'
  timestamp?: string
  pinCode?: string
}

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
  activeBroadcast: BroadcastNotification | null
  dismissBroadcast: () => void
  joinExamRoom: (examId: number, classId: number) => void
  leaveExamRoom: (examId: number, classId: number) => void
  reportCheatingWarning: (examId: number, reason: string, count: number) => void
}

const SocketContext = createContext<SocketContextType>({} as SocketContextType)

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [activeBroadcast, setActiveBroadcast] = useState<BroadcastNotification | null>(null)

  useEffect(() => {
    let newSocket: Socket | null = null

    const initSocket = async () => {
      if (!token || !user) return

      const socketUrl = await getSocketUrl()
      newSocket = io(socketUrl, {
        transports: ['websocket'],
        auth: { token }
      })

      newSocket.on('connect', () => {
        setIsConnected(true)
        if (user?.id) {
          newSocket?.emit('join_student_channel', { student_id: user.id })
        }
      })

      newSocket.on('disconnect', () => {
        setIsConnected(false)
      })

      // Lắng nghe thông báo / cảnh báo tức thì từ Giáo viên
      newSocket.on('exam_broadcast', (data: any) => {
        setActiveBroadcast({
          id: String(Date.now()),
          sender_name: data.sender_name || 'Giám thị phòng thi',
          message: data.message || data.text || 'Thông báo từ giáo viên',
          level: data.level || 'warning',
          timestamp: new Date().toLocaleTimeString(),
          pinCode: data.pinCode
        })
      })

      setSocket(newSocket)
    }

    initSocket()

    return () => {
      if (newSocket) {
        newSocket.disconnect()
      }
    }
  }, [token, user?.id])

  const dismissBroadcast = () => {
    setActiveBroadcast(null)
  }

  const joinExamRoom = (examId: number, classId: number) => {
    if (!socket || !user) return
    socket.emit('join_exam_session', {
      exam_id: examId,
      class_id: classId,
      student_id: user.id,
      student_code: user.student_code,
      full_name: user.full_name
    })
  }

  const leaveExamRoom = (examId: number, classId: number) => {
    if (!socket || !user) return
    socket.emit('leave_exam_session', {
      exam_id: examId,
      class_id: classId,
      student_id: user.id
    })
  }

  const reportCheatingWarning = (examId: number, reason: string, count: number) => {
    if (!socket || !user) return
    socket.emit('student_cheating_warning', {
      exam_id: examId,
      student_id: user.id,
      student_code: user.student_code,
      full_name: user.full_name,
      reason,
      warningCount: count,
      timestamp: new Date().toISOString()
    })
  }

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        activeBroadcast,
        dismissBroadcast,
        joinExamRoom,
        leaveExamRoom,
        reportCheatingWarning
      }}
    >
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => useContext(SocketContext)

