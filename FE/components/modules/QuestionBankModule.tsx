'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ListChecks,
  Plus,
  Search,
  Sparkles,
  CheckCircle2,
  Trash2,
  Edit2,
  HelpCircle,
  BookOpen,
  Check,
  ChevronDown,
  Layers,
  Sparkle,
  Image as ImageIcon,
  Upload,
  X,
  Link,
  Eye,
  Tag,
  FolderPlus,
  Palette,
  Wand2
} from 'lucide-react'
import { api } from '@/lib/api'
import {
  cleanMathText,
  formatQuestionAuthoringText,
  parseQuestionsFromAIText,
  ParsedAIQuestion
} from '@/lib/math-format'

export interface SubjectItem {
  id: number
  name: string
  code: string
  description?: string
  color?: string
  icon?: string
}

interface QuestionOptionItem {
  key: string
  content: string
  isCorrect: boolean
}

interface QuestionItem {
  id: number
  subject: string
  content: string
  imageUrl?: string | null
  points: number
  type: string
  options: QuestionOptionItem[]
  explanation: string
  explanationImageUrl?: string | null
}

export default function QuestionBankModule({
  onBack,
  embedded = false,
  onNavigateSubjectManagement
}: {
  onBack?: () => void
  embedded?: boolean
  onNavigateSubjectManagement?: () => void
}) {
  const [questions, setQuestions] = useState<QuestionItem[]>([])
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false)
  const [isSavingQuestion, setIsSavingQuestion] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('all')
  const [showAddForm, setShowAddForm] = useState(false)

  // Subjects / Topics State
  const [subjects, setSubjects] = useState<SubjectItem[]>([
    { id: 1, name: 'Toán học 10', code: 'TOAN10', color: '#8b7cf6' },
    { id: 2, name: 'Vật Lý 10', code: 'LY10', color: '#38bdf8' },
    { id: 3, name: 'Hóa học 10', code: 'HOA10', color: '#34d399' },
    { id: 4, name: 'Sinh học 10', code: 'SINH10', color: '#10b981' },
    { id: 5, name: 'Tiếng Anh 10', code: 'ANH10', color: '#f59e0b' },
    { id: 6, name: 'Ngữ Văn 10', code: 'VAN10', color: '#f43f5e' },
    { id: 7, name: 'Lịch Sử 10', code: 'SU10', color: '#ec4899' },
    { id: 8, name: 'Địa Lý 10', code: 'DIA10', color: '#06b6d4' },
    { id: 9, name: 'Tin học 10', code: 'TIN10', color: '#6366f1' },
    { id: 10, name: 'Toán học 11', code: 'TOAN11', color: '#8b7cf6' },
    { id: 11, name: 'Vật Lý 11', code: 'LY11', color: '#38bdf8' },
    { id: 12, name: 'Tiếng Anh 11', code: 'ANH11', color: '#f59e0b' },
    { id: 13, name: 'Toán học 12', code: 'TOAN12', color: '#8b7cf6' },
  ])
  const [showSubjectModal, setShowSubjectModal] = useState(false)
  const [createSubName, setCreateSubName] = useState('')
  const [createSubCode, setCreateSubCode] = useState('')
  const [createSubDesc, setCreateSubDesc] = useState('')
  const [createSubColor, setCreateSubColor] = useState('#8b7cf6')
  const [isSavingSubject, setIsSavingSubject] = useState(false)
  const [subjectSuccessMsg, setSubjectSuccessMsg] = useState<string | null>(null)
  const [subjectErrorMsg, setSubjectErrorMsg] = useState<string | null>(null)

  // Fetch subjects from API
  const fetchSubjects = async () => {
    try {
      const res = await api.subjects.getAll()
      if (res.data && res.data.length > 0) {
        setSubjects(res.data)
      }
    } catch (err: any) {
      console.debug('Using fallback subjects data:', err.message)
    }
  }

  // Fetch real questions from database
  const fetchQuestions = async () => {
    setIsLoadingQuestions(true)
    try {
      const res = await api.questions.getAll()
      if (res.data && Array.isArray(res.data)) {
        const mapped: QuestionItem[] = res.data.map((q: any) => ({
          id: q.id,
          subject: q.subject?.name || (q.subject_id === 1 ? 'Toán học 10' : q.subject_id === 2 ? 'Vật Lý 10' : 'Tổng hợp'),
          content: q.content,
          imageUrl: q.image_url,
          points: Number(q.points) || 2.0,
          type: q.question_type === 'single_choice' ? 'Trắc nghiệm đơn' : 'Trắc nghiệm',
          options: (q.options || []).map((opt: any) => ({
            key: opt.option_key,
            content: opt.content,
            isCorrect: Boolean(opt.is_correct)
          })),
          explanation: q.explanation || '',
          explanationImageUrl: q.explanation_image_url || null
        }))
        setQuestions(mapped)
      }
    } catch (err: any) {
      console.error('Lỗi nạp câu hỏi từ server:', err)
    } finally {
      setIsLoadingQuestions(false)
    }
  }

  useEffect(() => {
    fetchSubjects()
    fetchQuestions()
  }, [])

  // Create subject handler
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createSubName.trim()) return

    setIsSavingSubject(true)
    setSubjectErrorMsg(null)
    setSubjectSuccessMsg(null)

    try {
      const res = await api.subjects.create({
        name: createSubName.trim(),
        code: createSubCode.trim() || undefined,
        description: createSubDesc.trim() || undefined,
        color: createSubColor
      })

      const created = res.data
      setSubjects((prev) => [...prev, created])
      setNewSubject(created.name)
      setSubjectSuccessMsg(`Đã tạo môn học "${created.name}" thành công!`)
      setTimeout(() => {
        setSubjectSuccessMsg(null)
        setShowSubjectModal(false)
        setCreateSubName('')
        setCreateSubCode('')
        setCreateSubDesc('')
      }, 700)
    } catch (err: any) {
      const fallbackSub: SubjectItem = {
        id: Date.now(),
        name: createSubName.trim(),
        code: createSubCode.trim().toUpperCase() || `SUB_${Date.now().toString().slice(-4)}`,
        description: createSubDesc.trim(),
        color: createSubColor
      }
      setSubjects((prev) => [...prev, fallbackSub])
      setNewSubject(fallbackSub.name)
      setShowSubjectModal(false)
      setCreateSubName('')
      setCreateSubCode('')
      setCreateSubDesc('')
    } finally {
      setIsSavingSubject(false)
    }
  }

  // Delete subject handler
  const handleDeleteSubject = async (id: number) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id))
    try {
      await api.subjects.delete(id)
    } catch (err: any) {
      console.warn('Could not delete subject via API:', err.message)
    }
  }

  // Editor Mode: 'single' (soạn liên tục từng câu) or 'batch' (soạn hàng loạt nhiều câu)
  const [editMode, setEditMode] = useState<'single' | 'batch'>('single')
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // New Question Form State (Single Mode)
  const [newSubject, setNewSubject] = useState('Toán học 10')
  const [newContent, setNewContent] = useState('')
  const [newImageUrl, setNewImageUrl] = useState('')
  const [newExplanation, setNewExplanation] = useState('')
  const [newExplanationImageUrl, setNewExplanationImageUrl] = useState('')
  const [isUploadingQImg, setIsUploadingQImg] = useState(false)
  const [isUploadingExpImg, setIsUploadingExpImg] = useState(false)

  const qFileInputRef = useRef<HTMLInputElement>(null)
  const expFileInputRef = useRef<HTMLInputElement>(null)

  const [newOptions, setNewOptions] = useState<QuestionOptionItem[]>([
    { key: 'A', content: '', isCorrect: true },
    { key: 'B', content: '', isCorrect: false },
    { key: 'C', content: '', isCorrect: false },
    { key: 'D', content: '', isCorrect: false },
  ])

  // Start Editing Question Handler
  const handleStartEditQuestion = (q: QuestionItem) => {
    setEditingQuestionId(q.id)
    setNewSubject(q.subject)
    setNewContent(q.content)
    setNewImageUrl(q.imageUrl || '')
    setNewExplanation(q.explanation || '')
    setNewExplanationImageUrl(q.explanationImageUrl || '')
    setNewOptions(
      q.options && q.options.length > 0
        ? q.options.map((opt) => ({ key: opt.key, content: opt.content, isCorrect: opt.isCorrect }))
        : [
            { key: 'A', content: '', isCorrect: true },
            { key: 'B', content: '', isCorrect: false },
            { key: 'C', content: '', isCorrect: false },
            { key: 'D', content: '', isCorrect: false },
          ]
    )
    setEditMode('single')
    setShowAddForm(true)
    window.scrollTo({ top: 180, behavior: 'smooth' })
  }

  const handleCancelEdit = () => {
    setEditingQuestionId(null)
    setNewContent('')
    setNewImageUrl('')
    setNewExplanation('')
    setNewExplanationImageUrl('')
    setNewOptions([
      { key: 'A', content: '', isCorrect: true },
      { key: 'B', content: '', isCorrect: false },
      { key: 'C', content: '', isCorrect: false },
      { key: 'D', content: '', isCorrect: false },
    ])
  }

  // Batch Mode State (Soạn nhiều câu 1 lúc)
  interface BatchQuestionItem {
    id: string
    content: string
    imageUrl: string
    options: QuestionOptionItem[]
    explanation: string
    explanationImageUrl: string
  }

  const createBlankBatchQuestion = (): BatchQuestionItem => ({
    id: Math.random().toString(36).substring(2, 9),
    content: '',
    imageUrl: '',
    options: [
      { key: 'A', content: '', isCorrect: true },
      { key: 'B', content: '', isCorrect: false },
      { key: 'C', content: '', isCorrect: false },
      { key: 'D', content: '', isCorrect: false },
    ],
    explanation: '',
    explanationImageUrl: ''
  })

  const [batchQuestions, setBatchQuestions] = useState<BatchQuestionItem[]>([
    createBlankBatchQuestion(),
    createBlankBatchQuestion()
  ])

  // Smart AI Paste & Active Field Tracking for Math Formula Toolbar
  const [showSmartPaste, setShowSmartPaste] = useState(false)
  const [smartPasteText, setSmartPasteText] = useState('')
  const [activeFieldTarget, setActiveFieldTarget] = useState<
    | { scope: 'single'; field: 'content' | 'explanation' | 'A' | 'B' | 'C' | 'D' }
    | { scope: 'batch'; batchId: string; field: 'content' | 'explanation' | 'A' | 'B' | 'C' | 'D' }
  >({ scope: 'single', field: 'content' })

  const applyImportedQuestions = (parsedList: ParsedAIQuestion[]) => {
    if (!parsedList || parsedList.length === 0) return
    setShowAddForm(true)
    if (parsedList.length === 1) {
      const first = parsedList[0]
      setEditMode('single')
      setNewContent(formatQuestionAuthoringText(first.content))
      setNewOptions(
        first.options.map((o) => ({
          key: o.key,
          content: formatQuestionAuthoringText(o.content),
          isCorrect: o.isCorrect,
        }))
      )
      setNewExplanation(formatQuestionAuthoringText(first.explanation || ''))
      setToastMessage('✨ Đã nạp 1 câu hỏi từ AI vào khung soạn thảo!')
    } else {
      setEditMode('batch')
      setBatchQuestions(
        parsedList.map((item) => ({
          id: Math.random().toString(36).substring(2, 9),
          content: formatQuestionAuthoringText(item.content),
          imageUrl: '',
          options: item.options.map((o) => ({
            key: o.key,
            content: formatQuestionAuthoringText(o.content),
            isCorrect: o.isCorrect,
          })),
          explanation: formatQuestionAuthoringText(item.explanation || ''),
          explanationImageUrl: '',
        }))
      )
      setToastMessage(`✨ Đã nạp ${parsedList.length} câu hỏi từ AI vào chế độ Soạn nhanh nhiều câu!`)
    }
    setTimeout(() => setToastMessage(null), 3500)
    window.scrollTo({ top: 160, behavior: 'smooth' })
  }

  // Listen for AI Chatbox question import events
  useEffect(() => {
    if (typeof window === 'undefined') return
    const pendingRaw = localStorage.getItem('edutest_pending_ai_questions')
    if (pendingRaw) {
      localStorage.removeItem('edutest_pending_ai_questions')
      try {
        const parsed = JSON.parse(pendingRaw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          applyImportedQuestions(parsed)
        }
      } catch {
        // ignore
      }
    }

    const handleImportEvt = (e: Event) => {
      const custom = e as CustomEvent<{ questions: ParsedAIQuestion[] }>
      if (custom.detail?.questions) {
        localStorage.removeItem('edutest_pending_ai_questions')
        applyImportedQuestions(custom.detail.questions)
      }
    }
    window.addEventListener('edutest:import-ai-questions', handleImportEvt)
    return () => window.removeEventListener('edutest:import-ai-questions', handleImportEvt)
  }, [])

  // Insert math symbol into currently focused field
  const handleInsertMathSymbol = (symbol: string) => {
    if (editMode === 'single') {
      const target = activeFieldTarget.scope === 'single' ? activeFieldTarget.field : 'content'
      if (target === 'content') {
        setNewContent((prev) => prev + symbol)
      } else if (target === 'explanation') {
        setNewExplanation((prev) => prev + symbol)
      } else {
        setNewOptions((prev) =>
          prev.map((o) => (o.key === target ? { ...o, content: o.content + symbol } : o))
        )
      }
    } else {
      const targetBatchId =
        activeFieldTarget.scope === 'batch'
          ? activeFieldTarget.batchId
          : batchQuestions[0]?.id
      const targetField = activeFieldTarget.scope === 'batch' ? activeFieldTarget.field : 'content'
      if (!targetBatchId) return
      setBatchQuestions((prev) =>
        prev.map((q) => {
          if (q.id !== targetBatchId) return q
          if (targetField === 'content') return { ...q, content: q.content + symbol }
          if (targetField === 'explanation') return { ...q, explanation: q.explanation + symbol }
          return {
            ...q,
            options: q.options.map((o) =>
              o.key === targetField ? { ...o, content: o.content + symbol } : o
            ),
          }
        })
      )
    }
  }

  // Format all math formulas in current editor
  const handleFormatAllMathInEditor = () => {
    if (editMode === 'single') {
      setNewContent((prev) => formatQuestionAuthoringText(prev))
      setNewExplanation((prev) => formatQuestionAuthoringText(prev))
      setNewOptions((prev) =>
        prev.map((o) => ({ ...o, content: formatQuestionAuthoringText(o.content) }))
      )
    } else {
      setBatchQuestions((prev) =>
        prev.map((q) => ({
          ...q,
          content: formatQuestionAuthoringText(q.content),
          explanation: formatQuestionAuthoringText(q.explanation),
          options: q.options.map((o) => ({
            ...o,
            content: formatQuestionAuthoringText(o.content),
          })),
        }))
      )
    }
    setToastMessage('✨ Đã chuẩn hóa tất cả công thức Toán học sang định dạng đẹp!')
    setTimeout(() => setToastMessage(null), 2800)
  }

  const handleSmartPasteParse = () => {
    if (!smartPasteText.trim()) return
    const parsed = parseQuestionsFromAIText(smartPasteText)
    if (parsed.length > 0) {
      applyImportedQuestions(parsed)
      setSmartPasteText('')
      setShowSmartPaste(false)
    } else {
      // Nếu chỉ là 1 đoạn công thức/câu hỏi đơn không có A. B. C. D., đưa vào nội dung câu hỏi đã chuẩn hóa
      setNewContent(formatQuestionAuthoringText(smartPasteText.trim()))
      setSmartPasteText('')
      setShowSmartPaste(false)
      setToastMessage('✨ Đã chuẩn hóa công thức và đưa vào nội dung câu hỏi!')
      setTimeout(() => setToastMessage(null), 2800)
    }
  }

  // Handle local file selection and upload
  const handleSelectImageFile = async (
    file: File,
    type: 'question' | 'explanation'
  ) => {
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result as string
      if (type === 'question') {
        setIsUploadingQImg(true)
        try {
          const res = await api.media.uploadImage({ image: base64, name: file.name })
          setNewImageUrl(res.data.url)
        } catch {
          setNewImageUrl(base64)
        } finally {
          setIsUploadingQImg(false)
        }
      } else {
        setIsUploadingExpImg(true)
        try {
          const res = await api.media.uploadImage({ image: base64, name: file.name })
          setNewExplanationImageUrl(res.data.url)
        } catch {
          setNewExplanationImageUrl(base64)
        } finally {
          setIsUploadingExpImg(false)
        }
      }
    }
    reader.readAsDataURL(file)
  }

  // Handle image upload for Batch Questions
  const handleSelectBatchImageFile = async (
    file: File,
    batchId: string,
    type: 'question' | 'explanation'
  ) => {
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result as string
      let finalUrl = base64
      try {
        const res = await api.media.uploadImage({ image: base64, name: file.name })
        if (res.data?.url) finalUrl = res.data.url
      } catch {
        finalUrl = base64
      }
      setBatchQuestions((prev) =>
        prev.map((item) =>
          item.id === batchId
            ? type === 'question'
              ? { ...item, imageUrl: finalUrl }
              : { ...item, explanationImageUrl: finalUrl }
            : item
        )
      )
    }
    reader.readAsDataURL(file)
  }

  const handleSetCorrectOption = (key: string) => {
    setNewOptions((prev) =>
      prev.map((opt) => ({
        ...opt,
        isCorrect: opt.key === key
      }))
    )
  }

  const handleOptionContentChange = (key: string, content: string) => {
    setNewOptions((prev) =>
      prev.map((opt) => (opt.key === key ? { ...opt, content } : opt))
    )
  }

  // Save single question (or update existing question)
  const handleSaveQuestion = async (closeAfterSave: boolean) => {
    if (!newContent.trim()) {
      alert('Vui lòng nhập nội dung câu hỏi!')
      return
    }

    setIsSavingQuestion(true)
    try {
      const matchedSub = subjects.find((s) => s.name === newSubject)
      const payload = {
        content: formatQuestionAuthoringText(newContent.trim()),
        subject_id: matchedSub?.id || null,
        subject_name: newSubject,
        points: 2.0,
        image_url: newImageUrl.trim() || null,
        explanation: newExplanation.trim() ? formatQuestionAuthoringText(newExplanation.trim()) : null,
        explanation_image_url: newExplanationImageUrl.trim() || null,
        options: newOptions.map((opt) => ({
          key: opt.key,
          content: formatQuestionAuthoringText(opt.content.trim()),
          isCorrect: opt.isCorrect
        }))
      }

      let res
      if (editingQuestionId) {
        res = await api.questions.update(editingQuestionId, payload)
      } else {
        res = await api.questions.create(payload)
      }

      if (res.data) {
        await fetchQuestions()
        const isEditing = Boolean(editingQuestionId)
        setEditingQuestionId(null)
        setNewContent('')
        setNewImageUrl('')
        setNewExplanation('')
        setNewExplanationImageUrl('')
        setNewOptions([
          { key: 'A', content: '', isCorrect: true },
          { key: 'B', content: '', isCorrect: false },
          { key: 'C', content: '', isCorrect: false },
          { key: 'D', content: '', isCorrect: false },
        ])

        if (closeAfterSave || isEditing) {
          setShowAddForm(false)
          setToastMessage(isEditing ? '✓ Đã cập nhật câu hỏi thành công!' : '✓ Đã lưu câu hỏi thành công!')
        } else {
          setToastMessage('✓ Đã lưu câu hỏi vào cơ sở dữ liệu! Vui lòng tiếp tục nhập câu tiếp theo.')
        }
        setTimeout(() => setToastMessage(null), 3500)
      }
    } catch (err: any) {
      alert('Lỗi lưu câu hỏi vào cơ sở dữ liệu: ' + (err.message || 'Vui lòng kiểm tra lại'))
    } finally {
      setIsSavingQuestion(false)
    }
  }

  // Batch Save Questions Handler
  const handleSaveBatchQuestions = async () => {
    const validQuestions = batchQuestions.filter((q) => q.content.trim().length > 0)
    if (validQuestions.length === 0) {
      alert('Vui lòng nhập nội dung cho ít nhất 1 câu hỏi!')
      return
    }

    setIsSavingQuestion(true)
    try {
      const matchedSub = subjects.find((s) => s.name === newSubject)
      
      for (const q of validQuestions) {
        await api.questions.create({
          content: formatQuestionAuthoringText(q.content.trim()),
          subject_id: matchedSub?.id || null,
          subject_name: newSubject,
          points: 2.0,
          image_url: q.imageUrl.trim() || null,
          explanation: q.explanation.trim() ? formatQuestionAuthoringText(q.explanation.trim()) : null,
          explanation_image_url: q.explanationImageUrl.trim() || null,
          options: q.options.map((opt) => ({
            key: opt.key,
            content: formatQuestionAuthoringText(opt.content.trim()),
            isCorrect: opt.isCorrect
          }))
        })
      }

      await fetchQuestions()
      setShowAddForm(false)
      setBatchQuestions([createBlankBatchQuestion(), createBlankBatchQuestion()])
      setToastMessage(`✓ Đã lưu thành công ${validQuestions.length} câu hỏi vào CSDL!`)
      setTimeout(() => setToastMessage(null), 4000)
    } catch (err: any) {
      alert('Lỗi lưu hàng loạt câu hỏi: ' + (err.message || 'Vui lòng kiểm tra lại'))
    } finally {
      setIsSavingQuestion(false)
    }
  }

  const handleDeleteQuestion = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa câu hỏi này khỏi ngân hàng câu hỏi?')) return
    try {
      await api.questions.delete(id)
      setQuestions((prev) => prev.filter((item) => item.id !== id))
    } catch (err: any) {
      alert('Không thể xóa câu hỏi: ' + (err.message || 'Lỗi hệ thống'))
    }
  }

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch = q.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesSubject = selectedSubject === 'all' || q.subject.includes(selectedSubject)
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
            QUESTION LIBRARY · NGÂN HÀNG CÂU HỎI TRẮC NGHIỆM
          </div>
          {onBack && <button className="secondary-button" onClick={onBack}>← Về tổng quan</button>}
        </header>
      )}

      {/* Toast Banner */}
      {toastMessage && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 999, background: 'rgba(49,213,160,0.95)', color: '#000', padding: '12px 20px', borderRadius: 10, fontWeight: 700, boxShadow: '0 10px 30px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={18} /> {toastMessage}
        </div>
      )}

      <section className="content-wrap" style={{ maxWidth: 1250, paddingTop: 30 }}>
        {/* Page Heading */}
        <div className="page-heading">
          <div>
            <div className="eyebrow"><ListChecks size={14} /> THIẾT KẾ CÂU HỎI THI</div>
            <h1>Ngân hàng câu hỏi & Soạn đề</h1>
            <p>Tạo và quản lý các câu hỏi trắc nghiệm, thiết lập 4 phương án A-B-C-D và chỉ định đáp án đúng.</p>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              className="secondary-button"
              onClick={() => {
                if (onNavigateSubjectManagement) {
                  onNavigateSubjectManagement()
                } else {
                  setShowSubjectModal(true)
                }
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <FolderPlus size={15} color="#8b7cf6" />
              <span>Quản lý môn học ({subjects.length})</span>
            </button>

            <button className="primary-button" onClick={() => setShowAddForm(!showAddForm)}>
              <Plus size={16} /> {showAddForm ? 'Đóng trình soạn thảo' : 'Soạn câu hỏi mới'}
            </button>
          </div>
        </div>

        {/* Interactive Question Builder Form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{
                background: 'rgba(20,25,42,0.95)',
                border: '1px solid #8b7cf6',
                boxShadow: '0 10px 40px rgba(139,124,246,0.15)',
                borderRadius: 16,
                padding: '24px 28px',
                marginBottom: 30,
                overflow: 'hidden'
              }}
            >
              {/* Header & Mode Switcher */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={18} color="#8b7cf6" />
                  <h3 style={{ margin: 0, fontSize: 18, color: '#fff' }}>
                    {editingQuestionId ? `Chỉnh sửa câu hỏi (Mã #${editingQuestionId})` : 'Trình soạn câu hỏi trắc nghiệm trực quan'}
                  </h3>
                  {editingQuestionId && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      style={{ background: 'rgba(255,255,255,0.08)', border: 0, color: '#c4b5fd', fontSize: 11, padding: '3px 8px', borderRadius: 6, cursor: 'pointer' }}
                    >
                      Hủy sửa
                    </button>
                  )}
                </div>

                {/* Mode Tabs */}
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 3, gap: 4 }}>
                  <button
                    type="button"
                    onClick={() => setEditMode('single')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 8,
                      border: 0,
                      background: editMode === 'single' ? '#8b7cf6' : 'transparent',
                      color: editMode === 'single' ? '#fff' : 'var(--muted)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    Soạn từng câu
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditMode('batch')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 8,
                      border: 0,
                      background: editMode === 'batch' ? '#8b7cf6' : 'transparent',
                      color: editMode === 'batch' ? '#fff' : 'var(--muted)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    Soạn nhanh nhiều câu
                  </button>
                </div>
              </div>

              {/* Shared Subject Selector */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>Chọn Môn học / Chủ đề cho câu hỏi:</label>
                  <button
                    type="button"
                    onClick={() => setShowSubjectModal(true)}
                    style={{
                      background: 'rgba(139,124,246,0.15)',
                      border: '1px solid rgba(139,124,246,0.3)',
                      color: '#c4b5fd',
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={12} /> Tạo môn học / chủ đề mới
                  </button>
                </div>
                <select
                  value={newSubject}
                  onChange={(e) => {
                    if (e.target.value === '__CREATE_NEW__') {
                      setShowSubjectModal(true)
                    } else {
                      setNewSubject(e.target.value)
                    }
                  }}
                  style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line)', borderRadius: 9, color: '#fff', fontSize: 14, outline: 'none' }}
                >
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.name} style={{ background: '#121727' }}>
                      {sub.name} {sub.code ? `(${sub.code})` : ''}
                    </option>
                  ))}
                  <option value="__CREATE_NEW__" style={{ background: '#252048', color: '#c4b5fd', fontWeight: 700 }}>
                    + Tạo thêm môn học / chủ đề mới...
                  </option>
                </select>
              </div>

              {/* MATH FORMULA TOOLBAR & AI SMART PASTE BAR */}
              <div
                style={{
                  marginBottom: 20,
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'rgba(139, 124, 246, 0.08)',
                  border: '1px solid rgba(139, 124, 246, 0.28)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#c4b5fd' }}>
                    <Wand2 size={14} color="#a78bfa" />
                    <span>THANH CÔNG CỤ CÔNG THỨC TOÁN & AI SOẠN ĐỀ</span>
                    <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: 10 }}>
                      (Đặt con trỏ vào ô cần nhập rồi bấm ký hiệu)
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleFormatAllMathInEditor}
                      style={{
                        padding: '5px 11px',
                        borderRadius: 7,
                        border: '1px solid rgba(52, 211, 153, 0.4)',
                        background: 'rgba(52, 211, 153, 0.14)',
                        color: '#34d399',
                        fontSize: 11,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                      title="Tự động đổi x^2 -> x², x_1 -> x₁, sqrt(x) -> √(x), \frac{a}{b} -> a/b, \Delta -> Δ..."
                    >
                      <Sparkles size={12} /> Chuẩn hóa công thức Toán
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowSmartPaste(!showSmartPaste)}
                      style={{
                        padding: '5px 11px',
                        borderRadius: 7,
                        border: '1px solid rgba(139, 124, 246, 0.4)',
                        background: showSmartPaste ? '#8b7cf6' : 'rgba(139, 124, 246, 0.16)',
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <ListChecks size={12} /> {showSmartPaste ? 'Đóng khung dán AI' : 'Dán nhanh câu hỏi từ AI'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          window.dispatchEvent(
                            new CustomEvent('edutest:open-chatbox', {
                              detail: {
                                prompt: `Soạn 3 câu hỏi trắc nghiệm môn ${newSubject} có 4 đáp án A, B, C, D kèm Đáp án đúng và Giải thích chi tiết`,
                              },
                            })
                          )
                        }
                      }}
                      style={{
                        padding: '5px 11px',
                        borderRadius: 7,
                        border: '1px solid rgba(56, 189, 248, 0.35)',
                        background: 'rgba(56, 189, 248, 0.12)',
                        color: '#38bdf8',
                        fontSize: 11,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <Sparkles size={12} /> Nhờ AI soạn câu hỏi
                    </button>
                  </div>
                </div>

                {/* Math Symbol Quick Buttons */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {[
                    { label: 'x²', val: '²', tip: 'Bình phương' },
                    { label: 'x³', val: '³', tip: 'Lập phương' },
                    { label: 'xⁿ', val: 'ⁿ', tip: 'Mũ n' },
                    { label: 'x₁', val: '₁', tip: 'Chỉ số 1' },
                    { label: 'x₂', val: '₂', tip: 'Chỉ số 2' },
                    { label: 'Δ', val: 'Δ', tip: 'Biệt thức Delta' },
                    { label: '√', val: '√', tip: 'Căn bậc hai' },
                    { label: '∛', val: '∛', tip: 'Căn bậc ba' },
                    { label: '±', val: '±', tip: 'Cộng trừ' },
                    { label: '×', val: '×', tip: 'Nhân' },
                    { label: '·', val: '·', tip: 'Nhân chấm' },
                    { label: '÷', val: '÷', tip: 'Chia' },
                    { label: '≤', val: '≤', tip: 'Nhỏ hơn hoặc bằng' },
                    { label: '≥', val: '≥', tip: 'Lớn hơn hoặc bằng' },
                    { label: '≠', val: '≠', tip: 'Khác' },
                    { label: '≈', val: '≈', tip: 'Xấp xỉ' },
                    { label: '∈', val: '∈', tip: 'Thuộc' },
                    { label: '∉', val: '∉', tip: 'Không thuộc' },
                    { label: '⊂', val: '⊂', tip: 'Tập con' },
                    { label: '∪', val: '∪', tip: 'Hợp' },
                    { label: '∩', val: '∩', tip: 'Giao' },
                    { label: '∅', val: '∅', tip: 'Tập rỗng' },
                    { label: 'ℝ', val: 'ℝ', tip: 'Tập số thực R' },
                    { label: 'ℤ', val: 'ℤ', tip: 'Tập số nguyên Z' },
                    { label: '∞', val: '∞', tip: 'Vô cực' },
                    { label: 'π', val: 'π', tip: 'Số Pi' },
                    { label: 'α', val: 'α', tip: 'Alpha' },
                    { label: 'β', val: 'β', tip: 'Beta' },
                    { label: 'γ', val: 'γ', tip: 'Gamma' },
                    { label: 'θ', val: 'θ', tip: 'Theta' },
                    { label: '⇒', val: '⇒', tip: 'Suy ra' },
                    { label: '⇔', val: '⇔', tip: 'Tương đương' },
                    { label: '→', val: '→', tip: 'Mũi tên' },
                    { label: '∀', val: '∀', tip: 'Với mọi' },
                    { label: '∃', val: '∃', tip: 'Tồn tại' },
                    { label: '∫', val: '∫', tip: 'Tích phân' },
                    { label: '∑', val: '∑', tip: 'Tổng sigma' },
                    { label: '⊥', val: '⊥', tip: 'Vuông góc' },
                    { label: '∥', val: '∥', tip: 'Song song' },
                    { label: '∠', val: '∠', tip: 'Góc' },
                    { label: '△', val: '△', tip: 'Tam giác' },
                    { label: '°', val: '°', tip: 'Độ' },
                  ].map((sym) => (
                    <button
                      key={sym.label}
                      type="button"
                      onClick={() => handleInsertMathSymbol(sym.val)}
                      title={sym.tip}
                      style={{
                        minWidth: 30,
                        height: 27,
                        padding: '0 7px',
                        borderRadius: 6,
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        background: 'rgba(18, 23, 39, 0.9)',
                        color: '#e2e8f0',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {sym.label}
                    </button>
                  ))}
                </div>

                {/* Smart AI Paste Box */}
                {showSmartPaste && (
                  <div
                    style={{
                      marginTop: 4,
                      padding: 12,
                      borderRadius: 10,
                      background: 'rgba(10, 13, 24, 0.9)',
                      border: '1px solid rgba(139, 124, 246, 0.35)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <span style={{ fontSize: 11, color: '#cbd5e1' }}>
                      Dán nội dung câu hỏi từ AI Chatbox hoặc tài liệu (hệ thống sẽ tự động tách Câu hỏi, 4 đáp án A-B-C-D, Đáp án đúng, Lời giải và làm đẹp công thức Toán):
                    </span>
                    <textarea
                      rows={4}
                      value={smartPasteText}
                      onChange={(e) => setSmartPasteText(e.target.value)}
                      placeholder={`Ví dụ:\nCâu 1: Nghiệm của phương trình x^2 - 5x + 6 = 0 là:\nA. S = {2; 3}\nB. S = {-2; -3}\nC. S = {1; 6}\nD. S = {-1; -6}\nĐáp án đúng: A\nGiải thích: Ta có \\Delta = b^2 - 4ac = 25 - 24 = 1 > 0 => x_1 = 2, x_2 = 3.`}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.04)',
                        color: '#fff',
                        fontSize: 12,
                        outline: 'none',
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => setShowSmartPaste(false)}
                        className="secondary-button"
                        style={{ padding: '6px 12px', fontSize: 11 }}
                      >
                        Đóng
                      </button>
                      <button
                        type="button"
                        onClick={handleSmartPasteParse}
                        className="primary-button"
                        style={{ padding: '6px 14px', fontSize: 11 }}
                      >
                        ✨ Tự động tách & Chuẩn hóa công thức
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* SINGLE QUESTION MODE */}
              {editMode === 'single' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, marginBottom: 6, color: 'var(--muted)' }}>Nội dung câu hỏi:</label>
                    <textarea
                      rows={3}
                      value={newContent}
                      onFocus={() => setActiveFieldTarget({ scope: 'single', field: 'content' })}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder="Nhập nội dung câu hỏi (ví dụ: Phương trình x² - 5x + 6 = 0 có tập nghiệm là:)..."
                      required
                      style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line)', borderRadius: 9, color: '#fff', outline: 'none', resize: 'vertical' }}
                    />
                  </div>

                  {/* Question Image Attachment */}
                  <div className="image-attach-widget">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#c4b5fd', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <ImageIcon size={14} /> Đính kèm hình ảnh cho câu hỏi (Tùy chọn)
                      </span>
                      <input
                        type="file"
                        ref={qFileInputRef}
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleSelectImageFile(file, 'question')
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => qFileInputRef.current?.click()}
                        className="secondary-button"
                        style={{ padding: '4px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}
                      >
                        <Upload size={12} /> {isUploadingQImg ? 'Đang tải...' : 'Chọn tệp ảnh'}
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Link size={13} color="var(--muted)" />
                      <input
                        type="text"
                        value={newImageUrl}
                        onChange={(e) => setNewImageUrl(e.target.value)}
                        placeholder="Hoặc dán URL hình ảnh (https://...)"
                        style={{ flex: 1, padding: '7px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)', borderRadius: 7, color: '#fff', fontSize: 12, outline: 'none' }}
                      />
                    </div>

                    {newImageUrl && (
                      <div className="image-preview-bar">
                        <img src={newImageUrl} alt="Preview câu hỏi" className="image-preview-thumb" />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: 11, color: '#31d5a0', fontWeight: 600 }}>Ảnh câu hỏi đã đính kèm</span>
                          <span style={{ fontSize: 10, color: 'var(--muted)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{newImageUrl}</span>
                        </div>
                        <button type="button" onClick={() => setNewImageUrl('')} className="remove-img-btn">
                          <X size={12} /> Gỡ ảnh
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 4 Options Builder */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, marginBottom: 8, color: 'var(--muted)' }}>
                      Các phương án trả lời (Bấm nút tròn để chọn DUY NHẤT đáp án đúng):
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {newOptions.map((opt) => (
                        <div
                          key={opt.key}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 12px',
                            borderRadius: 9,
                            background: opt.isCorrect ? 'rgba(49,213,160,0.1)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${opt.isCorrect ? '#31d5a0' : 'var(--line)'}`
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => handleSetCorrectOption(opt.key)}
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: '50%',
                              border: `2px solid ${opt.isCorrect ? '#31d5a0' : 'var(--muted)'}`,
                              background: opt.isCorrect ? '#31d5a0' : 'transparent',
                              color: opt.isCorrect ? '#000' : 'var(--muted)',
                              fontWeight: 800,
                              display: 'grid',
                              placeItems: 'center',
                              cursor: 'pointer',
                              fontSize: 11
                            }}
                            title="Chọn làm đáp án đúng"
                          >
                            {opt.key}
                          </button>
                          <input
                            value={opt.content}
                            onFocus={() => setActiveFieldTarget({ scope: 'single', field: opt.key as 'A' | 'B' | 'C' | 'D' })}
                            onChange={(e) => handleOptionContentChange(opt.key, e.target.value)}
                            placeholder={`Nội dung phương án ${opt.key}...`}
                            required
                            style={{ flex: 1, background: 'transparent', border: 0, outline: 'none', color: '#fff', fontSize: 13 }}
                          />
                          {opt.isCorrect && (
                            <span style={{ fontSize: 10, color: '#31d5a0', fontWeight: 700 }}>ĐÚNG</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Explanation Text & Image */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)' }}>Lời giải thích chi tiết & Hướng dẫn (tùy chọn):</label>
                    <textarea
                      rows={2}
                      value={newExplanation}
                      onFocus={() => setActiveFieldTarget({ scope: 'single', field: 'explanation' })}
                      onChange={(e) => setNewExplanation(e.target.value)}
                      placeholder="Giải thích lý do phương án đúng hoặc công thức giải..."
                      style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line)', borderRadius: 8, color: '#fff', outline: 'none', resize: 'vertical' }}
                    />

                    {/* Explanation Image Attachment */}
                    <div className="image-attach-widget">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#c4b5fd', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <ImageIcon size={14} /> Đính kèm hình ảnh lời giải (Sơ đồ, đồ thị, bảng tính...)
                        </span>
                        <input
                          type="file"
                          ref={expFileInputRef}
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleSelectImageFile(file, 'explanation')
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => expFileInputRef.current?.click()}
                          className="secondary-button"
                          style={{ padding: '4px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}
                        >
                          <Upload size={12} /> {isUploadingExpImg ? 'Đang tải...' : 'Chọn tệp ảnh'}
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <Link size={13} color="var(--muted)" />
                        <input
                          type="text"
                          value={newExplanationImageUrl}
                          onChange={(e) => setNewExplanationImageUrl(e.target.value)}
                          placeholder="Hoặc dán URL ảnh lời giải (https://...)"
                          style={{ flex: 1, padding: '7px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)', borderRadius: 7, color: '#fff', fontSize: 12, outline: 'none' }}
                        />
                      </div>

                      {newExplanationImageUrl && (
                        <div className="image-preview-bar">
                          <img src={newExplanationImageUrl} alt="Preview lời giải" className="image-preview-thumb" />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: 11, color: '#8b7cf6', fontWeight: 600 }}>Ảnh lời giải đã đính kèm</span>
                            <span style={{ fontSize: 10, color: 'var(--muted)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{newExplanationImageUrl}</span>
                          </div>
                          <button type="button" onClick={() => setNewExplanationImageUrl('')} className="remove-img-btn">
                            <X size={12} /> Gỡ ảnh
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Form Action Buttons: Continuous vs Save & Close */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16 }}>
                    <button type="button" className="secondary-button" onClick={() => setShowAddForm(false)}>Hủy</button>
                    <button
                      type="button"
                      disabled={isSavingQuestion}
                      onClick={() => handleSaveQuestion(false)}
                      style={{ background: 'rgba(139,124,246,0.2)', border: '1px solid #8b7cf6', color: '#c4b5fd', padding: '9px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      Lưu & Soạn câu tiếp theo
                    </button>
                    <button
                      type="button"
                      disabled={isSavingQuestion}
                      onClick={() => handleSaveQuestion(true)}
                      className="primary-button"
                    >
                      {isSavingQuestion ? 'Đang lưu...' : 'Lưu & Đóng'}
                    </button>
                  </div>
                </div>
              )}

              {/* BATCH QUESTION MODE (Soạn nhiều câu cùng 1 lúc) */}
              {editMode === 'batch' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                  {batchQuestions.map((qItem, qIdx) => (
                    <div
                      key={qItem.id}
                      style={{
                        background: 'rgba(255,255,255,0.025)',
                        border: '1px solid var(--line)',
                        borderRadius: 12,
                        padding: '16px 18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 14
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#8b7cf6', display: 'flex', alignItems: 'center', gap: 6 }}>
                          CÂU HỎI THỨ {qIdx + 1}
                        </span>
                        {batchQuestions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setBatchQuestions((prev) => prev.filter((item) => item.id !== qItem.id))}
                            style={{ background: 'none', border: 0, color: '#ff6b81', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <Trash2 size={14} /> Xóa câu này
                          </button>
                        )}
                      </div>

                      {/* Content */}
                      <div>
                        <label style={{ display: 'block', fontSize: 11, marginBottom: 5, color: 'var(--muted)' }}>Nội dung câu hỏi #{qIdx + 1}:</label>
                        <textarea
                          rows={2}
                          value={qItem.content}
                          onChange={(e) => {
                            const val = e.target.value
                            setBatchQuestions((prev) => prev.map((item) => item.id === qItem.id ? { ...item, content: val } : item))
                          }}
                          placeholder={`Nhập nội dung cho câu hỏi ${qIdx + 1}...`}
                          style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line)', borderRadius: 8, color: '#fff', outline: 'none' }}
                        />
                      </div>

                      {/* Batch Question Image Attachment */}
                      <div className="image-attach-widget">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#c4b5fd', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <ImageIcon size={14} /> Đính kèm hình ảnh cho câu hỏi #{qIdx + 1} (Tùy chọn)
                          </span>
                          <input
                            type="file"
                            id={`batch-q-file-${qItem.id}`}
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleSelectBatchImageFile(file, qItem.id, 'question')
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => document.getElementById(`batch-q-file-${qItem.id}`)?.click()}
                            className="secondary-button"
                            style={{ padding: '4px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}
                          >
                            <Upload size={12} /> Chọn tệp ảnh
                          </button>
                        </div>

                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <Link size={13} color="var(--muted)" />
                          <input
                            type="text"
                            value={qItem.imageUrl}
                            onChange={(e) => {
                              const val = e.target.value
                              setBatchQuestions((prev) => prev.map((item) => item.id === qItem.id ? { ...item, imageUrl: val } : item))
                            }}
                            placeholder="Hoặc dán URL hình ảnh câu hỏi (https://...)"
                            style={{ flex: 1, padding: '7px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)', borderRadius: 7, color: '#fff', fontSize: 12, outline: 'none' }}
                          />
                        </div>

                        {qItem.imageUrl && (
                          <div className="image-preview-bar">
                            <img src={qItem.imageUrl} alt={`Preview câu ${qIdx + 1}`} className="image-preview-thumb" />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span style={{ fontSize: 11, color: '#31d5a0', fontWeight: 600 }}>Ảnh câu hỏi đã đính kèm</span>
                              <span style={{ fontSize: 10, color: 'var(--muted)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{qItem.imageUrl}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setBatchQuestions((prev) => prev.map((item) => item.id === qItem.id ? { ...item, imageUrl: '' } : item))}
                              className="remove-img-btn"
                            >
                              <X size={12} /> Gỡ ảnh
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Options */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {qItem.options.map((opt) => (
                          <div
                            key={opt.key}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: '6px 10px',
                              borderRadius: 8,
                              background: opt.isCorrect ? 'rgba(49,213,160,0.1)' : 'rgba(255,255,255,0.03)',
                              border: `1px solid ${opt.isCorrect ? '#31d5a0' : 'var(--line)'}`
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setBatchQuestions((prev) =>
                                  prev.map((item) =>
                                    item.id === qItem.id
                                      ? {
                                          ...item,
                                          options: item.options.map((o) => ({ ...o, isCorrect: o.key === opt.key }))
                                        }
                                      : item
                                  )
                                )
                              }}
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: '50%',
                                border: `2px solid ${opt.isCorrect ? '#31d5a0' : 'var(--muted)'}`,
                                background: opt.isCorrect ? '#31d5a0' : 'transparent',
                                color: opt.isCorrect ? '#000' : 'var(--muted)',
                                fontWeight: 800,
                                fontSize: 10,
                                cursor: 'pointer'
                              }}
                            >
                              {opt.key}
                            </button>
                            <input
                              value={opt.content}
                              onChange={(e) => {
                                const val = e.target.value
                                setBatchQuestions((prev) =>
                                  prev.map((item) =>
                                    item.id === qItem.id
                                      ? {
                                          ...item,
                                          options: item.options.map((o) => (o.key === opt.key ? { ...o, content: val } : o))
                                        }
                                      : item
                                  )
                                )
                              }}
                              placeholder={`Đáp án ${opt.key}...`}
                              style={{ flex: 1, background: 'transparent', border: 0, outline: 'none', color: '#fff', fontSize: 12 }}
                            />
                          </div>
                        ))}
                      </div>

                      {/* Explanation & Explanation Image Attachment */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <input
                          type="text"
                          value={qItem.explanation}
                          onChange={(e) => {
                            const val = e.target.value
                            setBatchQuestions((prev) => prev.map((item) => item.id === qItem.id ? { ...item, explanation: val } : item))
                          }}
                          placeholder="Lời giải thích (tùy chọn)..."
                          style={{ width: '100%', padding: '7px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--line)', borderRadius: 7, color: '#fff', fontSize: 11, outline: 'none' }}
                        />

                        {/* Batch Explanation Image Attachment */}
                        <div className="image-attach-widget">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#c4b5fd', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <ImageIcon size={14} /> Đính kèm hình ảnh lời giải câu #{qIdx + 1} (Tùy chọn)
                            </span>
                            <input
                              type="file"
                              id={`batch-exp-file-${qItem.id}`}
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleSelectBatchImageFile(file, qItem.id, 'explanation')
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => document.getElementById(`batch-exp-file-${qItem.id}`)?.click()}
                              className="secondary-button"
                              style={{ padding: '4px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}
                            >
                              <Upload size={12} /> Chọn tệp ảnh lời giải
                            </button>
                          </div>

                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <Link size={13} color="var(--muted)" />
                            <input
                              type="text"
                              value={qItem.explanationImageUrl}
                              onChange={(e) => {
                                const val = e.target.value
                                setBatchQuestions((prev) => prev.map((item) => item.id === qItem.id ? { ...item, explanationImageUrl: val } : item))
                              }}
                              placeholder="Hoặc dán URL ảnh lời giải (https://...)"
                              style={{ flex: 1, padding: '7px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)', borderRadius: 7, color: '#fff', fontSize: 12, outline: 'none' }}
                            />
                          </div>

                          {qItem.explanationImageUrl && (
                            <div className="image-preview-bar">
                              <img src={qItem.explanationImageUrl} alt={`Preview lời giải câu ${qIdx + 1}`} className="image-preview-thumb" />
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={{ fontSize: 11, color: '#8b7cf6', fontWeight: 600 }}>Ảnh lời giải đã đính kèm</span>
                                <span style={{ fontSize: 10, color: 'var(--muted)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{qItem.explanationImageUrl}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setBatchQuestions((prev) => prev.map((item) => item.id === qItem.id ? { ...item, explanationImageUrl: '' } : item))}
                                className="remove-img-btn"
                              >
                                <X size={12} /> Gỡ ảnh
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add More Question Button & Save All Button */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16 }}>
                    <button
                      type="button"
                      onClick={() => setBatchQuestions((prev) => [...prev, createBlankBatchQuestion()])}
                      className="secondary-button"
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <Plus size={15} /> Thêm câu hỏi thứ {batchQuestions.length + 1}
                    </button>

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button type="button" className="secondary-button" onClick={() => setShowAddForm(false)}>Hủy</button>
                      <button
                        type="button"
                        disabled={isSavingQuestion}
                        onClick={handleSaveBatchQuestions}
                        className="primary-button"
                      >
                        {isSavingQuestion ? 'Đang lưu...' : `💾 Lưu tất cả (${batchQuestions.length} câu hỏi)`}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toolbar Filter & Search */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
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
                minWidth: 230
              }}
            >
              <option value="all">Tất cả môn học ({subjects.length})</option>
              {subjects.map((sub) => (
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
              placeholder="Tìm kiếm nội dung câu hỏi..."
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* Question Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {isLoadingQuestions ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--muted)' }}>
              Đang tải danh sách câu hỏi từ ngân hàng...
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', background: 'rgba(18,23,39,0.5)', border: '1px dashed var(--line)', borderRadius: 14, color: 'var(--muted)' }}>
              <ListChecks size={32} style={{ opacity: 0.3, margin: '0 auto 10px' }} />
              <p style={{ margin: 0, fontSize: 14, color: '#fff' }}>Chưa có câu hỏi nào trong ngân hàng</p>
              <small style={{ color: '#656f88' }}>Bấm nút "+ Soạn câu hỏi mới" ở góc trên để tạo câu hỏi trắc nghiệm vào cơ sở dữ liệu.</small>
            </div>
          ) : (
            filteredQuestions.map((q, idx) => (
            <div
              key={q.id}
              style={{
                background: 'rgba(18,23,39,0.85)',
                border: '1px solid var(--line)',
                borderRadius: 14,
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14
              }}
            >
              {/* Question Top */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#8b7cf6', background: 'rgba(139,124,246,0.12)', padding: '3px 8px', borderRadius: 6 }}>
                    CÂU {idx + 1}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{q.subject}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, color: '#38bdf8', background: 'rgba(56,189,248,0.1)', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>Trắc nghiệm 4 đáp án</span>
                  <button
                    onClick={() => handleStartEditQuestion(q)}
                    style={{ background: 'rgba(139,124,246,0.15)', border: '1px solid rgba(139,124,246,0.3)', color: '#c4b5fd', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                    title="Chỉnh sửa câu hỏi này"
                  >
                    <Edit2 size={13} /> Sửa
                  </button>
                  <button
                    onClick={() => handleDeleteQuestion(q.id)}
                    style={{ background: 'rgba(255,107,129,0.1)', border: '1px solid rgba(255,107,129,0.25)', color: '#ff6b81', padding: '4px 8px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600 }}
                    title="Xóa câu hỏi khỏi ngân hàng"
                  >
                    <Trash2 size={13} /> Xóa
                  </button>
                </div>
              </div>

              {/* Question Content */}
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#fff', lineHeight: 1.4 }}>
                {cleanMathText(q.content)}
              </h3>

              {/* Question Attached Image */}
              {q.imageUrl && (
                <div className="question-img-wrap">
                  <div className="question-img-badge">
                    <ImageIcon size={12} /> HÌNH ẢNH MINH HỌA CÂU HỎI
                  </div>
                  <img src={q.imageUrl} alt={`Hình minh họa câu ${idx + 1}`} />
                </div>
              )}

              {/* Options List */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {q.options.map((opt) => (
                  <div
                    key={opt.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 14px',
                      borderRadius: 9,
                      background: opt.isCorrect ? 'rgba(49,213,160,0.1)' : 'rgba(255,255,255,0.025)',
                      border: `1px solid ${opt.isCorrect ? '#31d5a0' : 'var(--line)'}`,
                      color: opt.isCorrect ? '#fff' : '#b8c0d6',
                      fontSize: 13
                    }}
                  >
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        background: opt.isCorrect ? '#31d5a0' : 'rgba(255,255,255,0.06)',
                        color: opt.isCorrect ? '#000' : 'var(--muted)',
                        fontWeight: 700,
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 11
                      }}
                    >
                      {opt.key}
                    </span>
                    <span>{cleanMathText(opt.content)}</span>
                    {opt.isCorrect && <Check size={16} color="#31d5a0" style={{ marginLeft: 'auto' }} />}
                  </div>
                ))}
              </div>

              {/* Explanation & Explanation Image */}
              {(q.explanation || q.explanationImageUrl) && (
                <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, fontSize: 12, color: 'var(--muted)', borderLeft: '3px solid #8b7cf6', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {q.explanation && (
                    <div>
                      <strong style={{ color: '#fff' }}>Lời giải:</strong> {cleanMathText(q.explanation)}
                    </div>
                  )}
                  {q.explanationImageUrl && (
                    <div className="explanation-img-wrap">
                      <span style={{ fontSize: 10, color: '#a99bff', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                        <ImageIcon size={12} /> Hình minh họa lời giải:
                      </span>
                      <img src={q.explanationImageUrl} alt={`Lời giải câu ${idx + 1}`} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )))}
        </div>
      </section>

      {/* MODAL: TẠO VÀ QUẢN LÝ MÔN HỌC / CHỦ ĐỀ */}
      <AnimatePresence>
        {showSubjectModal && (
          <div className="result-overlay">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              style={{
                width: 'min(640px, calc(100% - 32px))',
                background: '#121727',
                border: '1px solid rgba(139,124,246,0.35)',
                boxShadow: '0 25px 70px rgba(0,0,0,0.65)',
                borderRadius: 18,
                padding: '28px 30px',
                maxHeight: '90vh',
                overflowY: 'auto',
                position: 'relative'
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(139,124,246,0.15)', display: 'grid', placeItems: 'center', color: '#a99bff' }}>
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 18, color: '#fff', fontWeight: 700 }}>Tạo Môn học & Chủ đề</h2>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--muted)' }}>Thêm mới hoặc quản lý danh mục môn học trong hệ thống</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  style={{ background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer', padding: 4 }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Alert Messages */}
              {subjectSuccessMsg && (
                <div style={{ padding: '9px 12px', background: 'rgba(49,213,160,0.12)', border: '1px solid rgba(49,213,160,0.3)', color: '#31d5a0', borderRadius: 8, fontSize: 12, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 7 }}>
                  <CheckCircle2 size={15} />
                  <span>{subjectSuccessMsg}</span>
                </div>
              )}

              {/* Form Create Subject */}
              <form onSubmit={handleCreateSubject} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--line)', borderRadius: 12, padding: '18px 20px', marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#a99bff', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em' }}>
                  <Plus size={14} /> THÊM MÔN HỌC / CHỦ ĐỀ MỚI
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 5 }}>Tên môn / Chủ đề (*):</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Hóa học 10, Chuyên đề Hàm số..."
                      value={createSubName}
                      onChange={(e) => {
                        setCreateSubName(e.target.value)
                        if (!createSubCode) {
                          const autoCode = e.target.value
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '')
                            .replace(/[^a-zA-Z0-9]/g, '')
                            .toUpperCase()
                            .slice(0, 10)
                          setCreateSubCode(autoCode)
                        }
                      }}
                      style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line)', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 5 }}>Mã viết tắt:</label>
                    <input
                      type="text"
                      placeholder="VD: HOA10, HAMSO..."
                      value={createSubCode}
                      onChange={(e) => setCreateSubCode(e.target.value.toUpperCase())}
                      style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line)', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 5 }}>Mô tả môn học (tùy chọn):</label>
                  <input
                    type="text"
                    placeholder="VD: Lý thuyết và bài tập trắc nghiệm chương trình chuẩn..."
                    value={createSubDesc}
                    onChange={(e) => setCreateSubDesc(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line)', borderRadius: 8, color: '#fff', fontSize: 12, outline: 'none' }}
                  />
                </div>

                {/* Color Palette Selector */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Màu sắc đại diện:</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {[
                      { color: '#8b7cf6', label: 'Tím' },
                      { color: '#38bdf8', label: 'Lam' },
                      { color: '#34d399', label: 'Ngọc' },
                      { color: '#10b981', label: 'Lục' },
                      { color: '#f59e0b', label: 'Hổ phách' },
                      { color: '#f43f5e', label: 'Hồng' },
                      { color: '#ec4899', label: 'Tím sen' },
                      { color: '#6366f1', label: 'Chàm' }
                    ].map((c) => (
                      <button
                        key={c.color}
                        type="button"
                        onClick={() => setCreateSubColor(c.color)}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: c.color,
                          border: createSubColor === c.color ? '2px solid #fff' : '2px solid transparent',
                          boxShadow: createSubColor === c.color ? `0 0 10px ${c.color}` : 'none',
                          cursor: 'pointer'
                        }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                  <button
                    type="submit"
                    disabled={isSavingSubject}
                    className="primary-button"
                    style={{ padding: '8px 16px', fontSize: 12 }}
                  >
                    {isSavingSubject ? 'Đang lưu...' : 'Thêm môn học'}
                  </button>
                </div>
              </form>

              {/* List of Existing Subjects */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>
                    Danh sách môn học hiện có ({subjects.length})
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--muted)' }}>Bấm để chọn cho câu hỏi</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                  {subjects.map((s) => (
                    <div
                      key={s.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--line)',
                        borderRadius: 8
                      }}
                    >
                      <div
                        onClick={() => {
                          setNewSubject(s.name)
                          setShowSubjectModal(false)
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1, minWidth: 0 }}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color || '#8b7cf6', flexShrink: 0 }} />
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <strong style={{ fontSize: 12, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</strong>
                          <span style={{ fontSize: 10, color: 'var(--muted)' }}>{s.code}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteSubject(s.id)}
                        style={{ background: 'none', border: 0, color: '#ef5f70', cursor: 'pointer', opacity: 0.6, padding: 4 }}
                        title="Xóa môn học này"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
