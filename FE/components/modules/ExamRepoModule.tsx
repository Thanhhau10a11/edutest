'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Plus,
  Search,
  Sparkles,
  Clock,
  HelpCircle,
  Award,
  Users,
  Check,
  X,
  ExternalLink,
  Trash2,
  Share2,
  Calendar,
  AlertCircle,
  RefreshCw,
  CheckSquare,
  Image as ImageIcon,
  KeyRound,
  Copy
} from 'lucide-react'
import { api } from '@/lib/api'

interface ClassAssignment {
  classId: number
  className: string
  isOpen: boolean
  pinCode: string
  isPinRequired: boolean
}

interface ExamItem {
  id: number
  code: string
  title: string
  description: string
  durationMinutes: number
  totalQuestions: number
  passingScore: number
  teacherName: string
  subject: string
  assignments: ClassAssignment[]
}

export default function ExamRepoModule({ onBack, embedded = false }: { onBack?: () => void; embedded?: boolean }) {
  const [exams, setExams] = useState<ExamItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('all')
  const [assigningExam, setAssigningExam] = useState<ExamItem | null>(null)
  const [selectedClassesForAssign, setSelectedClassesForAssign] = useState<number[]>([])
  const [isOpenImmediately, setIsOpenImmediately] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [subjects, setSubjects] = useState<any[]>([])
  const [classrooms, setClassrooms] = useState<any[]>([])
  const [newExamSubject, setNewExamSubject] = useState('')
  const [newExamSubjectId, setNewExamSubjectId] = useState<number | null>(null)

  // Form New Exam
  const [newExamTitle, setNewExamTitle] = useState('')
  const [newExamCode, setNewExamCode] = useState('')
  const [newExamDuration, setNewExamDuration] = useState(15)
  const [newExamDescription, setNewExamDescription] = useState('')
  const [newExamClassIds, setNewExamClassIds] = useState<number[]>([])
  const [newExamIsOpenImmediately, setNewExamIsOpenImmediately] = useState(true)

  // Question bank selection for create exam
  const [bankQuestions, setBankQuestions] = useState<any[]>([])
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<number[]>([])
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false)
  const [questionSearchQuery, setQuestionSearchQuery] = useState('')

  // 1. Fetch real exams from API
  const fetchExams = async () => {
    setIsLoading(true)
    try {
      const res = await api.exams.getAll({ search: searchQuery })
      if (res.data) {
        const mapped: ExamItem[] = res.data.map((ex: any) => ({
          id: ex.id,
          code: ex.code,
          title: ex.title,
          description: ex.description || 'Đề thi trắc nghiệm trực tuyến',
          durationMinutes: ex.duration_minutes || 15,
          totalQuestions: ex.total_questions || 0,
          passingScore: Number(ex.passing_score) || 5.0,
          teacherName: ex.teacher?.full_name || 'Giáo viên',
          subject: ex.subject?.name || (ex.title.toLowerCase().includes('lý') ? 'Vật Lý 10' : ex.title.toLowerCase().includes('anh') ? 'Tiếng Anh 11' : 'Toán học 10'),
          assignments: (ex.assignments || []).map((ass: any) => ({
            classId: ass.class_id,
            className: ass.classroom?.name || `Lớp ${ass.class_id}`,
            isOpen: Boolean(ass.is_open),
            pinCode:
              ass.pin_code ||
              String(((Number(ex.id || 1) * 13579 + Number(ass.class_id || 1) * 24680 + 102938) % 900000) + 100000),
            isPinRequired: ass.is_pin_required !== undefined ? Boolean(ass.is_pin_required) : true
          }))
        }))
        setExams(mapped)
      }
    } catch (err: any) {
      if (err.status === 401 || err.status === 403) {
        console.warn('Quyền truy cập kho đề thi:', err.message)
      } else {
        console.error('Error fetching exams from API:', err.message)
      }
      setExams([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchExams()
    api.subjects.getAll().then((res) => {
      if (res.data && res.data.length > 0) {
        setSubjects(res.data)
        if (!newExamSubject && res.data.length > 0) {
          setNewExamSubject(res.data[0].name)
          setNewExamSubjectId(res.data[0].id)
        }
      }
    }).catch(() => {})

    api.classrooms.getAll().then((res) => {
      if (res.data && Array.isArray(res.data)) {
        setClassrooms(res.data)
      }
    }).catch(() => {})
  }, [])

  // Fetch questions when subject changes for exam creation
  const fetchBankQuestions = useCallback(async (subjectId: number | null) => {
    if (!subjectId) {
      setBankQuestions([])
      return
    }
    setIsLoadingQuestions(true)
    try {
      const res = await api.questions.getAll({ subject_id: subjectId })
      if (res.data && Array.isArray(res.data)) {
        setBankQuestions(res.data)
      } else {
        setBankQuestions([])
      }
    } catch (err) {
      console.debug('Failed to load bank questions:', err)
      setBankQuestions([])
    } finally {
      setIsLoadingQuestions(false)
    }
  }, [])

  // When modal opens or subject changes, load questions
  useEffect(() => {
    if (showCreateModal && newExamSubjectId) {
      fetchBankQuestions(newExamSubjectId)
      setSelectedQuestionIds([])
    }
  }, [showCreateModal, newExamSubjectId, fetchBankQuestions])

  const handleToggleQuestion = (questionId: number) => {
    setSelectedQuestionIds(prev =>
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    )
  }

  const handleSelectAllQuestions = () => {
    const filtered = filteredBankQuestions.map(q => q.id)
    const allSelected = filtered.every(id => selectedQuestionIds.includes(id))
    if (allSelected) {
      setSelectedQuestionIds(prev => prev.filter(id => !filtered.includes(id)))
    } else {
      setSelectedQuestionIds(prev => [...new Set([...prev, ...filtered])])
    }
  }

  const filteredBankQuestions = bankQuestions.filter(q => {
    if (!questionSearchQuery.trim()) return true
    return (q.content || '').toLowerCase().includes(questionSearchQuery.toLowerCase())
  })

  // 2. Toggle class open/close via API
  const handleToggleClass = async (examId: number, classId: number) => {
    const targetExam = exams.find((e) => e.id === examId)
    const targetAss = targetExam?.assignments.find((a) => a.classId === classId)
    const nextState = !targetAss?.isOpen

    // Optimistic UI update
    setExams((prev) =>
      prev.map((exam) => {
        if (exam.id !== examId) return exam
        return {
          ...exam,
          assignments: exam.assignments.map((ass) => {
            if (ass.classId !== classId) return ass
            return { ...ass, isOpen: nextState }
          })
        }
      })
    )

    try {
      await api.exams.toggleClass(examId, { class_id: classId, is_open: nextState })
    } catch (err: any) {
      console.warn('API error when toggling class status:', err.message)
    }
  }

  // 3. Confirm assigning new classes via API
  const handleConfirmAssign = async () => {
    if (!assigningExam) return
    const examId = assigningExam.id

    try {
      await api.exams.assign(examId, {
        class_ids: selectedClassesForAssign,
        is_open: isOpenImmediately
      })
      await fetchExams()
    } catch (err: any) {
      alert(err.message || 'Lỗi khi giao đề cho lớp. Vui lòng kiểm tra lại kết nối.')
    } finally {
      setAssigningExam(null)
    }
  }

  // 4. Create new exam via API
  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedQuestionIds.length === 0) {
      alert('Vui lòng chọn ít nhất 1 câu hỏi từ ngân hàng câu hỏi để đưa vào đề thi!')
      return
    }

    const targetSubject = subjects.find((s) => s.name === newExamSubject)
    const examPayload = {
      code: newExamCode.trim(),
      title: newExamTitle.trim(),
      subject_id: targetSubject ? targetSubject.id : undefined,
      description: newExamDescription || 'Đề thi trắc nghiệm trực tuyến',
      duration_minutes: Number(newExamDuration),
      passing_score: 5.0,
      questions: [],
      question_ids: selectedQuestionIds,
      class_ids: newExamClassIds,
      is_open: newExamIsOpenImmediately
    }

    try {
      await api.exams.create(examPayload)
      await fetchExams()
      setShowCreateModal(false)
      setNewExamTitle('')
      setNewExamCode('')
      setNewExamDescription('')
      setSelectedQuestionIds([])
      setNewExamClassIds([])
      setBankQuestions([])
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tạo đề thi')
    }
  }

  // 5. Delete exam via API
  const handleDeleteExam = async (examId: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa đề thi này?')) return

    try {
      await api.exams.delete(examId)
    } catch (err: any) {
      console.warn('API error when deleting exam:', err.message)
    }
    setExams(exams.filter((e) => e.id !== examId))
  }

  const filteredExams = exams.filter((exam) => {
    const matchesSearch =
      exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.code.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesSubject =
      selectedSubject === 'all' || exam.subject.includes(selectedSubject)
    return matchesSearch && matchesSubject
  })

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
            ASSESSMENT STUDIO · QUẢN LÝ KHO ĐỀ THI & GIAO ĐỀ
          </div>
          {onBack && <button className="secondary-button" onClick={onBack}>← Về tổng quan</button>}
        </header>
      )}

      <section className="content-wrap" style={{ maxWidth: 1300, paddingTop: 30 }}>
        {/* Page Heading */}
        <div className="page-heading">
          <div>
            <div className="eyebrow"><FileText size={14} /> QUẢN LÝ KHO ĐỀ & PHÁT ĐỀ THEO LỚP</div>
            <h1>Kho đề thi & Phân phối theo lớp</h1>
            <p>Lưu trữ các bộ đề thi trắc nghiệm, quản lý mở/tắt quyền làm bài độc lập cho từng lớp học.</p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="primary-button" onClick={() => setShowCreateModal(true)}>
              <Plus size={16} /> Tạo đề thi mới
            </button>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Lọc theo môn học:</span>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              style={{
                background: 'rgba(18,23,39,0.95)',
                border: '1px solid var(--line)',
                borderRadius: 9,
                padding: '8px 14px',
                color: '#fff',
                fontSize: 13,
                outline: 'none',
                cursor: 'pointer',
                minWidth: 220
              }}
            >
              <option value="all">Tất cả môn học ({subjects.length})</option>
              {subjects.map((sub: any) => (
                <option key={sub.id} value={sub.name}>
                  {sub.name} ({sub.code})
                </option>
              ))}
            </select>
          </div>

          <div className="search-box" style={{ width: 280 }}>
            <Search size={15} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên đề hoặc mã đề..."
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* Exams Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 18 }}>
          {filteredExams.map((exam) => (
            <motion.div
              key={exam.id}
              whileHover={{ y: -3 }}
              style={{
                background: 'rgba(18,23,39,0.85)',
                border: '1px solid var(--line)',
                borderRadius: 14,
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16
              }}
            >
              {/* Card Top */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 10, letterSpacing: '0.1em', fontWeight: 700, color: '#8b7cf6', background: 'rgba(139,124,246,0.12)', padding: '3px 8px', borderRadius: 6 }}>
                    {exam.code}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{exam.subject}</span>
                </div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: 16, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>{exam.title}</h3>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>{exam.description}</p>
              </div>

              {/* Exam Specs */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', background: 'rgba(255,255,255,0.025)', borderRadius: 10, border: '1px solid var(--line)', fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Clock size={14} color="#f5ad52" /> {exam.durationMinutes} phút
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <HelpCircle size={14} color="#8b7cf6" /> {exam.totalQuestions} câu hỏi
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Award size={14} color="#31d5a0" /> Đạt: {exam.passingScore}đ
                </span>
              </div>

              {/* Class Assignments & Open/Close Toggle (Core Feature) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca4b9', letterSpacing: '0.05em' }}>
                    PHÁT ĐỀ THEO LỚP:
                  </span>
                  <button
                    onClick={() => {
                      setAssigningExam(exam)
                      setSelectedClassesForAssign(exam.assignments.map((a) => a.classId))
                      setIsOpenImmediately(true)
                    }}
                    style={{ background: 'none', border: 0, color: '#8b7cf6', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    + Giao thêm lớp
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {exam.assignments.map((assignment) => (
                    <div
                      key={assignment.classId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 8,
                        padding: '9px 12px',
                        borderRadius: 9,
                        background: assignment.isOpen ? 'rgba(49,213,160,0.08)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${assignment.isOpen ? 'rgba(49,213,160,0.25)' : 'var(--line)'}`
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Users size={14} color={assignment.isOpen ? '#31d5a0' : '#8891a9'} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: assignment.isOpen ? '#fff' : '#8891a9' }}>
                          {assignment.className}
                        </span>

                        {/* 6-Digit Exam Session PIN Badge + Copy & Regenerate */}
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: 'rgba(245, 158, 11, 0.14)',
                            border: '1px solid rgba(245, 158, 11, 0.4)',
                            color: '#fbbf24',
                            fontSize: 11,
                            fontWeight: 800
                          }}
                          title="Mã PIN 6 chữ số của ca thi cho lớp này (Giới hạn 1 thiết bị / 1 tài khoản)"
                        >
                          <KeyRound size={11} />
                          <span>PIN:</span>
                          <strong style={{ fontFamily: 'monospace', letterSpacing: 1.5, fontSize: 12, color: '#fde68a' }}>
                            {assignment.pinCode}
                          </strong>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText(assignment.pinCode)
                              alert(`📋 Đã sao chép mã PIN ca thi lớp ${assignment.className}: ${assignment.pinCode}`)
                            }}
                            style={{
                              border: 0,
                              background: 'transparent',
                              color: '#fde68a',
                              padding: '0 2px',
                              cursor: 'pointer',
                              display: 'grid',
                              placeItems: 'center'
                            }}
                            title="Sao chép mã PIN"
                          >
                            <Copy size={11} />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const res = await api.monitor.updateExamPin(exam.id, assignment.classId, {
                                  regenerate: true,
                                  isPinRequired: true
                                })
                                const newPin = res.data?.pinCode || String(Math.floor(100000 + Math.random() * 900000))
                                setExams((prev) =>
                                  prev.map((e) =>
                                    e.id !== exam.id
                                      ? e
                                      : {
                                          ...e,
                                          assignments: e.assignments.map((a) =>
                                            a.classId !== assignment.classId ? a : { ...a, pinCode: newPin }
                                          )
                                        }
                                  )
                                )
                              } catch {
                                const newPin = String(Math.floor(100000 + Math.random() * 900000))
                                setExams((prev) =>
                                  prev.map((e) =>
                                    e.id !== exam.id
                                      ? e
                                      : {
                                          ...e,
                                          assignments: e.assignments.map((a) =>
                                            a.classId !== assignment.classId ? a : { ...a, pinCode: newPin }
                                          )
                                        }
                                  )
                                )
                              }
                            }}
                            style={{
                              border: 0,
                              background: 'rgba(255,255,255,0.1)',
                              color: '#fff',
                              borderRadius: 4,
                              padding: '1px 5px',
                              fontSize: 9.5,
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                            title="Đổi mã PIN 6 số mới cho ca thi này"
                          >
                            Đổi PIN
                          </button>
                        </div>
                      </div>

                      {/* Toggle button */}
                      <button
                        onClick={() => handleToggleClass(exam.id, assignment.classId)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          background: assignment.isOpen ? 'rgba(49,213,160,0.2)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${assignment.isOpen ? '#31d5a0' : 'var(--line)'}`,
                          color: assignment.isOpen ? '#31d5a0' : 'var(--muted)',
                          borderRadius: 6,
                          padding: '3px 8px',
                          fontSize: 10,
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: assignment.isOpen ? '#31d5a0' : '#8891a9' }} />
                        {assignment.isOpen ? 'ĐANG MỞ' : 'ĐANG TẮT'}
                      </button>
                    </div>
                  ))}

                  {exam.assignments.length === 0 && (
                    <span style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>
                      Chưa giao cho lớp nào
                    </span>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>Tạo bởi: {exam.teacherName}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => handleDeleteExam(exam.id)}
                    style={{ border: '1px solid var(--line)', background: 'transparent', color: '#ff6b81', borderRadius: 8, padding: '6px 8px', cursor: 'pointer' }}
                    title="Xóa đề thi"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredExams.length === 0 && (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--muted)', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px dashed var(--line)', marginTop: 20 }}>
            {isLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <RefreshCw size={18} className="animate-spin" />
                <span>Đang tải danh sách đề thi từ máy chủ...</span>
              </div>
            ) : (
              <div>
                <FileText size={32} style={{ marginBottom: 10, opacity: 0.5 }} />
                <p style={{ margin: 0, fontSize: 14 }}>Chưa có đề thi nào trong kho đề.</p>
                <p style={{ margin: '6px 0 0', fontSize: 12 }}>Nhấn nút <strong>"+ Tạo đề thi mới"</strong> để tạo bài kiểm tra từ ngân hàng câu hỏi.</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Modal: Giao đề cho lớp */}
      <AnimatePresence>
        {assigningExam && (
          <div className="result-overlay">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="result-card" style={{ maxWidth: 480, textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ margin: 0, fontSize: 18 }}>Giao đề theo lớp học</h3>
                <button onClick={() => setAssigningExam(null)} style={{ background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer' }}><X size={18} /></button>
              </div>

              <p style={{ margin: '0 0 16px 0', fontSize: 12, color: 'var(--muted)' }}>
                Chọn các lớp bạn muốn phát đề: <strong style={{ color: '#fff' }}>{assigningExam.title}</strong>
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {classrooms.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: 12 }}>
                    Chưa có lớp học nào được tạo trong hệ thống
                  </div>
                ) : (
                  classrooms.map((c) => {
                    const checked = selectedClassesForAssign.includes(c.id)
                    return (
                      <label
                        key={c.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '10px 14px',
                          background: checked ? 'rgba(139,124,246,0.12)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${checked ? '#8b7cf6' : 'var(--line)'}`,
                          borderRadius: 9,
                          cursor: 'pointer',
                          fontSize: 13
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            if (checked) {
                              setSelectedClassesForAssign(selectedClassesForAssign.filter((id) => id !== c.id))
                            } else {
                              setSelectedClassesForAssign([...selectedClassesForAssign, c.id])
                            }
                          }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: checked ? '#fff' : '#c9cfe0' }}>{c.name}</span>
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                            {c.grade?.name || 'Khối lớp'} · {c.student_count || 0} học sinh · Mã: {c.code}
                          </span>
                        </div>
                      </label>
                    )
                  })
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 9, border: '1px solid var(--line)' }}>
                <span style={{ fontSize: 12 }}>Bật trạng thái Mở phát đề ngay lập tức:</span>
                <input
                  type="checkbox"
                  checked={isOpenImmediately}
                  onChange={(e) => setIsOpenImmediately(e.target.checked)}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="secondary-button" onClick={() => setAssigningExam(null)} style={{ flex: 1 }}>Hủy</button>
                <button className="primary-button" onClick={handleConfirmAssign} style={{ flex: 1, justifyContent: 'center' }}>Xác nhận giao đề</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Tạo đề thi mới */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="result-overlay">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="result-card" style={{ maxWidth: 680, textAlign: 'left', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ margin: 0, fontSize: 18 }}>Tạo đề thi trực tuyến mới</h3>
                <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer' }}><X size={18} /></button>
              </div>

              <form onSubmit={handleCreateExam} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, marginBottom: 5, color: 'var(--muted)' }}>Mã đề thi (duy nhất):</label>
                  <input
                    value={newExamCode}
                    onChange={(e) => setNewExamCode(e.target.value)}
                    placeholder="VD: DE_TOAN_10_02"
                    required
                    style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line)', borderRadius: 8, color: '#fff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, marginBottom: 5, color: 'var(--muted)' }}>Tiêu đề đề thi:</label>
                  <input
                    value={newExamTitle}
                    onChange={(e) => setNewExamTitle(e.target.value)}
                    placeholder="VD: Kiểm tra 15 phút: Phương trình bậc hai"
                    required
                    style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line)', borderRadius: 8, color: '#fff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, marginBottom: 5, color: 'var(--muted)' }}>Môn học / Chủ đề:</label>
                  <select
                    value={newExamSubject}
                    onChange={(e) => {
                      setNewExamSubject(e.target.value)
                      const sub = subjects.find(s => s.name === e.target.value)
                      setNewExamSubjectId(sub ? sub.id : null)
                    }}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: '#1a1f36',
                      border: '1px solid var(--line)',
                      borderRadius: 8,
                      color: '#fff',
                      fontSize: 13
                    }}
                  >
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.name} style={{ background: '#131728' }}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, marginBottom: 5, color: 'var(--muted)' }}>Mô tả đề thi:</label>
                  <input
                    value={newExamDescription}
                    onChange={(e) => setNewExamDescription(e.target.value)}
                    placeholder="Mô tả nội dung bài kiểm tra..."
                    style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line)', borderRadius: 8, color: '#fff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, marginBottom: 5, color: 'var(--muted)' }}>Thời lượng làm bài (phút):</label>
                  <input
                    type="number"
                    value={newExamDuration}
                    onChange={(e) => setNewExamDuration(Number(e.target.value))}
                    min={1}
                    max={180}
                    style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line)', borderRadius: 8, color: '#fff' }}
                  />
                </div>

                {/* ======= QUESTION SELECTION FROM BANK ======= */}
                <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckSquare size={14} />
                      Chọn câu hỏi từ ngân hàng ({selectedQuestionIds.length} đã chọn)
                    </label>
                    {filteredBankQuestions.length > 0 && (
                      <button
                        type="button"
                        onClick={handleSelectAllQuestions}
                        style={{ background: 'none', border: 0, color: '#8b7cf6', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                      >
                        {filteredBankQuestions.every(q => selectedQuestionIds.includes(q.id)) ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                      </button>
                    )}
                  </div>

                  {/* Search questions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '7px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)', borderRadius: 8 }}>
                    <Search size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                    <input
                      value={questionSearchQuery}
                      onChange={(e) => setQuestionSearchQuery(e.target.value)}
                      placeholder="Tìm kiếm câu hỏi..."
                      style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 12 }}
                    />
                  </div>

                  {isLoadingQuestions ? (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)', fontSize: 12 }}>
                      <RefreshCw size={16} className="animate-spin" style={{ marginBottom: 4 }} />
                      <div>Đang tải câu hỏi...</div>
                    </div>
                  ) : filteredBankQuestions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)', fontSize: 12 }}>
                      {newExamSubjectId ? 'Chưa có câu hỏi nào cho môn học này. Hãy tạo câu hỏi trong Ngân hàng câu hỏi trước.' : 'Vui lòng chọn môn học để xem câu hỏi.'}
                    </div>
                  ) : (
                    <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 4 }}>
                      {filteredBankQuestions.map((q, idx) => {
                        const isSelected = selectedQuestionIds.includes(q.id)
                        // Strip HTML for preview
                        const textContent = (q.content || '').replace(/<[^>]*>/g, '').trim()
                        const hasImage = (q.image_url || (q.content || '').includes('<img'))
                        return (
                          <label
                            key={q.id}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 10,
                              padding: '10px 12px',
                              background: isSelected ? 'rgba(139,124,246,0.12)' : 'rgba(255,255,255,0.03)',
                              border: `1px solid ${isSelected ? '#8b7cf6' : 'var(--line)'}`,
                              borderRadius: 9,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleQuestion(q.id)}
                              style={{ marginTop: 2, flexShrink: 0 }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: isSelected ? '#fff' : '#c9cfe0', lineHeight: 1.4, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ color: '#8b7cf6', fontWeight: 700, flexShrink: 0 }}>Câu {idx + 1}.</span>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{textContent || '(Câu hỏi hình ảnh)'}</span>
                                {hasImage && <ImageIcon size={12} style={{ color: '#f5ad52', flexShrink: 0 }} />}
                              </div>
                              {q.options && q.options.length > 0 && (
                                <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                                  {q.options.slice(0, 4).map((opt: any, oi: number) => (
                                    <span key={oi} style={{
                                      fontSize: 10,
                                      padding: '2px 6px',
                                      borderRadius: 4,
                                      background: opt.is_correct ? 'rgba(49,213,160,0.15)' : 'rgba(255,255,255,0.04)',
                                      color: opt.is_correct ? '#31d5a0' : '#8891a9',
                                      border: `1px solid ${opt.is_correct ? 'rgba(49,213,160,0.3)' : 'transparent'}`
                                    }}>
                                      {String.fromCharCode(65 + oi)}. {(opt.content || '').replace(/<[^>]*>/g, '').substring(0, 30)}{(opt.content || '').length > 30 ? '…' : ''}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* ======= CLASS DISTRIBUTION SELECTION ======= */}
                <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#31d5a0', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Users size={14} />
                      Phát đề cho các lớp (Tùy chọn - bạn tự chọn lớp hoặc để trống và giao sau):
                    </label>
                    {classrooms.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (newExamClassIds.length === classrooms.length) {
                            setNewExamClassIds([])
                          } else {
                            setNewExamClassIds(classrooms.map((c) => c.id))
                          }
                        }}
                        style={{ background: 'none', border: 0, color: '#31d5a0', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                      >
                        {newExamClassIds.length === classrooms.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                      </button>
                    )}
                  </div>

                  {classrooms.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: 8 }}>
                      Đang tải danh sách lớp học...
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8, maxHeight: 150, overflowY: 'auto' }}>
                      {classrooms.map((c) => {
                        const checked = newExamClassIds.includes(c.id)
                        return (
                          <label
                            key={c.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: '8px 10px',
                              background: checked ? 'rgba(49,213,160,0.12)' : 'rgba(255,255,255,0.03)',
                              border: `1px solid ${checked ? '#31d5a0' : 'var(--line)'}`,
                              borderRadius: 8,
                              cursor: 'pointer',
                              fontSize: 12
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                if (checked) {
                                  setNewExamClassIds(newExamClassIds.filter((id) => id !== c.id))
                                } else {
                                  setNewExamClassIds([...newExamClassIds, c.id])
                                }
                              }}
                            />
                            <span>{c.name} ({c.grade?.name || ''} · {c.student_count || 0} hs)</span>
                          </label>
                        )
                      })}
                    </div>
                  )}

                  {newExamClassIds.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid var(--line)' }}>
                      <span style={{ fontSize: 11, color: '#c9cfe0' }}>Mở phát đề ngay cho {newExamClassIds.length} lớp đã chọn:</span>
                      <input
                        type="checkbox"
                        checked={newExamIsOpenImmediately}
                        onChange={(e) => setNewExamIsOpenImmediately(e.target.checked)}
                      />
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                  <button type="button" className="secondary-button" onClick={() => setShowCreateModal(false)} style={{ flex: 1 }}>Hủy</button>
                  <button type="submit" className="primary-button" style={{ flex: 1, justifyContent: 'center' }}>
                    Tạo đề ({selectedQuestionIds.length} câu)
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
