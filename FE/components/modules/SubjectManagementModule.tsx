'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Edit3,
  FolderPlus,
  Check,
  X,
  Palette,
  Layers,
  ArrowRight,
  BookMarked
} from 'lucide-react'
import { api } from '@/lib/api'

export interface SubjectItem {
  id: number
  name: string
  code: string
  description?: string
  color?: string
  icon?: string
}

export default function SubjectManagementModule({
  onBack,
  embedded = false,
  onSelectSubject
}: {
  onBack?: () => void
  embedded?: boolean
  onSelectSubject?: (subjectName: string) => void
}) {
  const [subjects, setSubjects] = useState<SubjectItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#8b7cf6')
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // 1. Fetch Subjects from Real MySQL API
  const fetchSubjects = async () => {
    setIsLoading(true)
    try {
      const res = await api.subjects.getAll()
      if (res.data && Array.isArray(res.data)) {
        setSubjects(res.data)
      }
    } catch (err: any) {
      console.error('Lỗi khi nạp danh sách môn học:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSubjects()
  }, [])

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingId(null)
    setName('')
    setCode('')
    setDescription('')
    setColor('#8b7cf6')
    setErrorMsg(null)
    setSuccessMsg(null)
    setShowModal(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (sub: SubjectItem) => {
    setEditingId(sub.id)
    setName(sub.name)
    setCode(sub.code)
    setDescription(sub.description || '')
    setColor(sub.color || '#8b7cf6')
    setErrorMsg(null)
    setSuccessMsg(null)
    setShowModal(true)
  }

  // Save Subject (Create / Update)
  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrorMsg('Tên môn học không được để trống')
      return
    }

    setIsSaving(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      if (editingId) {
        // Update existing subject
        const res = await api.subjects.update(editingId, {
          name: name.trim(),
          description: description.trim() || undefined,
          color
        })
        if (res.data) {
          setSuccessMsg(`Đã cập nhật môn học "${name}" thành công!`)
          await fetchSubjects()
          setTimeout(() => {
            setShowModal(false)
          }, 600)
        }
      } else {
        // Create new subject
        const res = await api.subjects.create({
          name: name.trim(),
          code: code.trim() || undefined,
          description: description.trim() || undefined,
          color
        })
        if (res.data) {
          setSuccessMsg(`Đã tạo môn học "${name}" thành công!`)
          await fetchSubjects()
          setTimeout(() => {
            setShowModal(false)
          }, 600)
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể lưu môn học. Vui lòng thử lại.')
    } finally {
      setIsSaving(false)
    }
  }

  // Delete Subject
  const handleDeleteSubject = async (sub: SubjectItem) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa môn học "${sub.name}" (${sub.code})?`)) return
    try {
      await api.subjects.delete(sub.id)
      setSubjects((prev) => prev.filter((s) => s.id !== sub.id))
    } catch (err: any) {
      alert('Không thể xóa môn học: ' + (err.message || 'Lỗi hệ thống'))
    }
  }

  // Filtered list by search query
  const filteredSubjects = subjects.filter((s) => {
    const q = searchQuery.toLowerCase().trim()
    return s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
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
            SUBJECT MANAGEMENT · QUẢN LÝ DANH MỤC MÔN HỌC & CHỦ ĐỀ
          </div>
          {onBack && <button className="secondary-button" onClick={onBack}>← Về tổng quan</button>}
        </header>
      )}

      <section className="content-wrap" style={{ maxWidth: 1250, paddingTop: 30 }}>
        {/* Page Heading */}
        <div className="page-heading">
          <div>
            <div className="eyebrow"><BookOpen size={14} /> QUẢN LÝ DANH MỤC MÔN HỌC THI</div>
            <h1>Quản lý Môn học & Chủ đề</h1>
            <p>Khởi tạo, định dạng mã số, màu sắc nhận diện và phân loại chủ đề bài thi cho toàn hệ thống.</p>
          </div>

          <button className="primary-button" onClick={handleOpenCreate}>
            <Plus size={16} /> Thêm môn học mới
          </button>
        </div>

        {/* Toolbar & Search */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>
              Tổng số môn học: <strong style={{ color: '#fff', fontSize: 15 }}>{subjects.length}</strong>
            </span>
          </div>

          <div className="search-box" style={{ width: 320 }}>
            <Search size={15} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm môn học theo tên hoặc mã..."
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* Subjects Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 18 }}>
          {isLoading ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}>
              Đang nạp danh sách môn học từ cơ sở dữ liệu...
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', background: 'rgba(18,23,39,0.5)', border: '1px dashed var(--line)', borderRadius: 14, color: 'var(--muted)' }}>
              <BookMarked size={36} style={{ opacity: 0.35, margin: '0 auto 12px', color: '#8b7cf6' }} />
              <h3 style={{ fontSize: 16, color: '#fff', margin: '0 0 6px 0' }}>Không tìm thấy môn học nào</h3>
              <p style={{ fontSize: 13, margin: 0 }}>Bấm nút "+ Thêm môn học mới" ở góc trên để khởi tạo danh mục môn học mới.</p>
            </div>
          ) : (
            filteredSubjects.map((sub) => {
              const themeColor = sub.color || '#8b7cf6'
              return (
                <motion.div
                  key={sub.id}
                  whileHover={{ y: -3 }}
                  style={{
                    background: 'rgba(18,23,39,0.85)',
                    border: '1px solid var(--line)',
                    borderRadius: 14,
                    padding: '22px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 16,
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {/* Color Accent Pill Banner */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 4,
                      background: themeColor
                    }}
                  />

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          padding: '3px 9px',
                          borderRadius: 6,
                          background: `${themeColor}22`,
                          color: themeColor,
                          border: `1px solid ${themeColor}44`,
                          letterSpacing: '0.05em'
                        }}
                      >
                        {sub.code}
                      </span>

                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => handleOpenEdit(sub)}
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--line)',
                            borderRadius: 7,
                            color: '#c4b5fd',
                            padding: '5px 8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11
                          }}
                          title="Chỉnh sửa thông tin"
                        >
                          <Edit3 size={13} /> Sửa
                        </button>

                        <button
                          onClick={() => handleDeleteSubject(sub)}
                          style={{
                            background: 'rgba(239,95,112,0.1)',
                            border: '1px solid rgba(239,95,112,0.3)',
                            borderRadius: 7,
                            color: '#ff6b81',
                            padding: '5px 8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11
                          }}
                          title="Xóa môn học"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <h3 style={{ margin: '0 0 6px 0', fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>
                      {sub.name}
                    </h3>

                    <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
                      {sub.description || 'Chưa có mô tả chi tiết cho môn học này.'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--muted)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: themeColor }} />
                      <span>Mã môn: {sub.code}</span>
                    </div>

                    {onSelectSubject && (
                      <button
                        onClick={() => onSelectSubject(sub.name)}
                        style={{
                          background: 'none',
                          border: 0,
                          color: '#8b7cf6',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        Xem câu hỏi <ArrowRight size={13} />
                      </button>
                    )}
                  </div>
                </motion.div>
              )
            })
          )}
        </div>
      </section>

      {/* MODAL: TẠO / SỬA MÔN HỌC */}
      <AnimatePresence>
        {showModal && (
          <div className="result-overlay" style={{ zIndex: 9999 }}>
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              style={{
                width: 'min(580px, calc(100% - 32px))',
                background: '#121727',
                border: '1px solid rgba(139,124,246,0.35)',
                boxShadow: '0 25px 70px rgba(0,0,0,0.65)',
                borderRadius: 18,
                padding: '28px 30px',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(139,124,246,0.15)', border: '1px solid rgba(139,124,246,0.3)', display: 'grid', placeItems: 'center', color: '#a78bfa' }}>
                    <FolderPlus size={18} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#fff' }}>
                      {editingId ? 'Chỉnh sửa thông tin Môn học' : 'Thêm Môn học / Chủ đề mới'}
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--muted)' }}>
                      Dữ liệu sẽ được lưu trực tiếp vào cơ sở dữ liệu MySQL.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowModal(false)}
                  style={{ background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer', padding: 4 }}
                >
                  <X size={18} />
                </button>
              </div>

              {errorMsg && (
                <div style={{ padding: '10px 14px', background: 'rgba(239,95,112,0.12)', border: '1px solid rgba(239,95,112,0.3)', borderRadius: 9, color: '#ef5f70', fontSize: 12, marginBottom: 16 }}>
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div style={{ padding: '10px 14px', background: 'rgba(49,213,160,0.12)', border: '1px solid rgba(49,213,160,0.3)', borderRadius: 9, color: '#31d5a0', fontSize: 12, marginBottom: 16 }}>
                  {successMsg}
                </div>
              )}

              <form onSubmit={handleSaveSubject} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 5 }}>Tên môn học / Chủ đề *:</label>
                    <input
                      type="text"
                      placeholder="VD: Toán học 10, Vật Lý 11..."
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value)
                        if (!editingId && !code) {
                          const autoCode = e.target.value
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '')
                            .replace(/[^a-zA-Z0-9]/g, '')
                            .toUpperCase()
                            .slice(0, 10)
                          setCode(autoCode)
                        }
                      }}
                      required
                      style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line)', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 5 }}>Mã viết tắt (Code):</label>
                    <input
                      type="text"
                      placeholder="VD: TOAN10, HOA11..."
                      value={code}
                      disabled={Boolean(editingId)}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line)', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none', opacity: editingId ? 0.6 : 1 }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 5 }}>Mô tả ngắn (Chương trình, phạm vi):</label>
                  <input
                    type="text"
                    placeholder="VD: Lý thuyết & Bài tập chuẩn chương trình GDPT mới..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line)', borderRadius: 8, color: '#fff', fontSize: 12, outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>Màu sắc đại diện cho môn học:</label>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {[
                      { c: '#8b7cf6', label: 'Tím' },
                      { c: '#38bdf8', label: 'Lam' },
                      { c: '#34d399', label: 'Ngọc' },
                      { c: '#10b981', label: 'Lục' },
                      { c: '#f5ad52', label: 'Cam' },
                      { c: '#f43f5e', label: 'Hồng' },
                      { c: '#ec4899', label: 'Tím sen' },
                      { c: '#6366f1', label: 'Chàm' }
                    ].map((item) => (
                      <button
                        key={item.c}
                        type="button"
                        onClick={() => setColor(item.c)}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          background: item.c,
                          border: color === item.c ? '2px solid #fff' : '2px solid transparent',
                          boxShadow: color === item.c ? `0 0 10px ${item.c}` : 'none',
                          cursor: 'pointer'
                        }}
                        title={item.label}
                      />
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                  <button type="button" className="secondary-button" onClick={() => setShowModal(false)}>Hủy</button>
                  <button type="submit" className="primary-button" disabled={isSaving}>
                    {isSaving ? 'Đang lưu...' : editingId ? 'Cập nhật môn học' : 'Tạo môn học'}
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
