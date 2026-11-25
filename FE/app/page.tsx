'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  ArrowRight,
  Bell,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Code2,
  Ellipsis,
  ExternalLink,
  FileText,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  LogIn,
  LogOut,
  MoreHorizontal,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Settings2,
  Sparkles,
  Trophy,
  Users,
  WalletCards,
  X,
  Zap,
  BarChart3,
  FileSpreadsheet,
  Printer,
  KeyRound,
  Copy,
} from 'lucide-react'

// Import Modules
import LiveMonitorModule from '@/components/modules/LiveMonitorModule'
import ExamRepoModule from '@/components/modules/ExamRepoModule'
import ClassroomTreeModule from '@/components/modules/ClassroomTreeModule'
import QuestionBankModule from '@/components/modules/QuestionBankModule'
import SubjectManagementModule from '@/components/modules/SubjectManagementModule'
import LeaderboardModule from '@/components/modules/LeaderboardModule'
import ExamAnalyticsReportModule from '@/components/modules/ExamAnalyticsReportModule'
import StudentWorkspace from '@/components/modules/StudentWorkspace'
import AdminModule from '@/components/modules/AdminModule'
import { ThemeToggle } from '@/components/ThemeToggle'
import { AuthProvider, useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { getSocket, joinMonitorRoom, leaveMonitorRoom, sendTeacherBroadcastSocket } from '@/lib/socket'
import { exportClassScoreboardExcel, exportClassScoreboardPDF } from '@/lib/report-export'

const navItems = [
  { icon: LayoutDashboard, label: 'Tổng quan' },
  { icon: Activity, label: 'Giám sát trực tiếp', live: true },
  { icon: BarChart3, label: 'Phổ điểm & Báo cáo' },
  { icon: FileText, label: 'Kho đề thi' },
  { icon: Users, label: 'Lớp học & học sinh' },
]

interface ExamItem {
  id: number
  code: string
  title: string
  duration_minutes: number
  total_questions: number
  passing_score?: number
}

interface ClassroomItem {
  id: number
  name: string
  code: string
  grade_name?: string
  student_count?: number
}

interface StudentItem {
  student_id: number
  student_code: string
  full_name: string
  status: 'completed' | 'in_progress' | 'not_started'
  status_label: string
  total_score: number | null
  correct_answers_count: number | null
  started_at: string | null
  submitted_at: string | null
  duration_seconds: number | null
  earned_coins: number
  earned_points: number
}

interface MonitorStats {
  total_students: number
  completed_count: number
  in_progress_count: number
  not_started_count: number
  completion_rate: number
  average_score: number
  highest_score: number
  lowest_score: number
}

// Fallback initial data
const fallbackExams: ExamItem[] = [
  { id: 1, code: 'DE_TOAN_10_01', title: 'Kiểm tra 15p · Hàm số bậc hai', duration_minutes: 15, total_questions: 5, passing_score: 5.0 },
  { id: 2, code: 'DE_LY_10_01', title: 'Ôn tập Vật Lý 10 · Động học', duration_minutes: 20, total_questions: 3, passing_score: 5.0 }
]

const fallbackClassrooms: ClassroomItem[] = [
  { id: 1, name: '10A1', code: 'LOP_10A1', grade_name: 'Khối 10', student_count: 5 },
  { id: 2, name: '10A2', code: 'LOP_10A2', grade_name: 'Khối 10', student_count: 2 }
]

const fallbackStudents: StudentItem[] = [
  { student_id: 1, student_code: 'HS001', full_name: 'Nguyễn Văn An', status: 'completed', status_label: 'Đã xong', total_score: 8.0, correct_answers_count: 4, started_at: '2026-03-24T08:00:00Z', submitted_at: '2026-03-24T08:15:00Z', duration_seconds: 900, earned_coins: 40, earned_points: 20 },
  { student_id: 2, student_code: 'HS002', full_name: 'Lê Thị Bích', status: 'in_progress', status_label: 'Đang làm bài', total_score: null, correct_answers_count: null, started_at: '2026-03-24T08:05:00Z', submitted_at: null, duration_seconds: 512, earned_coins: 0, earned_points: 0 },
  { student_id: 3, student_code: 'HS003', full_name: 'Trần Hoàng Cường', status: 'not_started', status_label: 'Chưa mở đề', total_score: null, correct_answers_count: null, started_at: null, submitted_at: null, duration_seconds: null, earned_coins: 0, earned_points: 0 },
  { student_id: 4, student_code: 'HS004', full_name: 'Phạm Ngọc Dung', status: 'not_started', status_label: 'Chưa mở đề', total_score: null, correct_answers_count: null, started_at: null, submitted_at: null, duration_seconds: null, earned_coins: 0, earned_points: 0 },
  { student_id: 5, student_code: 'HS005', full_name: 'Đỗ Quang Em', status: 'not_started', status_label: 'Chưa mở đề', total_score: null, correct_answers_count: null, started_at: null, submitted_at: null, duration_seconds: null, earned_coins: 0, earned_points: 0 },
]

const TAB_MAP: Record<string, string> = {
  'tong-quan': 'Tổng quan',
  'giam-sat': 'Giám sát trực tiếp',
  'pho-diem': 'Phổ điểm & Báo cáo',
  'kho-de-thi': 'Kho đề thi',
  'lop-hoc': 'Lớp học & học sinh',
  'quan-ly-mon-hoc': 'Quản lý môn học',
  'ngan-hang': 'Ngân hàng câu hỏi',
  'thanh-tich': 'Bảng thành tích'
}

const REVERSE_TAB_MAP: Record<string, string> = {
  'Tổng quan': 'tong-quan',
  'Giám sát trực tiếp': 'giam-sat',
  'Phổ điểm & Báo cáo': 'pho-diem',
  'Kho đề thi': 'kho-de-thi',
  'Lớp học & học sinh': 'lop-hoc',
  'Quản lý môn học': 'quan-ly-mon-hoc',
  'Ngân hàng câu hỏi': 'ngan-hang',
  'Bảng thành tích': 'thanh-tich'
}

function MainDashboardContent() {
  const router = useRouter()
  const { user, role, setRole, loginTeacher, loginStudent, loginAdmin, logout, isLoading, token } = useAuth()
  
  // Navigation State with URL & LocalStorage persistence
  const [activeNav, setActiveNav] = useState<string>('Tổng quan')
  
  // Redirect unauthenticated users to /login
  useEffect(() => {
    if (!isLoading && (!token || !user)) {
      router.push('/login')
    }
  }, [isLoading, token, user, router])
  
  // Restore tab on mount from URL search param (?tab=...) or localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const tabParam = params.get('tab')
    const savedTab = localStorage.getItem('edutest_active_tab')

    if (tabParam && TAB_MAP[tabParam]) {
      setActiveNav(TAB_MAP[tabParam])
    } else if (savedTab && Object.values(TAB_MAP).includes(savedTab)) {
      setActiveNav(savedTab)
      const slug = REVERSE_TAB_MAP[savedTab] || 'tong-quan'
      const newUrl = `${window.location.pathname}?tab=${slug}`
      window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl)
    }
  }, [])

  const handleNavigate = (tabName: string) => {
    setActiveNav(tabName)
    if (typeof window !== 'undefined') {
      localStorage.setItem('edutest_active_tab', tabName)
      const slug = REVERSE_TAB_MAP[tabName] || 'tong-quan'
      const newUrl = `${window.location.pathname}?tab=${slug}`
      window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl)
    }
  }

  // Auto-navigate to Ngân hàng câu hỏi when importing questions from AI Chatbox
  useEffect(() => {
    const handleImportEvt = () => handleNavigate('Ngân hàng câu hỏi')
    window.addEventListener('edutest:import-ai-questions', handleImportEvt)
    return () => window.removeEventListener('edutest:import-ai-questions', handleImportEvt)
  }, [])
  
  // Selection State (Real Dropdowns!)
  const [exams, setExams] = useState<ExamItem[]>(fallbackExams)
  const [classrooms, setClassrooms] = useState<ClassroomItem[]>(fallbackClassrooms)
  const [selectedExamId, setSelectedExamId] = useState<number>(1)
  const [selectedClassId, setSelectedClassId] = useState<number>(1)
  
  // Dropdown open/close state
  const [isExamDropdownOpen, setIsExamDropdownOpen] = useState(false)
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false)
  
  const examDropdownRef = useRef<HTMLDivElement>(null)
  const classDropdownRef = useRef<HTMLDivElement>(null)
  
  // Live Data & Controls
  const [isOpen, setIsOpen] = useState(false)
  const [isTogglingRelease, setIsTogglingRelease] = useState(false)
  const [isLoadingMonitor, setIsLoadingMonitor] = useState(false)
  const [socketConnected, setSocketConnected] = useState(false)
  
  const [stats, setStats] = useState<MonitorStats>({
    total_students: 0,
    completed_count: 0,
    in_progress_count: 0,
    not_started_count: 0,
    completion_rate: 0,
    average_score: 0,
    highest_score: 0,
    lowest_score: 0
  })
  
  const [students, setStudents] = useState<StudentItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in_progress' | 'not_started'>('all')
  
  // Live Events Feed (strictly real events from database / Socket.IO)
  const [liveEvents, setLiveEvents] = useState<{ id: string; title: string; desc: string; time: string; type: string }[]>([])
  const [quickBroadcastText, setQuickBroadcastText] = useState('')
  const [quickBroadcastLevel, setQuickBroadcastLevel] = useState<'info' | 'warning' | 'urgent'>('warning')
  const [broadcastFeedback, setBroadcastFeedback] = useState<string | null>(null)
  const [overviewPinCode, setOverviewPinCode] = useState<string>('241197')

  useEffect(() => {
    if (!token || role !== 'teacher') return
    api.monitor.getExamSecurity(selectedExamId, selectedClassId).then((res) => {
      if (res.data?.pinConfig?.pinCode) {
        setOverviewPinCode(res.data.pinConfig.pinCode)
      }
    }).catch(() => {
      setOverviewPinCode(String(((Number(selectedExamId || 1) * 13579 + Number(selectedClassId || 1) * 24680 + 102938) % 900000) + 100000))
    })
  }, [selectedExamId, selectedClassId, token, role])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (examDropdownRef.current && !examDropdownRef.current.contains(event.target as Node)) {
        setIsExamDropdownOpen(false)
      }
      if (classDropdownRef.current && !classDropdownRef.current.contains(event.target as Node)) {
        setIsClassDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 1. Fetch initial lists of exams and classrooms
  useEffect(() => {
    if (isLoading || !token || !user || role !== 'teacher') return
    const fetchMetadata = async () => {
      try {
        const [examsRes, classesRes] = await Promise.allSettled([
          api.exams.getAll(),
          api.classrooms.getAll()
        ])
        
        if (examsRes.status === 'fulfilled' && Array.isArray(examsRes.value.data) && examsRes.value.data.length > 0) {
          const mappedExams: ExamItem[] = examsRes.value.data.map((e: any) => ({
            id: e.id,
            code: e.code,
            title: e.title,
            duration_minutes: e.duration_minutes,
            total_questions: e.total_questions,
            passing_score: e.passing_score
          }))
          setExams(mappedExams)
          if (!mappedExams.some(e => e.id === selectedExamId)) {
            setSelectedExamId(mappedExams[0].id)
          }
        }
        
        if (classesRes.status === 'fulfilled' && Array.isArray(classesRes.value.data) && classesRes.value.data.length > 0) {
          const mappedClasses: ClassroomItem[] = classesRes.value.data.map((c: any) => ({
            id: c.id,
            name: c.name,
            code: c.code,
            grade_name: c.grade_name || (c.grade ? c.grade.name : 'Khối'),
            student_count: c.student_count ?? (c.students ? c.students.length : 0)
          }))
          setClassrooms(mappedClasses)
          if (!mappedClasses.some(c => c.id === selectedClassId)) {
            setSelectedClassId(mappedClasses[0].id)
          }
        }
      } catch (err) {
        console.debug('Using fallback lists:', err)
      }
    }

    fetchMetadata()
  }, [isLoading, token, user, role])

  // 2. Fetch Live Monitoring Data for selected exam & classroom
  const fetchMonitoringData = async (examId: number, classId: number) => {
    setIsLoadingMonitor(true)
    try {
      const res = await api.monitor.getClassExamMonitoring(examId, classId)
      if (res.data) {
        const rawSummary = res.data.summary || res.data.stats
        if (rawSummary) {
          const compRate = typeof rawSummary.completion_rate === 'string'
            ? parseFloat(rawSummary.completion_rate) || 0
            : Number(rawSummary.completion_rate) || 0

          setStats({
            total_students: Number(rawSummary.total_students) || 0,
            completed_count: Number(rawSummary.completed_count) || 0,
            in_progress_count: Number(rawSummary.in_progress_count) || 0,
            not_started_count: Number(rawSummary.not_started_count) || 0,
            completion_rate: compRate,
            average_score: Number(rawSummary.average_score) || 0,
            highest_score: Number(rawSummary.highest_score) || 0,
            lowest_score: Number(rawSummary.lowest_score) || 0
          })
        }
        if (Array.isArray(res.data.students)) {
          setStudents(res.data.students)

          // Build real live events strictly from database student attempts
          const dbEvents = res.data.students
            .filter((s: any) => s.status === 'completed' || s.status === 'in_progress')
            .map((s: any) => ({
              id: `evt-${s.student_id}`,
              title: s.status === 'completed' ? `${s.full_name} vừa nộp bài` : `${s.full_name} đang làm bài`,
              desc: s.status === 'completed' ? `Đạt ${s.total_score} / 10 điểm · Thưởng +${s.earned_coins} xu` : `Đang làm bài trong phòng thi`,
              time: s.submitted_at ? new Date(s.submitted_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Đang thi',
              type: s.status === 'completed' ? 'emerald' : 'amber'
            }))
          setLiveEvents(dbEvents)
        }
        if (res.data.assignment) {
          setIsOpen(Boolean(res.data.assignment.is_open))
        }
      }
    } catch (err: any) {
      console.debug('Failed to fetch monitor data:', err.message)
    } finally {
      setIsLoadingMonitor(false)
    }
  }

  // 3. Socket.IO Room & Listener setup
  useEffect(() => {
    if (isLoading || !token || !user || role !== 'teacher') return
    fetchMonitoringData(selectedExamId, selectedClassId)
    
    // Join room
    joinMonitorRoom(selectedExamId, selectedClassId, 'teacher', user?.full_name || 'Thầy Giáo Viên')
    const socket = getSocket()
    
    if (socket) {
      setSocketConnected(socket.connected)
      const onConnect = () => setSocketConnected(true)
      const onDisconnect = () => setSocketConnected(false)
      
      socket.on('connect', onConnect)
      socket.on('disconnect', onDisconnect)
      
      // Listen to student updates
      const onStudentUpdate = (payload: any) => {
        setStudents(prev =>
          prev.map(s => {
            if (s.student_id === payload.student_id || s.student_code === payload.student_code) {
              return {
                ...s,
                status: payload.status,
                status_label: payload.status === 'completed' ? 'Đã xong' : payload.status === 'in_progress' ? 'Đang làm bài' : 'Chưa mở đề',
                total_score: payload.total_score !== undefined ? payload.total_score : s.total_score,
                correct_answers_count: payload.correct_answers_count !== undefined ? payload.correct_answers_count : s.correct_answers_count,
                submitted_at: payload.status === 'completed' ? new Date().toISOString() : s.submitted_at,
                earned_coins: payload.earned_coins !== undefined ? payload.earned_coins : s.earned_coins,
                earned_points: payload.earned_points !== undefined ? payload.earned_points : s.earned_points
              }
            }
            return s
          })
        )
        
        // Push live event
        const isComp = payload.status === 'completed'
        setLiveEvents(prev => [
          {
            id: Date.now().toString(),
            title: isComp ? `${payload.full_name || 'Học sinh'} vừa nộp bài!` : `${payload.full_name || 'Học sinh'} bắt đầu làm bài`,
            desc: isComp ? `Đạt ${payload.total_score ?? 0} điểm · +${payload.earned_coins || 0} xu thưởng` : 'Đang làm trong phòng thi',
            time: 'Vừa xong',
            type: isComp ? 'emerald' : 'amber'
          },
          ...prev.slice(0, 6)
        ])
        
        // Re-calculate stats locally
        setStats(prev => {
          if (payload.status === 'completed') {
            const newCompleted = prev.completed_count + 1
            const newInProgress = Math.max(0, prev.in_progress_count - 1)
            const rate = prev.total_students > 0 ? Number(((newCompleted / prev.total_students) * 100).toFixed(1)) : 0
            return {
              ...prev,
              completed_count: newCompleted,
              in_progress_count: newInProgress,
              completion_rate: rate,
              highest_score: Math.max(prev.highest_score, payload.total_score || 0)
            }
          }
          if (payload.status === 'in_progress') {
            return {
              ...prev,
              in_progress_count: prev.in_progress_count + 1,
              not_started_count: Math.max(0, prev.not_started_count - 1)
            }
          }
          return prev
        })
      }
      
      const onAssignmentToggle = (payload: any) => {
        if (payload.classId === selectedClassId) {
          setIsOpen(Boolean(payload.isOpen))
        }
      }

      const onCheatWarning = (payload: any) => {
        setLiveEvents(prev => [
          {
            id: `cheat-${Date.now()}`,
            title: `⚠️ Cảnh báo: ${payload.full_name || 'Học sinh'} (${payload.student_code || ''})`,
            desc: `${payload.reason || 'Chuyển tab / rời màn hình làm bài'}`,
            time: 'Tức thì',
            type: 'amber'
          },
          ...prev.slice(0, 6)
        ])
      }
      
      socket.on('student_status_update', onStudentUpdate)
      socket.on('exam_assignment_toggled', onAssignmentToggle)
      socket.on('student_cheat_warning', onCheatWarning)
      
      return () => {
        leaveMonitorRoom(selectedExamId, selectedClassId)
        socket.off('connect', onConnect)
        socket.off('disconnect', onDisconnect)
        socket.off('student_status_update', onStudentUpdate)
        socket.off('exam_assignment_toggled', onAssignmentToggle)
        socket.off('student_cheat_warning', onCheatWarning)
      }
    }
  }, [isLoading, token, user, role, selectedExamId, selectedClassId])

  // Toggle release ca thi
  const handleToggleRelease = async () => {
    const nextState = !isOpen
    setIsTogglingRelease(true)
    setIsOpen(nextState)
    try {
      await api.exams.toggleClass(selectedExamId, { class_id: selectedClassId, is_open: nextState })
      setLiveEvents(prev => [
        {
          id: Date.now().toString(),
          title: `Lớp ${currentClass?.name || ''}: ${nextState ? 'Đã mở phát đề' : 'Đã khóa bài thi'}`,
          desc: `Đề thi: ${currentExam?.code || ''}`,
          time: 'Vừa xong',
          type: nextState ? 'emerald' : 'violet'
        },
        ...prev.slice(0, 6)
      ])
    } catch (err: any) {
      console.debug('Failed to toggle class status:', err.message)
    } finally {
      setIsTogglingRelease(false)
    }
  }

  // Send Live Broadcast from Overview Dashboard
  const handleSendQuickBroadcast = async (customMsg?: string, customLvl?: 'info' | 'warning' | 'urgent') => {
    const msg = (customMsg !== undefined ? customMsg : quickBroadcastText).trim()
    if (!msg) return
    const lvl = customLvl || quickBroadcastLevel
    const payload = {
      examId: selectedExamId,
      classId: selectedClassId,
      title: lvl === 'urgent' ? 'Cảnh báo khẩn từ Giáo viên' : lvl === 'warning' ? 'Nhắc nhở phòng thi' : 'Thông báo từ Giáo viên',
      message: msg,
      level: lvl,
      senderName: user?.full_name || 'Giáo viên'
    }
    try {
      await api.monitor.sendBroadcast(payload)
    } catch {
      sendTeacherBroadcastSocket(payload)
    }
    if (customMsg === undefined) setQuickBroadcastText('')
    setLiveEvents(prev => [
      {
        id: `bc-${Date.now()}`,
        title: `📢 Đã phát thông báo tới Lớp ${currentClass?.name || '10A1'}`,
        desc: msg,
        time: 'Vừa xong',
        type: lvl === 'urgent' ? 'amber' : 'violet'
      },
      ...prev.slice(0, 6)
    ])
    setBroadcastFeedback(`✓ Đã phát thông báo tức thì tới toàn bộ học sinh lớp ${currentClass?.name || '10A1'}!`)
    setTimeout(() => setBroadcastFeedback(null), 3200)
  }

  // Active Selected Objects
  const currentExam = useMemo(() => {
    return exams.find(e => e.id === selectedExamId) || exams[0] || fallbackExams[0]
  }, [exams, selectedExamId])

  const currentClass = useMemo(() => {
    return classrooms.find(c => c.id === selectedClassId) || classrooms[0] || fallbackClassrooms[0]
  }, [classrooms, selectedClassId])

  // Filtered Students List
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchQuery = !searchQuery.trim() || 
        s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.student_code.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchStatus = statusFilter === 'all' || s.status === statusFilter
      return matchQuery && matchStatus
    })
  }, [students, searchQuery, statusFilter])

  // Loading State
  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0d18', color: '#fff' }}>
        <div style={{ width: 44, height: 44, border: '3px solid rgba(139,124,246,0.2)', borderTopColor: '#8b7cf6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: 16, color: '#8891a9', fontSize: 14 }}>Đang kiểm tra phiên đăng nhập...</p>
      </div>
    )
  }

  // Not authenticated
  if (!token || !user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0d18', color: '#fff' }}>
        <p style={{ color: '#8891a9', fontSize: 14 }}>Chưa đăng nhập. Đang chuyển hướng...</p>
      </div>
    )
  }

  // Route to Admin Dashboard
  if (role === 'admin') {
    return <AdminModule onBack={() => { logout(); router.push('/login') }} />
  }

  // Route to Student Workspace
  if (role === 'student') {
    return <StudentWorkspace onBack={() => { logout(); router.push('/login') }} />
  }

  return (
    <main className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Sparkles size={17} /></div>
          <span>Edu<span className="brand-accent">Test</span></span>
        </div>

        <div className="workspace">
          <div className="workspace-avatar">TN</div>
          <div>
            <strong>{user?.full_name || 'Thầy Nguyễn Văn Tuấn'}</strong>
            <span>Mã: {user?.code || 'GV001'} · Giáo viên</span>
          </div>
          <ChevronDown size={15} />
        </div>

        <nav className="side-nav" aria-label="Điều hướng chính">
          <span className="nav-caption">WORKSPACE</span>
          {navItems.map(({ icon: Icon, label, live }) => (
            <button
              key={label}
              onClick={() => handleNavigate(label)}
              className={`nav-item ${activeNav === label ? 'active' : ''}`}
            >
              <Icon size={17} />
              {label}
              {live && <b className="live-mini" />}
            </button>
          ))}
          <span className="nav-caption space-top">MANAGEMENT</span>
          <button
            className={`nav-item ${activeNav === 'Quản lý môn học' ? 'active' : ''}`}
            onClick={() => handleNavigate('Quản lý môn học')}
          >
            <BookOpen size={17} />
            Quản lý môn học
          </button>
          <button
            className={`nav-item ${activeNav === 'Ngân hàng câu hỏi' ? 'active' : ''}`}
            onClick={() => handleNavigate('Ngân hàng câu hỏi')}
          >
            <ListChecks size={17} />
            Ngân hàng câu hỏi
          </button>
          <button
            className={`nav-item ${activeNav === 'Bảng thành tích' ? 'active' : ''}`}
            onClick={() => handleNavigate('Bảng thành tích')}
          >
            <Trophy size={17} />
            Bảng thành tích
          </button>
          <button
            className="nav-item"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('edutest:open-chatbox'))
              }
            }}
            style={{ color: 'var(--violet)', fontWeight: 600 }}
          >
            <Sparkles size={17} />
            Trợ lý AI Chatbox
            <b className="live-mini" style={{ background: '#34d399', boxShadow: '0 0 8px #34d399' }} />
          </button>
        </nav>

        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => { logout(); router.push('/login') }}>
            <LogOut size={17} />
            Đăng xuất
          </button>

          <div className="profile">
            <div className="profile-avatar" style={{ background: '#2c3558', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>
              GV
            </div>
            <div>
              <strong>{user?.full_name || 'Thầy Tuấn'}</strong>
              <span>{user?.code || 'GV001'}</span>
            </div>
            <MoreHorizontal size={17} />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <section className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{activeNav === 'Tổng quan' ? 'Tổng quan hệ thống' : activeNav}</strong>
          </div>

          <div className="top-actions">
            <ThemeToggle />

            {/* Live Socket Status */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 8, background: socketConnected ? 'rgba(49,213,160,0.1)' : 'rgba(255,255,255,0.05)', border: `1px solid ${socketConnected ? 'rgba(49,213,160,0.3)' : 'var(--line)'}`, color: socketConnected ? '#31d5a0' : '#8891a9', fontSize: 11, fontWeight: 600 }}>
              <span className={socketConnected ? 'pulse-dot' : ''} style={{ width: 6, height: 6, borderRadius: '50%', background: socketConnected ? '#31d5a0' : '#69738d' }} />
              {socketConnected ? 'Socket Live' : 'Offline'}
            </div>

            {/* Role Badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 8, background: 'rgba(139,124,246,0.12)', border: '1px solid rgba(139,124,246,0.3)', color: '#a78bfa', fontSize: 12, fontWeight: 600 }}>
              <GraduationCap size={15} />
              Giáo viên
            </div>

            <div className="coin"><span>◈</span> 2,480 xu</div>
            <div className="points"><span>✦</span> 1,280đ</div>
            <div className="top-avatar">GV</div>
          </div>
        </header>

        {/* 1. OVERVIEW DASHBOARD */}
        {activeNav === 'Tổng quan' && (
          <div className="content-wrap">
            {/* Top Heading */}
            <div className="page-heading">
              <div>
                <div className="eyebrow"><span className="pulse-dot" />HỆ THỐNG QUẢN LÝ THI REAL-TIME</div>
                <h1>Xin chào, {user?.full_name || 'Thầy Nguyễn Văn Tuấn'} <span>✦</span></h1>
                <p>Chào mừng đến với hệ thống quản lý đề thi và giám sát trực tuyến EduTest.</p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  className="secondary-button"
                  onClick={() => fetchMonitoringData(selectedExamId, selectedClassId)}
                  disabled={isLoadingMonitor}
                  title="Làm mới số liệu"
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <RefreshCw size={14} className={isLoadingMonitor ? 'animate-spin' : ''} />
                  Làm mới
                </button>
                <button className="primary-button" onClick={() => handleNavigate('Kho đề thi')}>
                  <Plus size={16} />
                  Tạo đề thi mới
                </button>
              </div>
            </div>

            {/* REAL-TIME EXAM BANNER & CUSTOM DROPDOWNS */}
            <section className="monitor-header">
              <div className="section-label">
                <Radio size={16} />
                KỲ THI TRỰC TUYẾN <span style={{ margin: '0 4px', color: '#656f88' }}>/</span> 
                <span style={{ color: '#a78bfa', fontWeight: 700 }}>{currentExam?.code || 'DE_TOAN_10_01'}</span>
              </div>

              <div className="monitor-controls">
                {/* 1. CUSTOM DROPDOWN: ĐỀ THI */}
                <div className="dropdown-wrapper" ref={examDropdownRef}>
                  <button
                    type="button"
                    className={`select-control-btn ${isExamDropdownOpen ? 'active' : ''}`}
                    onClick={() => {
                      setIsExamDropdownOpen(!isExamDropdownOpen)
                      setIsClassDropdownOpen(false)
                    }}
                    title="Bấm để chọn đề thi"
                  >
                    <FileText className="control-icon" size={16} />
                    <div className="control-text">
                      <small>ĐỀ THI</small>
                      <span>{currentExam?.title || 'Chọn đề thi'}</span>
                    </div>
                    <ChevronDown className="chevron-icon" size={15} />
                  </button>

                  <AnimatePresence>
                    {isExamDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="custom-dropdown-menu"
                      >
                        <div className="custom-dropdown-header">
                          <span>Danh sách đề thi ({exams.length})</span>
                          <span style={{ color: '#8b7cf6' }}>Mã đề</span>
                        </div>

                        {exams.map(exam => {
                          const isSelected = exam.id === selectedExamId
                          return (
                            <button
                              key={exam.id}
                              type="button"
                              className={`custom-dropdown-item ${isSelected ? 'selected' : ''}`}
                              onClick={() => {
                                setSelectedExamId(exam.id)
                                setIsExamDropdownOpen(false)
                              }}
                            >
                              <FileText size={15} color={isSelected ? '#a78bfa' : '#69738d'} />
                              <div className="item-info">
                                <span className="item-title">{exam.title}</span>
                                <span className="item-desc">
                                  {exam.code} · {exam.duration_minutes} phút ({exam.total_questions} câu)
                                </span>
                              </div>
                              {isSelected && <Check size={14} color="#34d399" />}
                            </button>
                          )
                        })}

                        <div className="custom-dropdown-footer">
                          <button
                            type="button"
                            className="custom-dropdown-action"
                            onClick={() => {
                              setIsExamDropdownOpen(false)
                              handleNavigate('Kho đề thi')
                            }}
                          >
                            <span>Quản lý kho đề thi & giao đề</span>
                            <ExternalLink size={12} />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 2. CUSTOM DROPDOWN: LỚP HỌC */}
                <div className="dropdown-wrapper" ref={classDropdownRef}>
                  <button
                    type="button"
                    className={`select-control-btn ${isClassDropdownOpen ? 'active' : ''}`}
                    onClick={() => {
                      setIsClassDropdownOpen(!isClassDropdownOpen)
                      setIsExamDropdownOpen(false)
                    }}
                    title="Bấm để chọn lớp học"
                  >
                    <Users className="control-icon" size={16} color="#49abff" />
                    <div className="control-text">
                      <small>LỚP HỌC</small>
                      <span>{currentClass?.name ? `Lớp ${currentClass.name} · ${currentClass.student_count || stats.total_students} HS` : 'Chọn lớp'}</span>
                    </div>
                    <ChevronDown className="chevron-icon" size={15} />
                  </button>

                  <AnimatePresence>
                    {isClassDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="custom-dropdown-menu"
                        style={{ width: 280 }}
                      >
                        <div className="custom-dropdown-header">
                          <span>Danh sách lớp học ({classrooms.length})</span>
                          <span style={{ color: '#49abff' }}>Sĩ số</span>
                        </div>

                        {classrooms.map(c => {
                          const isSelected = c.id === selectedClassId
                          return (
                            <button
                              key={c.id}
                              type="button"
                              className={`custom-dropdown-item ${isSelected ? 'selected' : ''}`}
                              onClick={() => {
                                setSelectedClassId(c.id)
                                setIsClassDropdownOpen(false)
                              }}
                            >
                              <Users size={15} color={isSelected ? '#60a5fa' : '#69738d'} />
                              <div className="item-info">
                                <span className="item-title">Lớp {c.name}</span>
                                <span className="item-desc">
                                  {c.grade_name || 'Khối 10'} · Sĩ số: {c.student_count || 5} học sinh
                                </span>
                              </div>
                              {isSelected && <Check size={14} color="#34d399" />}
                            </button>
                          )
                        })}

                        <div className="custom-dropdown-footer">
                          <button
                            type="button"
                            className="custom-dropdown-action"
                            onClick={() => {
                              setIsClassDropdownOpen(false)
                              handleNavigate('Lớp học & học sinh')
                            }}
                          >
                            <span>Xem danh mục lớp & học sinh</span>
                            <ExternalLink size={12} />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 3. RELEASE TOGGLE SWITCH */}
                <button
                  type="button"
                  onClick={handleToggleRelease}
                  disabled={isTogglingRelease}
                  className={`release-toggle ${isOpen ? 'on' : ''}`}
                  title="Bấm để Mở hoặc Đóng ca thi cho lớp này"
                >
                  <span className="toggle-track"><i /></span>
                  <span>
                    {isOpen ? 'Đang mở đề' : 'Đã đóng đề'}
                    <small>{isOpen ? 'Học sinh đang làm được' : 'Đã khóa bài thi'}</small>
                  </span>
                </button>
              </div>
            </section>

            {/* LIVE TEACHER-STUDENT BROADCAST QUICK BAR */}
            <div
              style={{
                marginBottom: 18,
                padding: '12px 16px',
                borderRadius: 13,
                background: 'linear-gradient(135deg, rgba(139, 124, 246, 0.1) 0%, rgba(16, 20, 32, 0.9) 100%)',
                border: '1px solid rgba(139, 124, 246, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: '#fff' }}>
                  <Bell size={15} color="#f5ad52" />
                  <span>Kênh phát thông báo & Cảnh báo tức thì tới phòng thi ({currentClass?.name || '10A1'})</span>
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5, background: 'rgba(49,213,160,0.12)', color: '#34d399', border: '1px solid rgba(49,213,160,0.3)' }}>
                    🔀 Đã bật trộn ngẫu nhiên câu hỏi & đáp án A-B-C-D
                  </span>

                  {/* 6-Digit PIN Badge on Overview */}
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 11,
                      padding: '2px 9px',
                      borderRadius: 6,
                      background: 'rgba(245,158,11,0.15)',
                      color: '#fbbf24',
                      border: '1px solid rgba(245,158,11,0.4)',
                      fontWeight: 800
                    }}
                  >
                    <KeyRound size={12} />
                    <span>MÃ PIN CA THI:</span>
                    <strong style={{ fontFamily: 'monospace', fontSize: 13, letterSpacing: 2, color: '#fde68a' }}>
                      {overviewPinCode}
                    </strong>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await api.monitor.updateExamPin(selectedExamId, selectedClassId, { regenerate: true, isPinRequired: true })
                          if (res.data?.pinCode) setOverviewPinCode(res.data.pinCode)
                        } catch {
                          setOverviewPinCode(String(Math.floor(100000 + Math.random() * 900000)))
                        }
                      }}
                      style={{
                        border: 0,
                        background: 'rgba(255,255,255,0.12)',
                        color: '#fff',
                        borderRadius: 4,
                        padding: '1px 6px',
                        fontSize: 9.5,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Đổi PIN
                    </button>
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => handleSendQuickBroadcast(`🔑 MÃ PIN CA THI HIỆN TẠI: ${overviewPinCode} — Các em nhập đúng 6 số này để mở đề thi (Giới hạn 1 thiết bị / 1 tài khoản).`, 'info')}
                    style={{ padding: '4px 9px', borderRadius: 6, border: '1px solid rgba(56,189,248,0.4)', background: 'rgba(56,189,248,0.14)', color: '#38bdf8', fontSize: 10, fontWeight: 700 }}
                  >
                    🔑 Phát PIN ({overviewPinCode}) cho lớp
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendQuickBroadcast('⏰ Còn 5 phút làm bài, các em kiểm tra lại đáp án trước khi nộp!', 'warning')}
                    style={{ padding: '4px 9px', borderRadius: 6, border: '1px solid rgba(245,173,82,0.35)', background: 'rgba(245,173,82,0.1)', color: '#fbbf24', fontSize: 10, fontWeight: 600 }}
                  >
                    ⏰ Nhắc còn 5 phút
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendQuickBroadcast('⚠️ Yêu cầu toàn bộ học sinh tập trung làm bài, không trao đổi hay nhìn màn hình bạn bên cạnh!', 'urgent')}
                    style={{ padding: '4px 9px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.12)', color: '#f87171', fontSize: 10, fontWeight: 600 }}
                  >
                    🚨 Cảnh báo trật tự & chống nhìn bài
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select
                  value={quickBroadcastLevel}
                  onChange={(e) => setQuickBroadcastLevel(e.target.value as any)}
                  style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--line)', background: '#121727', color: '#fff', fontSize: 11, outline: 'none' }}
                >
                  <option value="info">📢 Thông báo</option>
                  <option value="warning">⏰ Nhắc nhở</option>
                  <option value="urgent">🚨 Cảnh báo khẩn</option>
                </select>
                <input
                  value={quickBroadcastText}
                  onChange={(e) => setQuickBroadcastText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSendQuickBroadcast()
                    }
                  }}
                  placeholder={`Nhập thông báo / cảnh báo gửi ngay tới màn hình học sinh lớp ${currentClass?.name || '10A1'}...`}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(139,124,246,0.3)', background: 'rgba(10,13,24,0.85)', color: '#fff', fontSize: 12, outline: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => handleSendQuickBroadcast()}
                  disabled={!quickBroadcastText.trim()}
                  className="primary-button"
                  style={{ padding: '8px 14px', fontSize: 11, opacity: !quickBroadcastText.trim() ? 0.5 : 1 }}
                >
                  Phát thông báo
                </button>
              </div>

              {broadcastFeedback && (
                <div style={{ fontSize: 11, color: '#34d399', fontWeight: 600 }}>
                  {broadcastFeedback}
                </div>
              )}
            </div>

            {/* 5 REFINED KPI METRIC CARDS (CLEAN & NON-OVERLAPPING) */}
            <div className="metrics-grid-refined">
              {/* Card 1: Tổng Sĩ Số */}
              <motion.div whileHover={{ y: -3 }} className="metric-card-refined primary">
                <div className="metric-top-bar">
                  <span className="metric-label">TỔNG SĨ SỐ</span>
                  <div className="metric-icon-box">
                    <Users size={16} />
                  </div>
                </div>
                <div className="metric-center">
                  <span className="metric-number">{stats.total_students}</span>
                  <span className="metric-unit">học sinh</span>
                </div>
                <div>
                  <div className="metric-bottom-bar">
                    <span className="metric-subtext">100% học sinh lớp {currentClass?.name || '10A1'}</span>
                    <span className="metric-pill-tag blue">Lớp {currentClass?.name || '10A1'}</span>
                  </div>
                  <div className="metric-progress-track">
                    <div className="metric-progress-bar" style={{ width: '100%', background: '#818cf8' }} />
                  </div>
                </div>
              </motion.div>

              {/* Card 2: Đã Nộp Bài */}
              <motion.div whileHover={{ y: -3 }} className="metric-card-refined success">
                <div className="metric-top-bar">
                  <span className="metric-label">ĐÃ NỘP BÀI</span>
                  <div className="metric-icon-box">
                    <CheckCircle2 size={16} />
                  </div>
                </div>
                <div className="metric-center">
                  <span className="metric-number">{stats.completed_count}</span>
                  <span className="metric-unit">/ {stats.total_students} HS</span>
                </div>
                <div>
                  <div className="metric-bottom-bar">
                    <span className="metric-subtext">{stats.completion_rate}% hoàn thành</span>
                    <span className="metric-pill-tag green">+{stats.completed_count} đã nộp</span>
                  </div>
                  <div className="metric-progress-track">
                    <div className="metric-progress-bar" style={{ width: `${Math.max(stats.completion_rate, 4)}%`, background: '#34d399' }} />
                  </div>
                </div>
              </motion.div>

              {/* Card 3: Đang Làm Bài */}
              <motion.div whileHover={{ y: -3 }} className="metric-card-refined warning">
                <div className="metric-top-bar">
                  <span className="metric-label">ĐANG LÀM BÀI</span>
                  <div className="metric-icon-box">
                    <Clock3 size={16} />
                  </div>
                </div>
                <div className="metric-center">
                  <span className="metric-number">{stats.in_progress_count}</span>
                  <span className="metric-unit">thí sinh</span>
                </div>
                <div>
                  <div className="metric-bottom-bar">
                    <span className="metric-subtext">Đang trong phòng thi</span>
                    <span className="metric-pill-tag amber">
                      <span className="pulse-dot" style={{ width: 4, height: 4, background: '#fbbf24' }} />
                      Trực tiếp
                    </span>
                  </div>
                  <div className="metric-progress-track">
                    <div
                      className="metric-progress-bar"
                      style={{
                        width: `${stats.total_students > 0 ? (stats.in_progress_count / stats.total_students) * 100 : 0}%`,
                        background: '#fbbf24'
                      }}
                    />
                  </div>
                </div>
              </motion.div>

              {/* Card 4: Chưa Mở Đề */}
              <motion.div whileHover={{ y: -3 }} className="metric-card-refined muted">
                <div className="metric-top-bar">
                  <span className="metric-label">CHƯA MỞ ĐỀ</span>
                  <div className="metric-icon-box">
                    <BookOpen size={16} />
                  </div>
                </div>
                <div className="metric-center">
                  <span className="metric-number">{stats.not_started_count}</span>
                  <span className="metric-unit">chưa vào</span>
                </div>
                <div>
                  <div className="metric-bottom-bar">
                    <span className="metric-subtext">Chưa truy cập đề thi</span>
                    <span className="metric-pill-tag" style={{ background: 'rgba(148,163,184,0.12)', color: '#94a3b8' }}>Chờ ca</span>
                  </div>
                  <div className="metric-progress-track">
                    <div
                      className="metric-progress-bar"
                      style={{
                        width: `${stats.total_students > 0 ? (stats.not_started_count / stats.total_students) * 100 : 0}%`,
                        background: '#94a3b8'
                      }}
                    />
                  </div>
                </div>
              </motion.div>

              {/* Card 5: Điểm Trung Bình */}
              <motion.div whileHover={{ y: -3 }} className="metric-card-refined chart">
                <div className="metric-top-bar">
                  <span className="metric-label">ĐIỂM TRUNG BÌNH</span>
                  <div className="metric-icon-box">
                    <Trophy size={16} />
                  </div>
                </div>
                <div className="metric-center">
                  <span className="metric-number">{Number(stats.average_score).toFixed(1)}</span>
                  <span className="metric-unit">/ 10.0</span>
                </div>
                <div>
                  <div className="metric-bottom-bar">
                    <span className="metric-subtext">Dựa trên {stats.completed_count} bài nộp</span>
                    <span className="metric-pill-tag purple">Cao nhất: {stats.highest_score}đ</span>
                  </div>
                  <div className="metric-progress-track">
                    <div
                      className="metric-progress-bar"
                      style={{
                        width: `${Math.min(Number(stats.average_score) * 10, 100)}%`,
                        background: '#c084fc'
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* 2-COLUMN MAIN DASHBOARD PANELS */}
            <div className="dashboard-grid">
              {/* Left Panel: Real-time Students Progress */}
              <section className="panel students-panel">
                <div className="panel-header">
                  <div>
                    <h2>Tiến độ học sinh lớp {currentClass?.name || '10A1'}</h2>
                    <p>Theo dõi đề: {currentExam?.title || ''} · Cập nhật trực tiếp</p>
                  </div>
                  <div className="panel-actions" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() =>
                        exportClassScoreboardExcel({
                          exam: currentExam,
                          classroom: currentClass,
                          students: students as any
                        })
                      }
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 11px',
                        borderRadius: 8,
                        background: 'rgba(16,185,129,0.15)',
                        border: '1px solid rgba(16,185,129,0.4)',
                        color: '#34d399',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      title="Xuất Bảng điểm cả lớp ra file Excel chuẩn Bộ GD&ĐT"
                    >
                      <FileSpreadsheet size={13} /> Xuất Excel Bộ GD&ĐT
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        exportClassScoreboardPDF({
                          exam: currentExam,
                          classroom: currentClass,
                          students: students as any
                        })
                      }
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 11px',
                        borderRadius: 8,
                        background: 'rgba(139,124,246,0.16)',
                        border: '1px solid rgba(139,124,246,0.4)',
                        color: '#c4b5fd',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      title="Xuất Bảng điểm ra file PDF chuẩn Bộ GD&ĐT"
                    >
                      <Printer size={13} /> Xuất PDF
                    </button>

                    <button
                      type="button"
                      onClick={() => handleNavigate('Phổ điểm & Báo cáo')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 11px',
                        borderRadius: 8,
                        background: 'rgba(245,173,82,0.15)',
                        border: '1px solid rgba(245,173,82,0.4)',
                        color: '#f5ad52',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      title="Xem Biểu đồ phổ điểm hình chuông & Thống kê câu sai nhiều nhất"
                    >
                      <BarChart3 size={13} /> Phổ điểm & Câu hay sai
                    </button>

                    <div className="search-box">
                      <Search size={14} />
                      <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm học sinh..."
                      />
                    </div>
                    <button
                      className="icon-button"
                      onClick={() => handleNavigate('Giám sát trực tiếp')}
                      title="Mở toàn màn hình Giám sát trực tiếp"
                    >
                      <ExternalLink size={15} />
                    </button>
                  </div>
                </div>

                {/* Status Filter Tabs */}
                <div style={{ display: 'flex', gap: 6, padding: '0 19px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {[
                    { key: 'all', label: `Tất cả (${students.length})` },
                    { key: 'completed', label: `Đã xong (${stats.completed_count})` },
                    { key: 'in_progress', label: `Đang làm (${stats.in_progress_count})` },
                    { key: 'not_started', label: `Chưa mở (${stats.not_started_count})` },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setStatusFilter(tab.key as any)}
                      style={{
                        background: statusFilter === tab.key ? 'rgba(139,124,246,0.18)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${statusFilter === tab.key ? 'rgba(139,124,246,0.4)' : 'rgba(255,255,255,0.06)'}`,
                        color: statusFilter === tab.key ? '#fff' : '#8891a9',
                        padding: '4px 10px',
                        borderRadius: 7,
                        fontSize: 10,
                        fontWeight: statusFilter === tab.key ? 600 : 400,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Table Header */}
                <div className="table-head">
                  <span>HỌC SINH</span>
                  <span>TRẠNG THÁI</span>
                  <span>ĐIỂM SỐ</span>
                  <span>THỜI GIAN</span>
                  <span>NỘP BÀI</span>
                  <span />
                </div>

                {/* Student Rows */}
                <div className="student-list">
                  {filteredStudents.length === 0 ? (
                    <div style={{ padding: '36px 20px', textAlign: 'center', color: '#717b94', fontSize: 12 }}>
                      Không tìm thấy học sinh nào phù hợp với bộ lọc.
                    </div>
                  ) : (
                    filteredStudents.map((st, index) => {
                      const initials = st.full_name.split(' ').slice(-2).map(w => w[0]).join('') || 'HS'
                      const isDone = st.status === 'completed'
                      const isDoing = st.status === 'in_progress'

                      return (
                        <motion.div
                          key={st.student_id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="student-row"
                        >
                          <div className="student-name">
                            <div className={`student-avatar ${index % 4 === 0 ? 'blue' : index % 4 === 1 ? 'amber' : index % 4 === 2 ? 'rose' : 'cyan'}`}>
                              {initials}
                            </div>
                            <div>
                              <strong>{st.full_name}</strong>
                              <span>{st.student_code}</span>
                            </div>
                          </div>

                          <div>
                            <span className={`status-badge ${isDone ? 'done' : isDoing ? 'doing' : 'waiting'}`}>
                              <i />
                              {st.status_label || (isDone ? 'Đã xong' : isDoing ? 'Đang làm bài' : 'Chưa mở đề')}
                            </span>
                          </div>

                          <div className="score">
                            {st.total_score !== null ? (
                              <>
                                <strong>{st.total_score}</strong>
                                <span>/ 10</span>
                              </>
                            ) : (
                              <span>—</span>
                            )}
                          </div>

                          <div className="row-time">
                            {isDoing && <b className="tiny-live" />}
                            {st.duration_seconds ? `${Math.floor(st.duration_seconds / 60)}m ${st.duration_seconds % 60}s` : isDoing ? 'Đang thi' : '—'}
                          </div>

                          <div className="row-submitted">
                            {isDone ? (st.submitted_at ? 'Đã nộp bài' : 'Vừa xong') : isDoing ? 'Đang hoạt động' : 'Chưa tham gia'}
                          </div>

                          <button
                            className="row-menu"
                            onClick={() => handleNavigate('Giám sát trực tiếp')}
                            title="Xem chi tiết"
                          >
                            <MoreHorizontal size={16} />
                          </button>
                        </motion.div>
                      )
                    })
                  )}
                </div>

                <div className="table-footer">
                  <span>Hiển thị {filteredStudents.length} trong {students.length} học sinh lớp {currentClass?.name}</span>
                  <button onClick={() => handleNavigate('Giám sát trực tiếp')}>
                    Mở màn hình Giám sát trực tiếp chi tiết <ArrowRight size={14} />
                  </button>
                </div>
              </section>

              {/* Right Panel: Live Activity Stream */}
              <section className="panel activity-panel">
                <div className="panel-header">
                  <div>
                    <h2>Dòng sự kiện trực tiếp</h2>
                    <p>Real-time Socket.IO · Tự động đồng bộ</p>
                  </div>
                  <span className="activity-live"><i /> LIVE</span>
                </div>

                <div className="activity-list">
                  {liveEvents.length > 0 ? (
                    liveEvents.map(evt => (
                      <div className="activity-item" key={evt.id}>
                        <div className={`activity-icon ${evt.type}`}>
                          {evt.type === 'emerald' ? <Check size={14} /> : evt.type === 'amber' ? <Clock3 size={14} /> : <Radio size={14} />}
                        </div>
                        <div>
                          <strong>{evt.title}</strong>
                          <span>{evt.desc}</span>
                        </div>
                        <time>{evt.time}</time>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--muted)', fontSize: 13 }}>
                      <Radio size={24} style={{ opacity: 0.35, margin: '0 auto 8px', color: '#8b7cf6' }} />
                      <p style={{ margin: 0, fontWeight: 500, color: '#e2e8f0' }}>Chưa có hoạt động nộp bài nào</p>
                      <small style={{ color: '#656f88', display: 'block', marginTop: 4 }}>Khi học sinh trong lớp bắt đầu làm bài hoặc nộp bài, diễn biến thời gian thực sẽ hiển thị tại đây.</small>
                    </div>
                  )}
                </div>

                {/* Quick Summary Card */}
                <div className="health-card" style={{ marginTop: 12 }}>
                  <div>
                    <span className="health-dot" />
                    <span>Ca thi đang vận hành ổn định</span>
                  </div>
                  <span>{currentClass?.name} ({stats.completed_count}/{stats.total_students} nộp)</span>
                </div>
              </section>
            </div>

            {/* QUICK ACCESS TO 5 BUSINESS MODULES */}
            <section className="quick-section">
              <div className="section-title">
                <div>
                  <h2>Lối tắt các phân hệ nghiệp vụ</h2>
                  <p>Truy cập trực tiếp 5 module quản trị và khảo thí với đầy đủ API của EduTest</p>
                </div>
              </div>

              <div className="quick-grid">
                <motion.button whileHover={{ y: -3 }} className="quick-card" onClick={() => handleNavigate('Giám sát trực tiếp')}>
                  <div className="quick-icon purple"><Activity size={18} /></div>
                  <div>
                    <strong>Giám sát trực tiếp</strong>
                    <span>Theo dõi realtime học sinh làm bài</span>
                  </div>
                  <ArrowRight size={16} />
                </motion.button>

                <motion.button whileHover={{ y: -3 }} className="quick-card" onClick={() => handleNavigate('Phổ điểm & Báo cáo')}>
                  <div className="quick-icon blue"><BarChart3 size={18} /></div>
                  <div>
                    <strong>Phổ điểm & Báo cáo Bộ GD&ĐT</strong>
                    <span>Biểu đồ hình chuông, câu hay sai & Xuất Excel/PDF</span>
                  </div>
                  <ArrowRight size={16} />
                </motion.button>

                <motion.button whileHover={{ y: -3 }} className="quick-card" onClick={() => handleNavigate('Kho đề thi')}>
                  <div className="quick-icon purple"><FileText size={18} /></div>
                  <div>
                    <strong>Kho đề thi</strong>
                    <span>Tạo đề & Bật/Tắt phát đề theo lớp</span>
                  </div>
                  <ArrowRight size={16} />
                </motion.button>

                <motion.button whileHover={{ y: -3 }} className="quick-card" onClick={() => handleNavigate('Lớp học & học sinh')}>
                  <div className="quick-icon blue"><Users size={18} /></div>
                  <div>
                    <strong>Lớp học & học sinh</strong>
                    <span>Cây thư mục Khối - Lớp - Học sinh</span>
                  </div>
                  <ArrowRight size={16} />
                </motion.button>

                <motion.button whileHover={{ y: -3 }} className="quick-card" onClick={() => handleNavigate('Ngân hàng câu hỏi')}>
                  <div className="quick-icon amber"><ListChecks size={18} /></div>
                  <div>
                    <strong>Ngân hàng câu hỏi</strong>
                    <span>Soạn câu hỏi trắc nghiệm & đáp án đúng</span>
                  </div>
                  <ArrowRight size={16} />
                </motion.button>

                <motion.button whileHover={{ y: -3 }} className="quick-card" onClick={() => handleNavigate('Bảng thành tích')}>
                  <div className="quick-icon amber"><Trophy size={18} /></div>
                  <div>
                    <strong>Bảng thành tích</strong>
                    <span>Top vinh danh, tích xu & điểm thưởng</span>
                  </div>
                  <ArrowRight size={16} />
                </motion.button>
              </div>
            </section>
          </div>
        )}

        {/* 2. Embedded Sub-page Modules (Keeps sidebar persistent!) */}
        {activeNav === 'Giám sát trực tiếp' && <LiveMonitorModule embedded onBack={() => handleNavigate('Tổng quan')} />}
        {activeNav === 'Phổ điểm & Báo cáo' && (
          <ExamAnalyticsReportModule
            embedded
            selectedExamId={selectedExamId}
            selectedClassId={selectedClassId}
            exams={exams}
            classrooms={classrooms}
            onSelectExam={setSelectedExamId}
            onSelectClass={setSelectedClassId}
            onBack={() => handleNavigate('Tổng quan')}
          />
        )}
        {activeNav === 'Kho đề thi' && <ExamRepoModule embedded onBack={() => handleNavigate('Tổng quan')} />}
        {activeNav === 'Lớp học & học sinh' && <ClassroomTreeModule embedded onBack={() => handleNavigate('Tổng quan')} />}
        {activeNav === 'Quản lý môn học' && (
          <SubjectManagementModule
            embedded
            onBack={() => handleNavigate('Tổng quan')}
            onSelectSubject={() => handleNavigate('Ngân hàng câu hỏi')}
          />
        )}
        {activeNav === 'Ngân hàng câu hỏi' && (
          <QuestionBankModule
            embedded
            onBack={() => handleNavigate('Tổng quan')}
            onNavigateSubjectManagement={() => handleNavigate('Quản lý môn học')}
          />
        )}
        {activeNav === 'Bảng thành tích' && <LeaderboardModule embedded onBack={() => handleNavigate('Tổng quan')} />}
      </section>
    </main>
  )
}

export default function Page() {
  return <MainDashboardContent />
}
