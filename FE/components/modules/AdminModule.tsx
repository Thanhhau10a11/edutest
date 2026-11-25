'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield,
  Users,
  GraduationCap,
  BookOpen,
  Plus,
  Search,
  Trash2,
  X,
  Check,
  UserPlus,
  ArrowLeftRight,
  Sparkles,
  ChevronDown,
  Edit,
  Key,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  LogOut
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { ThemeToggle } from '@/components/ThemeToggle'

interface TeacherItem {
  id: number
  teacher_code: string
  full_name: string
  email: string | null
  phone: string | null
  status: string
}

interface StudentItem {
  id: number
  student_code: string
  full_name: string
  email: string | null
  class_id: number
  status: string
  classroom?: { id: number; name: string; code: string; grade?: { id: number; name: string } }
}

interface ClassroomItem {
  id: number
  name: string
  code: string
}

type TabType = 'teachers' | 'students'

export default function AdminModule({ onBack }: { onBack?: () => void }) {
  const router = useRouter()
  const { logout } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('teachers')

  const [teachers, setTeachers] = useState<TeacherItem[]>([])
  const [students, setStudents] = useState<StudentItem[]>([])
  const [totalTeacherCount, setTotalTeacherCount] = useState<number>(0)
  const [totalStudentCount, setTotalStudentCount] = useState<number>(0)
  const [classrooms, setClassrooms] = useState<ClassroomItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  // Create modals
  const [showCreateTeacher, setShowCreateTeacher] = useState(false)
  const [showCreateStudent, setShowCreateStudent] = useState(false)
  const [showAssignClass, setShowAssignClass] = useState(false)
  const [assigningStudent, setAssigningStudent] = useState<StudentItem | null>(null)

  // Edit modals
  const [showEditTeacher, setShowEditTeacher] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState<TeacherItem | null>(null)
  const [editTCode, setEditTCode] = useState('')
  const [editTName, setEditTName] = useState('')
  const [editTEmail, setEditTEmail] = useState('')
  const [editTPhone, setEditTPhone] = useState('')
  const [editTStatus, setEditTStatus] = useState('active')

  const [showEditStudent, setShowEditStudent] = useState(false)
  const [editingStudent, setEditingStudent] = useState<StudentItem | null>(null)
  const [editSCode, setEditSCode] = useState('')
  const [editSName, setEditSName] = useState('')
  const [editSEmail, setEditSEmail] = useState('')
  const [editSClassId, setEditSClassId] = useState<number>(1)
  const [editSStatus, setEditSStatus] = useState('active')

  // Password reset modal
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [resettingUser, setResettingUser] = useState<{
    type: 'teacher' | 'student'
    id: number
    name: string
    code: string
  } | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)

  // Teacher create form
  const [tCode, setTCode] = useState('')
  const [tName, setTName] = useState('')
  const [tEmail, setTEmail] = useState('')
  const [tPassword, setTPassword] = useState('')
  const [tPhone, setTPhone] = useState('')

  // Student create form
  const [sCode, setSCode] = useState('')
  const [sName, setSName] = useState('')
  const [sEmail, setSEmail] = useState('')
  const [sPassword, setSPassword] = useState('')
  const [sClassId, setSClassId] = useState<number>(1)

  // Assign class form
  const [assignClassId, setAssignClassId] = useState<number>(1)

  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  const fetchTeachers = async (query = searchQuery) => {
    setIsLoading(true)
    try {
      const res = await api.admin.getTeachers({ search: query })
      if (res.data?.teachers) {
        setTeachers(res.data.teachers)
        if (!query) setTotalTeacherCount(res.data.total ?? res.data.teachers.length)
      }
    } catch (err: any) {
      console.debug('Error fetching teachers:', err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStudents = async (query = searchQuery) => {
    setIsLoading(true)
    try {
      const res = await api.admin.getStudents({ search: query })
      if (res.data?.students) {
        setStudents(res.data.students)
        if (!query) setTotalStudentCount(res.data.total ?? res.data.students.length)
      }
    } catch (err: any) {
      console.debug('Error fetching students:', err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchClassrooms = async () => {
    try {
      const res = await api.classrooms.getAll()
      if (res.data && Array.isArray(res.data)) {
        setClassrooms(res.data.map((c: any) => ({ id: c.id, name: c.name, code: c.code })))
        if (res.data.length > 0) {
          setSClassId(res.data[0].id)
          setAssignClassId(res.data[0].id)
        }
      }
    } catch (err: any) {
      console.debug('Error fetching classrooms:', err.message)
    }
  }

  // Tải đồng thời cả Giáo viên và Học sinh ngay khi mở trang để số lượng trên Tabs luôn hiển thị chính xác
  useEffect(() => {
    fetchClassrooms()
    fetchTeachers('')
    fetchStudents('')
  }, [])

  // Khi chuyển Tab hoặc tìm kiếm, cập nhật danh sách của Tab đang xem
  useEffect(() => {
    if (activeTab === 'teachers') {
      fetchTeachers(searchQuery)
    } else {
      fetchStudents(searchQuery)
    }
  }, [activeTab, searchQuery])

  // ==================== TEACHER CRUD ====================
  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)
    try {
      await api.admin.createTeacher({
        teacher_code: tCode.trim(),
        full_name: tName.trim(),
        email: tEmail.trim() || undefined,
        password: tPassword || undefined,
        phone: tPhone.trim() || undefined
      })
      setFormSuccess('Tạo tài khoản giáo viên thành công!')
      setTCode(''); setTName(''); setTEmail(''); setTPassword(''); setTPhone('')
      fetchTeachers()
      setTimeout(() => { setShowCreateTeacher(false); setFormSuccess(null) }, 1000)
    } catch (err: any) {
      setFormError(err.message || 'Lỗi tạo tài khoản')
    }
  }

  const openEditTeacher = (t: TeacherItem) => {
    setEditingTeacher(t)
    setEditTCode(t.teacher_code)
    setEditTName(t.full_name)
    setEditTEmail(t.email || '')
    setEditTPhone(t.phone || '')
    setEditTStatus(t.status || 'active')
    setFormError(null)
    setFormSuccess(null)
    setShowEditTeacher(true)
  }

  const handleUpdateTeacher = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTeacher) return
    setFormError(null)
    setFormSuccess(null)
    try {
      await api.admin.updateTeacher(editingTeacher.id, {
        teacher_code: editTCode.trim(),
        full_name: editTName.trim(),
        email: editTEmail.trim() || undefined,
        phone: editTPhone.trim() || undefined,
        status: editTStatus
      })
      setFormSuccess('Cập nhật thông tin giáo viên thành công!')
      fetchTeachers()
      setTimeout(() => {
        setShowEditTeacher(false)
        setEditingTeacher(null)
        setFormSuccess(null)
      }, 800)
    } catch (err: any) {
      setFormError(err.message || 'Lỗi cập nhật giáo viên')
    }
  }

  const handleToggleTeacherStatus = async (t: TeacherItem) => {
    const isLocking = t.status === 'active'
    const actionText = isLocking ? 'khóa' : 'mở khóa'
    if (!confirm(`Bạn có chắc muốn ${actionText} tài khoản của giáo viên "${t.full_name}"?`)) return
    try {
      await api.admin.toggleTeacherStatus(t.id)
      fetchTeachers()
    } catch (err: any) {
      alert(err.message || 'Lỗi thay đổi trạng thái tài khoản')
    }
  }

  const handleDeleteTeacher = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa giáo viên này?')) return
    try {
      await api.admin.deleteTeacher(id)
      setTeachers(teachers.filter(t => t.id !== id))
    } catch (err: any) {
      alert(err.message || 'Lỗi xóa giáo viên')
    }
  }

  // ==================== STUDENT CRUD ====================
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)
    try {
      await api.admin.createStudent({
        student_code: sCode.trim(),
        full_name: sName.trim(),
        email: sEmail.trim() || undefined,
        password: sPassword || undefined,
        class_id: sClassId
      })
      setFormSuccess('Tạo tài khoản học sinh thành công!')
      setSCode(''); setSName(''); setSEmail(''); setSPassword('')
      fetchStudents()
      setTimeout(() => { setShowCreateStudent(false); setFormSuccess(null) }, 1000)
    } catch (err: any) {
      setFormError(err.message || 'Lỗi tạo tài khoản')
    }
  }

  const openEditStudent = (s: StudentItem) => {
    setEditingStudent(s)
    setEditSCode(s.student_code)
    setEditSName(s.full_name)
    setEditSEmail(s.email || '')
    setEditSClassId(s.class_id || 1)
    setEditSStatus(s.status || 'active')
    setFormError(null)
    setFormSuccess(null)
    setShowEditStudent(true)
  }

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingStudent) return
    setFormError(null)
    setFormSuccess(null)
    try {
      await api.admin.updateStudent(editingStudent.id, {
        student_code: editSCode.trim(),
        full_name: editSName.trim(),
        email: editSEmail.trim() || undefined,
        class_id: editSClassId,
        status: editSStatus
      })
      setFormSuccess('Cập nhật thông tin học sinh thành công!')
      fetchStudents()
      setTimeout(() => {
        setShowEditStudent(false)
        setEditingStudent(null)
        setFormSuccess(null)
      }, 800)
    } catch (err: any) {
      setFormError(err.message || 'Lỗi cập nhật học sinh')
    }
  }

  const handleToggleStudentStatus = async (s: StudentItem) => {
    const isLocking = s.status === 'active'
    const actionText = isLocking ? 'khóa' : 'mở khóa'
    if (!confirm(`Bạn có chắc muốn ${actionText} tài khoản của học sinh "${s.full_name}"?`)) return
    try {
      await api.admin.toggleStudentStatus(s.id)
      fetchStudents()
    } catch (err: any) {
      alert(err.message || 'Lỗi thay đổi trạng thái tài khoản')
    }
  }

  const handleDeleteStudent = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa học sinh này?')) return
    try {
      await api.admin.deleteStudent(id)
      setStudents(students.filter(s => s.id !== id))
    } catch (err: any) {
      alert(err.message || 'Lỗi xóa học sinh')
    }
  }

  const handleAssignClass = async () => {
    if (!assigningStudent) return
    try {
      await api.admin.assignStudentToClass(assigningStudent.id, assignClassId)
      setFormSuccess('Xếp lớp thành công!')
      fetchStudents()
      setTimeout(() => {
        setShowAssignClass(false)
        setAssigningStudent(null)
        setFormSuccess(null)
      }, 800)
    } catch (err: any) {
      alert(err.message || 'Lỗi xếp lớp')
    }
  }

  // ==================== RESET PASSWORD ====================
  const openResetPassword = (type: 'teacher' | 'student', id: number, name: string, code: string) => {
    setResettingUser({ type, id, name, code })
    setNewPassword('')
    setShowNewPassword(false)
    setFormError(null)
    setFormSuccess(null)
    setShowResetPassword(true)
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resettingUser) return
    if (!newPassword || newPassword.length < 6) {
      setFormError('Mật khẩu mới phải có ít nhất 6 ký tự')
      return
    }
    setFormError(null)
    setFormSuccess(null)
    try {
      if (resettingUser.type === 'teacher') {
        await api.admin.resetTeacherPassword(resettingUser.id, newPassword)
      } else {
        await api.admin.resetStudentPassword(resettingUser.id, newPassword)
      }
      setFormSuccess(`Đã cập nhật mật khẩu mới cho ${resettingUser.name} thành công!`)
      setTimeout(() => {
        setShowResetPassword(false)
        setResettingUser(null)
        setNewPassword('')
        setFormSuccess(null)
      }, 1000)
    } catch (err: any) {
      setFormError(err.message || 'Lỗi cập nhật mật khẩu')
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--line)',
    borderRadius: 8,
    color: '#fff',
    fontSize: 13,
    outline: 'none'
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    marginBottom: 5,
    color: 'var(--muted)',
    fontWeight: 600
  }

  return (
    <div className="module-shell">
      <header className="module-header">
        <div className="brand">
          <div className="brand-mark"><Shield size={17} /></div>
          <span>Edu<span className="brand-accent">Test</span> Admin</span>
        </div>
        <div className="module-context">
          <span className="module-context-dot" />
          HỆ THỐNG QUẢN TRỊ VIÊN · QUẢN LÝ TÀI KHOẢN & PHÂN QUYỀN
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ThemeToggle />
          {onBack && (
            <button className="secondary-button" onClick={onBack} title="Về trang chủ">
              ← Về trang chủ
            </button>
          )}
          <button
            className="secondary-button"
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              borderColor: 'rgba(239,68,68,0.3)',
              color: '#f87171',
              fontWeight: 600
            }}
            title="Đăng xuất khỏi hệ thống"
          >
            <LogOut size={15} />
            Đăng xuất
          </button>
        </div>
      </header>

      <section className="content-wrap" style={{ maxWidth: 1300, paddingTop: 30 }}>
        {/* Page Heading */}
        <div className="page-heading">
          <div>
            <div className="eyebrow"><Shield size={14} /> QUẢN TRỊ VIÊN · QUẢN LÝ TÀI KHOẢN</div>
            <h1>Quản lý tài khoản hệ thống</h1>
            <p>Tạo tài khoản, sửa thông tin, đặt lại mật khẩu, khóa/mở khóa tài khoản Giáo viên & Học sinh.</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
          <button
            onClick={() => setActiveTab('teachers')}
            style={{
              padding: '10px 24px',
              borderRadius: 8,
              border: 'none',
              background: activeTab === 'teachers' ? 'rgba(139,124,246,0.2)' : 'transparent',
              color: activeTab === 'teachers' ? '#a78bfa' : 'var(--muted)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <GraduationCap size={16} /> Giáo viên ({searchQuery ? teachers.length : (totalTeacherCount || teachers.length)})
          </button>
          <button
            onClick={() => setActiveTab('students')}
            style={{
              padding: '10px 24px',
              borderRadius: 8,
              border: 'none',
              background: activeTab === 'students' ? 'rgba(49,213,160,0.2)' : 'transparent',
              color: activeTab === 'students' ? '#31d5a0' : 'var(--muted)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Users size={16} /> Học sinh ({searchQuery ? students.length : (totalStudentCount || students.length)})
          </button>
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 24 }}>
          <div className="search-box" style={{ width: 320 }}>
            <Search size={15} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'teachers' ? 'Tìm giáo viên...' : 'Tìm học sinh...'}
              style={{ width: '100%' }}
            />
          </div>
          <button
            className="primary-button"
            onClick={() => {
              setFormError(null); setFormSuccess(null)
              if (activeTab === 'teachers') setShowCreateTeacher(true)
              else setShowCreateStudent(true)
            }}
          >
            <UserPlus size={16} />
            {activeTab === 'teachers' ? 'Tạo tài khoản GV' : 'Tạo tài khoản HS'}
          </button>
        </div>

        {/* Table */}
        <div style={{
          background: 'rgba(18,23,39,0.85)',
          border: '1px solid var(--line)',
          borderRadius: 14,
          overflow: 'hidden'
        }}>
          {activeTab === 'teachers' ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)', background: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.05em' }}>MÃ GV</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.05em' }}>HỌ TÊN</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.05em' }}>EMAIL</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.05em' }}>SĐT</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 11, color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.05em' }}>TRẠNG THÁI</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 11, color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.05em' }}>HÀNH ĐỘNG</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map(t => {
                  const isLocked = t.status === 'inactive'
                  return (
                    <tr key={t.id} style={{ borderBottom: '1px solid var(--line)', opacity: isLocked ? 0.75 : 1 }}>
                      <td style={{ padding: '12px 16px', fontSize: 13 }}>
                        <span style={{ background: 'rgba(139,124,246,0.12)', color: '#a78bfa', padding: '3px 10px', borderRadius: 6, fontWeight: 700, fontSize: 11, letterSpacing: '0.05em' }}>{t.teacher_code}</span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, color: '#fff' }}>{t.full_name}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--muted)' }}>{t.email || '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--muted)' }}>{t.phone || '—'}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        {isLocked ? (
                          <span style={{ background: 'rgba(255,107,129,0.12)', color: '#ff6b81', border: '1px solid rgba(255,107,129,0.3)', padding: '3px 9px', borderRadius: 6, fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff6b81' }} /> Đã khóa
                          </span>
                        ) : (
                          <span style={{ background: 'rgba(49,213,160,0.12)', color: '#31d5a0', border: '1px solid rgba(49,213,160,0.3)', padding: '3px 9px', borderRadius: 6, fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#31d5a0' }} /> Hoạt động
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button
                            onClick={() => openEditTeacher(t)}
                            style={{ background: 'rgba(139,124,246,0.1)', border: '1px solid rgba(139,124,246,0.25)', color: '#a78bfa', borderRadius: 7, padding: '5px 8px', cursor: 'pointer' }}
                            title="Sửa thông tin"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => openResetPassword('teacher', t.id, t.full_name, t.teacher_code)}
                            style={{ background: 'rgba(245,173,82,0.1)', border: '1px solid rgba(245,173,82,0.25)', color: '#f5ad52', borderRadius: 7, padding: '5px 8px', cursor: 'pointer' }}
                            title="Đổi mật khẩu mới"
                          >
                            <Key size={14} />
                          </button>
                          <button
                            onClick={() => handleToggleTeacherStatus(t)}
                            style={{
                              background: isLocked ? 'rgba(49,213,160,0.15)' : 'rgba(255,107,129,0.1)',
                              border: `1px solid ${isLocked ? 'rgba(49,213,160,0.3)' : 'rgba(255,107,129,0.25)'}`,
                              color: isLocked ? '#31d5a0' : '#ff6b81',
                              borderRadius: 7,
                              padding: '5px 8px',
                              cursor: 'pointer'
                            }}
                            title={isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                          >
                            {isLocked ? <Unlock size={14} /> : <Lock size={14} />}
                          </button>
                          <button
                            onClick={() => handleDeleteTeacher(t.id)}
                            style={{ background: 'rgba(255,107,129,0.1)', border: '1px solid rgba(255,107,129,0.2)', color: '#ff6b81', borderRadius: 7, padding: '5px 8px', cursor: 'pointer' }}
                            title="Xóa giáo viên"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {teachers.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 30, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                      {isLoading ? 'Đang tải...' : 'Chưa có giáo viên nào trong hệ thống'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)', background: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.05em' }}>MÃ HS</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.05em' }}>HỌ TÊN</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.05em' }}>EMAIL</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.05em' }}>LỚP</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 11, color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.05em' }}>TRẠNG THÁI</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 11, color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.05em' }}>HÀNH ĐỘNG</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => {
                  const isLocked = s.status === 'inactive'
                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--line)', opacity: isLocked ? 0.75 : 1 }}>
                      <td style={{ padding: '12px 16px', fontSize: 13 }}>
                        <span style={{ background: 'rgba(49,213,160,0.12)', color: '#31d5a0', padding: '3px 10px', borderRadius: 6, fontWeight: 700, fontSize: 11, letterSpacing: '0.05em' }}>{s.student_code}</span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, color: '#fff' }}>{s.full_name}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--muted)' }}>{s.email || '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12 }}>
                        <span style={{ background: 'rgba(245,173,82,0.12)', color: '#f5ad52', padding: '3px 10px', borderRadius: 6, fontWeight: 600, fontSize: 11 }}>
                          {s.classroom?.name || `Lớp ${s.class_id}`}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        {isLocked ? (
                          <span style={{ background: 'rgba(255,107,129,0.12)', color: '#ff6b81', border: '1px solid rgba(255,107,129,0.3)', padding: '3px 9px', borderRadius: 6, fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff6b81' }} /> Đã khóa
                          </span>
                        ) : (
                          <span style={{ background: 'rgba(49,213,160,0.12)', color: '#31d5a0', border: '1px solid rgba(49,213,160,0.3)', padding: '3px 9px', borderRadius: 6, fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#31d5a0' }} /> Hoạt động
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button
                            onClick={() => openEditStudent(s)}
                            style={{ background: 'rgba(139,124,246,0.1)', border: '1px solid rgba(139,124,246,0.25)', color: '#a78bfa', borderRadius: 7, padding: '5px 8px', cursor: 'pointer' }}
                            title="Sửa thông tin"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => openResetPassword('student', s.id, s.full_name, s.student_code)}
                            style={{ background: 'rgba(245,173,82,0.1)', border: '1px solid rgba(245,173,82,0.25)', color: '#f5ad52', borderRadius: 7, padding: '5px 8px', cursor: 'pointer' }}
                            title="Đổi mật khẩu mới"
                          >
                            <Key size={14} />
                          </button>
                          <button
                            onClick={() => handleToggleStudentStatus(s)}
                            style={{
                              background: isLocked ? 'rgba(49,213,160,0.15)' : 'rgba(255,107,129,0.1)',
                              border: `1px solid ${isLocked ? 'rgba(49,213,160,0.3)' : 'rgba(255,107,129,0.25)'}`,
                              color: isLocked ? '#31d5a0' : '#ff6b81',
                              borderRadius: 7,
                              padding: '5px 8px',
                              cursor: 'pointer'
                            }}
                            title={isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                          >
                            {isLocked ? <Unlock size={14} /> : <Lock size={14} />}
                          </button>
                          <button
                            onClick={() => { setAssigningStudent(s); setAssignClassId(s.class_id); setShowAssignClass(true); setFormError(null); setFormSuccess(null) }}
                            style={{ background: 'rgba(49,213,160,0.1)', border: '1px solid rgba(49,213,160,0.25)', color: '#31d5a0', borderRadius: 7, padding: '5px 8px', cursor: 'pointer' }}
                            title="Xếp lớp"
                          >
                            <ArrowLeftRight size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(s.id)}
                            style={{ background: 'rgba(255,107,129,0.1)', border: '1px solid rgba(255,107,129,0.2)', color: '#ff6b81', borderRadius: 7, padding: '5px 8px', cursor: 'pointer' }}
                            title="Xóa học sinh"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 30, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                      {isLoading ? 'Đang tải...' : 'Chưa có học sinh nào trong hệ thống'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* ==================== MODAL: TẠO GIÁO VIÊN ==================== */}
      <AnimatePresence>
        {showCreateTeacher && (
          <div className="result-overlay">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="result-card" style={{ maxWidth: 480, textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <GraduationCap size={20} color="#a78bfa" /> Tạo tài khoản Giáo viên
                </h3>
                <button onClick={() => setShowCreateTeacher(false)} style={{ background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer' }}><X size={18} /></button>
              </div>

              {formError && <div style={{ padding: '8px 12px', background: 'rgba(255,107,129,0.1)', border: '1px solid rgba(255,107,129,0.3)', borderRadius: 8, color: '#ff6b81', fontSize: 12, marginBottom: 14 }}>{formError}</div>}
              {formSuccess && <div style={{ padding: '8px 12px', background: 'rgba(49,213,160,0.1)', border: '1px solid rgba(49,213,160,0.3)', borderRadius: 8, color: '#31d5a0', fontSize: 12, marginBottom: 14 }}>{formSuccess}</div>}

              <form onSubmit={handleCreateTeacher} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Mã giáo viên *</label>
                  <input value={tCode} onChange={e => setTCode(e.target.value)} placeholder="VD: GV002" required style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Họ tên *</label>
                  <input value={tName} onChange={e => setTName(e.target.value)} placeholder="VD: Nguyễn Văn A" required style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input value={tEmail} onChange={e => setTEmail(e.target.value)} placeholder="VD: teacher@edutest.vn" type="email" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Mật khẩu khởi tạo</label>
                  <input value={tPassword} onChange={e => setTPassword(e.target.value)} placeholder="Mật khẩu đăng nhập (mặc định nếu trống)" type="password" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Số điện thoại</label>
                  <input value={tPhone} onChange={e => setTPhone(e.target.value)} placeholder="VD: 0912345678" style={inputStyle} />
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                  <button type="button" className="secondary-button" onClick={() => setShowCreateTeacher(false)} style={{ flex: 1 }}>Hủy</button>
                  <button type="submit" className="primary-button" style={{ flex: 1, justifyContent: 'center' }}>Tạo tài khoản</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== MODAL: SỬA THÔNG TIN GIÁO VIÊN ==================== */}
      <AnimatePresence>
        {showEditTeacher && editingTeacher && (
          <div className="result-overlay">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="result-card" style={{ maxWidth: 480, textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Edit size={20} color="#a78bfa" /> Sửa thông tin Giáo viên
                </h3>
                <button onClick={() => setShowEditTeacher(false)} style={{ background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer' }}><X size={18} /></button>
              </div>

              {formError && <div style={{ padding: '8px 12px', background: 'rgba(255,107,129,0.1)', border: '1px solid rgba(255,107,129,0.3)', borderRadius: 8, color: '#ff6b81', fontSize: 12, marginBottom: 14 }}>{formError}</div>}
              {formSuccess && <div style={{ padding: '8px 12px', background: 'rgba(49,213,160,0.1)', border: '1px solid rgba(49,213,160,0.3)', borderRadius: 8, color: '#31d5a0', fontSize: 12, marginBottom: 14 }}>{formSuccess}</div>}

              <form onSubmit={handleUpdateTeacher} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Mã giáo viên *</label>
                  <input value={editTCode} onChange={e => setEditTCode(e.target.value)} required style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Họ và tên *</label>
                  <input value={editTName} onChange={e => setEditTName(e.target.value)} required style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input value={editTEmail} onChange={e => setEditTEmail(e.target.value)} type="email" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Số điện thoại</label>
                  <input value={editTPhone} onChange={e => setEditTPhone(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Trạng thái hoạt động tài khoản</label>
                  <select
                    value={editTStatus}
                    onChange={e => setEditTStatus(e.target.value)}
                    style={{ ...inputStyle, cursor: 'pointer', background: '#1a1f36' }}
                  >
                    <option value="active">🟢 Đang hoạt động (active)</option>
                    <option value="inactive">🔴 Đã khóa / Vô hiệu hóa (inactive)</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button type="button" className="secondary-button" onClick={() => setShowEditTeacher(false)} style={{ flex: 1 }}>Hủy</button>
                  <button type="submit" className="primary-button" style={{ flex: 1, justifyContent: 'center' }}>Lưu thay đổi</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== MODAL: TẠO HỌC SINH ==================== */}
      <AnimatePresence>
        {showCreateStudent && (
          <div className="result-overlay">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="result-card" style={{ maxWidth: 480, textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Users size={20} color="#31d5a0" /> Tạo tài khoản Học sinh
                </h3>
                <button onClick={() => setShowCreateStudent(false)} style={{ background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer' }}><X size={18} /></button>
              </div>

              {formError && <div style={{ padding: '8px 12px', background: 'rgba(255,107,129,0.1)', border: '1px solid rgba(255,107,129,0.3)', borderRadius: 8, color: '#ff6b81', fontSize: 12, marginBottom: 14 }}>{formError}</div>}
              {formSuccess && <div style={{ padding: '8px 12px', background: 'rgba(49,213,160,0.1)', border: '1px solid rgba(49,213,160,0.3)', borderRadius: 8, color: '#31d5a0', fontSize: 12, marginBottom: 14 }}>{formSuccess}</div>}

              <form onSubmit={handleCreateStudent} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Mã học sinh *</label>
                  <input value={sCode} onChange={e => setSCode(e.target.value)} placeholder="VD: HS010" required style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Họ tên *</label>
                  <input value={sName} onChange={e => setSName(e.target.value)} placeholder="VD: Trần Thị B" required style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input value={sEmail} onChange={e => setSEmail(e.target.value)} placeholder="VD: student@edutest.vn" type="email" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Mật khẩu khởi tạo</label>
                  <input value={sPassword} onChange={e => setSPassword(e.target.value)} placeholder="Mật khẩu đăng nhập (mặc định nếu trống)" type="password" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Lớp học ban đầu *</label>
                  <select
                    value={sClassId}
                    onChange={(e) => setSClassId(Number(e.target.value))}
                    style={{ ...inputStyle, cursor: 'pointer', background: '#1a1f36' }}
                  >
                    {classrooms.map(c => (
                      <option key={c.id} value={c.id} style={{ background: '#131728' }}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                  <button type="button" className="secondary-button" onClick={() => setShowCreateStudent(false)} style={{ flex: 1 }}>Hủy</button>
                  <button type="submit" className="primary-button" style={{ flex: 1, justifyContent: 'center' }}>Tạo tài khoản</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== MODAL: SỬA THÔNG TIN HỌC SINH ==================== */}
      <AnimatePresence>
        {showEditStudent && editingStudent && (
          <div className="result-overlay">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="result-card" style={{ maxWidth: 480, textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Edit size={20} color="#31d5a0" /> Sửa thông tin Học sinh
                </h3>
                <button onClick={() => setShowEditStudent(false)} style={{ background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer' }}><X size={18} /></button>
              </div>

              {formError && <div style={{ padding: '8px 12px', background: 'rgba(255,107,129,0.1)', border: '1px solid rgba(255,107,129,0.3)', borderRadius: 8, color: '#ff6b81', fontSize: 12, marginBottom: 14 }}>{formError}</div>}
              {formSuccess && <div style={{ padding: '8px 12px', background: 'rgba(49,213,160,0.1)', border: '1px solid rgba(49,213,160,0.3)', borderRadius: 8, color: '#31d5a0', fontSize: 12, marginBottom: 14 }}>{formSuccess}</div>}

              <form onSubmit={handleUpdateStudent} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Mã học sinh *</label>
                  <input value={editSCode} onChange={e => setEditSCode(e.target.value)} required style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Họ và tên *</label>
                  <input value={editSName} onChange={e => setEditSName(e.target.value)} required style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input value={editSEmail} onChange={e => setEditSEmail(e.target.value)} type="email" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Lớp học *</label>
                  <select
                    value={editSClassId}
                    onChange={(e) => setEditSClassId(Number(e.target.value))}
                    style={{ ...inputStyle, cursor: 'pointer', background: '#1a1f36' }}
                  >
                    {classrooms.map(c => (
                      <option key={c.id} value={c.id} style={{ background: '#131728' }}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Trạng thái hoạt động tài khoản</label>
                  <select
                    value={editSStatus}
                    onChange={e => setEditSStatus(e.target.value)}
                    style={{ ...inputStyle, cursor: 'pointer', background: '#1a1f36' }}
                  >
                    <option value="active">🟢 Đang hoạt động (active)</option>
                    <option value="inactive">🔴 Đã khóa / Vô hiệu hóa (inactive)</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button type="button" className="secondary-button" onClick={() => setShowEditStudent(false)} style={{ flex: 1 }}>Hủy</button>
                  <button type="submit" className="primary-button" style={{ flex: 1, justifyContent: 'center' }}>Lưu thay đổi</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== MODAL: ĐỔI MẬT KHẨU MỚI ==================== */}
      <AnimatePresence>
        {showResetPassword && resettingUser && (
          <div className="result-overlay">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="result-card" style={{ maxWidth: 440, textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Key size={20} color="#f5ad52" /> Cập nhật mật khẩu mới
                </h3>
                <button onClick={() => setShowResetPassword(false)} style={{ background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer' }}><X size={18} /></button>
              </div>

              <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 9, border: '1px solid var(--line)', marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Tài khoản áp dụng:</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginTop: 2 }}>{resettingUser.name}</div>
                <div style={{ fontSize: 11, color: '#a78bfa', marginTop: 2 }}>
                  {resettingUser.type === 'teacher' ? 'Giáo viên' : 'Học sinh'} · Mã: {resettingUser.code}
                </div>
              </div>

              {formError && <div style={{ padding: '8px 12px', background: 'rgba(255,107,129,0.1)', border: '1px solid rgba(255,107,129,0.3)', borderRadius: 8, color: '#ff6b81', fontSize: 12, marginBottom: 14 }}>{formError}</div>}
              {formSuccess && <div style={{ padding: '8px 12px', background: 'rgba(49,213,160,0.1)', border: '1px solid rgba(49,213,160,0.3)', borderRadius: 8, color: '#31d5a0', fontSize: 12, marginBottom: 14 }}>{formSuccess}</div>}

              <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Mật khẩu mới (tối thiểu 6 ký tự) *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Nhập mật khẩu mới..."
                      required
                      minLength={6}
                      style={{ ...inputStyle, paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      style={{
                        position: 'absolute',
                        right: 10,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4, display: 'block' }}>
                    Mật khẩu sẽ được mã hóa an toàn và có hiệu lực ngay lập tức khi đăng nhập.
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                  <button type="button" className="secondary-button" onClick={() => setShowResetPassword(false)} style={{ flex: 1 }}>Hủy</button>
                  <button type="submit" className="primary-button" style={{ flex: 1, justifyContent: 'center' }}>Cập nhật mật khẩu</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== MODAL: XẾP LỚP ==================== */}
      <AnimatePresence>
        {showAssignClass && assigningStudent && (
          <div className="result-overlay">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="result-card" style={{ maxWidth: 420, textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ArrowLeftRight size={20} color="#a78bfa" /> Xếp lớp
                </h3>
                <button onClick={() => { setShowAssignClass(false); setAssigningStudent(null) }} style={{ background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer' }}><X size={18} /></button>
              </div>

              {formSuccess && <div style={{ padding: '8px 12px', background: 'rgba(49,213,160,0.1)', border: '1px solid rgba(49,213,160,0.3)', borderRadius: 8, color: '#31d5a0', fontSize: 12, marginBottom: 14 }}>{formSuccess}</div>}

              <p style={{ margin: '0 0 16px 0', fontSize: 13, color: 'var(--muted)' }}>
                Chuyển học sinh <strong style={{ color: '#fff' }}>{assigningStudent.full_name}</strong> sang lớp:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {classrooms.map(c => (
                  <label
                    key={c.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 14px',
                      background: assignClassId === c.id ? 'rgba(139,124,246,0.12)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${assignClassId === c.id ? '#8b7cf6' : 'var(--line)'}`,
                      borderRadius: 9,
                      cursor: 'pointer',
                      fontSize: 13
                    }}
                  >
                    <input
                      type="radio"
                      name="assignClass"
                      checked={assignClassId === c.id}
                      onChange={() => setAssignClassId(c.id)}
                    />
                    <span>{c.name} ({c.code})</span>
                    {assigningStudent.class_id === c.id && (
                      <span style={{ fontSize: 10, color: '#31d5a0', fontWeight: 700, marginLeft: 'auto' }}>HIỆN TẠI</span>
                    )}
                  </label>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="secondary-button" onClick={() => { setShowAssignClass(false); setAssigningStudent(null) }} style={{ flex: 1 }}>Hủy</button>
                <button className="primary-button" onClick={handleAssignClass} style={{ flex: 1, justifyContent: 'center' }}>Xác nhận</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
