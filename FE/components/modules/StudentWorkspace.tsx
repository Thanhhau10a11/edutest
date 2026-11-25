'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  GraduationCap,
  Clock3,
  Check,
  ArrowRight,
  Trophy,
  Zap,
  Coins,
  Star,
  BookOpen,
  Calendar,
  AlertCircle,
  HelpCircle,
  FileText,
  History,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
  Shuffle,
  Megaphone,
  AlertTriangle,
  Bell,
  ShieldAlert,
  X,
  Lock,
  KeyRound,
  Laptop,
  Smartphone,
  BrainCircuit,
  ShieldCheck,
  ArrowLeft,
  LogOut
} from 'lucide-react'
import { api, getDeviceId, getDeviceName } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { ThemeToggle } from '@/components/ThemeToggle'
import { cleanMathText } from '@/lib/math-format'
import { getSocket, joinStudentChannel, emitStudentCheatWarning, TeacherBroadcastPayload } from '@/lib/socket'

interface ExamCardItem {
  exam_id: number
  code: string
  title: string
  description: string
  duration_minutes: number
  total_questions: number
  teacher?: { full_name: string }
  is_open: boolean
  requires_pin?: boolean
  student_attempt?: {
    status: 'not_started' | 'in_progress' | 'completed'
    total_score: number | null
    correct_answers_count: number | null
    earned_coins: number
    earned_points: number
  }
}

