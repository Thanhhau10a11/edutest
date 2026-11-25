'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart3,
  FileSpreadsheet,
  FileText,
  Printer,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Sparkles,
  RefreshCw,
  BookOpen,
  Eye,
  Award,
  TrendingUp,
  Target,
  HelpCircle,
  X,
  Download,
  CheckSquare
} from 'lucide-react'
import { api } from '@/lib/api'
import { useTheme } from '@/lib/theme-context'
import { cleanMathText } from '@/lib/math-format'
import {
  exportClassScoreboardExcel,
  exportClassScoreboardPDF,
  exportItemAnalysisExcel,
  exportOMRBubbleSheetPDF,
  ExportExamInfo,
  ExportClassroomInfo,
  ExportStudentRow,
  ExportQuestionAnalyticsItem
} from '@/lib/report-export'

interface ExamAnalyticsReportModuleProps {
  selectedExamId?: number
  selectedClassId?: number
  exams?: Array<{ id: number; code: string; title: string; duration_minutes: number; total_questions: number }>
  classrooms?: Array<{ id: number; name: string; code: string; grade_name?: string }>
  onSelectExam?: (id: number) => void
  onSelectClass?: (id: number) => void
  onBack?: () => void
  embedded?: boolean
}

const FALLBACK_ANALYTICS = {
  exam: {
    id: 1,
    code: 'DE_TOAN_10_01',
    title: 'Kiểm tra 15p · Hàm số bậc hai',
    subject_name: 'Toán học 10',
    duration_minutes: 15,
    total_questions: 5,
    passing_score: 5.0,
    teacher_name: 'ThS. Nguyễn Minh Hoàng'
  },
  classroom: {
    id: 1,
    name: '10A1',
    code: 'LOP_10A1',
    grade: { name: 'Khối 10' }
  },
  statistics: {
    total_students: 8,
    completed_count: 7,
    in_progress_count: 1,
    not_started_count: 0,
    mean_score: 6.86,
    median_score: 7.0,
    std_dev: 1.72,
    highest_score: 10.0,
    lowest_score: 4.0,
    pass_count: 6,
    pass_rate: 85.7,
    academic_tiers: {
      excellent: 3,
      good: 2,
      average: 1,
      weak: 1
    }
  },
  score_distribution: [
    { range: '0-1', label: '0 - 1đ', midpoint: 0.5, count: 0, percentage: 0, bell_curve_value: 0.5, students: [] },
    { range: '1-2', label: '1 - 2đ', midpoint: 1.5, count: 0, percentage: 0, bell_curve_value: 1.8, students: [] },
    { range: '2-3', label: '2 - 3đ', midpoint: 2.5, count: 0, percentage: 0, bell_curve_value: 4.9, students: [] },
    { range: '3-4', label: '3 - 4đ', midpoint: 3.5, count: 1, percentage: 14.3, bell_curve_value: 10.6, students: [{ student_id: 5, student_code: 'HS005', full_name: 'Đỗ Quang Em', total_score: 4.0 }] },
    { range: '4-5', label: '4 - 5đ', midpoint: 4.5, count: 0, percentage: 0, bell_curve_value: 17.8, students: [] },
    { range: '5-6', label: '5 - 6đ', midpoint: 5.5, count: 1, percentage: 14.3, bell_curve_value: 23.2, students: [{ student_id: 4, student_code: 'HS004', full_name: 'Phạm Ngọc Dung', total_score: 6.0 }] },
    { range: '6-7', label: '6 - 7đ', midpoint: 6.5, count: 2, percentage: 28.6, bell_curve_value: 24.1, students: [{ student_id: 3, student_code: 'HS003', full_name: 'Trần Hoàng Cường', total_score: 6.5 }, { student_id: 6, student_code: 'HS006', full_name: 'Vũ Thị Giang', total_score: 7.0 }] },
    { range: '7-8', label: '7 - 8đ', midpoint: 7.5, count: 2, percentage: 28.6, bell_curve_value: 19.6, students: [{ student_id: 1, student_code: 'HS001', full_name: 'Nguyễn Văn An', total_score: 8.0 }, { student_id: 7, student_code: 'HS007', full_name: 'Bùi Minh Khoa', total_score: 8.0 }] },
    { range: '8-9', label: '8 - 9đ', midpoint: 8.5, count: 0, percentage: 0, bell_curve_value: 12.4, students: [] },
    { range: '9-10', label: '9 - 10đ', midpoint: 9.5, count: 1, percentage: 14.3, bell_curve_value: 6.1, students: [{ student_id: 8, student_code: 'HS008', full_name: 'Ngô Bảo Long', total_score: 10.0 }] }
  ],
  question_analytics: [
    {
      question_id: 1,
      order_index: 1,
      content: 'Cho hàm số bậc hai y = x² - 4x + 3. Tọa độ đỉnh I của parabol là:',
      points: 2.0,
      explanation: 'Hoành độ đỉnh x_I = -b/(2a) = 4/2 = 2. Tung độ đỉnh y_I = 2² - 4(2) + 3 = -1. Vậy I(2; -1).',
      correct_option_key: 'A',
      correct_option_content: 'I(2; -1)',
      total_attempts: 7,
      correct_count: 6,
      wrong_count: 1,
      unanswered_count: 0,
      correct_rate: 85.7,
      wrong_rate: 14.3,
      difficulty_level: 'Dễ',
      difficulty_code: 'easy',
      option_stats: [
        { option_id: 101, option_key: 'A', content: 'I(2; -1)', is_correct: true, selection_count: 6, selection_rate: 85.7 },
        { option_id: 102, option_key: 'B', content: 'I(-2; 15)', is_correct: false, selection_count: 1, selection_rate: 14.3 },
        { option_id: 103, option_key: 'C', content: 'I(4; 3)', is_correct: false, selection_count: 0, selection_rate: 0 },
        { option_id: 104, option_key: 'D', content: 'I(2; 1)', is_correct: false, selection_count: 0, selection_rate: 0 }
      ],
      most_chosen_wrong_option: { option_key: 'B', content: 'I(-2; 15) (Quên dấu trừ trong công thức -b/2a)', selection_count: 1, selection_rate: 14.3 },
      wrong_students: [{ student_id: 5, student_code: 'HS005', full_name: 'Đỗ Quang Em', chosen_key: 'B' }]
    },
    {
      question_id: 2,
      order_index: 2,
      content: 'Trục đối xứng của đồ thị hàm số y = 2x² + 6x - 5 là đường thẳng:',
      points: 2.0,
      explanation: 'Trục đối xứng của parabol y = ax² + bx + c là đường thẳng x = -b/(2a) = -6/(2·2) = -3/2.',
      correct_option_key: 'B',
      correct_option_content: 'x = -3/2',
      total_attempts: 7,
      correct_count: 5,
      wrong_count: 2,
      unanswered_count: 0,
      correct_rate: 71.4,
      wrong_rate: 28.6,
      difficulty_level: 'Trung bình',
      difficulty_code: 'medium',
      option_stats: [
        { option_id: 201, option_key: 'A', content: 'x = 3/2', is_correct: false, selection_count: 2, selection_rate: 28.6 },
        { option_id: 202, option_key: 'B', content: 'x = -3/2', is_correct: true, selection_count: 5, selection_rate: 71.4 },
        { option_id: 203, option_key: 'C', content: 'x = -3', is_correct: false, selection_count: 0, selection_rate: 0 },
        { option_id: 204, option_key: 'D', content: 'y = -3/2', is_correct: false, selection_count: 0, selection_rate: 0 }
      ],
      most_chosen_wrong_option: { option_key: 'A', content: 'x = 3/2 (Nhầm công thức x = b/2a)', selection_count: 2, selection_rate: 28.6 },
      wrong_students: [
        { student_id: 4, student_code: 'HS004', full_name: 'Phạm Ngọc Dung', chosen_key: 'A' },
        { student_id: 5, student_code: 'HS005', full_name: 'Đỗ Quang Em', chosen_key: 'A' }
      ]
    },
    {
      question_id: 3,
      order_index: 3,
      content: 'Hàm số y = -x² + 4x - 1 đồng biến trên khoảng nào dưới đây?',
      points: 2.0,
      explanation: 'Vì hệ số a = -1 < 0 và hoành độ đỉnh x_I = -4/(2·(-1)) = 2 nên hàm số đồng biến trên khoảng (-∞; 2) và nghịch biến trên (2; +∞).',
      correct_option_key: 'C',
      correct_option_content: '(-∞; 2)',
      total_attempts: 7,
      correct_count: 3,
      wrong_count: 4,
      unanswered_count: 0,
      correct_rate: 42.9,
      wrong_rate: 57.1,
      difficulty_level: 'Khó',
      difficulty_code: 'hard',
      option_stats: [
        { option_id: 301, option_key: 'A', content: '(2; +∞)', is_correct: false, selection_count: 3, selection_rate: 42.9 },
        { option_id: 302, option_key: 'B', content: '(-∞; -2)', is_correct: false, selection_count: 1, selection_rate: 14.3 },
        { option_id: 303, option_key: 'C', content: '(-∞; 2)', is_correct: true, selection_count: 3, selection_rate: 42.9 },
        { option_id: 304, option_key: 'D', content: '(-2; +∞)', is_correct: false, selection_count: 0, selection_rate: 0 }
      ],
      most_chosen_wrong_option: { option_key: 'A', content: '(2; +∞) (Nhầm chiều biến thiên khi a < 0)', selection_count: 3, selection_rate: 42.9 },
      wrong_students: [
        { student_id: 3, student_code: 'HS003', full_name: 'Trần Hoàng Cường', chosen_key: 'A' },
        { student_id: 4, student_code: 'HS004', full_name: 'Phạm Ngọc Dung', chosen_key: 'A' },
        { student_id: 5, student_code: 'HS005', full_name: 'Đỗ Quang Em', chosen_key: 'B' },
        { student_id: 6, student_code: 'HS006', full_name: 'Vũ Thị Giang', chosen_key: 'A' }
      ]
    },
    {
      question_id: 4,
      order_index: 4,
      content: 'Tìm tất cả giá trị của tham số m để phương trình x² - 2(m+1)x + m² + 3 = 0 có 2 nghiệm phân biệt cùng dương:',
      points: 2.0,
      explanation: 'Điều kiện: Δ\' = (m+1)² - (m²+3) = 2m - 2 > 0 ⇔ m > 1. Tổng S = 2(m+1) > 0 và tích P = m²+3 > 0 luôn đúng với m > 1. Vậy m > 1.',
      correct_option_key: 'D',
      correct_option_content: 'm > 1',
      total_attempts: 7,
      correct_count: 2,
      wrong_count: 5,
      unanswered_count: 0,
      correct_rate: 28.6,
      wrong_rate: 71.4,
      difficulty_level: 'Rất khó',
      difficulty_code: 'very_hard',
      option_stats: [
        { option_id: 401, option_key: 'A', content: 'm ≥ 1', is_correct: false, selection_count: 4, selection_rate: 57.1 },
        { option_id: 402, option_key: 'B', content: 'm > -1', is_correct: false, selection_count: 1, selection_rate: 14.3 },
        { option_id: 403, option_key: 'C', content: 'm < 1', is_correct: false, selection_count: 0, selection_rate: 0 },
        { option_id: 404, option_key: 'D', content: 'm > 1', is_correct: true, selection_count: 2, selection_rate: 28.6 }
      ],
      most_chosen_wrong_option: { option_key: 'A', content: 'm ≥ 1 (Quên điều kiện 2 nghiệm phân biệt Δ\' > 0)', selection_count: 4, selection_rate: 57.1 },
      wrong_students: [
        { student_id: 1, student_code: 'HS001', full_name: 'Nguyễn Văn An', chosen_key: 'A' },
        { student_id: 3, student_code: 'HS003', full_name: 'Trần Hoàng Cường', chosen_key: 'A' },
        { student_id: 4, student_code: 'HS004', full_name: 'Phạm Ngọc Dung', chosen_key: 'A' },
        { student_id: 5, student_code: 'HS005', full_name: 'Đỗ Quang Em', chosen_key: 'B' },
        { student_id: 7, student_code: 'HS007', full_name: 'Bùi Minh Khoa', chosen_key: 'A' }
      ]
    },
    {
      question_id: 5,
      order_index: 5,
      content: 'Giao điểm của parabol (P): y = x² - 3x + 2 với trục tung Oy là điểm:',
      points: 2.0,
      explanation: 'Giao điểm với trục tung Oy có hoành độ x = 0 ⇒ y = 2. Vậy điểm (0; 2).',
      correct_option_key: 'A',
      correct_option_content: 'M(0; 2)',
      total_attempts: 7,
      correct_count: 6,
      wrong_count: 1,
      unanswered_count: 0,
      correct_rate: 85.7,
      wrong_rate: 14.3,
      difficulty_level: 'Dễ',
      difficulty_code: 'easy',
      option_stats: [
        { option_id: 501, option_key: 'A', content: 'M(0; 2)', is_correct: true, selection_count: 6, selection_rate: 85.7 },
        { option_id: 502, option_key: 'B', content: 'M(2; 0)', is_correct: false, selection_count: 1, selection_rate: 14.3 },
        { option_id: 503, option_key: 'C', content: 'M(1; 0)', is_correct: false, selection_count: 0, selection_rate: 0 },
        { option_id: 504, option_key: 'D', content: 'M(0; -2)', is_correct: false, selection_count: 0, selection_rate: 0 }
      ],
      most_chosen_wrong_option: { option_key: 'B', content: 'M(2; 0) (Nhầm trục Oy với trục Ox)', selection_count: 1, selection_rate: 14.3 },
      wrong_students: [{ student_id: 5, student_code: 'HS005', full_name: 'Đỗ Quang Em', chosen_key: 'B' }]
    }
  ]
}

