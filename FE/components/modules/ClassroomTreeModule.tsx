'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Search,
  Plus,
  GraduationCap,
  Award,
  Coins,
  Star,
  CheckCircle2,
  MoreHorizontal,
  Mail,
  Phone,
  RefreshCw,
  X,
  Edit,
  Trash2
} from 'lucide-react'
import { api } from '@/lib/api'

interface StudentItem {
  id: number
  code: string
  name: string
  coins: number
  points: number
  status: 'active' | 'inactive'
}

interface ClassroomItem {
  id: number
  name: string
  code: string
  academicYear: string
  teacherName: string
  studentCount: number
  students: StudentItem[]
}

interface GradeItem {
  id: number
  name: string
  code: string
  classes: ClassroomItem[]
}

const fallbackTreeData: GradeItem[] = [
  {
    id: 1,
    name: 'Khối 10',
    code: 'K10',
    classes: [
      {
        id: 1,
        name: 'Lớp 10A1',
        code: '10A1_2026',
        academicYear: '2025-2026',
        teacherName: 'Thầy Nguyễn Văn Tuấn',
        studentCount: 5,
        students: [
          { id: 1, code: 'HS001', name: 'Nguyễn Văn An', coins: 80, points: 40, status: 'active' },
          { id: 2, code: 'HS002', name: 'Lê Thị Bích', coins: 0, points: 0, status: 'active' },
          { id: 3, code: 'HS003', name: 'Trần Hoàng Cường', coins: 0, points: 0, status: 'active' },
          { id: 4, code: 'HS004', name: 'Phạm Ngọc Dung', coins: 0, points: 0, status: 'active' },
          { id: 5, code: 'HS005', name: 'Đỗ Quang Em', coins: 0, points: 0, status: 'active' },
        ]
      },
      {
        id: 2,
        name: 'Lớp 10A2',
        code: '10A2_2026',
        academicYear: '2025-2026',
        teacherName: 'Cô Lê Thị Mai',
        studentCount: 2,
        students: [
          { id: 6, code: 'HS006', name: 'Vũ Thị Giang', coins: 30, points: 15, status: 'active' },
          { id: 7, code: 'HS007', name: 'Hoàng Minh Hải', coins: 0, points: 0, status: 'active' },
        ]
      }
    ]
  },
  {
    id: 2,
    name: 'Khối 11',
    code: 'K11',
    classes: [
      {
        id: 3,
        name: 'Lớp 11A1',
        code: '11A1_2026',
        academicYear: '2025-2026',
        teacherName: 'Cô Lê Thị Mai',
        studentCount: 2,
        students: [
          { id: 8, code: 'HS008', name: 'Đinh Khánh Huyền', coins: 50, points: 25, status: 'active' },
          { id: 9, code: 'HS009', name: 'Bùi Anh Khoa', coins: 0, points: 0, status: 'active' },
        ]
      }
    ]
  },
  {
    id: 3,
    name: 'Khối 12',
    code: 'K12',
    classes: [
      {
        id: 4,
        name: 'Lớp 12A1',
        code: '12A1_2026',
        academicYear: '2025-2026',
        teacherName: 'Thầy Trần Đình Minh',
        studentCount: 1,
        students: [
          { id: 10, code: 'HS010', name: 'Ngô Bảo Long', coins: 100, points: 50, status: 'active' },
        ]
      }
    ]
  }
]

