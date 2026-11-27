'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  AlertTriangle,
  Bell,
  Check,
  Clock3,
  FileText,
  Megaphone,
  Radio,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  Users,
  X,
  FileSpreadsheet,
  Printer,
  KeyRound,
  Lock,
  Unlock,
  Smartphone,
  Copy
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { exportClassScoreboardExcel, exportClassScoreboardPDF } from '@/lib/report-export'
import {
  getSocket,
  joinMonitorRoom,
  leaveMonitorRoom,
  sendTeacherBroadcastSocket
} from '@/lib/socket'

interface StudentMonitorItem {
  id: string
  code: string
  name: string
  initials: string
  status: 'completed' | 'in_progress' | 'not_started'
  statusLabel: string
  score: number | null
  correctCount: number | null
  totalQuestions: number
  startTime: string | null
  submittedTime: string | null
  duration: string | null
  coins: number
  points: number
  cheatWarnings?: number
}

const fallbackStudents: StudentMonitorItem[] = [
  {
    id: '1',
    code: 'HS001',
    name: 'Nguyễn Văn An',
    initials: 'VA',
    status: 'completed',
    statusLabel: 'ĐÃ XONG',
    score: 8.0,
    correctCount: 4,
    totalQuestions: 5,
    startTime: '10:45',
    submittedTime: '10 phút trước',
    duration: '15m 00s',
    coins: 40,
    points: 20,
    cheatWarnings: 0
  },
  {
    id: '2',
    code: 'HS002',
    name: 'Lê Thị Bích',
    initials: 'TB',
    status: 'in_progress',
    statusLabel: 'ĐANG LÀM BÀI',
    score: null,
    correctCount: null,
    totalQuestions: 5,
    startTime: '8 phút trước',
    submittedTime: null,
    duration: '08m 32s',
    coins: 0,
    points: 0,
    cheatWarnings: 0
  },
  {
    id: '3',
    code: 'HS003',
    name: 'Trần Hoàng Cường',
    initials: 'HC',
    status: 'not_started',
    statusLabel: 'CHƯA MỞ ĐỀ',
    score: null,
    correctCount: null,
    totalQuestions: 5,
    startTime: null,
    submittedTime: null,
    duration: null,
    coins: 0,
    points: 0,
    cheatWarnings: 0
  },
  {
    id: '4',
    code: 'HS004',
    name: 'Phạm Ngọc Dung',
    initials: 'ND',
    status: 'not_started',
    statusLabel: 'CHƯA MỞ ĐỀ',
    score: null,
    correctCount: null,
    totalQuestions: 5,
    startTime: null,
    submittedTime: null,
    duration: null,
    coins: 0,
    points: 0,
    cheatWarnings: 0
  },
  {
    id: '5',
    code: 'HS005',
    name: 'Đỗ Quang Em',
    initials: 'QE',
    status: 'not_started',
    statusLabel: 'CHƯA MỞ ĐỀ',
    score: null,
    correctCount: null,
    totalQuestions: 5,
    startTime: null,
    submittedTime: null,
    duration: null,
    coins: 0,
    points: 0,
    cheatWarnings: 0
  }
]

const QUICK_BROADCAST_TEMPLATES = [
  {
    level: 'warning' as const,
    label: '⏰ Nhắc còn 5 phút',
    text: '⏰ Còn 5 phút làm bài! Các em khẩn trương kiểm tra lại toàn bộ các câu đã chọn trước khi hết giờ.'
  },
  {
    level: 'urgent' as const,
    label: '⚠️ Cảnh báo trật tự & chống nhìn bài',
    text: '⚠️ Yêu cầu toàn bộ học sinh tập trung nhìn vào màn hình của mình, tuyệt đối không trao đổi hay chuyển tab trình duyệt!'
  },
  {
    level: 'info' as const,
    label: '🔀 Thông báo đề đảo ngẫu nhiên',
    text: '📌 Lưu ý: Mỗi học sinh có một mã đề riêng với thứ tự câu hỏi và vị trí đáp án A-B-C-D đã được đảo ngẫu nhiên khác nhau.'
  },
  {
    level: 'info' as const,
    label: '✅ Nhắc bấm Nộp bài',
    text: '✅ Những em đã hoàn thành xong bài kiểm tra nhớ bấm nút "Nộp bài thi" ở góc dưới màn hình để hệ thống ghi nhận điểm.'
  }
]