export default function ExamAnalyticsReportModule({
  selectedExamId = 1,
  selectedClassId = 1,
  exams = [],
  classrooms = [],
  onSelectExam,
  onSelectClass,
  onBack,
  embedded = false
}: ExamAnalyticsReportModuleProps) {
  const { isDark } = useTheme()
  const [analytics, setAnalytics] = useState<any>(FALLBACK_ANALYTICS)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedBinRange, setSelectedBinRange] = useState<string | null>(null)
  const [reviewQuestion, setReviewQuestion] = useState<any | null>(null)
  const [previewStudentOMR, setPreviewStudentOMR] = useState<ExportStudentRow | null>(null)
  const [questionSortMode, setQuestionSortMode] = useState<'most_missed' | 'order'>('most_missed')

  const fetchAnalytics = async () => {
    setIsLoading(true)
    try {
      const res = await api.monitor.getExamAnalytics(selectedExamId, selectedClassId)
      if (res?.data) {
        // Nếu lớp hiện tại chưa có câu trả lời nào (0 bài nộp), vẫn giữ dữ liệu thật của đề và câu hỏi
        setAnalytics(res.data)
      }
    } catch (err) {
      console.debug('Fallback analytics used:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [selectedExamId, selectedClassId])

  const examInfo: ExportExamInfo = analytics?.exam || FALLBACK_ANALYTICS.exam
  const classInfo: ExportClassroomInfo = analytics?.classroom || FALLBACK_ANALYTICS.classroom
  const stats = analytics?.statistics || FALLBACK_ANALYTICS.statistics
  const distribution: any[] = analytics?.score_distribution || FALLBACK_ANALYTICS.score_distribution
  const questionList: ExportQuestionAnalyticsItem[] =
    analytics?.question_analytics?.length > 0
      ? analytics.question_analytics
      : FALLBACK_ANALYTICS.question_analytics

  const sortedQuestions = useMemo(() => {
    const copy = [...questionList]
    if (questionSortMode === 'most_missed') {
      return copy.sort((a, b) => b.wrong_rate - a.wrong_rate || a.order_index - b.order_index)
    }
    return copy.sort((a, b) => a.order_index - b.order_index)
  }, [questionList, questionSortMode])

  const topMissedQuestions = useMemo(() => {
    return [...questionList]
      .sort((a, b) => b.wrong_rate - a.wrong_rate || a.order_index - b.order_index)
      .slice(0, 3)
  }, [questionList])

  const studentsList: ExportStudentRow[] = useMemo(() => {
    if (Array.isArray(analytics?.students) && analytics.students.length > 0) {
      return analytics.students
    }
    return [
      {
        stt: 1,
        student_id: 1,
        student_code: 'HS001',
        full_name: 'Nguyễn Văn An',
        status: 'completed',
        status_label: 'Đã xong',
        total_score: 8.0,
        correct_answers_count: 4,
        duration_seconds: 640,
        academic_rank: 'Giỏi',
        exam_variant_code: 'MĐ-238',
        answers: [
          { question_id: 1, question_order: 1, selected_option_id: 101, selected_option_key: 'A', correct_option_key: 'A', is_correct: true, points_earned: 2 },
          { question_id: 2, question_order: 2, selected_option_id: 202, selected_option_key: 'B', correct_option_key: 'B', is_correct: true, points_earned: 2 },
          { question_id: 3, question_order: 3, selected_option_id: 303, selected_option_key: 'C', correct_option_key: 'C', is_correct: true, points_earned: 2 },
          { question_id: 4, question_order: 4, selected_option_id: 401, selected_option_key: 'A', correct_option_key: 'D', is_correct: false, points_earned: 0 },
          { question_id: 5, question_order: 5, selected_option_id: 501, selected_option_key: 'A', correct_option_key: 'A', is_correct: true, points_earned: 2 }
        ]
      },
      {
        stt: 2,
        student_id: 3,
        student_code: 'HS003',
        full_name: 'Trần Hoàng Cường',
        status: 'completed',
        status_label: 'Đã xong',
        total_score: 6.0,
        correct_answers_count: 3,
        duration_seconds: 780,
        academic_rank: 'Đạt (TB)',
        exam_variant_code: 'MĐ-412',
        answers: [
          { question_id: 1, question_order: 1, selected_option_id: 101, selected_option_key: 'A', correct_option_key: 'A', is_correct: true, points_earned: 2 },
          { question_id: 2, question_order: 2, selected_option_id: 202, selected_option_key: 'B', correct_option_key: 'B', is_correct: true, points_earned: 2 },
          { question_id: 3, question_order: 3, selected_option_id: 301, selected_option_key: 'A', correct_option_key: 'C', is_correct: false, points_earned: 0 },
          { question_id: 4, question_order: 4, selected_option_id: 401, selected_option_key: 'A', correct_option_key: 'D', is_correct: false, points_earned: 0 },
          { question_id: 5, question_order: 5, selected_option_id: 501, selected_option_key: 'A', correct_option_key: 'A', is_correct: true, points_earned: 2 }
        ]
      }
    ]
  }, [analytics])

  // Dựng đường cong hình chuông SVG mượt mà trên hệ tọa độ 1000 x 220
  const bellCurveSvgData = useMemo(() => {
    const maxCount = Math.max(1, ...distribution.map((d) => Number(d.count || 0)))
    const maxBell = Math.max(1, ...distribution.map((d) => Number(d.bell_curve_value || 1)))

    const points = distribution.map((d, idx) => {
      const x = 50 + idx * 100
      const normalized = Number(d.bell_curve_value || 0) / maxBell
      const y = 195 - normalized * 155
      return { x, y, count: d.count, barHeight: (Number(d.count || 0) / maxCount) * 150 }
    })

    if (points.length === 0) return { path: '', area: '', points: [] }

    let path = `M ${points[0].x} ${points[0].y}`
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i]
      const next = points[i + 1]
      const ctrlX1 = curr.x + (next.x - curr.x) * 0.45
      const ctrlY1 = curr.y
      const ctrlX2 = curr.x + (next.x - curr.x) * 0.55
      const ctrlY2 = next.y
      path += ` C ${ctrlX1} ${ctrlY1}, ${ctrlX2} ${ctrlY2}, ${next.x} ${next.y}`
    }

    const area = `${path} L ${points[points.length - 1].x} 200 L ${points[0].x} 200 Z`
    return { path, area, points }
  }, [distribution])

  const getDifficultyBadgeStyle = (code: string) => {
    if (code === 'very_hard') {
      return { bg: 'rgba(239,95,112,0.16)', border: 'rgba(239,95,112,0.45)', color: '#ef5f70' }
    }
    if (code === 'hard') {
      return { bg: 'rgba(245,173,82,0.16)', border: 'rgba(245,173,82,0.45)', color: '#f5ad52' }
    }
    if (code === 'medium') {
      return { bg: 'rgba(139,124,246,0.16)', border: 'rgba(139,124,246,0.45)', color: '#a78bfa' }
    }
    return { bg: 'rgba(49,213,160,0.15)', border: 'rgba(49,213,160,0.4)', color: '#31d5a0' }
  }

  return (
    <div className={embedded ? 'module-embedded' : 'module-shell'}>
      <section className="content-wrap" style={{ maxWidth: 1380, paddingTop: embedded ? 10 : 28 }}>
        {/* HEADER & 1-CLICK MINISTRY OF EDUCATION EXPORT BAR */}
        <div
          style={{
            background: isDark
              ? 'linear-gradient(135deg, rgba(24,31,54,0.95), rgba(14,19,34,0.95))'
              : 'linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%)',
            border: isDark ? '1px solid rgba(139,124,246,0.32)' : '1px solid rgba(109,91,226,0.22)',
            boxShadow: isDark ? 'none' : '0 4px 20px rgba(15, 23, 42, 0.05)',
            borderRadius: 18,
            padding: '22px 26px',
            marginBottom: 24,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 18
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: isDark ? '#a78bfa' : '#6d5be2', fontSize: 11, fontWeight: 700, letterSpacing: '0.09em' }}>
              <BarChart3 size={15} /> PHÂN TÍCH PHỔ ĐIỂM HÌNH CHUÔNG & XUẤT BÁO CÁO CHUẨN BỘ GD&ĐT
            </div>
            <h1 style={{ margin: '6px 0 4px', fontSize: 23, fontWeight: 800, color: isDark ? '#fff' : '#0f172a' }}>
              {examInfo.title} · Lớp {classInfo.name}
            </h1>
            <p style={{ margin: 0, fontSize: 12.5, color: isDark ? '#9ba4b5' : '#475569' }}>
              Mã đề gốc: <strong style={{ color: isDark ? '#c4b5fd' : '#6d5be2' }}>{examInfo.code}</strong> · Thời lượng:{' '}
              <strong>{examInfo.duration_minutes} phút</strong> · Tự động thống kê độ khó từng câu hỏi & xuất Bảng điểm / Phiếu OMR 1-Click.
            </p>
          </div>

          {/* Filter & 1-Click Export Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
            {exams.length > 0 && onSelectExam && (
              <select
                value={selectedExamId}
                onChange={(e) => onSelectExam(Number(e.target.value))}
                style={{
                  padding: '9px 12px',
                  borderRadius: 10,
                  background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                  border: '1px solid var(--line)',
                  color: isDark ? '#fff' : '#0f172a',
                  fontSize: 12,
                  fontWeight: 600
                }}
              >
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id} style={{ background: isDark ? '#111827' : '#ffffff', color: isDark ? '#fff' : '#0f172a' }}>
                    Đề: {ex.code} — {ex.title}
                  </option>
                ))}
              </select>
            )}

            {classrooms.length > 0 && onSelectClass && (
              <select
                value={selectedClassId}
                onChange={(e) => onSelectClass(Number(e.target.value))}
                style={{
                  padding: '9px 12px',
                  borderRadius: 10,
                  background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                  border: '1px solid var(--line)',
                  color: isDark ? '#fff' : '#0f172a',
                  fontSize: 12,
                  fontWeight: 600
                }}
              >
                {classrooms.map((cls) => (
                  <option key={cls.id} value={cls.id} style={{ background: isDark ? '#111827' : '#ffffff', color: isDark ? '#fff' : '#0f172a' }}>
                    Lớp {cls.name}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={() =>
                exportClassScoreboardExcel({
                  exam: examInfo,
                  classroom: classInfo,
                  students: studentsList,
                  questions: questionList
                })
              }
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '9px 14px',
                borderRadius: 10,
                background: 'linear-gradient(135deg, #10b981, #059669)',
                border: 0,
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(16,185,129,0.28)'
              }}
              title="Xuất Bảng điểm cả lớp kèm chi tiết từng câu ra file Excel chuẩn Bộ GD&ĐT"
            >
              <FileSpreadsheet size={15} />
              Xuất Excel Bảng điểm Lớp
            </button>

            <button
              type="button"
              onClick={() =>
                exportClassScoreboardPDF({
                  exam: examInfo,
                  classroom: classInfo,
                  students: studentsList,
                  questions: sortedQuestions
                })
              }
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '9px 14px',
                borderRadius: 10,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                border: 0,
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(99,102,241,0.28)'
              }}
              title="Xuất Bảng điểm & Thống kê độ khó ra file PDF chuẩn Bộ GD&ĐT"
            >
              <Printer size={15} />
              Xuất PDF Chuẩn Bộ GD&ĐT
            </button>

            <button
              type="button"
              onClick={() =>
                exportOMRBubbleSheetPDF({
                  exam: examInfo,
                  classroom: classInfo,
                  student: null,
                  questions: questionList
                })
              }
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '9px 14px',
                borderRadius: 10,
                background: 'rgba(245,173,82,0.14)',
                border: '1px solid rgba(245,173,82,0.45)',
                color: '#f5ad52',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer'
              }}
              title="In / Xuất PDF Phiếu trả lời trắc nghiệm mẫu chuẩn Bộ GD&ĐT"
            >
              <CheckSquare size={15} />
              Phiếu Trắc nghiệm Bộ GD&ĐT
            </button>

            <button
              type="button"
              onClick={fetchAnalytics}
              className="icon-button"
              title="Làm mới số liệu phân tích"
            >
              <RefreshCw size={15} className={isLoading ? 'spin' : ''} />
            </button>
          </div>
        </div>

        {/* KPI SUMMARY CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 22 }}>
          <div className="panel" style={{ padding: '16px 18px' }}>
            <span style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 700 }}>ĐIỂM TRUNG BÌNH (μ)</span>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#a78bfa', margin: '6px 0 2px' }}>
              {stats.mean_score ?? stats.average_score ?? 0} <small style={{ fontSize: 13 }}>/ 10</small>
            </div>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>Trung vị (Median): {stats.median_score ?? 0}đ</span>
          </div>

          <div className="panel" style={{ padding: '16px 18px' }}>
            <span style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 700 }}>ĐỘ LỆCH CHUẨN (σ)</span>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#38bdf8', margin: '6px 0 2px' }}>
              ±{stats.std_dev ?? 1.45}
            </div>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              Biên độ: {stats.lowest_score ?? 0}đ → {stats.highest_score ?? 10}đ
            </span>
          </div>

          <div className="panel" style={{ padding: '16px 18px' }}>
            <span style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 700 }}>TỶ LỆ ĐẠT CHUẨN (&ge; 5.0đ)</span>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#31d5a0', margin: '6px 0 2px' }}>
              {stats.pass_rate ?? 85}%
            </div>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              {stats.pass_count ?? 0} / {stats.completed_count ?? 0} học sinh đạt
            </span>
          </div>

          <div className="panel" style={{ padding: '16px 18px' }}>
            <span style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 700 }}>PHÂN LOẠI GIỎI / KHÁ</span>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#f5ad52', margin: '6px 0 2px' }}>
              {(stats.academic_tiers?.excellent ?? 0) + (stats.academic_tiers?.good ?? 0)} HS
            </div>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              Giỏi: {stats.academic_tiers?.excellent ?? 0} · Khá: {stats.academic_tiers?.good ?? 0}
            </span>
          </div>

          <div className="panel" style={{ padding: '16px 18px' }}>
            <span style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 700 }}>CÂU HỎI CẦN CHỮA GẤP</span>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#ef5f70', margin: '6px 0 2px' }}>
              {questionList.filter((q) => q.wrong_rate >= 40).length} câu
            </div>
            <span style={{ fontSize: 11, color: '#ef5f70' }}>Tỷ lệ học sinh làm sai &ge; 40%</span>
          </div>
        </div>

        {/* SECTION 1: BELL CURVE SCORE DISTRIBUTION + TOP MOST MISSED QUESTIONS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: 20, marginBottom: 24 }}>
          {/* Left: Bell Curve Score Distribution */}
          <div className="panel" style={{ padding: '22px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <span className="eyebrow" style={{ color: '#a78bfa' }}>
                  <TrendingUp size={13} /> BIỂU ĐỒ PHỔ ĐIỂM HÌNH CHUÔNG (GAUSSIAN BELL CURVE)
                </span>
                <h2 style={{ margin: '4px 0 2px', fontSize: 17, fontWeight: 700, color: '#fff' }}>
                  Phân phối điểm số & Đường cong chuẩn của lớp {classInfo.name}
                </h2>
                <p style={{ margin: 0, fontSize: 11.5, color: 'var(--muted)' }}>
                  Bấm vào từng cột điểm để xem danh sách học sinh tương ứng. Đường cong vàng thể hiện phân phối chuẩn Gauss.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#8b7cf6' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: '#8b7cf6', display: 'inline-block' }} />
                  Số lượng HS
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#f5ad52' }}>
                  <span style={{ width: 14, height: 3, borderRadius: 2, background: '#f5ad52', display: 'inline-block' }} />
                  Đường hình chuông
                </span>
              </div>
            </div>

            {/* Interactive SVG Histogram + Smooth Gaussian Bell Curve */}
            <div
              style={{
                background: isDark ? 'rgba(11,15,26,0.65)' : '#f8fafc',
                border: '1px solid var(--line)',
                borderRadius: 14,
                padding: '18px 14px 12px'
              }}
            >
              <svg viewBox="0 0 1000 245" style={{ width: '100%', height: 245, overflow: 'visible' }}>
                <defs>
                  <linearGradient id="bellAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f5ad52" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#f5ad52" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="barPassGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b7cf6" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.65" />
                  </linearGradient>
                  <linearGradient id="barFailGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef5f70" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#be123c" stopOpacity="0.6" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid Lines */}
                {[45, 95, 145, 200].map((yLine, idx) => (
                  <line
                    key={idx}
                    x1="20"
                    y1={yLine}
                    x2="980"
                    y2={yLine}
                    stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.08)'}
                    strokeDasharray={idx < 3 ? '4 4' : undefined}
                  />
                ))}

                {/* Passing Threshold Line at 5.0 */}
                <line
                  x1="500"
                  y1="20"
                  x2="500"
                  y2="200"
                  stroke="rgba(49,213,160,0.55)"
                  strokeWidth="1.5"
                  strokeDasharray="5 5"
                />
                <text x="506" y="32" fill={isDark ? '#31d5a0' : '#059669'} fontSize="10" fontWeight="700">
                  Mốc Đạt 5.0đ
                </text>

                {/* Histogram Bars */}
                {distribution.map((bin, idx) => {
                  const pt = bellCurveSvgData.points[idx] || { x: 50 + idx * 100, barHeight: 0 }
                  const barH = Math.max(bin.count > 0 ? 18 : 4, pt.barHeight)
                  const barY = 200 - barH
                  const isSelected = selectedBinRange === bin.range
                  const isBelowPass = idx < 5

                  return (
                    <g
                      key={bin.range}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedBinRange(isSelected ? null : bin.range)}
                    >
                      <rect
                        x={pt.x - 28}
                        y={barY}
                        width={56}
                        height={barH}
                        rx={7}
                        fill={isBelowPass ? 'url(#barFailGrad)' : 'url(#barPassGrad)'}
                        stroke={isSelected ? (isDark ? '#ffffff' : '#0f172a') : isDark ? 'rgba(255,255,255,0.15)' : 'rgba(15,23,42,0.12)'}
                        strokeWidth={isSelected ? 2 : 1}
                        opacity={bin.count > 0 ? 1 : 0.25}
                      />
                      <text
                        x={pt.x}
                        y={barY - 8}
                        textAnchor="middle"
                        fill={bin.count > 0 ? (isDark ? '#ffffff' : '#0f172a') : '#64748b'}
                        fontSize="11"
                        fontWeight="700"
                      >
                        {bin.count} HS ({bin.percentage}%)
                      </text>
                      <text
                        x={pt.x}
                        y={222}
                        textAnchor="middle"
                        fill={isSelected ? '#d97706' : isDark ? '#94a3b8' : '#475569'}
                        fontSize="11"
                        fontWeight="700"
                      >
                        {bin.label}
                      </text>
                    </g>
                  )
                })}

                {/* Smooth Gaussian Bell Curve Area & Stroke */}
                {bellCurveSvgData.area && <path d={bellCurveSvgData.area} fill="url(#bellAreaGrad)" />}
                {bellCurveSvgData.path && (
                  <path
                    d={bellCurveSvgData.path}
                    fill="none"
                    stroke="#f5ad52"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />
                )}

                {/* Bell Curve Nodes */}
                {bellCurveSvgData.points.map((pt, idx) => (
                  <circle
                    key={idx}
                    cx={pt.x}
                    cy={pt.y}
                    r={4.5}
                    fill={isDark ? '#0f172a' : '#ffffff'}
                    stroke="#f5ad52"
                    strokeWidth={2.5}
                  />
                ))}
              </svg>

              {/* Selected Bin Student Drill-down */}
              {selectedBinRange && (
                <div
                  style={{
                    marginTop: 10,
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: 'rgba(139,124,246,0.12)',
                    border: '1px solid rgba(139,124,246,0.35)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 8
                  }}
                >
                  <div style={{ fontSize: 12, color: '#fff' }}>
                    <strong>Khoảng điểm [{selectedBinRange}đ]: </strong>
                    {(distribution.find((d) => d.range === selectedBinRange)?.students || []).length === 0 ? (
                      <span style={{ color: 'var(--muted)' }}>Không có học sinh nào trong khoảng điểm này.</span>
                    ) : (
                      (distribution.find((d) => d.range === selectedBinRange)?.students || []).map((s: any) => (
                        <span
                          key={s.student_id}
                          style={{
                            display: 'inline-block',
                            marginRight: 6,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: 'rgba(255,255,255,0.08)',
                            fontSize: 11,
                            fontWeight: 600
                          }}
                        >
                          {s.full_name} ({s.student_code}: {s.total_score}đ)
                        </span>
                      ))
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedBinRange(null)}
                    style={{ background: 'none', border: 0, color: '#c4b5fd', fontSize: 11, cursor: 'pointer' }}
                  >
                    Đóng
                  </button>
                </div>
              )}
            </div>

            {/* 4 Academic Tiers Breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 14 }}>
              <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(49,213,160,0.08)', border: '1px solid rgba(49,213,160,0.25)' }}>
                <span style={{ fontSize: 10, color: '#31d5a0', fontWeight: 700 }}>HỌC LỰC GIỎI (&ge; 8.0)</span>
                <strong style={{ display: 'block', fontSize: 17, color: '#fff', marginTop: 2 }}>
                  {stats.academic_tiers?.excellent ?? 0} học sinh
                </strong>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(139,124,246,0.08)', border: '1px solid rgba(139,124,246,0.25)' }}>
                <span style={{ fontSize: 10, color: '#a78bfa', fontWeight: 700 }}>HỌC LỰC KHÁ (6.5 - 7.9)</span>
                <strong style={{ display: 'block', fontSize: 17, color: '#fff', marginTop: 2 }}>
                  {stats.academic_tiers?.good ?? 0} học sinh
                </strong>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(245,173,82,0.08)', border: '1px solid rgba(245,173,82,0.25)' }}>
                <span style={{ fontSize: 10, color: '#f5ad52', fontWeight: 700 }}>ĐẠT / TB (5.0 - 6.4)</span>
                <strong style={{ display: 'block', fontSize: 17, color: '#fff', marginTop: 2 }}>
                  {stats.academic_tiers?.average ?? 0} học sinh
                </strong>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(239,95,112,0.08)', border: '1px solid rgba(239,95,112,0.25)' }}>
                <span style={{ fontSize: 10, color: '#ef5f70', fontWeight: 700 }}>CHƯA ĐẠT (&lt; 5.0)</span>
                <strong style={{ display: 'block', fontSize: 17, color: '#fff', marginTop: 2 }}>
                  {stats.academic_tiers?.weak ?? 0} học sinh
                </strong>
              </div>
            </div>
          </div>

          {/* Right: Top Questions Students Missed Most (Immediate Teacher Remediation) */}
          <div className="panel" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <span className="eyebrow" style={{ color: '#ef5f70' }}>
                <AlertTriangle size={13} /> CẢNH BÁO CÂU HỎI HỌC SINH HAY CHỌN SAI NHIỀU NHẤT
              </span>
              <h2 style={{ margin: '4px 0 2px', fontSize: 17, fontWeight: 700, color: '#fff' }}>
                Trọng tâm cần chữa đề & ôn tập ngay
              </h2>
              <p style={{ margin: 0, fontSize: 11.5, color: 'var(--muted)' }}>
                Hệ thống tự động phát hiện phương án nhiễu (bẫy) mà nhiều học sinh chọn nhầm nhất.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {topMissedQuestions.map((q) => {
                const badge = getDifficultyBadgeStyle(q.difficulty_code)
                return (
                  <div
                    key={q.question_id}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 12,
                      background: 'rgba(239,95,112,0.06)',
                      border: '1px solid rgba(239,95,112,0.28)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: '#ef5f70',
                            color: '#fff',
                            fontSize: 11,
                            fontWeight: 800
                          }}
                        >
                          Câu {q.order_index}
                        </span>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: badge.bg,
                            border: `1px solid ${badge.border}`,
                            color: badge.color,
                            fontSize: 10.5,
                            fontWeight: 700
                          }}
                        >
                          Độ khó: {q.difficulty_level}
                        </span>
                      </div>
                      <strong style={{ fontSize: 12.5, color: '#ef5f70' }}>
                        {q.wrong_rate}% HS làm sai ({q.wrong_count + q.unanswered_count}/{q.total_attempts})
                      </strong>
                    </div>

                    <p style={{ margin: 0, fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.45, fontWeight: 500 }}>
                      {cleanMathText(q.content)}
                    </p>

                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 8,
                        fontSize: 11,
                        paddingTop: 4,
                        borderTop: '1px dashed rgba(255,255,255,0.08)'
                      }}
                    >
                      <span style={{ color: '#31d5a0', fontWeight: 700 }}>
                        ✓ Đáp án đúng: {q.correct_option_key} ({cleanMathText(q.correct_option_content)})
                      </span>
                      {q.most_chosen_wrong_option && (
                        <span style={{ color: '#f5ad52', fontWeight: 700 }}>
                          ⚠️ Bẫy hay chọn nhầm nhất: Đáp án {q.most_chosen_wrong_option.option_key} (
                          {q.most_chosen_wrong_option.selection_rate}% HS chọn)
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                      <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                        HS sai:{' '}
                        {(q as any).wrong_students?.length > 0
                          ? (q as any).wrong_students
                              .slice(0, 3)
                              .map((s: any) => `${s.full_name} (chọn ${s.chosen_key})`)
                              .join(', ')
                          : 'Chưa có'}
                      </span>

                      <button
                        type="button"
                        onClick={() => setReviewQuestion(q)}
                        style={{
                          padding: '5px 11px',
                          borderRadius: 7,
                          background: 'rgba(139,124,246,0.2)',
                          border: '1px solid rgba(139,124,246,0.45)',
                          color: '#c4b5fd',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5
                        }}
                      >
                        <BookOpen size={12} /> Chữa câu này trên lớp
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* SECTION 2: FULL QUESTION DIFFICULTY & DISTRACTOR BREAKDOWN TABLE */}
        <div className="panel" style={{ padding: '22px 24px', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <span className="eyebrow" style={{ color: '#31d5a0' }}>
                <Target size={13} /> MA TRẬN ĐỘ KHÓ TỪNG CÂU HỎI & TỶ LỆ CHỌN ĐÁP ÁN A - B - C - D
              </span>
              <h2 style={{ margin: '4px 0 0', fontSize: 17, fontWeight: 700, color: '#fff' }}>
                Phân tích chi tiết toàn bộ {questionList.length} câu hỏi trong đề thi
              </h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={() => setQuestionSortMode('most_missed')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--line)',
                  background: questionSortMode === 'most_missed' ? 'rgba(239,95,112,0.18)' : 'transparent',
                  color: questionSortMode === 'most_missed' ? '#ef5f70' : 'var(--muted)',
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Xếp theo câu sai nhiều nhất
              </button>
              <button
                type="button"
                onClick={() => setQuestionSortMode('order')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--line)',
                  background: questionSortMode === 'order' ? 'rgba(139,124,246,0.18)' : 'transparent',
                  color: questionSortMode === 'order' ? '#a78bfa' : 'var(--muted)',
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Xếp theo thứ tự câu 1 → {questionList.length}
              </button>
              <button
                type="button"
                onClick={() =>
                  exportItemAnalysisExcel({
                    exam: examInfo,
                    classroom: classInfo,
                    questions: sortedQuestions
                  })
                }
                className="secondary-button"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}
              >
                <Download size={13} /> Xuất Excel Phân tích câu hỏi
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sortedQuestions.map((q) => {
              const badge = getDifficultyBadgeStyle(q.difficulty_code)
              return (
                <div
                  key={q.question_id}
                  style={{
                    padding: '16px 18px',
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--line)',
                    display: 'grid',
                    gridTemplateColumns: '1.5fr 1.2fr auto',
                    gap: 18,
                    alignItems: 'center'
                  }}
                >
                  {/* Column 1: Question content & Difficulty badge */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <strong style={{ fontSize: 13, color: '#fff' }}>Câu {q.order_index}</strong>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: badge.bg,
                          border: `1px solid ${badge.border}`,
                          color: badge.color,
                          fontSize: 10.5,
                          fontWeight: 700
                        }}
                      >
                        {q.difficulty_level}
                      </span>
                      <span style={{ fontSize: 11, color: '#31d5a0', fontWeight: 700 }}>
                        Đúng: {q.correct_rate}% ({q.correct_count}/{q.total_attempts})
                      </span>
                      <span style={{ fontSize: 11, color: '#ef5f70', fontWeight: 700 }}>
                        Sai: {q.wrong_rate}%
                      </span>
                    </div>

                    <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.45 }}>
                      {cleanMathText(q.content)}
                    </div>
                  </div>

                  {/* Column 2: Option A B C D Distribution Bars */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                    {(q.option_stats || []).map((opt) => (
                      <div
                        key={opt.option_id || opt.option_key}
                        style={{
                          padding: '6px 9px',
                          borderRadius: 8,
                          background: opt.is_correct
                            ? 'rgba(49,213,160,0.1)'
                            : opt.selection_count > 0
                            ? 'rgba(239,95,112,0.08)'
                            : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${
                            opt.is_correct
                              ? 'rgba(49,213,160,0.35)'
                              : opt.selection_count > 0
                              ? 'rgba(239,95,112,0.25)'
                              : 'var(--line)'
                          }`,
                          fontSize: 11
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <strong style={{ color: opt.is_correct ? '#31d5a0' : '#fff' }}>
                            {opt.option_key}. {cleanMathText(opt.content)}
                          </strong>
                          <span style={{ fontWeight: 700, color: opt.is_correct ? '#31d5a0' : '#f5ad52' }}>
                            {opt.selection_rate}% ({opt.selection_count})
                          </span>
                        </div>
                        <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${Math.min(100, opt.selection_rate)}%`,
                              height: '100%',
                              background: opt.is_correct ? '#31d5a0' : '#ef5f70'
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Column 3: Action button */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setReviewQuestion(q)}
                      className="secondary-button"
                      style={{ fontSize: 11.5, padding: '8px 12px', whiteSpace: 'nowrap' }}
                    >
                      Xem lời giải & Chữa bài
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* SECTION 3: CLASS SCOREBOARD & 1-CLICK STUDENT OMR BUBBLE SHEET EXPORT */}
        <div className="panel" style={{ padding: '22px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <span className="eyebrow" style={{ color: '#f5ad52' }}>
                <Award size={13} /> BẢNG ĐIỂM CHI TIẾT & XUẤT PHIẾU TRẢ LỜI TRẮC NGHIỆM TỪNG HỌC SINH
              </span>
              <h2 style={{ margin: '4px 0 0', fontSize: 17, fontWeight: 700, color: '#fff' }}>
                Danh sách bảng điểm lớp {classInfo.name} ({studentsList.length} học sinh)
              </h2>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() =>
                  exportClassScoreboardExcel({
                    exam: examInfo,
                    classroom: classInfo,
                    students: studentsList,
                    questions: questionList
                  })
                }
                className="secondary-button"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#31d5a0', borderColor: 'rgba(49,213,160,0.35)' }}
              >
                <FileSpreadsheet size={14} /> Xuất Excel cả lớp (.xls)
              </button>

              <button
                type="button"
                onClick={() =>
                  exportClassScoreboardPDF({
                    exam: examInfo,
                    classroom: classInfo,
                    students: studentsList,
                    questions: sortedQuestions
                  })
                }
                className="secondary-button"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#c4b5fd', borderColor: 'rgba(139,124,246,0.35)' }}
              >
                <Printer size={14} /> Xuất PDF Bảng điểm Bộ GD&ĐT
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)', color: 'var(--muted)', fontSize: 10.5, letterSpacing: '0.06em' }}>
                  <th style={{ padding: '10px 8px' }}>STT</th>
                  <th style={{ padding: '10px 8px' }}>MÃ HS (SBD)</th>
                  <th style={{ padding: '10px 8px' }}>HỌ VÀ TÊN HỌC SINH</th>
                  <th style={{ padding: '10px 8px' }}>MÃ ĐỀ RIÊNG</th>
                  <th style={{ padding: '10px 8px' }}>TRẠNG THÁI</th>
                  <th style={{ padding: '10px 8px' }}>SỐ CÂU ĐÚNG</th>
                  <th style={{ padding: '10px 8px' }}>ĐIỂM SỐ</th>
                  <th style={{ padding: '10px 8px' }}>XẾP LOẠI</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>XUẤT PHIẾU TRẮC NGHIỆM / CHI TIẾT</th>
                </tr>
              </thead>
              <tbody>
                {studentsList.map((st, idx) => (
                  <tr key={st.student_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '12px 8px', color: 'var(--muted)' }}>{idx + 1}</td>
                    <td style={{ padding: '12px 8px', fontWeight: 700, color: '#a78bfa' }}>{st.student_code}</td>
                    <td style={{ padding: '12px 8px', fontWeight: 600, color: '#fff' }}>{st.full_name}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(49,213,160,0.1)', color: '#31d5a0', fontSize: 11, fontWeight: 700 }}>
                        {st.exam_variant_code || `MĐ-${101 + idx}`}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          background:
                            st.status === 'completed'
                              ? 'rgba(49,213,160,0.14)'
                              : st.status === 'in_progress'
                              ? 'rgba(245,173,82,0.14)'
                              : 'rgba(255,255,255,0.06)',
                          color:
                            st.status === 'completed'
                              ? '#31d5a0'
                              : st.status === 'in_progress'
                              ? '#f5ad52'
                              : 'var(--muted)'
                        }}
                      >
                        {st.status_label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px', fontWeight: 600 }}>
                      {st.status === 'completed' && st.correct_answers_count !== null
                        ? `${st.correct_answers_count} / ${examInfo.total_questions}`
                        : '—'}
                    </td>
                    <td style={{ padding: '12px 8px', fontWeight: 800, fontSize: 14, color: '#fff' }}>
                      {st.status === 'completed' && st.total_score !== null ? `${Number(st.total_score).toFixed(2)}đ` : '—'}
                    </td>
                    <td style={{ padding: '12px 8px', fontWeight: 700, color: '#f5ad52' }}>
                      {st.academic_rank || '—'}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => setPreviewStudentOMR(st)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: 7,
                            background: 'rgba(139,124,246,0.14)',
                            border: '1px solid rgba(139,124,246,0.35)',
                            color: '#c4b5fd',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5
                          }}
                        >
                          <Eye size={12} /> Xem Phiếu OMR
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            exportOMRBubbleSheetPDF({
                              exam: examInfo,
                              classroom: classInfo,
                              student: st,
                              questions: questionList
                            })
                          }
                          style={{
                            padding: '5px 10px',
                            borderRadius: 7,
                            background: 'rgba(49,213,160,0.14)',
                            border: '1px solid rgba(49,213,160,0.35)',
                            color: '#31d5a0',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5
                          }}
                        >
                          <Printer size={12} /> In PDF Bộ GD&ĐT
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* MODAL 1: CHẾ ĐỘ CHỮA CÂU HỎI TRÊN LỚP (TEACHER REMEDIATION PRESENTATION MODAL) */}
      <AnimatePresence>
        {reviewQuestion && (
          <div className="result-overlay" onClick={() => setReviewQuestion(null)}>
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 760,
                maxWidth: '94vw',
                background: isDark ? '#13192b' : '#ffffff',
                border: '1px solid rgba(139,124,246,0.45)',
                borderRadius: 20,
                padding: '26px 28px',
                boxShadow: isDark ? '0 24px 60px rgba(0,0,0,0.65)' : '0 24px 60px rgba(15,23,42,0.18)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ padding: '4px 10px', borderRadius: 8, background: '#8b7cf6', color: '#fff', fontSize: 12, fontWeight: 800 }}>
                    CHỮA ĐỀ TRÊN LỚP · CÂU {reviewQuestion.order_index}
                  </span>
                  <span style={{ fontSize: 12, color: '#ef5f70', fontWeight: 700 }}>
                    Tỷ lệ học sinh chọn sai: {reviewQuestion.wrong_rate}%
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setReviewQuestion(null)}
                  style={{ background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              <h2 style={{ fontSize: 19, color: '#fff', lineHeight: 1.5, margin: '0 0 18px' }}>
                {cleanMathText(reviewQuestion.content)}
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
                {(reviewQuestion.option_stats || []).map((opt: any) => (
                  <div
                    key={opt.option_key}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 12,
                      background: opt.is_correct
                        ? 'rgba(49,213,160,0.14)'
                        : opt.selection_count > 0
                        ? 'rgba(239,95,112,0.1)'
                        : 'rgba(255,255,255,0.03)',
                      border: `1.5px solid ${
                        opt.is_correct
                          ? '#31d5a0'
                          : opt.selection_count > 0
                          ? 'rgba(239,95,112,0.45)'
                          : 'var(--line)'
                      }`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ fontSize: 14, color: '#fff', fontWeight: opt.is_correct ? 700 : 500 }}>
                      <strong style={{ marginRight: 8, color: opt.is_correct ? '#31d5a0' : '#a78bfa' }}>
                        {opt.option_key}.
                      </strong>
                      {cleanMathText(opt.content)}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: opt.is_correct ? '#31d5a0' : '#ef5f70' }}>
                      {opt.is_correct ? '✓ ĐÁP ÁN ĐÚNG' : opt.selection_count > 0 ? `✗ ${opt.selection_count} HS chọn nhầm (${opt.selection_rate}%)` : '0 HS chọn'}
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: 'rgba(139,124,246,0.1)',
                  borderLeft: '4px solid #8b7cf6',
                  fontSize: 13.5,
                  color: '#e2e8f0',
                  lineHeight: 1.55
                }}
              >
                <strong style={{ color: '#c4b5fd', display: 'block', marginBottom: 4 }}>
                  💡 Hướng dẫn giải & Kiến thức trọng tâm cần nhắc lại cho học sinh:
                </strong>
                {cleanMathText(reviewQuestion.explanation || 'Giáo viên phân tích trực tiếp công thức và lưu ý bẫy dấu của bài toán.')}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: XEM TRƯỚC PHIẾU TRẢ LỜI TRẮC NGHIỆM OMR CỦA HỌC SINH */}
      <AnimatePresence>
        {previewStudentOMR && (
          <div className="result-overlay" onClick={() => setPreviewStudentOMR(null)}>
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 780,
                maxWidth: '95vw',
                maxHeight: '88vh',
                overflowY: 'auto',
                background: isDark ? '#13192b' : '#ffffff',
                border: '1px solid rgba(49,213,160,0.45)',
                borderRadius: 20,
                padding: '24px 26px',
                boxShadow: isDark ? '0 24px 60px rgba(0,0,0,0.65)' : '0 24px 60px rgba(15,23,42,0.18)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#31d5a0' }}>
                    PHIẾU TRẢ LỜI TRẮC NGHIỆM CHUẨN BỘ GD&ĐT
                  </span>
                  <h3 style={{ margin: '4px 0 0', fontSize: 18, color: '#fff' }}>
                    Thí sinh: {previewStudentOMR.full_name} ({previewStudentOMR.student_code}) · Mã đề:{' '}
                    {previewStudentOMR.exam_variant_code || 'MĐ-101'}
                  </h3>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() =>
                      exportOMRBubbleSheetPDF({
                        exam: examInfo,
                        classroom: classInfo,
                        student: previewStudentOMR,
                        questions: questionList
                      })
                    }
                    className="primary-button"
                    style={{ fontSize: 12, padding: '8px 14px' }}
                  >
                    <Printer size={14} /> Xuất / In PDF Phiếu này
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewStudentOMR(null)}
                    style={{ background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer' }}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* OMR Bubble Grid Preview */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))',
                  gap: 10,
                  padding: 16,
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--line)',
                  marginBottom: 16
                }}
              >
                {questionList.map((q, idx) => {
                  const ans = (previewStudentOMR.answers || [])[idx]
                  return (
                    <div
                      key={q.question_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        borderRadius: 8,
                        background: 'rgba(11,15,26,0.6)',
                        border: '1px solid rgba(255,255,255,0.06)'
                      }}
                    >
                      <strong style={{ fontSize: 12, color: '#fff' }}>Câu {idx + 1}</strong>
                      <div style={{ display: 'flex', gap: 5 }}>
                        {['A', 'B', 'C', 'D'].map((letter) => {
                          const isChosen = ans?.selected_option_key === letter
                          const isRight = q.correct_option_key === letter
                          return (
                            <span
                              key={letter}
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: '50%',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 10.5,
                                fontWeight: 800,
                                border: `1.5px solid ${
                                  isChosen && isRight
                                    ? '#31d5a0'
                                    : isChosen && !isRight
                                    ? '#ef5f70'
                                    : isRight
                                    ? '#31d5a0'
                                    : 'rgba(255,255,255,0.25)'
                                }`,
                                background:
                                  isChosen && isRight
                                    ? '#31d5a0'
                                    : isChosen && !isRight
                                    ? '#ef5f70'
                                    : 'transparent',
                                color: isChosen ? '#0b0f1a' : isRight ? '#31d5a0' : '#94a3b8'
                              }}
                            >
                              {letter}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