export default function ClassroomTreeModule({ onBack, embedded = false }: { onBack?: () => void; embedded?: boolean }) {
  const [treeData, setTreeData] = useState<GradeItem[]>(fallbackTreeData)
  const [openGrades, setOpenGrades] = useState<Record<number, boolean>>({ 1: true, 2: true, 3: false })
  const [selectedClassId, setSelectedClassId] = useState<number>(1)
  const [searchStudent, setSearchStudent] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Modal Thêm lớp mới
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newClassName, setNewClassName] = useState('')
  const [newClassCode, setNewClassCode] = useState('')
  const [newClassGradeId, setNewClassGradeId] = useState<number>(1)
  const [newClassTeacherId, setNewClassTeacherId] = useState<number | null>(null)
  const [newClassAcademicYear, setNewClassAcademicYear] = useState('2025-2026')
  const [gradesList, setGradesList] = useState<{ id: number; name: string }[]>([
    { id: 1, name: 'Khối 10' },
    { id: 2, name: 'Khối 11' },
    { id: 3, name: 'Khối 12' }
  ])
  const [teachersList, setTeachersList] = useState<{ id: number; full_name: string; teacher_code?: string }[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  // Modal Sửa lớp
  const [showEditModal, setShowEditModal] = useState(false)
  const [editClassName, setEditClassName] = useState('')
  const [editClassCode, setEditClassCode] = useState('')
  const [editClassGradeId, setEditClassGradeId] = useState<number>(1)
  const [editClassTeacherId, setEditClassTeacherId] = useState<number | null>(null)
  const [editClassAcademicYear, setEditClassAcademicYear] = useState('2025-2026')
  const [isUpdating, setIsUpdating] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editSuccess, setEditSuccess] = useState<string | null>(null)

  // Fetch real tree data from Backend API
  const fetchClassroomTree = async () => {
    setIsLoading(true)
    try {
      const res = await api.classrooms.getTree()
      if (res.data && res.data.length > 0) {
        const mapped: GradeItem[] = res.data.map((g: any) => ({
          id: g.grade_id || g.id,
          name: g.name,
          code: g.code,
          classes: (g.children || []).map((c: any) => ({
            id: c.class_id || c.id,
            name: c.name,
            code: c.code,
            academicYear: c.academic_year || '2025-2026',
            teacherName: c.teacher?.full_name || 'Chưa phân công',
            studentCount: c.student_count || (c.children || []).length,
            students: (c.children || []).map((st: any) => ({
              id: st.student_id || st.id,
              code: st.student_code,
              name: st.full_name,
              coins: st.wallet_coins || 0,
              points: st.reward_points || 0,
              status: st.status || 'active'
            }))
          }))
        }))
        setTreeData(mapped)
      }
    } catch (err: any) {
      console.debug('Using fallback classroom tree data:', err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchClassroomTree()
    api.classrooms.getGrades().then((res) => {
      if (res.data && res.data.length > 0) {
        setGradesList(res.data)
      }
    }).catch(() => {})
    api.classrooms.getTeachers().then((res) => {
      if (res.data && res.data.length > 0) {
        setTeachersList(res.data)
      }
    }).catch(() => {})
  }, [])

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newClassName.trim()) {
      setFormError('Vui lòng nhập tên lớp học')
      return
    }
    if (!newClassGradeId) {
      setFormError('Vui lòng chọn khối lớp')
      return
    }

    setIsSubmitting(true)
    setFormError(null)
    setFormSuccess(null)

    try {
      const res = await api.classrooms.create({
        name: newClassName.trim(),
        code: newClassCode.trim() || undefined,
        grade_id: Number(newClassGradeId),
        teacher_id: newClassTeacherId ? Number(newClassTeacherId) : null,
        academic_year: newClassAcademicYear.trim() || '2025-2026'
      })

      setFormSuccess('Tạo lớp học mới thành công!')
      await fetchClassroomTree()

      // Tự động mở nhánh khối vừa thêm lớp
      setOpenGrades((prev) => ({ ...prev, [newClassGradeId]: true }))

      if (res.data?.id) {
        setSelectedClassId(res.data.id)
      }

      setTimeout(() => {
        setShowCreateModal(false)
        setNewClassName('')
        setNewClassCode('')
        setFormSuccess(null)
      }, 900)
    } catch (err: any) {
      setFormError(err.message || 'Lỗi khi tạo lớp học')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Open Edit Modal for currently selected class
  const openEditModal = () => {
    const gradeOfClass = treeData.find((g) => g.classes.some((c) => c.id === selectedClass.id))
    setEditClassName(selectedClass.name)
    setEditClassCode(selectedClass.code)
    setEditClassGradeId(gradeOfClass ? gradeOfClass.id : 1)

    const matchedTeacher = teachersList.find((t) => t.full_name === selectedClass.teacherName)
    setEditClassTeacherId(matchedTeacher ? matchedTeacher.id : null)
    setEditClassAcademicYear(selectedClass.academicYear || '2025-2026')
    setEditError(null)
    setEditSuccess(null)
    setShowEditModal(true)
  }

  // Submit Update Class
  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editClassName.trim()) {
      setEditError('Vui lòng nhập tên lớp học')
      return
    }

    setIsUpdating(true)
    setEditError(null)
    setEditSuccess(null)

    try {
      await api.classrooms.update(selectedClass.id, {
        name: editClassName.trim(),
        code: editClassCode.trim() || undefined,
        grade_id: Number(editClassGradeId),
        teacher_id: editClassTeacherId ? Number(editClassTeacherId) : null,
        academic_year: editClassAcademicYear.trim() || '2025-2026'
      })

      setEditSuccess('Cập nhật thông tin lớp học thành công!')
      await fetchClassroomTree()

      setTimeout(() => {
        setShowEditModal(false)
        setEditSuccess(null)
      }, 800)
    } catch (err: any) {
      setEditError(err.message || 'Lỗi khi cập nhật lớp học')
    } finally {
      setIsUpdating(false)
    }
  }

  // Submit Delete Class
  const handleDeleteClass = async () => {
    const studentCount = selectedClass.students?.length || 0
    const confirmMsg =
      studentCount > 0
        ? `⚠️ CẢNH BÁO: Lớp "${selectedClass.name}" đang có ${studentCount} học sinh.\nBạn có chắc chắn muốn xóa lớp học này và toàn bộ học sinh trong lớp không?`
        : `Bạn có chắc chắn muốn xóa lớp "${selectedClass.name}" khỏi hệ thống?`

    if (!confirm(confirmMsg)) return

    try {
      await api.classrooms.delete(selectedClass.id)
      alert(`Đã xóa lớp "${selectedClass.name}" thành công!`)
      await fetchClassroomTree()

      // Chuyển sang lớp khả dụng khác
      const remaining = treeData.flatMap((g) => g.classes).filter((c) => c.id !== selectedClass.id)
      if (remaining.length > 0) {
        setSelectedClassId(remaining[0].id)
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xóa lớp học')
    }
  }

  const toggleGrade = (gradeId: number) => {
    setOpenGrades((prev) => ({ ...prev, [gradeId]: !prev[gradeId] }))
  }

  // Find currently selected class
  const selectedClass = treeData
    .flatMap((g) => g.classes)
    .find((c) => c.id === selectedClassId) || treeData[0]?.classes[0] || fallbackTreeData[0].classes[0]

  const filteredStudents = (selectedClass.students || []).filter((st) =>
    st.name.toLowerCase().includes(searchStudent.toLowerCase()) ||
    st.code.toLowerCase().includes(searchStudent.toLowerCase())
  )

  const totalClassCoins = (selectedClass.students || []).reduce((acc, s) => acc + s.coins, 0)
  const totalClassPoints = (selectedClass.students || []).reduce((acc, s) => acc + s.points, 0)

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
            CLASSROOM DIRECTORY · CÂY THƯ MỤC LỚP HỌC & HỌC SINH
          </div>
          {onBack && <button className="secondary-button" onClick={onBack}>← Về tổng quan</button>}
        </header>
      )}

      <section className="content-wrap" style={{ maxWidth: 1350, paddingTop: 30 }}>
        {/* Page Heading */}
        <div className="page-heading">
          <div>
            <div className="eyebrow"><Users size={14} /> QUẢN LÝ DANH SÁCH LỚP HỌC</div>
            <h1>Cây phân loại lớp & Học sinh</h1>
            <p>Tổ chức cây phân cấp Khối lớp - Lớp học, theo dõi danh sách và đồng bộ ví điểm thưởng của học sinh.</p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="icon-button" onClick={fetchClassroomTree} title="Làm mới danh sách">
              <RefreshCw size={15} />
            </button>
            <button
              className="primary-button"
              onClick={() => {
                setShowCreateModal(true)
                setFormError(null)
                setFormSuccess(null)
                if (!newClassName) {
                  setNewClassName('Lớp 10A3')
                  setNewClassCode('10A3_2026')
                }
              }}
            >
              <Plus size={16} /> Thêm lớp mới
            </button>
          </div>
        </div>

        {/* 2-Column Split: Tree View on Left, Student Directory on Right */}
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>
          {/* Left Column: Tree View */}
          <aside
            style={{
              background: 'rgba(16,21,33,0.85)',
              border: '1px solid var(--line)',
              borderRadius: 14,
              padding: '18px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#9da7c0', letterSpacing: '0.08em' }}>
                CÂY PHÂN LOẠI LỚP
              </span>
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>3 Khối · 4 Lớp</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {treeData.map((grade) => {
                const isOpen = Boolean(openGrades[grade.id])
                return (
                  <div key={grade.id} style={{ display: 'flex', flexDirection: 'column' }}>
                    {/* Grade Folder Header */}
                    <button
                      onClick={() => toggleGrade(grade.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '9px 12px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--line)',
                        borderRadius: 9,
                        color: '#d4d9ea',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {isOpen ? <FolderOpen size={16} color="#8b7cf6" /> : <Folder size={16} color="#8b7cf6" />}
                        <span>{grade.name}</span>
                        <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 400 }}>({grade.classes.length} lớp)</span>
                      </div>
                      {isOpen ? <ChevronDown size={14} color="var(--muted)" /> : <ChevronRight size={14} color="var(--muted)" />}
                    </button>

                    {/* Classes in Grade */}
                    {isOpen && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 18, marginTop: 4, borderLeft: '1px dashed rgba(255,255,255,0.1)', marginLeft: 12 }}>
                        {grade.classes.map((cls) => {
                          const isSelected = selectedClassId === cls.id
                          return (
                            <button
                              key={cls.id}
                              onClick={() => setSelectedClassId(cls.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 12px',
                                background: isSelected ? 'rgba(139,124,246,0.22)' : 'transparent',
                                border: `1px solid ${isSelected ? '#8b7cf6' : 'transparent'}`,
                                borderRadius: 8,
                                color: isSelected ? '#fff' : '#9ca6be',
                                fontSize: 12,
                                fontWeight: isSelected ? 600 : 400,
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'all 0.15s'
                              }}
                            >
                              <span>{cls.name}</span>
                              <span style={{ fontSize: 10, color: isSelected ? '#d8d4ff' : 'var(--muted)', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4 }}>
                                {cls.studentCount} HS
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </aside>

          {/* Right Column: Class Details & Student Directory */}
          <section
            style={{
              background: 'rgba(18,23,39,0.85)',
              border: '1px solid var(--line)',
              borderRadius: 14,
              padding: '24px 26px',
              display: 'flex',
              flexDirection: 'column',
              gap: 20
            }}
          >
            {/* Class Overview Banner */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)', paddingBottom: 18, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{selectedClass.name}</h2>
                  <span style={{ fontSize: 11, background: 'rgba(73,171,255,0.15)', color: '#68bcf8', padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>
                    Mã: {selectedClass.code}
                  </span>

                  {/* Sửa & Xóa Lớp học */}
                  <div style={{ display: 'flex', gap: 6, marginLeft: 4 }}>
                    <button
                      type="button"
                      onClick={openEditModal}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '4px 10px',
                        borderRadius: 7,
                        border: '1px solid rgba(139,124,246,0.35)',
                        background: 'rgba(139,124,246,0.14)',
                        color: '#c4b5fd',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                      title="Sửa thông tin lớp học"
                    >
                      <Edit size={12} /> Sửa lớp
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteClass}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '4px 10px',
                        borderRadius: 7,
                        border: '1px solid rgba(239,68,68,0.35)',
                        background: 'rgba(239,68,68,0.14)',
                        color: '#f87171',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                      title="Xóa lớp học này"
                    >
                      <Trash2 size={12} /> Xóa lớp
                    </button>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
                  Niên khóa: {selectedClass.academicYear} · GVCN: <strong style={{ color: '#fff' }}>{selectedClass.teacherName}</strong>
                </p>
              </div>

              {/* 3 Stats Chips */}
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 9, border: '1px solid var(--line)', textAlign: 'center' }}>
                  <span style={{ display: 'block', fontSize: 10, color: 'var(--muted)' }}>SĨ SỐ</span>
                  <strong style={{ fontSize: 16, color: '#fff' }}>{selectedClass.studentCount} HS</strong>
                </div>

                <div style={{ padding: '8px 14px', background: 'rgba(245,173,82,0.08)', borderRadius: 9, border: '1px solid rgba(245,173,82,0.25)', textAlign: 'center' }}>
                  <span style={{ display: 'block', fontSize: 10, color: '#f5ad52' }}>TỔNG XU</span>
                  <strong style={{ fontSize: 16, color: '#f5ad52' }}>🪙 {totalClassCoins}</strong>
                </div>

                <div style={{ padding: '8px 14px', background: 'rgba(139,124,246,0.08)', borderRadius: 9, border: '1px solid rgba(139,124,246,0.25)', textAlign: 'center' }}>
                  <span style={{ display: 'block', fontSize: 10, color: '#8b7cf6' }}>ĐIỂM THƯỞNG</span>
                  <strong style={{ fontSize: 16, color: '#8b7cf6' }}>⭐ {totalClassPoints}</strong>
                </div>
              </div>
            </div>

            {/* Student Search & Action Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="search-box" style={{ width: 260 }}>
                <Search size={15} />
                <input
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                  placeholder="Tìm học sinh trong lớp..."
                  style={{ width: '100%' }}
                />
              </div>

              <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                Hiển thị {filteredStudents.length} / {selectedClass.studentCount} học sinh
              </span>
            </div>

            {/* Student Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
                <thead>
                  <tr style={{ color: 'var(--muted)', fontSize: 10, borderBottom: '1px solid var(--line)', letterSpacing: '0.08em' }}>
                    <th style={{ padding: '10px 12px' }}>MÃ HỌC SINH</th>
                    <th style={{ padding: '10px 12px' }}>HỌ VÀ TÊN</th>
                    <th style={{ padding: '10px 12px' }}>VÍ XU (COINS)</th>
                    <th style={{ padding: '10px 12px' }}>ĐIỂM TÍCH LŨY</th>
                    <th style={{ padding: '10px 12px' }}>TRẠNG THÁI</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((st) => (
                    <tr key={st.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '14px 12px', fontWeight: 600, color: '#8b7cf6' }}>
                        {st.code}
                      </td>
                      <td style={{ padding: '14px 12px', color: '#fff', fontWeight: 500 }}>
                        {st.name}
                      </td>
                      <td style={{ padding: '14px 12px', color: '#f5ad52', fontWeight: 600 }}>
                        🪙 {st.coins} xu
                      </td>
                      <td style={{ padding: '14px 12px', color: '#a99aff', fontWeight: 600 }}>
                        ⭐ {st.points} điểm
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 6, fontSize: 10, background: 'rgba(49,213,160,0.1)', color: '#31d5a0', fontWeight: 600 }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#31d5a0' }} />
                          Đang học
                        </span>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                        <button style={{ background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer' }}>
                          <MoreHorizontal size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredStudents.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--muted)', fontSize: 13 }}>
                  Không tìm thấy học sinh nào phù hợp.
                </div>
              )}
            </div>
          </section>
        </div>
      </section>

      {/* ==================== MODAL: THÊM LỚP MỚI ==================== */}
      <AnimatePresence>
        {showCreateModal && (
          <div
            className="modal-overlay"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(5, 8, 16, 0.78)',
              backdropFilter: 'blur(6px)',
              zIndex: 9999,
              display: 'grid',
              placeItems: 'center',
              padding: 20
            }}
            onClick={() => !isSubmitting && setShowCreateModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 480,
                background: 'linear-gradient(145deg, #13192b 0%, #0d1220 100%)',
                border: '1px solid rgba(139, 124, 246, 0.45)',
                borderRadius: 18,
                padding: '24px 26px',
                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.65)',
                color: '#fff'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: 'linear-gradient(135deg, #8b7cf6, #6366f1)',
                      display: 'grid',
                      placeItems: 'center',
                      color: '#fff'
                    }}
                  >
                    <Plus size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Thêm lớp học mới</h3>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                      Tạo lớp học mới và phân cấp vào Khối lớp
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ background: 'transparent', border: 0, color: '#94a3b8', cursor: 'pointer', padding: 4 }}
                >
                  <X size={18} />
                </button>
              </div>

              {formError && (
                <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5', fontSize: 12, marginBottom: 14 }}>
                  {formError}
                </div>
              )}

              {formSuccess && (
                <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', color: '#34d399', fontSize: 12, marginBottom: 14 }}>
                  {formSuccess}
                </div>
              )}

              <form onSubmit={handleCreateClass} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
                    Thuộc Khối lớp <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={newClassGradeId}
                    onChange={(e) => {
                      const gId = Number(e.target.value)
                      setNewClassGradeId(gId)
                      const gObj = gradesList.find((g) => g.id === gId)
                      const gPrefix = gObj ? gObj.name.replace(/[^0-9]/g, '') : '10'
                      const defaultName = `Lớp ${gPrefix}A3`
                      setNewClassName(defaultName)
                      setNewClassCode(`${gPrefix}A3_2026`)
                    }}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line)', background: '#121727', color: '#fff', fontSize: 13, outline: 'none' }}
                  >
                    {gradesList.map((g) => (
                      <option key={g.id} value={g.id} style={{ background: '#121727' }}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
                    Tên lớp học <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={newClassName}
                    onChange={(e) => {
                      const val = e.target.value
                      setNewClassName(val)
                      const clean = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
                      setNewClassCode(`${clean || 'LOP'}_2026`)
                    }}
                    placeholder="VD: Lớp 10A3 hoặc 10A3"
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line)', background: '#121727', color: '#fff', fontSize: 13, outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
                    Mã lớp học <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={newClassCode}
                    onChange={(e) => setNewClassCode(e.target.value.toUpperCase())}
                    placeholder="VD: 10A3_2026"
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line)', background: '#121727', color: '#fff', fontSize: 13, outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
                      Giáo viên chủ nhiệm (GVCN)
                    </label>
                    <select
                      value={newClassTeacherId || ''}
                      onChange={(e) => setNewClassTeacherId(e.target.value ? Number(e.target.value) : null)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line)', background: '#121727', color: '#fff', fontSize: 13, outline: 'none' }}
                    >
                      <option value="" style={{ background: '#121727' }}>-- Chưa phân công --</option>
                      {teachersList.map((t) => (
                        <option key={t.id} value={t.id} style={{ background: '#121727' }}>
                          {t.full_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
                      Niên khóa
                    </label>
                    <input
                      type="text"
                      value={newClassAcademicYear}
                      onChange={(e) => setNewClassAcademicYear(e.target.value)}
                      placeholder="2025-2026"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line)', background: '#121727', color: '#fff', fontSize: 13, outline: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setShowCreateModal(false)}
                    disabled={isSubmitting}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={isSubmitting}
                    style={{ flex: 1.5, justifyContent: 'center' }}
                  >
                    {isSubmitting ? 'Đang tạo...' : 'Xác nhận tạo lớp'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== MODAL: SỬA LỚP HỌC ==================== */}
      <AnimatePresence>
        {showEditModal && (
          <div
            className="modal-overlay"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(5, 8, 16, 0.78)',
              backdropFilter: 'blur(6px)',
              zIndex: 9999,
              display: 'grid',
              placeItems: 'center',
              padding: 20
            }}
            onClick={() => !isUpdating && setShowEditModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 480,
                background: 'linear-gradient(145deg, #13192b 0%, #0d1220 100%)',
                border: '1px solid rgba(139, 124, 246, 0.45)',
                borderRadius: 18,
                padding: '24px 26px',
                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.65)',
                color: '#fff'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      display: 'grid',
                      placeItems: 'center',
                      color: '#fff'
                    }}
                  >
                    <Edit size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Chỉnh sửa lớp học</h3>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                      Cập nhật thông tin lớp {selectedClass.name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{ background: 'transparent', border: 0, color: '#94a3b8', cursor: 'pointer', padding: 4 }}
                >
                  <X size={18} />
                </button>
              </div>

              {editError && (
                <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5', fontSize: 12, marginBottom: 14 }}>
                  {editError}
                </div>
              )}

              {editSuccess && (
                <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', color: '#34d399', fontSize: 12, marginBottom: 14 }}>
                  {editSuccess}
                </div>
              )}

              <form onSubmit={handleUpdateClass} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
                    Thuộc Khối lớp <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={editClassGradeId}
                    onChange={(e) => setEditClassGradeId(Number(e.target.value))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line)', background: '#121727', color: '#fff', fontSize: 13, outline: 'none' }}
                  >
                    {gradesList.map((g) => (
                      <option key={g.id} value={g.id} style={{ background: '#121727' }}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
                    Tên lớp học <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={editClassName}
                    onChange={(e) => setEditClassName(e.target.value)}
                    placeholder="VD: Lớp 10A1"
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line)', background: '#121727', color: '#fff', fontSize: 13, outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
                    Mã lớp học <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={editClassCode}
                    onChange={(e) => setEditClassCode(e.target.value.toUpperCase())}
                    placeholder="VD: 10A1_2026"
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line)', background: '#121727', color: '#fff', fontSize: 13, outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
                      Giáo viên chủ nhiệm (GVCN)
                    </label>
                    <select
                      value={editClassTeacherId || ''}
                      onChange={(e) => setEditClassTeacherId(e.target.value ? Number(e.target.value) : null)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line)', background: '#121727', color: '#fff', fontSize: 13, outline: 'none' }}
                    >
                      <option value="" style={{ background: '#121727' }}>-- Chưa phân công --</option>
                      {teachersList.map((t) => (
                        <option key={t.id} value={t.id} style={{ background: '#121727' }}>
                          {t.full_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
                      Niên khóa
                    </label>
                    <input
                      type="text"
                      value={editClassAcademicYear}
                      onChange={(e) => setEditClassAcademicYear(e.target.value)}
                      placeholder="2025-2026"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line)', background: '#121727', color: '#fff', fontSize: 13, outline: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setShowEditModal(false)}
                    disabled={isUpdating}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={isUpdating}
                    style={{ flex: 1.5, justifyContent: 'center' }}
                  >
                    {isUpdating ? 'Đang lưu...' : 'Lưu thay đổi'}
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