export default function LiveMonitorModule({ onBack, embedded = false }: { onBack?: () => void; embedded?: boolean }) {
  const { user } = useAuth()
  const [examId, setExamId] = useState<number>(0)
  const [classId, setClassId] = useState<number>(0)
  const [examsList, setExamsList] = useState<{ id: number; code: string; title: string; total_questions: number; assignments?: any[] }[]>([])
  const [classesList, setClassesList] = useState<{ id: number; name: string; student_count?: number }[]>([])

  const [isOpenExam, setIsOpenExam] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [studentList, setStudentList] = useState<StudentMonitorItem[]>([])
  const [elapsedTimer, setElapsedTimer] = useState(512)
  const [socketConnected, setSocketConnected] = useState(false)
  const [liveEvents, setLiveEvents] = useState<{ id: string; title: string; desc: string; time: string; type: string }[]>([])

  // Live Teacher-Student Broadcast State
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcastLevel, setBroadcastLevel] = useState<'info' | 'warning' | 'urgent'>('warning')
  const [targetStudent, setTargetStudent] = useState<{ id: number; name: string; code: string } | null>(null)
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false)
  const [broadcastBannerToast, setBroadcastBannerToast] = useState<string | null>(null)

  // Exam PIN & Single-Device Anti-Proxy Lock State
  const [pinConfig, setPinConfig] = useState<{ pinCode: string; isPinRequired: boolean }>({
    pinCode: String(((Number(examId || 1) * 13579 + Number(classId || 1) * 24680 + 102938) % 900000) + 100000),
    isPinRequired: true
  })
  const [deviceLocks, setDeviceLocks] = useState<any[]>([])
  const [isUpdatingSecurity, setIsUpdatingSecurity] = useState(false)

  const fetchExamSecurity = async (eId = examId, cId = classId) => {
    try {
      const res = await api.monitor.getExamSecurity(eId, cId)
      if (res.data?.pinConfig) {
        setPinConfig({
          pinCode: res.data.pinConfig.pinCode,
          isPinRequired: Boolean(res.data.pinConfig.isPinRequired)
        })
      }
      if (Array.isArray(res.data?.deviceLocks)) {
        setDeviceLocks(res.data.deviceLocks)
      }
    } catch {
      const fallbackPin = String(((Number(eId || 1) * 13579 + Number(cId || 1) * 24680 + 102938) % 900000) + 100000)
      setPinConfig((prev) => ({ ...prev, pinCode: fallbackPin }))
    }
  }

  const handleRegeneratePin = async () => {
    setIsUpdatingSecurity(true)
    try {
      const res = await api.monitor.updateExamPin(examId, classId, { regenerate: true, isPinRequired: true })
      if (res.data?.pinCode) {
        setPinConfig({ pinCode: res.data.pinCode, isPinRequired: Boolean(res.data.isPinRequired) })
        setBroadcastBannerToast(`🔑 Đã cấp mã PIN ca thi mới: ${res.data.pinCode}`)
        setTimeout(() => setBroadcastBannerToast(null), 3500)
      }
    } catch {
      const randomPin = String(Math.floor(100000 + Math.random() * 900000))
      setPinConfig((prev) => ({ ...prev, pinCode: randomPin }))
    } finally {
      setIsUpdatingSecurity(false)
    }
  }

  const handleTogglePinRequired = async () => {
    const nextVal = !pinConfig.isPinRequired
    setPinConfig((prev) => ({ ...prev, isPinRequired: nextVal }))
    try {
      await api.monitor.updateExamPin(examId, classId, { isPinRequired: nextVal })
    } catch {}
  }

  const handleUnlockStudentDevice = async (studentId?: number, studentName?: string) => {
    try {
      await api.monitor.unlockStudentDevice(examId, classId, studentId ? { studentId } : {})
      await fetchExamSecurity(examId, classId)
      setBroadcastBannerToast(
        studentId
          ? `🔓 Đã mở khóa thiết bị cho học sinh ${studentName || studentId}!`
          : `🔓 Đã giải phóng khóa thiết bị cho toàn bộ lớp!`
      )
      setTimeout(() => setBroadcastBannerToast(null), 3500)
    } catch {}
  }

  // Fetch exams & classes metadata và tự động chọn đề/lớp đang mở thi thật từ DB
  useEffect(() => {
    Promise.all([
      api.exams.getAll({ limit: 100 }).catch(() => ({ data: [] })),
      api.classrooms.getAll().catch(() => ({ data: [] }))
    ]).then(([exRes, clRes]) => {
      const exams = Array.isArray(exRes?.data) ? exRes.data : []
      const classes = Array.isArray(clRes?.data) ? clRes.data : []

      if (exams.length > 0) {
        setExamsList(exams)
        const activeExam = exams.find((ex: any) => Array.isArray(ex.assignments) && ex.assignments.some((a: any) => a.is_open)) || exams[0]
        setExamId((prev) => (exams.some((ex: any) => ex.id === prev) ? prev : activeExam.id))

        if (classes.length > 0) {
          setClassesList(classes)
          const openAssignment = Array.isArray(activeExam.assignments)
            ? activeExam.assignments.find((a: any) => a.is_open) || activeExam.assignments[0]
            : null
          const targetClassId = openAssignment?.class_id || classes[0].id
          setClassId((prev) => (classes.some((c: any) => c.id === prev) ? prev : targetClassId))
        }
      } else if (classes.length > 0) {
        setClassesList(classes)
        setClassId((prev) => (classes.some((c: any) => c.id === prev) ? prev : classes[0].id))
      }
    })
  }, [])

  // Fetch real monitoring data from Backend API
  const fetchLiveMonitoring = async () => {
    if (!examId || !classId) return
    try {
      const res = await api.monitor.getClassExamMonitoring(examId, classId)
      if (res.data?.students) {
        const mapped: StudentMonitorItem[] = res.data.students.map((st: any) => ({
          id: st.student_id.toString(),
          code: st.student_code,
          name: st.full_name,
          initials: st.full_name.split(' ').slice(-2).map((w: string) => w[0]).join('') || 'HS',
          status: st.status,
          statusLabel: st.status_label || (st.status === 'completed' ? 'ĐÃ XONG' : st.status === 'in_progress' ? 'ĐANG LÀM BÀI' : 'CHƯA MỞ ĐỀ'),
          score: st.total_score,
          correctCount: st.correct_answers_count,
          totalQuestions: res.data.exam?.total_questions || 5,
          startTime: st.started_at ? new Date(st.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
          submittedTime: st.submitted_at ? 'Vừa xong' : null,
          duration: st.duration_seconds ? `${Math.floor(st.duration_seconds / 60)}m ${st.duration_seconds % 60}s` : null,
          coins: st.earned_coins || 0,
          points: st.earned_points || 0,
          cheatWarnings: 0
        }))
        setStudentList(mapped)
        if (res.data.assignment) {
          setIsOpenExam(Boolean(res.data.assignment.is_open))
        }
      }
    } catch (err: any) {
      console.debug('Error fetching monitoring data:', err.message)
      setStudentList([])
    }
  }

  // Socket.IO real-time subscription
  useEffect(() => {
    if (!examId || !classId) return
    fetchLiveMonitoring()
    fetchExamSecurity(examId, classId)

    // Join room
    joinMonitorRoom(examId, classId, 'teacher', user?.full_name || 'Giáo viên')
    const socket = getSocket()

    if (socket) {
      setSocketConnected(socket.connected)
      const onConnect = () => setSocketConnected(true)
      const onDisconnect = () => setSocketConnected(false)

      const onStudentStatus = (payload: any) => {
        setStudentList((prev) =>
          prev.map((s) => {
            if (s.id === payload.student_id?.toString() || s.code === payload.student_code) {
              return {
                ...s,
                status: payload.status,
                statusLabel: payload.status === 'completed' ? 'ĐÃ XONG' : payload.status === 'in_progress' ? 'ĐANG LÀM BÀI' : 'CHƯA MỞ ĐỀ',
                score: payload.total_score ?? s.score,
                correctCount: payload.correct_answers_count ?? s.correctCount,
                submittedTime: payload.status === 'completed' ? 'Vừa xong' : s.submittedTime,
                coins: payload.earned_coins ?? s.coins,
                points: payload.earned_points ?? s.points
              }
            }
            return s
          })
        )

        const eventTitle = payload.status === 'completed'
          ? `${payload.full_name || 'Học sinh'} vừa nộp bài thi!`
          : `${payload.full_name || 'Học sinh'} bắt đầu mở đề (Đã trộn ngẫu nhiên)`
        const eventDesc = payload.total_score !== undefined
          ? `Đạt ${payload.total_score} điểm · Thưởng +${payload.earned_coins || 0} xu`
          : 'Đã nhận bộ câu hỏi & đáp án A-B-C-D riêng'

        setLiveEvents((prev) => [
          {
            id: Date.now().toString(),
            title: eventTitle,
            desc: eventDesc,
            time: 'Vừa xong',
            type: payload.status === 'completed' ? 'emerald' : 'amber'
          },
          ...prev.slice(0, 9)
        ])
      }

      const onAssignmentToggled = (payload: any) => {
        if (payload.classId === classId) {
          setIsOpenExam(payload.isOpen)
        }
      }

      const onCheatWarning = (payload: any) => {
        setStudentList((prev) =>
          prev.map((s) => {
            if (s.id === payload.student_id?.toString() || s.code === payload.student_code) {
              return {
                ...s,
                cheatWarnings: (s.cheatWarnings || 0) + 1
              }
            }
            return s
          })
        )

        setLiveEvents((prev) => [
          {
            id: `cheat-${Date.now()}`,
            title: `⚠️ Cảnh báo: ${payload.full_name || 'Học sinh'} (${payload.student_code || ''})`,
            desc: `${payload.reason || 'Rời màn hình / chuyển tab khi đang thi'} (Lần ${payload.warningCount || 1})`,
            time: 'Tức thì',
            type: 'rose'
          },
          ...prev.slice(0, 9)
        ])
      }

      socket.on('connect', onConnect)
      socket.on('disconnect', onDisconnect)
      socket.on('student_status_update', onStudentStatus)
      socket.on('exam_assignment_toggled', onAssignmentToggled)
      socket.on('student_cheat_warning', onCheatWarning)

      return () => {
        leaveMonitorRoom(examId, classId)
        socket.off('connect', onConnect)
        socket.off('disconnect', onDisconnect)
        socket.off('student_status_update', onStudentStatus)
        socket.off('exam_assignment_toggled', onAssignmentToggled)
        socket.off('student_cheat_warning', onCheatWarning)
      }
    }
  }, [examId, classId, user?.full_name])

  // Toggle release exam
  const handleToggleRelease = async () => {
    const nextState = !isOpenExam
    setIsOpenExam(nextState)
    try {
      await api.exams.toggleClass(examId, { class_id: classId, is_open: nextState })
    } catch (err: any) {
      console.debug('Failed to toggle class status:', err.message)
    }
  }

  // Send Live Broadcast / Warning to Class or Specific Student
  const handleSendBroadcast = async (customText?: string, customLevel?: 'info' | 'warning' | 'urgent', customStudent?: { id: number; name: string; code: string } | null) => {
    const msgToSend = (customText !== undefined ? customText : broadcastMessage).trim()
    if (!msgToSend) return

    const levelToUse = customLevel || broadcastLevel
    const studentToUse = customStudent !== undefined ? customStudent : targetStudent

    setIsSendingBroadcast(true)
    try {
      const payload = {
        examId,
        classId,
        studentId: studentToUse ? studentToUse.id : null,
        studentName: studentToUse ? studentToUse.name : null,
        title: studentToUse
          ? `Nhắc nhở trực tiếp: ${studentToUse.name} (${studentToUse.code})`
          : levelToUse === 'urgent'
          ? 'Cảnh báo khẩn từ Giáo viên coi thi'
          : levelToUse === 'warning'
          ? 'Nhắc nhở phòng thi trực tuyến'
          : 'Thông báo từ Giáo viên bộ môn',
        message: msgToSend,
        level: levelToUse,
        senderName: user?.full_name || 'Giáo viên giám sát'
      }

      // Gửi qua REST API (đồng thời kích hoạt Socket.IO trên server) hoặc trực tiếp qua Socket
      try {
        await api.monitor.sendBroadcast(payload)
      } catch {
        sendTeacherBroadcastSocket(payload)
      }

      setLiveEvents((prev) => [
        {
          id: `bc-${Date.now()}`,
          title: studentToUse
            ? `📢 Đã gửi cảnh báo tới ${studentToUse.name}`
            : `📢 Đã phát thông báo toàn phòng thi`,
          desc: msgToSend,
          time: 'Vừa xong',
          type: levelToUse === 'urgent' ? 'rose' : levelToUse === 'warning' ? 'amber' : 'violet'
        },
        ...prev.slice(0, 9)
      ])

      if (customText === undefined) {
        setBroadcastMessage('')
      }
      setBroadcastBannerToast(
        studentToUse
          ? `✓ Đã gửi cảnh báo tức thì tới màn hình của học sinh ${studentToUse.name}!`
          : `✓ Đã phát thông báo tức thì tới toàn bộ học sinh đang thi!`
      )
      setTimeout(() => setBroadcastBannerToast(null), 3500)
    } finally {
      setIsSendingBroadcast(false)
    }
  }

  // Timer
  useEffect(() => {
    const interval = setInterval(() => setElapsedTimer((prev) => prev + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  const runningSeconds = `${Math.floor(elapsedTimer / 60).toString().padStart(2, '0')}:${(elapsedTimer % 60).toString().padStart(2, '0')}`

  // Metrics
  const summary = useMemo(() => {
    const total = studentList.length
    const completed = studentList.filter((s) => s.status === 'completed').length
    const inProgress = studentList.filter((s) => s.status === 'in_progress').length
    const notStarted = studentList.filter((s) => s.status === 'not_started').length
    const avgScore = completed > 0
      ? (studentList.filter((s) => s.score !== null).reduce((acc, s) => acc + (s.score || 0), 0) / completed).toFixed(1)
      : '0.0'
    return { total, completed, inProgress, notStarted, avgScore }
  }, [studentList])

  const filteredStudents = useMemo(() => {
    return studentList.filter((s) => {
      const matchFilter = filterStatus === 'all' || s.status === filterStatus
      const matchSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(searchQuery.toLowerCase())
      return matchFilter && matchSearch
    })
  }, [studentList, filterStatus, searchQuery])

  const currentClassName = classesList.find((c) => c.id === classId)?.name || '10A1'

  return (
    <div className={embedded ? 'module-embedded' : 'module-shell'}>
      {!embedded && (
        <header className="module-header">
          <div className="brand">
            <div className="brand-mark"><Sparkles size={17} /></div>
            <span>Edu<span className="brand-accent">Test</span></span>
          </div>
          <div className="module-context">
            <span className="module-context-dot" />
            COMMAND CENTER · GIÁM SÁT THỜI GIAN THỰC (REAL-TIME)
          </div>
          {onBack && <button className="secondary-button" onClick={onBack}>← Về tổng quan</button>}
        </header>
      )}

      {/* Toast Notification when broadcast is sent */}
      <AnimatePresence>
        {broadcastBannerToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'fixed',
              top: 22,
              right: 24,
              zIndex: 9999,
              padding: '12px 18px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              boxShadow: '0 12px 30px rgba(16, 185, 129, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Megaphone size={16} />
            <span>{broadcastBannerToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="content-wrap" style={{ maxWidth: 1400, paddingTop: 30 }}>
        {/* Top title and control bar */}
        <div className="page-heading" style={{ marginBottom: 20 }}>
          <div>
            <div className="eyebrow">
              <Activity size={14} /> LIVE MONITORING & BROADCAST OPERATIONS
            </div>
            <h1>Giám sát trực tiếp & Phát thông báo phòng thi</h1>
            <p>Theo dõi tiến độ làm bài, tự động đảo mã đề chống nhìn bài và phát thông báo/cảnh báo tức thì tới màn hình học sinh.</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Real Socket.io Status */}
            <div className="socket-status" style={{ background: socketConnected ? 'rgba(56,217,165,0.08)' : 'rgba(239,95,112,0.08)', borderRadius: 10, border: `1px solid ${socketConnected ? 'rgba(56,217,165,0.25)' : 'rgba(239,95,112,0.25)'}` }}>
              <span className="socket-dot" style={{ background: socketConnected ? '#38d9a5' : '#ef5f70' }} />
              <div>
                <strong style={{ color: socketConnected ? '#4bd8aa' : '#ef5f70' }}>
                  {socketConnected ? 'SOCKET.IO LIVE' : 'SOCKET RECONNECTING'}
                </strong>
                <small>ROOM: exam_{examId}_class_{classId}</small>
              </div>
            </div>

            {/* Toggle release */}
            <button
              onClick={handleToggleRelease}
              className={`release-toggle ${isOpenExam ? 'on' : ''}`}
              style={{ minHeight: 42 }}
            >
              <span className="toggle-track"><i /></span>
              <span>
                {isOpenExam ? 'Đang mở phát đề' : 'Đã đóng phát đề'}
                <small>{isOpenExam ? 'Học sinh đang làm được' : 'Đã khóa bài thi'}</small>
              </span>
            </button>

            <button
              onClick={fetchLiveMonitoring}
              className="icon-button"
              title="Làm mới dữ liệu từ API"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* Exam and Class Selector Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '14px 18px', background: 'rgba(16,21,33,0.7)', borderRadius: 12, border: '1px solid var(--line)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 340px', minWidth: 240, maxWidth: '100%' }}>
            <FileText size={16} color="#8b7cf6" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0, whiteSpace: 'nowrap' }}>Đề thi:</span>
            <select
              value={examId}
              onChange={(e) => {
                const nextExamId = Number(e.target.value)
                setExamId(nextExamId)
                const selectedExam = examsList.find((ex) => ex.id === nextExamId)
                if (Array.isArray(selectedExam?.assignments) && selectedExam.assignments.length > 0) {
                  const hasCurrentClass = selectedExam.assignments.some((a: any) => a.class_id === classId)
                  if (!hasCurrentClass) {
                    const openAss = selectedExam.assignments.find((a: any) => a.is_open) || selectedExam.assignments[0]
                    if (openAss?.class_id) setClassId(openAss.class_id)
                  }
                }
              }}
              style={{ background: '#121727', border: '1px solid var(--line)', color: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 13, outline: 'none', flex: 1, minWidth: 0, width: '100%', maxWidth: '100%', textOverflow: 'ellipsis', cursor: 'pointer' }}
            >
              {examsList.map((ex) => (
                <option key={ex.id} value={ex.id} style={{ background: '#121727' }}>
                  {ex.code}: {ex.title} ({ex.total_questions} câu)
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <Users size={16} color="#49abff" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0, whiteSpace: 'nowrap' }}>Lớp học:</span>
            <select
              value={classId}
              onChange={(e) => setClassId(Number(e.target.value))}
              style={{ background: '#121727', border: '1px solid var(--line)', color: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 13, outline: 'none', minWidth: 120, cursor: 'pointer' }}
            >
              {classesList.map((cl) => (
                <option key={cl.id} value={cl.id} style={{ background: '#121727' }}>
                  {cl.name.startsWith('Lớp') ? cl.name : `Lớp ${cl.name}`}
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 8,
              background: 'rgba(49, 213, 160, 0.1)',
              border: '1px solid rgba(49, 213, 160, 0.3)',
              color: '#34d399',
              fontSize: 11,
              fontWeight: 700,
              flexShrink: 0
            }}
          >
            <span>🔀 Chế độ đảo câu hỏi & đáp án A-B-C-D: ĐANG BẬT</span>
          </div>

          <button
            type="button"
            onClick={() => {
              const ex = examsList.find((e) => e.id === examId) || { id: examId, code: 'DE_THI', title: 'Đề kiểm tra', duration_minutes: 15, total_questions: 5 }
              exportClassScoreboardExcel({
                exam: { ...ex, duration_minutes: 15 },
                classroom: { id: classId, name: currentClassName, code: `LOP_${currentClassName}` },
                students: studentList.map((s, idx) => ({
                  stt: idx + 1,
                  student_id: Number(s.id),
                  student_code: s.code,
                  full_name: s.name,
                  status: s.status,
                  status_label: s.statusLabel,
                  total_score: s.score,
                  correct_answers_count: s.correctCount,
                  duration_seconds: null
                }))
              })
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 12px',
              borderRadius: 8,
              background: 'linear-gradient(135deg, #10b981, #059669)',
              border: 0,
              color: '#fff',
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            <FileSpreadsheet size={14} /> Xuất Excel Bộ GD&ĐT
          </button>

          <button
            type="button"
            onClick={() => {
              const ex = examsList.find((e) => e.id === examId) || { id: examId, code: 'DE_THI', title: 'Đề kiểm tra', duration_minutes: 15, total_questions: 5 }
              exportClassScoreboardPDF({
                exam: { ...ex, duration_minutes: 15 },
                classroom: { id: classId, name: currentClassName, code: `LOP_${currentClassName}` },
                students: studentList.map((s, idx) => ({
                  stt: idx + 1,
                  student_id: Number(s.id),
                  student_code: s.code,
                  full_name: s.name,
                  status: s.status,
                  status_label: s.statusLabel,
                  total_score: s.score,
                  correct_answers_count: s.correctCount,
                  duration_seconds: null
                }))
              })
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 12px',
              borderRadius: 8,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 0,
              color: '#fff',
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            <Printer size={14} /> Xuất PDF Bộ GD&ĐT
          </button>
        </div>

        {/* EXAM SESSION PIN & SINGLE-DEVICE ANTI-PROXY LOCK PANEL */}
        <div
          style={{
            marginBottom: 20,
            padding: '16px 20px',
            borderRadius: 15,
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(18, 23, 39, 0.94) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.38)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                boxShadow: '0 6px 18px rgba(245, 158, 11, 0.35)'
              }}
            >
              <KeyRound size={20} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 14, color: '#fff' }}>
                  Mã PIN Ca Thi & Khóa 1 Thiết Bị Duy Nhất (Chống Làm Hộ Bài)
                </strong>
                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: pinConfig.isPinRequired ? 'rgba(16, 185, 129, 0.16)' : 'rgba(148, 163, 184, 0.15)',
                    color: pinConfig.isPinRequired ? '#34d399' : '#94a3b8',
                    border: `1px solid ${pinConfig.isPinRequired ? 'rgba(16, 185, 129, 0.35)' : 'rgba(148, 163, 184, 0.3)'}`
                  }}
                >
                  {pinConfig.isPinRequired ? '🔒 ĐANG YÊU CẦU MÃ PIN & KHÓA 1 MÁY' : 'ĐÃ TẮT YÊU CẦU PIN'}
                </span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: 11.5, color: '#cbd5e1' }}>
                Cung cấp mã PIN bên dưới cho học sinh tại phòng thi. Mỗi tài khoản chỉ được mở đề trên <strong>1 thiết bị duy nhất</strong> tại một thời điểm.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* 6-digit PIN Display */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '7px 14px',
                borderRadius: 10,
                background: 'rgba(10, 14, 26, 0.9)',
                border: '1.5px solid rgba(251, 191, 36, 0.5)'
              }}
            >
              <span style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 700 }}>MÃ PIN CA THI:</span>
              <strong
                style={{
                  fontSize: 20,
                  fontWeight: 900,
                  letterSpacing: 4,
                  color: '#fbbf24',
                  fontFamily: 'monospace'
                }}
              >
                {pinConfig.pinCode}
              </strong>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(pinConfig.pinCode)
                  setBroadcastBannerToast(`📋 Đã sao chép mã PIN ca thi: ${pinConfig.pinCode}`)
                  setTimeout(() => setBroadcastBannerToast(null), 2500)
                }}
                style={{
                  border: 0,
                  background: 'rgba(255,255,255,0.08)',
                  color: '#e2e8f0',
                  borderRadius: 6,
                  padding: '4px 6px',
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center'
                }}
                title="Sao chép mã PIN"
              >
                <Copy size={13} />
              </button>
            </div>

            <button
              type="button"
              onClick={handleRegeneratePin}
              disabled={isUpdatingSecurity}
              style={{
                padding: '8px 12px',
                borderRadius: 9,
                border: '1px solid rgba(245, 158, 11, 0.45)',
                background: 'rgba(245, 158, 11, 0.14)',
                color: '#fbbf24',
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
              title="Sinh ngẫu nhiên mã PIN 6 số mới cho ca thi"
            >
              <RefreshCw size={13} /> Đổi PIN mới
            </button>

            <button
              type="button"
              onClick={() =>
                handleSendBroadcast(
                  `🔑 MÃ PIN CA THI HIỆN TẠI: ${pinConfig.pinCode} — Các em nhập đúng 6 chữ số này để mở đề thi (Lưu ý: Mỗi tài khoản chỉ được thi trên 1 thiết bị duy nhất).`,
                  'info',
                  null
                )
              }
              style={{
                padding: '8px 12px',
                borderRadius: 9,
                border: '1px solid rgba(56, 189, 248, 0.4)',
                background: 'rgba(56, 189, 248, 0.14)',
                color: '#38bdf8',
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
              title="Phát mã PIN lên màn hình toàn lớp"
            >
              <Megaphone size={13} /> Phát PIN cho lớp
            </button>

            <button
              type="button"
              onClick={handleTogglePinRequired}
              style={{
                padding: '8px 12px',
                borderRadius: 9,
                border: '1px solid rgba(255, 255, 255, 0.14)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#cbd5e1',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {pinConfig.isPinRequired ? 'Tắt PIN' : 'Bật PIN'}
            </button>

            {deviceLocks.length > 0 && (
              <button
                type="button"
                onClick={() => handleUnlockStudentDevice()}
                style={{
                  padding: '8px 12px',
                  borderRadius: 9,
                  border: '1px solid rgba(239, 68, 68, 0.45)',
                  background: 'rgba(239, 68, 68, 0.14)',
                  color: '#fca5a5',
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
                title="Mở khóa toàn bộ thiết bị trong lớp"
              >
                <Unlock size={13} /> Mở khóa tất cả ({deviceLocks.length} máy)
              </button>
            )}
          </div>
        </div>

        {/* LIVE TEACHER-STUDENT BROADCAST PANEL */}
        <div
          style={{
            marginBottom: 24,
            padding: '18px 20px',
            borderRadius: 15,
            background: 'linear-gradient(135deg, rgba(139, 124, 246, 0.12) 0%, rgba(18, 23, 39, 0.92) 100%)',
            border: '1px solid rgba(139, 124, 246, 0.35)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: 14
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#fff',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)'
                }}
              >
                <Megaphone size={18} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <strong style={{ fontSize: 14, color: '#fff' }}>
                    Kênh phát thông báo & Cảnh báo tức thì (Live Teacher-Student Broadcast)
                  </strong>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 6,
                      background: 'rgba(239, 68, 68, 0.16)',
                      color: '#f87171',
                      border: '1px solid rgba(239, 68, 68, 0.35)'
                    }}
                  >
                    REAL-TIME PUSH
                  </span>
                </div>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>
                  Tin nhắn hoặc cảnh báo sẽ bật lên ngay lập tức trên màn hình làm bài của học sinh lớp {currentClassName}.
                </p>
              </div>
            </div>

            {/* Level Selector & Target Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {targetStudent ? (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 10px',
                    borderRadius: 8,
                    background: 'rgba(239, 68, 68, 0.18)',
                    border: '1px solid rgba(239, 68, 68, 0.45)',
                    color: '#fca5a5',
                    fontSize: 11,
                    fontWeight: 700
                  }}
                >
                  <span>🎯 Đang gửi riêng: {targetStudent.name} ({targetStudent.code})</span>
                  <button
                    type="button"
                    onClick={() => setTargetStudent(null)}
                    style={{ border: 0, background: 'transparent', color: '#fff', display: 'grid', placeItems: 'center', padding: 0 }}
                    title="Chuyển về gửi toàn lớp"
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <span style={{ fontSize: 11, color: '#a78bfa', fontWeight: 600 }}>
                  📡 Phạm vi: Toàn bộ lớp {currentClassName}
                </span>
              )}

              <div style={{ display: 'flex', gap: 4, background: 'rgba(10,13,24,0.8)', padding: 3, borderRadius: 8, border: '1px solid var(--line)' }}>
                {[
                  { key: 'info', label: '📢 Thông báo', color: '#8b7cf6' },
                  { key: 'warning', label: '⏰ Nhắc nhở', color: '#f59e0b' },
                  { key: 'urgent', label: '🚨 Cảnh báo khẩn', color: '#ef4444' }
                ].map((lvl) => (
                  <button
                    key={lvl.key}
                    type="button"
                    onClick={() => setBroadcastLevel(lvl.key as any)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      border: 0,
                      background: broadcastLevel === lvl.key ? lvl.color : 'transparent',
                      color: broadcastLevel === lvl.key ? '#fff' : '#94a3b8',
                      fontSize: 11,
                      fontWeight: 700
                    }}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick 1-Click Broadcast Templates */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Phát nhanh 1 chạm:</span>
            {QUICK_BROADCAST_TEMPLATES.map((tpl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendBroadcast(tpl.text, tpl.level)}
                disabled={isSendingBroadcast}
                style={{
                  padding: '5px 10px',
                  borderRadius: 8,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.04)',
                  color: '#e2e8f0',
                  fontSize: 11,
                  fontWeight: 500,
                  transition: 'all 0.15s'
                }}
                title="Bấm để phát ngay thông báo này xuống phòng thi"
              >
                {tpl.label}
              </button>
            ))}
          </div>

          {/* Custom Broadcast Input Row */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              type="text"
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSendBroadcast()
                }
              }}
              placeholder={
                targetStudent
                  ? `Nhập nội dung nhắc nhở / cảnh báo gửi riêng cho ${targetStudent.name}...`
                  : `Nhập nội dung thông báo hoặc cảnh báo gửi tới toàn bộ học sinh lớp ${currentClassName}...`
              }
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid rgba(139, 124, 246, 0.35)',
                background: 'rgba(10, 13, 24, 0.85)',
                color: '#fff',
                fontSize: 13,
                outline: 'none'
              }}
            />
            <button
              type="button"
              onClick={() => handleSendBroadcast()}
              disabled={!broadcastMessage.trim() || isSendingBroadcast}
              className="primary-button"
              style={{
                padding: '10px 18px',
                background:
                  broadcastLevel === 'urgent'
                    ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                    : broadcastLevel === 'warning'
                    ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                    : undefined,
                opacity: !broadcastMessage.trim() || isSendingBroadcast ? 0.6 : 1
              }}
            >
              <Send size={15} />
              <span>{targetStudent ? `Gửi cảnh báo cho ${targetStudent.code}` : 'Phát thông báo ngay'}</span>
            </button>
          </div>
        </div>

        {/* 5 KPI Metric Cards */}
        <div className="metrics-grid">
          <motion.div whileHover={{ y: -3 }} className="metric-card">
            <div className="metric-top"><span>TỔNG SĨ SỐ</span><Users size={17} /></div>
            <div className="metric-value">{summary.total}</div>
            <div className="metric-detail">100% học sinh trong lớp</div>
          </motion.div>

          <motion.div whileHover={{ y: -3 }} className="metric-card success">
            <div className="metric-top"><span>ĐÃ NỘP BÀI</span><Check size={17} /></div>
            <div className="metric-value" style={{ color: '#48dbb0' }}>{summary.completed}</div>
            <div className="metric-detail">Đã hoàn thành và có điểm</div>
          </motion.div>

          <motion.div whileHover={{ y: -3 }} className="metric-card warning">
            <div className="metric-top"><span>ĐANG LÀM BÀI</span><Clock3 size={17} /></div>
            <div className="metric-value" style={{ color: '#f5ad52' }}>{summary.inProgress}</div>
            <div className="metric-detail">Đang làm trong phòng thi</div>
          </motion.div>

          <motion.div whileHover={{ y: -3 }} className="metric-card muted">
            <div className="metric-top"><span>CHƯA MỞ ĐỀ</span><Radio size={17} /></div>
            <div className="metric-value" style={{ color: '#8891a9' }}>{summary.notStarted}</div>
            <div className="metric-detail">Chưa bấm vào đề thi</div>
          </motion.div>

          <motion.div whileHover={{ y: -3 }} className="metric-card chart">
            <div className="metric-top"><span>ĐIỂM TRUNG BÌNH</span><Activity size={17} /></div>
            <div className="metric-value" style={{ color: '#a99aff' }}>{summary.avgScore} <span style={{ fontSize: 14 }}>/10</span></div>
            <div className="metric-detail">Dựa trên các bài đã nộp</div>
          </motion.div>
        </div>

        {/* Main Grid: Student Table & Live Event Stream */}
        <div className="dashboard-grid">
          {/* Student Status Table */}
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Danh sách học sinh & Trạng thái làm bài</h2>
                <p>Bấm nút 🔔 ở từng dòng để gửi cảnh báo / nhắc nhở đích danh tới màn hình học sinh đó</p>
              </div>

              {/* Status Filters */}
              <div style={{ display: 'flex', gap: 6 }}>
                {[
                  { key: 'all', label: `Tất cả (${summary.total})` },
                  { key: 'completed', label: `Đã xong (${summary.completed})` },
                  { key: 'in_progress', label: `Đang làm (${summary.inProgress})` },
                  { key: 'not_started', label: `Chưa mở (${summary.notStarted})` },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setFilterStatus(item.key)}
                    style={{
                      border: '1px solid var(--line)',
                      background: filterStatus === item.key ? 'rgba(139,124,246,0.25)' : 'transparent',
                      color: filterStatus === item.key ? '#fff' : 'var(--muted)',
                      borderColor: filterStatus === item.key ? '#8b7cf6' : 'var(--line)',
                      borderRadius: 8,
                      padding: '5px 10px',
                      fontSize: 11
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div style={{ padding: '0 19px 12px' }}>
              <div className="search-box" style={{ width: '100%' }}>
                <Search size={15} />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm học sinh theo tên hoặc mã HS (HS001, An, Bích...)..."
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ overflowX: 'auto', width: '100%' }}>
            <div style={{ minWidth: 820 }}>
            <div
              className="table-head"
              style={{
                gridTemplateColumns:
                  'minmax(155px, 1.4fr) minmax(110px, 0.95fr) minmax(80px, 0.6fr) minmax(85px, 0.7fr) minmax(120px, 0.9fr) max-content',
                columnGap: 12
              }}
            >
              <span>HỌC SINH</span>
              <span>TRẠNG THÁI</span>
              <span>ĐIỂM SỐ</span>
              <span>THỜI GIAN LÀM</span>
              <span>NỘP BÀI / THƯỞNG</span>
              <span style={{ textAlign: 'right' }}>CẢNH BÁO</span>
            </div>

            <div className="student-list">
              <AnimatePresence>
                {filteredStudents.map((student) => (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="student-row"
                    style={{
                      gridTemplateColumns:
                        'minmax(155px, 1.4fr) minmax(110px, 0.95fr) minmax(80px, 0.6fr) minmax(85px, 0.7fr) minmax(120px, 0.9fr) max-content',
                      columnGap: 12
                    }}
                  >
                    <div className="student-name">
                      <div className={`student-avatar ${student.status === 'completed' ? 'blue' : student.status === 'in_progress' ? 'amber' : ''}`}>
                        {student.initials}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <strong>{student.name}</strong>
                          {(student.cheatWarnings || 0) > 0 && (
                            <span
                              style={{
                                fontSize: 9,
                                fontWeight: 700,
                                padding: '1px 5px',
                                borderRadius: 4,
                                background: 'rgba(239, 68, 68, 0.2)',
                                color: '#f87171',
                                border: '1px solid rgba(239, 68, 68, 0.4)'
                              }}
                              title="Số lần chuyển tab / rời màn hình"
                            >
                              ⚠️ {student.cheatWarnings}
                            </span>
                          )}
                        </div>
                        <span>{student.code} · {currentClassName.startsWith('Lớp') ? currentClassName : `Lớp ${currentClassName}`}</span>
                      </div>
                    </div>

                    <div>
                      <span className={`status-badge ${student.status === 'completed' ? 'done' : student.status === 'in_progress' ? 'doing' : 'waiting'}`}>
                        <i />
                        {student.statusLabel}
                      </span>
                    </div>

                    <div className="score">
                      {student.score !== null ? (
                        <>
                          <strong style={{ color: '#48dbb0' }}>{Number(student.score).toFixed(1)}</strong>
                          <span>/ 10 ({student.correctCount}/{student.totalQuestions})</span>
                        </>
                      ) : (
                        <span style={{ color: '#656e86' }}>—</span>
                      )}
                    </div>

                    <div className="row-time">
                      {student.status === 'in_progress' && (
                        <span style={{ color: '#f5ad52', fontWeight: 600 }}>
                          <b className="tiny-live" />
                          {runningSeconds}
                        </span>
                      )}
                      {student.status === 'completed' && (student.duration || '15m')}
                      {student.status === 'not_started' && <span style={{ color: '#656e86' }}>Chưa vào thi</span>}
                    </div>

                    <div className="row-submitted" style={{ minWidth: 0, overflow: 'hidden' }}>
                      {student.status === 'completed' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {student.submittedTime || 'Đã nộp'}
                          </span>
                          <span style={{ color: '#f4b34f', fontSize: 10, whiteSpace: 'nowrap' }}>
                            +{student.coins} xu · +{student.points}đ
                          </span>
                        </div>
                      ) : student.status === 'in_progress' ? (
                        <span style={{ color: '#f5ad52', whiteSpace: 'nowrap' }}>Đang kết nối</span>
                      ) : (
                        <span style={{ color: '#656e86', whiteSpace: 'nowrap' }}>Chưa nộp</span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', alignItems: 'center', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setTargetStudent({ id: Number(student.id), name: student.name, code: student.code })
                          setBroadcastLevel('urgent')
                          window.scrollTo({ top: 140, behavior: 'smooth' })
                        }}
                        title={`Soạn tin nhắc nhở riêng cho ${student.name}`}
                        style={{
                          padding: '4px 7px',
                          borderRadius: 6,
                          border: '1px solid rgba(245, 173, 82, 0.35)',
                          background: 'rgba(245, 173, 82, 0.12)',
                          color: '#fbbf24',
                          fontSize: 10,
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}
                      >
                        <Bell size={11} /> Nhắc
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleUnlockStudentDevice(Number(student.id), student.name)
                        }
                        title={`Mở khóa thiết bị cho ${student.name} (cho phép đổi máy khi sự cố)`}
                        style={{
                          padding: '4px 6px',
                          borderRadius: 6,
                          border: '1px solid rgba(56, 189, 248, 0.4)',
                          background: 'rgba(56, 189, 248, 0.14)',
                          color: '#38bdf8',
                          fontSize: 10,
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          flexShrink: 0
                        }}
                      >
                        <Unlock size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleSendBroadcast(
                            `⚠️ Cảnh báo trực tiếp từ Giáo viên: Yêu cầu học sinh ${student.name} (${student.code}) tập trung làm bài nghiêm túc trên màn hình!`,
                            'urgent',
                            { id: Number(student.id), name: student.name, code: student.code }
                          )
                        }
                        title={`Gửi cảnh báo khẩn tức thì tới màn hình của ${student.name}`}
                        style={{
                          padding: '4px 6px',
                          borderRadius: 6,
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#f87171',
                          fontSize: 10,
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          flexShrink: 0
                        }}
                      >
                        <ShieldAlert size={12} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            </div>
            </div>
          </section>

          {/* Live Activity Stream */}
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Luồng sự kiện & Cảnh báo Socket.IO</h2>
                <p>Cập nhật tự động nộp bài, mở đề & cảnh báo gian lận</p>
              </div>
              <span className="activity-live"><i /> LIVE</span>
            </div>

            <div className="activity-list">
              {liveEvents.map((ev) => (
                <div key={ev.id} className="activity-item">
                  <div className={`activity-icon ${ev.type}`}>
                    {ev.type === 'emerald' ? (
                      <Check size={15} />
                    ) : ev.type === 'amber' ? (
                      <Clock3 size={15} />
                    ) : ev.type === 'rose' ? (
                      <AlertTriangle size={15} />
                    ) : (
                      <Radio size={15} />
                    )}
                  </div>
                  <div>
                    <strong>{ev.title}</strong>
                    <span>{ev.desc}</span>
                  </div>
                  <time>{ev.time}</time>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  )
}