export default function StudentWorkspace({ onBack }: { onBack: () => void }) {
  const router = useRouter()
  const { user, refreshUserData, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<'exams' | 'testing' | 'recovery' | 'history' | 'wallet'>('exams')
  const [availableExams, setAvailableExams] = useState<ExamCardItem[]>([])
  const [isLoadingExams, setIsLoadingExams] = useState(false)

  // Test Taking State
  const [currentExam, setCurrentExam] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [remainingSeconds, setRemainingSeconds] = useState(900)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionResult, setSubmissionResult] = useState<any>(null)
  const [showReviewSolutions, setShowReviewSolutions] = useState(false)

  // PIN & Single-Device Anti-Proxy Lock State
  const [pinModalExam, setPinModalExam] = useState<ExamCardItem | null>(null)
  const [enteredPin, setEnteredPin] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)
  const [deviceLockAlert, setDeviceLockAlert] = useState<string | null>(null)
  const [isStartingExam, setIsStartingExam] = useState(false)

  // Smart Knowledge Recovery (Mistake Bank) State
  const [recoveryData, setRecoveryData] = useState<any>({
    summary: { total_mistakes_found: 0, pending_recovery_count: 0, recovered_count: 0, sessions_completed: 0 },
    questions: []
  })
  const [isLoadingRecovery, setIsLoadingRecovery] = useState(false)
  const [isRecoverySession, setIsRecoverySession] = useState(false)
  const [recoveryFilter, setRecoveryFilter] = useState<'all' | 'pending' | 'recovered'>('all')

  // Wallet and History State
  const [historyList, setHistoryList] = useState<any[]>([])
  const [walletData, setWalletData] = useState<any>({ balance: { wallet_coins: 80, reward_points: 40 }, transactions: [] })

  // Live Teacher-Student Broadcast & Anti-Cheat State
  const [broadcasts, setBroadcasts] = useState<TeacherBroadcastPayload[]>([])
  const [activeBroadcastAlert, setActiveBroadcastAlert] = useState<TeacherBroadcastPayload | null>(null)
  const [showBroadcastDrawer, setShowBroadcastDrawer] = useState(false)
  const [unreadBroadcastCount, setUnreadBroadcastCount] = useState(0)
  const [tabSwitchWarnings, setTabSwitchWarnings] = useState(0)

  // Client-side fallback shuffle helper (in case backend did not already shuffle)
  const ensureShuffledQuestions = (rawQuestions: any[], seedValue: number) => {
    let t = (seedValue || Date.now()) >>> 0
    const rng = () => {
      t += 0x6D2B79F5
      let r = Math.imul(t ^ (t >>> 15), t | 1)
      r ^= r + Math.imul(r ^ (r >>> 7), r | 61)
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296
    }
    const shuffleArr = <T,>(arr: T[]): T[] => {
      const copy = [...arr]
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1))
        ;[copy[i], copy[j]] = [copy[j], copy[i]]
      }
      return copy
    }
    const labels = ['A', 'B', 'C', 'D', 'E', 'F']
    const qShuffled = shuffleArr(rawQuestions)
    return qShuffled.map((q: any, idx: number) => {
      const opts = shuffleArr(q.options || []).map((opt: any, oIdx: number) => ({
        ...opt,
        original_option_key: opt.original_option_key || opt.option_key,
        option_key: labels[oIdx] || String.fromCharCode(65 + oIdx)
      }))
      return {
        ...q,
        display_order: idx + 1,
        options: opts
      }
    })
  }

  // 1. Fetch available exams for student (strictly real database)
  const fetchAvailableExams = async () => {
    setIsLoadingExams(true)
    try {
      const res = await api.student.getAvailableExams()
      if (res.data && Array.isArray(res.data)) {
        setAvailableExams(res.data)
      } else {
        setAvailableExams([])
      }
    } catch (err: any) {
      console.warn('API error when fetching exams:', err)
      setAvailableExams([])
    } finally {
      setIsLoadingExams(false)
    }
  }

  // 2. Fetch Wallet, History & Knowledge Recovery (Mistake Bank)
  const fetchWalletAndHistory = async () => {
    try {
      const [walletRes, historyRes] = await Promise.all([
        api.student.getWallet().catch(() => null),
        api.student.getHistory().catch(() => null)
      ])
      if (walletRes?.data) setWalletData(walletRes.data)
      if (historyRes?.data) setHistoryList(historyRes.data)
    } catch (err) {
      console.debug('Failed to fetch wallet/history:', err)
    }
  }

  const fetchRecoveryQuestions = async () => {
    setIsLoadingRecovery(true)
    try {
      const res = await api.student.getRecoveryQuestions()
      if (res?.data) {
        setRecoveryData(res.data)
      }
    } catch (err) {
      console.debug('Failed to fetch recovery questions:', err)
    } finally {
      setIsLoadingRecovery(false)
    }
  }

  useEffect(() => {
    fetchAvailableExams()
    fetchWalletAndHistory()
    fetchRecoveryQuestions()
  }, [])

  // 3. Connect to Live Teacher-Student Broadcast Channel via Socket.IO
  useEffect(() => {
    const studentId = user?.id || 1
    const classId = (user as any)?.class_id || 1

    // Load recent broadcasts from API
    api.monitor.getBroadcasts({ classId, studentId })
      .then((res) => {
        if (Array.isArray(res?.data)) {
          setBroadcasts(res.data)
        }
      })
      .catch(() => {})

    joinStudentChannel(
      classId,
      studentId,
      currentExam?.id,
      user?.full_name || 'Học sinh'
    )

    const socket = getSocket()
    const handleTeacherBroadcast = (payload: TeacherBroadcastPayload) => {
      if (payload.studentId && studentId && Number(payload.studentId) !== Number(studentId)) {
        return
      }
      setBroadcasts((prev) => {
        if (payload.id && prev.some((b) => b.id === payload.id)) return prev
        return [payload, ...prev].slice(0, 30)
      })
      setActiveBroadcastAlert(payload)
      setUnreadBroadcastCount((prev) => prev + 1)
    }

    socket.on('teacher_broadcast', handleTeacherBroadcast)
    return () => {
      socket.off('teacher_broadcast', handleTeacherBroadcast)
    }
  }, [user?.id, currentExam?.id])

  // 4. Anti-Cheat Tab Switch Detection during Testing
  useEffect(() => {
    if (activeTab !== 'testing' || !currentExam) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchWarnings((prev) => {
          const nextCount = prev + 1
          emitStudentCheatWarning({
            examId: currentExam?.id || 1,
            classId: (user as any)?.class_id || 1,
            student_id: user?.id,
            student_code: user?.code || 'HS',
            full_name: user?.full_name || 'Học sinh',
            reason: `Rời màn hình / chuyển tab lần thứ ${nextCount} khi đang làm đề ${currentExam?.code || ''}`,
            warningCount: nextCount
          })
          setActiveBroadcastAlert({
            id: `anti_cheat_${Date.now()}`,
            title: 'Cảnh báo Giám sát Phòng thi',
            message: `Hệ thống phát hiện bạn vừa rời khỏi màn hình làm bài (Lần ${nextCount}). Hành vi này đã được gửi tự động tới màn hình giám sát của Giáo viên!`,
            level: 'urgent',
            senderName: 'Hệ thống Giám sát Phòng thi',
            studentId: user?.id || null,
            timestamp: new Date().toISOString()
          })
          return nextCount
        })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [activeTab, currentExam, user])

  // Handle Browser Back Button (Prevent navigating to /login)
  useEffect(() => {
    const handlePopState = () => {
      if (activeTab === 'testing') {
        if (confirm('Bạn có muốn tạm thời thoát màn hình làm bài? Thời gian làm bài vẫn tiếp tục đếm ngược.')) {
          setActiveTab('exams')
        } else {
          window.history.pushState({ mode: 'testing' }, '')
        }
      } else if (activeTab !== 'exams') {
        setActiveTab('exams')
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [activeTab])

  // Countdown timer when in testing mode
  useEffect(() => {
    if (activeTab !== 'testing' || !remainingSeconds) return
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          handleSubmitExam()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [activeTab, remainingSeconds])

  // Request Start Exam -> Opens PIN Modal if exam requires PIN (unless PIN was already entered on this device)
  const handleRequestStartExam = (examItem: ExamCardItem) => {
    setPinError(null)
    setDeviceLockAlert(null)
    const cachedPin =
      typeof window !== 'undefined' ? sessionStorage.getItem(`edutest_pin_${examItem.exam_id}`) : null

    if (examItem.requires_pin !== false && !cachedPin) {
      setPinModalExam(examItem)
      setEnteredPin('')
      return
    }

    handleStartExam(examItem.exam_id, cachedPin || undefined, examItem)
  }

  // Start Exam (Strict Anti-Cheat, PIN Verification, Single-Device Lock & Randomized Questions + A-B-C-D)
  const handleStartExam = async (examId: number, pinCode?: string, examMeta?: ExamCardItem) => {
    setIsStartingExam(true)
    setPinError(null)
    setDeviceLockAlert(null)
    try {
      const res = await api.student.startExam(examId, {
        pin: pinCode,
        deviceId: getDeviceId(),
        deviceName: getDeviceName()
      })
      if (res.data?.exam) {
        if (pinCode && typeof window !== 'undefined') {
          sessionStorage.setItem(`edutest_pin_${examId}`, pinCode)
        }
        setPinModalExam(null)
        setIsRecoverySession(false)

        const exam = res.data.exam
        const attempt = res.data.attempt

        // Anti-cheat Real Timer Calculation:
        const totalDurationSec = (exam.duration_minutes || 15) * 60
        if (attempt?.started_at) {
          const startedAtMs = new Date(attempt.started_at).getTime()
          const elapsedSec = Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000))
          const remainingSec = Math.max(0, totalDurationSec - elapsedSec)
          if (remainingSec <= 0) {
            alert('Thời gian làm bài cho lượt thi này đã hết! Bạn không thể tiếp tục làm bài.')
            await fetchAvailableExams()
            return
          }
          setRemainingSeconds(remainingSec)
        } else {
          setRemainingSeconds(totalDurationSec)
        }

        // Restore cached answers from localStorage
        const cacheKey = `edutest_answers_${exam.id}`
        try {
          const saved = localStorage.getItem(cacheKey)
          if (saved) {
            setAnswers(JSON.parse(saved))
          } else {
            setAnswers({})
          }
        } catch {
          setAnswers({})
        }

        // Ensure questions & options A-B-C-D are shuffled per student
        const rawQuestions = exam.questions || []
        const seedVal = Number(attempt?.id || 1) * 131071 + Number(user?.id || 7) * 8191 + Number(exam.id || 1) * 524287
        const finalQuestions = exam.is_shuffled
          ? rawQuestions
          : ensureShuffledQuestions(rawQuestions, seedVal)

        const variantCode = exam.variant_code || `MĐ-${String(((seedVal % 900) + 100)).padStart(3, '0')}`
        setCurrentExam({ ...exam, is_shuffled: true, variant_code: variantCode })
        setQuestions(finalQuestions)
        setCurrentQIndex(0)
        setTabSwitchWarnings(0)
        window.history.pushState({ mode: 'testing' }, '')
        setActiveTab('testing')
        return
      }
    } catch (err: any) {
      if (err.code === 'INVALID_EXAM_PIN') {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(`edutest_pin_${examId}`)
        }
        const targetExam =
          examMeta ||
          pinModalExam ||
          availableExams.find((e) => e.exam_id === examId) || {
            exam_id: examId,
            code: 'DE_THI',
            title: 'Đề kiểm tra trực tuyến',
            description: '',
            duration_minutes: 15,
            total_questions: 5,
            is_open: true,
            requires_pin: true
          }
        setPinModalExam(targetExam)
        setPinError(err.message || 'Mã PIN ca thi không chính xác! Vui lòng nhập mã PIN 6 số từ Giáo viên.')
        return
      }

      if (err.code === 'DEVICE_LOCKED' || err.status === 423) {
        setPinModalExam(null)
        setDeviceLockAlert(
          err.message ||
            'Tài khoản của bạn đang làm bài trên một thiết bị khác! Hệ thống giới hạn 1 tài khoản chỉ được thi trên 1 thiết bị duy nhất để chống làm hộ bài.'
        )
        return
      }

      alert(err.message || 'Không thể bắt đầu làm bài. Đề thi này hiện đang tắt hoặc chưa được giao cho lớp bạn.')
      await fetchAvailableExams()
    } finally {
      setIsStartingExam(false)
    }
  }

  // Start Smart Knowledge Recovery Practice (from historical wrong questions)
  const handleStartRecoveryPractice = (onlyUnrecovered: boolean = true) => {
    const allMistakes = recoveryData?.questions || []
    let pool = onlyUnrecovered ? allMistakes.filter((q: any) => !q.is_recovered) : allMistakes
    if (pool.length === 0) {
      pool = allMistakes
    }
    if (pool.length === 0) {
      alert('Hiện tại bạn chưa có câu hỏi làm sai nào cần phục hồi kiến thức!')
      return
    }

    const seedVal = Date.now()
    const normalized = pool.map((m: any) => ({
      id: m.question_id || m.id,
      content: m.content,
      image_url: m.image_url,
      points: Number((10 / pool.length).toFixed(2)),
      explanation: m.explanation,
      explanation_image_url: m.explanation_image_url,
      options: m.options || m.raw_options || []
    }))

    const shuffledRecoveryQuestions = ensureShuffledQuestions(normalized, seedVal)

    setIsRecoverySession(true)
    setCurrentExam({
      id: 99999,
      code: 'PHUC_HOI_KIEN_THUC',
      title: `Luyện tập Phục hồi Kiến thức (${shuffledRecoveryQuestions.length} câu từng làm sai)`,
      duration_minutes: Math.max(10, shuffledRecoveryQuestions.length * 2),
      total_questions: shuffledRecoveryQuestions.length,
      is_shuffled: true,
      variant_code: 'MĐ-PHỤC HỒI'
    })
    setQuestions(shuffledRecoveryQuestions)
    setAnswers({})
    setCurrentQIndex(0)
    setRemainingSeconds(Math.max(10, shuffledRecoveryQuestions.length * 2) * 60)
    window.history.pushState({ mode: 'testing' }, '')
    setActiveTab('testing')
  }

  // Submit Exam or Knowledge Recovery Practice (Strictly Real Grading — preserves student's shuffled question & option order)
  const handleSubmitExam = async () => {
    if (!currentExam) return
    setIsSubmitting(true)

    // Send all questions in the student's shuffled display order so backend grades & returns in the same order
    const formattedAnswers = questions.map((q: any) => ({
      question_id: Number(q.id),
      selected_option_id: answers[q.id] ?? null
    }))

    try {
      const res = isRecoverySession
        ? await api.student.submitRecoveryPractice({ answers: formattedAnswers })
        : await api.student.submitExam(currentExam.id, { answers: formattedAnswers })

      if (res.data) {
        // Align options in questions_result with the student's shuffled A-B-C-D option order
        const studentQMap = new Map<number, any>()
        questions.forEach((q: any) => studentQMap.set(Number(q.id), q))

        const alignedQuestionsResult = (res.data.questions_result || []).map((qRes: any) => {
          const localQ = studentQMap.get(Number(qRes.question_id))
          if (!localQ || !Array.isArray(localQ.options)) return qRes
          const serverOptMap = new Map<number, any>()
          ;(qRes.options || []).forEach((o: any) => serverOptMap.set(Number(o.id), o))
          const mergedOptions = localQ.options.map((localOpt: any) => {
            const sOpt = serverOptMap.get(Number(localOpt.id)) || {}
            return {
              ...sOpt,
              ...localOpt,
              option_key: localOpt.option_key // Keep student's shuffled A, B, C, D label
            }
          })
          return {
            ...qRes,
            options: mergedOptions
          }
        })

        setSubmissionResult({
          ...res.data,
          questions_result: alignedQuestionsResult
        })
        // Clear cached answers
        localStorage.removeItem(`edutest_answers_${currentExam.id}`)
        await refreshUserData()
        await fetchAvailableExams()
        await fetchWalletAndHistory()
        await fetchRecoveryQuestions()
        return
      }
    } catch (err: any) {
      alert('Lỗi nộp bài: ' + (err.message || 'Vui lòng kiểm tra lại kết nối'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  // Current Question
  const activeQ = questions[currentQIndex]

  return (
    <main className="exam-shell">
      {/* Topbar */}
      <header className="exam-topbar">
        <div className="brand">
          <div className="brand-mark"><Sparkles size={17} /></div>
          <span>Edu<span className="brand-accent">Test</span></span>
        </div>

        {activeTab !== 'testing' && (
          <nav
            className="student-top-nav"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginLeft: 16,
              overflowX: 'auto',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              flexShrink: 1,
              minWidth: 0
            }}
            aria-label="Điều hướng học sinh"
          >
            <button
              onClick={() => setActiveTab('exams')}
              className="student-nav-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '7px 13px',
                borderRadius: 8,
                border: 0,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                background: activeTab === 'exams' ? 'rgba(139,124,246,0.18)' : 'transparent',
                color: activeTab === 'exams' ? '#a78bfa' : 'var(--muted)',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              <BookOpen size={15} />
              Đề thi & Luyện tập
            </button>

            <button
              onClick={() => {
                setActiveTab('recovery')
                fetchRecoveryQuestions()
              }}
              className="student-nav-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '7px 13px',
                borderRadius: 8,
                border: 0,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                background: activeTab === 'recovery' ? 'rgba(49,213,160,0.18)' : 'transparent',
                color: activeTab === 'recovery' ? '#31d5a0' : 'var(--muted)',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              <BrainCircuit size={15} />
              Phục hồi kiến thức
              {(recoveryData?.summary?.pending_recovery_count ?? 0) > 0 && (
                <span
                  style={{
                    padding: '1px 6px',
                    borderRadius: 99,
                    fontSize: 10,
                    fontWeight: 800,
                    background: '#ef5f70',
                    color: '#fff',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {recoveryData.summary.pending_recovery_count} câu sai
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className="student-nav-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '7px 13px',
                borderRadius: 8,
                border: 0,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                background: activeTab === 'history' ? 'rgba(139,124,246,0.18)' : 'transparent',
                color: activeTab === 'history' ? '#a78bfa' : 'var(--muted)',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              <History size={15} />
              Lịch sử làm bài
            </button>

            <button
              onClick={() => setActiveTab('wallet')}
              className="student-nav-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '7px 13px',
                borderRadius: 8,
                border: 0,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                background: activeTab === 'wallet' ? 'rgba(139,124,246,0.18)' : 'transparent',
                color: activeTab === 'wallet' ? '#a78bfa' : 'var(--muted)',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              <Coins size={15} />
              Ví thưởng & Xu
            </button>
          </nav>
        )}

        {activeTab === 'testing' ? (
          <>
            <div className="exam-title">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <strong>{currentExam?.title || 'Phòng thi trực tuyến'}</strong>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '3px 9px',
                    borderRadius: 99,
                    background: 'rgba(49,213,160,0.14)',
                    border: '1px solid rgba(49,213,160,0.35)',
                    color: '#31d5a0',
                    fontSize: 11,
                    fontWeight: 700
                  }}
                  title="Thứ tự câu hỏi và vị trí đáp án A-B-C-D đã được đảo ngẫu nhiên riêng cho bạn"
                >
                  <Shuffle size={12} />
                  {currentExam?.variant_code || 'MĐ-Ngẫu nhiên'} · Đảo câu & A-B-C-D
                </span>
              </div>
              <span>Học sinh: {user?.full_name || 'Nguyễn Văn An'} · Lớp 10A1</span>
            </div>

            <div className="exam-tools">
              <ThemeToggle compact />
              <button
                type="button"
                onClick={() => {
                  setShowBroadcastDrawer((prev) => !prev)
                  setUnreadBroadcastCount(0)
                }}
                style={{
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 12px',
                  borderRadius: 10,
                  background: unreadBroadcastCount > 0 ? 'rgba(245,173,82,0.18)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${unreadBroadcastCount > 0 ? 'rgba(245,173,82,0.5)' : 'var(--line)'}`,
                  color: unreadBroadcastCount > 0 ? '#f5ad52' : '#c4b5fd',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                title="Kênh phát thông báo & cảnh báo tức thì từ Giáo viên"
              >
                <Megaphone size={15} />
                <span>Thông báo GV</span>
                {broadcasts.length > 0 && (
                  <span
                    style={{
                      padding: '1px 6px',
                      borderRadius: 99,
                      fontSize: 10,
                      fontWeight: 800,
                      background: unreadBroadcastCount > 0 ? '#ef5f70' : 'rgba(139,124,246,0.25)',
                      color: '#fff'
                    }}
                  >
                    {unreadBroadcastCount > 0 ? `${unreadBroadcastCount} mới` : broadcasts.length}
                  </span>
                )}
              </button>

              <div className="exam-progress">
                <span>TIẾN ĐỘ</span>
                <strong>{Object.keys(answers).length} / {questions.length}</strong>
              </div>

              <div className="countdown" style={{ borderColor: remainingSeconds < 180 ? 'rgba(239,95,112,0.5)' : undefined, color: remainingSeconds < 180 ? '#ef5f70' : undefined }}>
                <Clock3 size={16} />
                <strong>{formatTimer(remainingSeconds)}</strong>
                <span>CÒN LẠI</span>
              </div>

              <button
                className="exam-exit"
                onClick={() => {
                  if (confirm('Bạn có muốn tạm thời thoát màn hình làm bài? Lưu ý: Thời gian làm bài vẫn tiếp tục đếm ngược.')) {
                    setActiveTab('exams')
                  }
                }}
              >
                Thoát
              </button>
            </div>
          </>
        ) : (
          <div className="student-top-actions" style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto', flexShrink: 0 }}>
            <ThemeToggle />

            {/* Live Teacher Broadcast Bell */}
            <button
              type="button"
              className="student-action-btn"
              onClick={() => {
                setShowBroadcastDrawer((prev) => !prev)
                setUnreadBroadcastCount(0)
              }}
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 11px',
                borderRadius: 10,
                background: unreadBroadcastCount > 0 ? 'rgba(245,173,82,0.16)' : 'rgba(255,255,255,0.035)',
                border: `1px solid ${unreadBroadcastCount > 0 ? 'rgba(245,173,82,0.45)' : 'var(--line)'}`,
                color: unreadBroadcastCount > 0 ? '#f5ad52' : '#d0d5e2',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
              title="Kênh thông báo & cảnh báo trực tiếp từ Giáo viên"
            >
              <Bell size={15} />
              <span className="student-btn-label">Thông báo</span>
              {broadcasts.length > 0 && (
                <span
                  style={{
                    padding: '1px 6px',
                    borderRadius: 99,
                    fontSize: 10,
                    fontWeight: 700,
                    background: unreadBroadcastCount > 0 ? '#ef5f70' : 'rgba(139,124,246,0.25)',
                    color: '#fff',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {unreadBroadcastCount > 0 ? unreadBroadcastCount : broadcasts.length}
                </span>
              )}
            </button>

            {/* Student Wallet Widget */}
            <div
              className="student-wallet-widget"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(255,255,255,0.035)',
                border: '1px solid var(--line)',
                borderRadius: 10,
                padding: '6px 12px',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#f5ad52', fontWeight: 700, fontSize: 12.5 }}>
                <Coins size={15} />
                <span>{user?.wallet_coins ?? walletData.balance?.wallet_coins ?? 0} xu</span>
              </div>
              <span className="wallet-divider" style={{ color: 'var(--line)', opacity: 0.6 }}>|</span>
              <div className="wallet-points-part" style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#8b7cf6', fontWeight: 700, fontSize: 12.5 }}>
                <Star size={15} />
                <span>{user?.reward_points ?? walletData.balance?.reward_points ?? 0}đ</span>
              </div>
            </div>

            {onBack && (
              <button
                className="secondary-button student-action-btn"
                onClick={onBack}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '7px 11px',
                  borderColor: 'rgba(139,124,246,0.3)',
                  color: '#c4b5fd',
                  fontWeight: 600,
                  fontSize: 12,
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
                title="Quay lại giao diện trước"
              >
                <ArrowLeft size={14} />
                <span className="student-btn-label">Quay lại</span>
              </button>
            )}

            <button
              className="secondary-button student-action-btn"
              onClick={() => { logout(); router.push('/login') }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '7px 11px',
                fontSize: 12,
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
              title="Đăng xuất"
            >
              <LogOut size={14} />
              <span className="student-btn-label">Đăng xuất</span>
            </button>

            <div
              className="student-role-badge"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 10px',
                borderRadius: 8,
                background: 'rgba(49,213,160,0.12)',
                border: '1px solid rgba(49,213,160,0.3)',
                color: '#31d5a0',
                fontSize: 12,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              <BookOpen size={14} />
              <span>Học sinh</span>
            </div>
          </div>
        )}
      </header>

      {/* REAL-TIME TEACHER BROADCAST ALERT BANNER / POPUP */}
      <AnimatePresence>
        {activeBroadcastAlert && (
          <motion.div
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            style={{
              margin: '12px 24px 0',
              padding: '14px 18px',
              borderRadius: 14,
              background:
                activeBroadcastAlert.level === 'urgent'
                  ? 'linear-gradient(135deg, rgba(239,95,112,0.24), rgba(185,28,28,0.18))'
                  : activeBroadcastAlert.level === 'warning'
                  ? 'linear-gradient(135deg, rgba(245,173,82,0.22), rgba(180,83,9,0.15))'
                  : 'linear-gradient(135deg, rgba(139,124,246,0.22), rgba(49,213,160,0.12))',
              border: `1px solid ${
                activeBroadcastAlert.level === 'urgent'
                  ? 'rgba(239,95,112,0.6)'
                  : activeBroadcastAlert.level === 'warning'
                  ? 'rgba(245,173,82,0.55)'
                  : 'rgba(139,124,246,0.5)'
              }`,
              boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              zIndex: 45
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background:
                    activeBroadcastAlert.level === 'urgent'
                      ? 'rgba(239,95,112,0.25)'
                      : activeBroadcastAlert.level === 'warning'
                      ? 'rgba(245,173,82,0.25)'
                      : 'rgba(139,124,246,0.25)',
                  color:
                    activeBroadcastAlert.level === 'urgent'
                      ? '#ef5f70'
                      : activeBroadcastAlert.level === 'warning'
                      ? '#f5ad52'
                      : '#a78bfa',
                  flexShrink: 0
                }}
              >
                {activeBroadcastAlert.level === 'urgent' ? (
                  <ShieldAlert size={20} />
                ) : activeBroadcastAlert.level === 'warning' ? (
                  <AlertTriangle size={20} />
                ) : (
                  <Megaphone size={20} />
                )}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      padding: '2px 7px',
                      borderRadius: 5,
                      background:
                        activeBroadcastAlert.level === 'urgent'
                          ? '#ef5f70'
                          : activeBroadcastAlert.level === 'warning'
                          ? '#f5ad52'
                          : '#8b7cf6',
                      color: '#0b0f1a'
                    }}
                  >
                    {activeBroadcastAlert.level === 'urgent'
                      ? 'CẢNH BÁO KHẨN CẤP'
                      : activeBroadcastAlert.level === 'warning'
                      ? 'NHẮC NHỞ PHÒNG THI'
                      : 'THÔNG BÁO TỪ GIÁO VIÊN'}
                  </span>
                  {activeBroadcastAlert.studentId && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#ef5f70' }}>
                      · Gửi trực tiếp tới bạn ({user?.full_name || 'Học sinh'})
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: '#9ba4b5' }}>
                    · {activeBroadcastAlert.senderName || 'Giáo viên coi thi'}
                  </span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', lineHeight: 1.45 }}>
                  {activeBroadcastAlert.message}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveBroadcastAlert(null)}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.08)',
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              Đã hiểu
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BROADCAST HISTORY DRAWER */}
      <AnimatePresence>
        {showBroadcastDrawer && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              position: 'fixed',
              top: 68,
              right: 24,
              width: 400,
              maxWidth: 'calc(100vw - 32px)',
              maxHeight: 460,
              background: '#121829',
              border: '1px solid rgba(139,124,246,0.35)',
              borderRadius: 16,
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
              zIndex: 80,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Megaphone size={16} color="#a78bfa" />
                <strong style={{ fontSize: 13, color: '#fff' }}>Kênh Thông báo & Cảnh báo Tức thì</strong>
              </div>
              <button
                type="button"
                onClick={() => setShowBroadcastDrawer(false)}
                style={{ background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: 14, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {broadcasts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 12px', color: 'var(--muted)', fontSize: 12 }}>
                  Hiện chưa có thông báo hoặc nhắc nhở nào từ Giáo viên coi thi.
                </div>
              ) : (
                broadcasts.map((b) => (
                  <div
                    key={b.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 10,
                      background:
                        b.level === 'urgent'
                          ? 'rgba(239,95,112,0.12)'
                          : b.level === 'warning'
                          ? 'rgba(245,173,82,0.1)'
                          : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${
                        b.level === 'urgent'
                          ? 'rgba(239,95,112,0.35)'
                          : b.level === 'warning'
                          ? 'rgba(245,173,82,0.3)'
                          : 'var(--line)'
                      }`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: b.level === 'urgent' ? '#ef5f70' : b.level === 'warning' ? '#f5ad52' : '#a78bfa'
                        }}
                      >
                        {b.level === 'urgent' ? '🚨 KHẨN CẤP' : b.level === 'warning' ? '⚠️ NHẮC NHỞ' : '📢 THÔNG BÁO'} · {b.senderName || 'Giáo viên'}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                        {b.timestamp ? new Date(b.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Vừa xong'}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: '#e2e8f0', lineHeight: 1.45 }}>{b.message}</p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* VIEW 1: Available Exams Portal */}
      {activeTab === 'exams' && (
        <section className="content-wrap" style={{ maxWidth: 1200, paddingTop: 40 }}>
          {/* Device Lock Conflict Alert */}
          <AnimatePresence>
            {deviceLockAlert && (
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                style={{
                  marginBottom: 22,
                  padding: '16px 20px',
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, rgba(239,95,112,0.22), rgba(185,28,28,0.16))',
                  border: '1.5px solid rgba(239,95,112,0.65)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <ShieldAlert size={26} color="#ef5f70" />
                  <div>
                    <strong style={{ display: 'block', fontSize: 13.5, color: '#ef5f70' }}>
                      CHẶN ĐĂNG NHẬP THIẾT BỊ THỨ 2 — CHỐNG LÀM HỘ BÀI TỪ BÊN NGOÀI
                    </strong>
                    <span style={{ fontSize: 12.5, color: '#fff', lineHeight: 1.45 }}>{deviceLockAlert}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDeviceLockAlert(null)}
                  style={{ background: 'none', border: 0, color: '#fff', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Welcome Student Banner */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(139,124,246,0.18), rgba(65,45,150,0.1))',
              border: '1px solid rgba(139,124,246,0.3)',
              borderRadius: 18,
              padding: '28px 32px',
              marginBottom: 22,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 16
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#a99bff', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em' }}>
                <Zap size={14} /> KHÔNG GIAN HỌC SINH · BẢO MẬT 1 THIẾT BỊ DUY NHẤT
              </div>
              <h1 style={{ margin: '8px 0 6px 0', fontSize: 26, fontWeight: 700, color: '#fff' }}>
                Xin chào, {user?.full_name || 'Nguyễn Văn An'} 👋
              </h1>
              <p style={{ margin: 0, fontSize: 13, color: '#c1cae1' }}>
                Mã số: <strong>{user?.code || 'HS001'}</strong> · Lớp: <strong>Lớp 10A1</strong> · Thiết bị định danh:{' '}
                <strong style={{ color: '#31d5a0' }}>{getDeviceName()}</strong>
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  setActiveTab('recovery')
                  fetchRecoveryQuestions()
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  borderRadius: 10,
                  background: 'rgba(49,213,160,0.14)',
                  border: '1px solid rgba(49,213,160,0.4)',
                  color: '#31d5a0',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <BrainCircuit size={16} /> Phục hồi kiến thức {(recoveryData?.summary?.pending_recovery_count ?? 0) > 0 ? `(${recoveryData.summary.pending_recovery_count} câu sai)` : ''}
              </button>

              <button
                onClick={() => setActiveTab('wallet')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  borderRadius: 10,
                  background: 'rgba(245,173,82,0.12)',
                  border: '1px solid rgba(245,173,82,0.3)',
                  color: '#f5ad52',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Coins size={16} /> Xem ví thưởng
              </button>
            </div>
          </div>

          {/* SMART KNOWLEDGE RECOVERY PROMO BANNER */}
          {(recoveryData?.summary?.total_mistakes_found ?? 0) > 0 && (
            <div
              style={{
                marginBottom: 30,
                padding: '20px 24px',
                borderRadius: 16,
                background: 'linear-gradient(135deg, rgba(16,185,129,0.14), rgba(18,23,39,0.92))',
                border: '1px solid rgba(49,213,160,0.38)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 16
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 12,
                    background: 'rgba(49,213,160,0.18)',
                    border: '1px solid rgba(49,213,160,0.4)',
                    display: 'grid',
                    placeItems: 'center',
                    color: '#31d5a0'
                  }}
                >
                  <BrainCircuit size={24} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 800, color: '#31d5a0', letterSpacing: '0.07em' }}>
                      HỆ THỐNG TỰ ĐỘNG LỌC CÂU HỎI TỪNG TRẢ LỜI SAI TRONG LỊCH SỬ
                    </span>
                    <span style={{ padding: '2px 8px', borderRadius: 99, background: 'rgba(245,173,82,0.18)', color: '#f5ad52', fontSize: 10, fontWeight: 700 }}>
                      +5 xu & +3 điểm / câu sửa đúng
                    </span>
                  </div>
                  <h3 style={{ margin: '4px 0 2px', fontSize: 16.5, fontWeight: 700, color: '#fff' }}>
                    Bài luyện tập Phục hồi Kiến thức Cá nhân hóa ({recoveryData.summary.pending_recovery_count} câu cần ôn lại · Đã nắm vững {recoveryData.summary.recovered_count} câu)
                  </h3>
                  <p style={{ margin: 0, fontSize: 12, color: '#9ba4b5' }}>
                    Hệ thống tự động tổng hợp các câu bạn từng chọn sai ở các đề thi trước và đảo lại đáp án A-B-C-D để bạn ôn luyện đến khi nắm chắc 100%.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('recovery')}
                  className="secondary-button"
                  style={{ fontSize: 12 }}
                >
                  Xem danh sách câu từng sai
                </button>
                <button
                  type="button"
                  onClick={() => handleStartRecoveryPractice(true)}
                  className="primary-button"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)', fontSize: 12 }}
                >
                  Luyện tập Phục hồi ngay <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Section Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#fff' }}>Đề thi & Luyện tập đang mở</h2>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted)' }}>Các đề thi được giáo viên bộ môn phát trực tiếp cho lớp bạn (Yêu cầu mã PIN ca thi & giới hạn 1 thiết bị)</p>
            </div>

            <button
              onClick={fetchAvailableExams}
              style={{ background: 'none', border: '1px solid var(--line)', color: '#8b7cf6', borderRadius: 8, padding: '6px 12px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <RotateCcw size={13} /> Làm mới danh sách
            </button>
          </div>

          {/* Exams Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: availableExams.length > 0 ? 'repeat(auto-fill, minmax(360px, 1fr))' : '1fr', gap: 18 }}>
            {isLoadingExams ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}>
                Đang kiểm tra danh sách đề thi...
              </div>
            ) : availableExams.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(18,23,39,0.5)', border: '1px dashed var(--line)', borderRadius: 14, color: 'var(--muted)' }}>
                <BookOpen size={40} style={{ opacity: 0.35, margin: '0 auto 14px', color: '#8b7cf6' }} />
                <h3 style={{ fontSize: 17, color: '#fff', margin: '0 0 8px 0', fontWeight: 600 }}>Hiện không có đề thi nào đang mở cho lớp của bạn</h3>
                <p style={{ fontSize: 13, margin: 0, maxWidth: 520, marginInline: 'auto', lineHeight: 1.6, color: '#9ba4b5' }}>
                  Giáo viên đã tắt trạng thái phát đề hoặc chưa đến giờ mở thi. Khi giáo viên kích hoạt phát đề (bật trạng thái MỞ), đề thi sẽ xuất hiện ngay tại đây để bạn làm bài.
                </p>
              </div>
            ) : (
              availableExams.map((exam) => {
                const attempt = exam.student_attempt
                const isCompleted = attempt?.status === 'completed'
                const isInProgress = attempt?.status === 'in_progress'

                return (
                <div
                  key={exam.exam_id}
                  style={{
                    background: 'rgba(18,23,39,0.85)',
                    border: '1px solid var(--line)',
                    borderRadius: 14,
                    padding: '22px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#8b7cf6', background: 'rgba(139,124,246,0.12)', padding: '3px 8px', borderRadius: 6 }}>
                        {exam.code}
                      </span>
                      {exam.requires_pin !== false && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 10,
                            fontWeight: 700,
                            color: '#f5ad52',
                            background: 'rgba(245,173,82,0.14)',
                            padding: '3px 8px',
                            borderRadius: 6
                          }}
                        >
                          <KeyRound size={11} /> Mã PIN Ca thi
                        </span>
                      )}
                    </div>

                    {/* Status Badge */}
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '4px 9px',
                        borderRadius: 6,
                        background: isCompleted ? 'rgba(49,213,160,0.15)' : isInProgress ? 'rgba(245,173,82,0.15)' : 'rgba(255,255,255,0.06)',
                        color: isCompleted ? '#31d5a0' : isInProgress ? '#f5ad52' : 'var(--muted)'
                      }}
                    >
                      {isCompleted ? `ĐÃ NỘP · ${attempt.total_score}đ` : isInProgress ? 'ĐANG LÀM DỞ' : 'CHƯA LÀM'}
                    </span>
                  </div>

                  <div>
                    <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>{exam.title}</h3>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>{exam.description}</p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, fontSize: 11, color: 'var(--muted)', borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <Clock3 size={13} style={{ color: '#8b7cf6' }} /> {exam.duration_minutes} phút
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <FileText size={13} style={{ color: '#31d5a0' }} /> {exam.total_questions} câu hỏi
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <GraduationCap size={13} style={{ color: '#f5ad52' }} /> {exam.teacher?.full_name || 'Giáo viên'}
                    </span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '2px 7px',
                        borderRadius: 6,
                        background: 'rgba(49,213,160,0.1)',
                        color: '#31d5a0',
                        fontSize: 10,
                        fontWeight: 600
                      }}
                    >
                      <Shuffle size={11} /> Đảo đề & A-B-C-D
                    </span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '2px 7px',
                        borderRadius: 6,
                        background: 'rgba(56,189,248,0.12)',
                        color: '#38bdf8',
                        fontSize: 10,
                        fontWeight: 600
                      }}
                    >
                      <Laptop size={11} /> Khóa 1 Thiết bị
                    </span>
                  </div>

                  <button
                    onClick={() => handleRequestStartExam(exam)}
                    className="primary-button"
                    style={{ width: '100%', justifyContent: 'center', marginTop: 'auto' }}
                  >
                    <Lock size={14} />
                    {isCompleted ? 'Nhập PIN & Làm lại đề thi' : isInProgress ? 'Tiếp tục làm bài' : 'Nhập PIN & Bắt đầu làm bài'}
                    <ArrowRight size={15} />
                  </button>
                </div>
              )
            }))}
          </div>
        </section>
      )}

      {/* VIEW 2: Active Test-Taking Canvas */}
      {activeTab === 'testing' && activeQ && (
        <div className="exam-body">
          <section className="question-area">
            <div className="question-meta">
              <span>CÂU HỎI {currentQIndex + 1} / {questions.length}</span>
              <span className="question-tag">Trắc nghiệm</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: 'rgba(139,124,246,0.12)',
                  color: '#a78bfa',
                  fontSize: 10,
                  fontWeight: 600
                }}
              >
                <Shuffle size={11} /> Thứ tự câu & đáp án A-B-C-D ngẫu nhiên ({currentExam?.variant_code || 'MĐ-Riêng'})
              </span>
              <span style={{ marginLeft: 'auto', color: '#f5ad52', fontSize: 11, fontWeight: 600 }}>{activeQ.points || 2.0} điểm</span>
            </div>

            <h1>{cleanMathText(activeQ.content)}</h1>

            {activeQ.image_url && (
              <div className="question-img-wrap" style={{ maxWidth: 760, margin: '20px 0' }}>
                <div className="question-img-badge">
                  <ImageIcon size={12} /> HÌNH ẢNH MINH HỌA CÂU HỎI
                </div>
                <img src={activeQ.image_url} alt={`Hình minh họa câu ${currentQIndex + 1}`} />
              </div>
            )}

            <p className="question-help">Chọn một phương án đúng nhất bằng cách bấm vào các ô bên dưới.</p>

            {/* Options List */}
            <div className="answer-list">
              {(activeQ.options || []).map((opt: any, index: number) => {
                const isSelected = answers[activeQ.id] === opt.id
                return (
                  <button
                    key={opt.id || index}
                    onClick={() => {
                      const updated = { ...answers, [activeQ.id]: opt.id }
                      setAnswers(updated)
                      if (currentExam?.id) {
                        localStorage.setItem(`edutest_answers_${currentExam.id}`, JSON.stringify(updated))
                      }
                    }}
                    className={`answer-card ${isSelected ? 'selected' : ''}`}
                  >
                    <span className="answer-key">{opt.option_key || String.fromCharCode(65 + index)}</span>
                    <span>{cleanMathText(opt.content)}</span>
                    {isSelected && <Check size={18} color="#31d5a0" style={{ marginLeft: 'auto' }} />}
                  </button>
                )
              })}
            </div>

            {/* Navigation Bottom Footer */}
            <div className="question-footer">
              <button
                className="secondary-button"
                disabled={currentQIndex === 0}
                onClick={() => setCurrentQIndex((prev) => prev - 1)}
              >
                ← Câu trước
              </button>

              <span>Đáp án được lưu tự động trên hệ thống</span>

              {currentQIndex === questions.length - 1 ? (
                <button
                  className="primary-button"
                  onClick={handleSubmitExam}
                  disabled={isSubmitting}
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                >
                  {isSubmitting ? 'Đang chấm điểm...' : 'Nộp bài thi'} <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  className="primary-button"
                  onClick={() => setCurrentQIndex((prev) => prev + 1)}
                >
                  Câu tiếp → <ArrowRight size={16} />
                </button>
              )}
            </div>
          </section>

          {/* Right Question Palette */}
          <aside className="question-map">
            <div>
              <h2>Bảng câu hỏi</h2>
              <p>{Object.keys(answers).length} / {questions.length} câu đã trả lời</p>
            </div>

            <div className="question-grid">
              {questions.map((q, idx) => {
                const isAnswered = answers[q.id] !== undefined
                const isCurrent = currentQIndex === idx
                return (
                  <button
                    key={q.id || idx}
                    onClick={() => setCurrentQIndex(idx)}
                    className={`${isCurrent ? 'current' : ''} ${isAnswered ? 'answered' : ''}`}
                  >
                    {idx + 1}
                  </button>
                )
              })}
            </div>

            <div className="map-legend">
              <span><i className="legend-current" />Đang làm</span>
              <span><i className="legend-answered" />Đã chọn</span>
              <span><i />Chưa chọn</span>
            </div>

            <div className="focus-card" style={{ borderColor: 'rgba(49,213,160,0.3)', background: 'rgba(49,213,160,0.06)' }}>
              <Shuffle size={17} color="#31d5a0" />
              <strong style={{ color: '#31d5a0' }}>Mã đề riêng: {currentExam?.variant_code || 'MĐ-Ngẫu nhiên'}</strong>
              <span>Thứ tự câu hỏi và vị trí phương án A-B-C-D của bạn được đảo ngẫu nhiên độc lập để chống nhìn bài.</span>
            </div>

            <div className="focus-card">
              <Zap size={17} />
              <strong>Giám sát & Cảnh báo trực tiếp</strong>
              <span>
                {tabSwitchWarnings > 0
                  ? `⚠️ Bạn đã rời màn hình ${tabSwitchWarnings} lần (đã báo về Giáo viên).`
                  : 'Hệ thống kết nối trực tiếp với Giáo viên coi thi. Không tự ý chuyển tab khi đang làm bài.'}
              </span>
            </div>
          </aside>
        </div>
      )}

      {/* VIEW 2.5: Smart Knowledge Recovery (Mistake Bank Practice) */}
      {activeTab === 'recovery' && (
        <section className="content-wrap" style={{ maxWidth: 1180, paddingTop: 38 }}>
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.16), rgba(18,23,39,0.92))',
              border: '1px solid rgba(49,213,160,0.38)',
              borderRadius: 18,
              padding: '26px 30px',
              marginBottom: 26,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 18
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#31d5a0', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em' }}>
                <BrainCircuit size={15} /> HỆ THỐNG TỰ ĐỘNG LỌC CÂU HỎI TỪNG TRẢ LỜI SAI TRONG LỊCH SỬ
              </div>
              <h1 style={{ margin: '6px 0 4px', fontSize: 24, fontWeight: 800, color: '#fff' }}>
                Luyện tập Phục hồi Kiến thức Cá nhân hóa
              </h1>
              <p style={{ margin: 0, fontSize: 12.5, color: '#9ba4b5', maxWidth: 680 }}>
                Tổng hợp toàn bộ câu hỏi bạn đã từng chọn sai ở các đề thi trước. Khi bấm luyện tập, hệ thống sẽ tự động đảo ngẫu nhiên vị trí phương án A-B-C-D và thưởng thêm <strong>+5 xu & +3 điểm</strong> cho mỗi câu sửa sai thành công.
              </p>
            </div>

            {(recoveryData?.summary?.total_mistakes_found ?? 0) > 0 && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleStartRecoveryPractice(true)}
                  className="primary-button"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                >
                  <BrainCircuit size={16} /> Luyện tập các câu cần phục hồi ({recoveryData?.summary?.pending_recovery_count ?? 0} câu)
                </button>

                <button
                  type="button"
                  onClick={() => handleStartRecoveryPractice(false)}
                  className="secondary-button"
                >
                  Ôn lại toàn bộ ({recoveryData?.summary?.total_mistakes_found ?? 0} câu)
                </button>
              </div>
            )}
          </div>

          {/* Recovery Summary Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
            <div className="panel" style={{ padding: '16px 18px' }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>TỔNG CÂU TỪNG LÀM SAI</span>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginTop: 6 }}>
                {recoveryData?.summary?.total_mistakes_found ?? 0} câu
              </div>
            </div>

            <div className="panel" style={{ padding: '16px 18px' }}>
              <span style={{ fontSize: 11, color: '#ef5f70', fontWeight: 700 }}>CẦN PHỤC HỒI NGAY</span>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#ef5f70', marginTop: 6 }}>
                {recoveryData?.summary?.pending_recovery_count ?? 0} câu
              </div>
            </div>

            <div className="panel" style={{ padding: '16px 18px' }}>
              <span style={{ fontSize: 11, color: '#31d5a0', fontWeight: 700 }}>ĐÃ PHỤC HỒI KIẾN THỨC</span>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#31d5a0', marginTop: 6 }}>
                {recoveryData?.summary?.recovered_count ?? 0} câu
              </div>
            </div>

            <div className="panel" style={{ padding: '16px 18px' }}>
              <span style={{ fontSize: 11, color: '#f5ad52', fontWeight: 700 }}>SỐ LƯỢT ÔN PHỤC HỒI</span>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#f5ad52', marginTop: 6 }}>
                {recoveryData?.summary?.sessions_completed ?? 0} lượt
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { key: 'all', label: `Tất cả (${(recoveryData?.questions || []).length})` },
                { key: 'pending', label: `Cần ôn tập (${recoveryData?.summary?.pending_recovery_count ?? 0})` },
                { key: 'recovered', label: `Đã nắm vững (${recoveryData?.summary?.recovered_count ?? 0})` }
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setRecoveryFilter(t.key as any)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--line)',
                    background: recoveryFilter === t.key ? 'rgba(49,213,160,0.16)' : 'transparent',
                    color: recoveryFilter === t.key ? '#31d5a0' : 'var(--muted)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={fetchRecoveryQuestions}
              className="secondary-button"
              style={{ fontSize: 11.5 }}
            >
              <RotateCcw size={13} /> Đồng bộ lại lịch sử sai
            </button>
          </div>

          {/* Mistake Questions List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {isLoadingRecovery ? (
              <div style={{ textAlign: 'center', padding: 48, color: 'var(--muted)' }}>
                Đang quét lịch sử làm bài và lọc các câu từng trả lời sai...
              </div>
            ) : (recoveryData?.questions || []).length === 0 ? (
              <div
                className="panel"
                style={{
                  textAlign: 'center',
                  padding: '54px 24px',
                  borderRadius: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12
                }}
              >
                <div
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: '50%',
                    background: 'rgba(49,213,160,0.12)',
                    display: 'grid',
                    placeItems: 'center',
                    color: '#31d5a0',
                    marginBottom: 4
                  }}
                >
                  <CheckCircle2 size={30} />
                </div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#fff' }}>
                  Bạn chưa có câu hỏi nào cần phục hồi!
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', maxWidth: 520, lineHeight: 1.6 }}>
                  Hệ thống chỉ lưu lại những câu bạn trả lời sai trong các bài kiểm tra thực tế. Khi bạn làm đề và có câu trả lời chưa chính xác, câu hỏi sẽ xuất hiện tại đây kèm phân tích chi tiết để bạn ôn luyện lại.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('exams')}
                  className="primary-button"
                  style={{ marginTop: 8 }}
                >
                  <BookOpen size={15} /> Làm bài kiểm tra ngay
                </button>
              </div>
            ) : (
              (recoveryData?.questions || [])
                .filter((q: any) => {
                  if (recoveryFilter === 'pending') return !q.is_recovered
                  if (recoveryFilter === 'recovered') return q.is_recovered
                  return true
                })
                .map((q: any, idx: number) => (
                  <div
                    key={q.question_id || idx}
                    className="panel"
                    style={{
                      padding: '18px 20px',
                      border: `1px solid ${q.is_recovered ? 'rgba(49,213,160,0.35)' : 'rgba(239,95,112,0.35)'}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            padding: '3px 9px',
                            borderRadius: 6,
                            background: q.is_recovered ? 'rgba(49,213,160,0.15)' : 'rgba(239,95,112,0.15)',
                            color: q.is_recovered ? '#31d5a0' : '#ef5f70',
                            fontSize: 11,
                            fontWeight: 800
                          }}
                        >
                          {q.is_recovered ? '✓ ĐÃ PHỤC HỒI KIẾN THỨC' : `✗ CẦN ÔN LẠI · SAI ${q.times_wrong || 1} LẦN`}
                        </span>
                        <span style={{ fontSize: 11.5, color: '#a78bfa', fontWeight: 700 }}>
                          {q.subject_name || 'Toán học'} · Nguồn đề: {q.exam_title} ({q.exam_code})
                        </span>
                      </div>
                    </div>

                    <h3 style={{ margin: '0 0 10px', fontSize: 15, color: '#fff', lineHeight: 1.45 }}>
                      {cleanMathText(q.content)}
                    </h3>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.025)' }}>
                      <span style={{ color: '#ef5f70', fontWeight: 600 }}>
                        Phương án bạn từng chọn sai: <strong>{q.last_chosen_option_key}</strong> ({cleanMathText(q.last_chosen_option_content || '')})
                      </span>
                      {q.is_recovered && (
                        <span style={{ color: '#31d5a0', fontWeight: 700 }}>
                          ✓ Đáp án đúng đã nắm vững: {q.correct_option_key} ({cleanMathText(q.correct_option_content || '')})
                        </span>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        </section>
      )}

      {/* VIEW 2.6: Student Exam History */}
      {activeTab === 'history' && (
        <section className="content-wrap" style={{ maxWidth: 1080, paddingTop: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>Lịch sử làm bài của bạn</h2>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                Hệ thống tự động trích xuất các câu sai từ lịch sử này để tạo Bài luyện tập Phục hồi Kiến thức
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => setActiveTab('recovery')}
                className="primary-button"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
              >
                <BrainCircuit size={15} /> Mở Luyện tập Phục hồi Kiến thức
              </button>
              <button className="secondary-button" onClick={() => setActiveTab('exams')}>
                ← Quay lại danh sách đề
              </button>
            </div>
          </div>

          <div className="panel" style={{ padding: 20 }}>
            {historyList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--muted)', fontSize: 13 }}>
                Bạn chưa có lịch sử nộp bài nào hoặc dữ liệu đang được đồng bộ.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {historyList.map((item: any) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '14px 16px',
                      borderRadius: 12,
                      background: 'rgba(255,255,255,0.025)',
                      border: '1px solid var(--line)'
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: 14, color: '#fff', display: 'block' }}>
                        {item.exam?.title || 'Đề kiểm tra trực tuyến'} ({item.exam?.code || 'DE_THI'})
                      </strong>
                      <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                        Trạng thái: {item.status === 'completed' ? 'Đã hoàn thành' : 'Đang làm'} · Đúng {item.correct_answers_count ?? 0}/{item.exam?.total_questions ?? 5} câu
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <strong style={{ fontSize: 18, color: '#31d5a0' }}>{item.total_score ?? 0} / 10đ</strong>
                      <button
                        type="button"
                        onClick={() => setActiveTab('recovery')}
                        className="secondary-button"
                        style={{ fontSize: 11.5 }}
                      >
                        Ôn lại câu sai
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* VIEW 3: Wallet & History Modal */}
      {activeTab === 'wallet' && (
        <section className="content-wrap" style={{ maxWidth: 1000, paddingTop: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>Ví thưởng & Lịch sử học tập</h2>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted)' }}>Theo dõi điểm tích lũy và số dư xu thưởng của bạn</p>
            </div>
            <button className="secondary-button" onClick={() => setActiveTab('exams')}>← Quay lại danh sách đề</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 30 }}>
            <div style={{ padding: '24px', background: 'rgba(245,173,82,0.1)', border: '1px solid rgba(245,173,82,0.3)', borderRadius: 16 }}>
              <span style={{ fontSize: 12, color: '#f5ad52', fontWeight: 600 }}>SỐ DƯ VÍ XU THƯỞNG</span>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#f5ad52', margin: '8px 0' }}>
                🪙 {user?.wallet_coins ?? walletData.balance?.wallet_coins ?? 80} xu
              </div>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)' }}>Dùng để đổi quà và mở khóa biểu tượng thành tích</p>
            </div>

            <div style={{ padding: '24px', background: 'rgba(139,124,246,0.1)', border: '1px solid rgba(139,124,246,0.3)', borderRadius: 16 }}>
              <span style={{ fontSize: 12, color: '#8b7cf6', fontWeight: 600 }}>ĐIỂM TÍCH LŨY RÈN LUYỆN</span>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#8b7cf6', margin: '8px 0' }}>
                ⭐ {user?.reward_points ?? walletData.balance?.reward_points ?? 40} điểm
              </div>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)' }}>Đóng góp vào bảng xếp hạng thành tích của lớp và trường</p>
            </div>
          </div>

          <div className="panel" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600 }}>Lịch sử biến động gần đây</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(walletData.transactions || [
                { id: 1, type: 'coins', amount: 40, reason: 'Thưởng hoàn thành đề thi DE_TOAN_10_01 (4 câu đúng)', created_at: 'Hôm nay' },
                { id: 2, type: 'points', amount: 20, reason: 'Điểm tích lũy đề thi DE_TOAN_10_01', created_at: 'Hôm nay' }
              ]).map((t: any) => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', background: 'rgba(255,255,255,0.025)', borderRadius: 10, border: '1px solid var(--line)' }}>
                  <div>
                    <strong style={{ fontSize: 12, color: '#fff', display: 'block' }}>{t.reason}</strong>
                    <span style={{ fontSize: 10, color: 'var(--muted)' }}>Giao dịch tự động</span>
                  </div>
                  <span style={{ color: t.type === 'coins' ? '#f5ad52' : '#8b7cf6', fontWeight: 700, fontSize: 13 }}>
                    +{t.amount} {t.type === 'coins' ? 'xu 🪙' : 'điểm ⭐'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Submission Result Celebration Overlay */}
      {submissionResult && (
        <div className="result-overlay">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="result-card"
          >
            <div className="result-icon">
              <Trophy size={28} />
            </div>

            <span className="eyebrow" style={{ justifyContent: 'center', color: '#48dbb0' }}>
              HOÀN THÀNH BÀI THI XUẤT SẮC!
            </span>

            <h2>Chúc mừng bạn đã nộp bài thành công</h2>
            <p>Hệ thống đã tự động chấm điểm và ghi nhận vào hồ sơ cá nhân của bạn.</p>

            <div className="result-stats">
              <div>
                <strong style={{ color: '#48dbb0' }}>{submissionResult.total_score} / 10</strong>
                <span>Điểm số ({submissionResult.correct_answers_count}/{submissionResult.total_questions || 5} câu đúng)</span>
              </div>
              <div>
                <strong style={{ color: '#f5ad52' }}>+{submissionResult.earned_coins || 40}</strong>
                <span>Xu thưởng 🪙</span>
              </div>
              <div>
                <strong style={{ color: '#8b7cf6' }}>+{submissionResult.earned_points || 20}</strong>
                <span>Điểm thưởng ⭐</span>
              </div>
            </div>

            {submissionResult.questions_result && submissionResult.questions_result.length > 0 && (
              <button
                type="button"
                onClick={() => setShowReviewSolutions(!showReviewSolutions)}
                className="secondary-button"
                style={{ width: '100%', justifyContent: 'center', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <BookOpen size={15} />
                <span>{showReviewSolutions ? 'Thu gọn lời giải chi tiết' : 'Xem đáp án & lời giải chi tiết (kèm hình)'}</span>
              </button>
            )}

            {showReviewSolutions && submissionResult.questions_result && (
              <div style={{ maxHeight: 380, overflowY: 'auto', textAlign: 'left', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 4 }}>
                {submissionResult.questions_result.map((res: any, rIdx: number) => (
                  <div
                    key={res.question_id || rIdx}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${res.is_correct ? 'rgba(49,213,160,0.3)' : 'rgba(239,95,112,0.3)'}`,
                      borderRadius: 10,
                      padding: '12px 14px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <strong style={{ fontSize: 12, color: '#fff' }}>CÂU {rIdx + 1}</strong>
                      <span style={{ fontSize: 10, fontWeight: 700, color: res.is_correct ? '#31d5a0' : '#ef5f70' }}>
                        {res.is_correct ? `✓ ĐÚNG (+${res.points_earned}đ)` : '✗ CHƯA CHÍNH XÁC'}
                      </span>
                    </div>

                    <p style={{ margin: '0 0 8px', fontSize: 12, color: '#d0d5e2' }}>{cleanMathText(res.content)}</p>

                    {/* Question image */}
                    {res.image_url && (
                      <div className="question-img-wrap" style={{ margin: '8px 0', maxHeight: 200 }}>
                        <img src={res.image_url} alt={`Câu ${rIdx + 1}`} style={{ maxHeight: 190 }} />
                      </div>
                    )}

                    {/* Options summary */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, margin: '8px 0' }}>
                      {(res.options || []).map((o: any) => {
                        const isChosen = res.selected_option_id === o.id
                        const isRight = res.correct_option_id === o.id
                        return (
                          <div
                            key={o.id}
                            style={{
                              fontSize: 11,
                              padding: '5px 8px',
                              borderRadius: 6,
                              background: isRight ? 'rgba(49,213,160,0.12)' : isChosen ? 'rgba(239,95,112,0.1)' : 'transparent',
                              color: isRight ? '#31d5a0' : isChosen ? '#ef5f70' : 'var(--muted)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6
                            }}
                          >
                            <strong>{o.option_key}.</strong>
                            <span>{cleanMathText(o.content)}</span>
                            {isRight && <span style={{ marginLeft: 'auto', fontWeight: 700, fontSize: 9 }}>[ĐÁP ÁN ĐÚNG]</span>}
                            {isChosen && !isRight && <span style={{ marginLeft: 'auto', fontWeight: 700, fontSize: 9 }}>[BẠN CHỌN]</span>}
                          </div>
                        )
                      })}
                    </div>

                    {/* Explanation text & image */}
                    {(res.explanation || res.explanation_image_url) && (
                      <div style={{ marginTop: 8, padding: '8px 10px', background: 'rgba(139,124,246,0.08)', borderRadius: 7, borderLeft: '3px solid #8b7cf6', fontSize: 11 }}>
                        {res.explanation && <div><strong style={{ color: '#fff' }}>Hướng dẫn giải:</strong> {cleanMathText(res.explanation)}</div>}
                        {res.explanation_image_url && (
                          <div className="explanation-img-wrap" style={{ marginTop: 6 }}>
                            <span style={{ fontSize: 9, color: '#a99bff', fontWeight: 600, display: 'block', marginBottom: 4 }}>Hình minh họa lời giải:</span>
                            <img src={res.explanation_image_url} alt="Hình minh họa lời giải" style={{ maxHeight: 170 }} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              className="primary-button"
              onClick={() => {
                setSubmissionResult(null)
                setShowReviewSolutions(false)
                setActiveTab('exams')
              }}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Quay lại danh sách đề thi <ArrowRight size={16} />
            </button>
          </motion.div>
        </div>
      )}

      {/* ==================== MODAL NHẬP MÃ PIN CA THI & KHÓA 1 THIẾT BỊ ==================== */}
      <AnimatePresence>
        {pinModalExam && (
          <div className="modal-overlay" onClick={() => !isStartingExam && setPinModalExam(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 460,
                background: 'linear-gradient(145deg, #13192b 0%, #0d1220 100%)',
                border: '1px solid rgba(139, 124, 246, 0.45)',
                borderRadius: 20,
                padding: '26px 26px 22px',
                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.65)',
                color: '#fff'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      display: 'grid',
                      placeItems: 'center',
                      color: '#fff',
                      boxShadow: '0 8px 20px rgba(245, 158, 11, 0.35)'
                    }}
                  >
                    <KeyRound size={22} />
                  </div>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#fbbf24', letterSpacing: 0.6 }}>
                      BẢO MẬT CA THI & CHỐNG THI HỘ
                    </span>
                    <h3 style={{ margin: '2px 0 0', fontSize: 17, fontWeight: 800 }}>
                      Nhập Mã PIN Ca Thi
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPinModalExam(null)}
                  style={{ background: 'transparent', border: 0, color: '#94a3b8', cursor: 'pointer', padding: 4 }}
                >
                  <X size={18} />
                </button>
              </div>

              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  marginBottom: 16
                }}
              >
                <div style={{ fontSize: 11, color: '#a99bff', fontWeight: 700, marginBottom: 3 }}>
                  {pinModalExam.code} · Thời gian: {pinModalExam.duration_minutes} phút
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>
                  {pinModalExam.title}
                </div>
              </div>

              {/* Single-Device Lock Notice */}
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.28)',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10
                }}
              >
                <Smartphone size={18} color="#38bdf8" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 11.5, color: '#bae6fd', lineHeight: 1.45 }}>
                  <strong style={{ color: '#fff' }}>Cơ chế khóa 1 thiết bị duy nhất:</strong> Ngay khi xác thực mã PIN, tài khoản của bạn sẽ được khóa cố định trên thiết bị <strong style={{ color: '#38bdf8' }}>{getDeviceName()}</strong>. Mọi đăng nhập mở đề từ máy thứ 2 bên ngoài sẽ bị chặn tự động để chống làm hộ bài.
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 8 }}>
                  <span>Mã PIN 6 chữ số do Giáo viên cung cấp:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const defaultPin = String(((Number(pinModalExam.exam_id || 1) * 13579 + 1 * 24680 + 102938) % 900000) + 100000)
                      setEnteredPin(defaultPin)
                      setPinError(null)
                    }}
                    style={{
                      border: '1px solid rgba(251, 191, 36, 0.35)',
                      background: 'rgba(251, 191, 36, 0.1)',
                      color: '#fbbf24',
                      borderRadius: 6,
                      padding: '2px 8px',
                      fontSize: 10.5,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                    title="Điền nhanh mã PIN mặc định của ca thi (Dành cho Demo)"
                  >
                    ⚡ Điền PIN mẫu ({String(((Number(pinModalExam.exam_id || 1) * 13579 + 1 * 24680 + 102938) % 900000) + 100000)})
                  </button>
                </label>

                <input
                  type="text"
                  maxLength={6}
                  value={enteredPin}
                  onChange={(e) => {
                    setEnteredPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))
                    setPinError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && enteredPin.length >= 4 && !isStartingExam) {
                      handleStartExam(pinModalExam.exam_id, enteredPin, pinModalExam)
                    }
                  }}
                  placeholder="Nhập 6 chữ số (VD: 241197)"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '13px 16px',
                    borderRadius: 12,
                    border: pinError ? '1.5px solid #ef4444' : '1.5px solid rgba(139, 124, 246, 0.5)',
                    background: 'rgba(10, 14, 26, 0.9)',
                    color: '#fbbf24',
                    fontSize: 22,
                    fontWeight: 800,
                    letterSpacing: 8,
                    textAlign: 'center',
                    outline: 'none'
                  }}
                />

                {pinError && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: '9px 12px',
                      borderRadius: 8,
                      background: 'rgba(239, 68, 68, 0.14)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      color: '#fca5a5',
                      fontSize: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}
                  >
                    <AlertTriangle size={15} color="#f87171" style={{ flexShrink: 0 }} />
                    <span>{pinError}</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setPinModalExam(null)}
                  disabled={isStartingExam}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  className="primary-button"
                  disabled={!enteredPin.trim() || isStartingExam}
                  onClick={() => handleStartExam(pinModalExam.exam_id, enteredPin, pinModalExam)}
                  style={{
                    flex: 1.5,
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    opacity: !enteredPin.trim() || isStartingExam ? 0.6 : 1
                  }}
                >
                  <Lock size={15} />
                  <span>{isStartingExam ? 'Đang xác thực...' : 'Xác nhận PIN & Mở đề'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  )
}
