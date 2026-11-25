'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  GraduationCap,
  BookOpen,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Shield
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function LoginPage() {
  const router = useRouter()
  const { user, token, isLoading: authLoading, loginTeacher, loginStudent, loginAdmin } = useAuth()

  // Redirect to home if already authenticated
  useEffect(() => {
    if (!authLoading && user && token) {
      router.push('/')
    }
  }, [authLoading, user, token, router])

  const [roleTab, setRoleTab] = useState<'teacher' | 'student' | 'admin'>('teacher')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Switch role tab
  const handleTabChange = (role: 'teacher' | 'student' | 'admin') => {
    setRoleTab(role)
    setErrorMessage(null)
    setIdentifier('')
    setPassword('')
  }

  // Submit Login Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)
    setIsLoading(true)

    try {
      if (roleTab === 'teacher') {
        await loginTeacher({ email: identifier, password })
        setSuccessMessage('Đăng nhập Giáo viên thành công! Đang chuyển hướng...')
      } else if (roleTab === 'student') {
        await loginStudent({ email: identifier, password })
        setSuccessMessage('Đăng nhập Học sinh thành công! Đang chuyển hướng...')
      } else {
        await loginAdmin({ email: identifier, password })
        setSuccessMessage('Đăng nhập Quản trị viên thành công! Đang chuyển hướng...')
      }

      setTimeout(() => {
        router.push('/')
      }, 700)
    } catch (err: any) {
      setErrorMessage(err.message || 'Thông tin tài khoản hoặc mật khẩu không chính xác')
      setIsLoading(false)
    }
  }

  const roleLabels = {
    teacher: 'Giáo viên',
    student: 'Học sinh',
    admin: 'Quản trị viên'
  }

  const rolePlaceholders = {
    teacher: 'teacher@gmail.com hoặc GV001',
    student: 'student@gmail.com hoặc HS001',
    admin: 'admin@gmail.com'
  }

  return (
    <div className="login-page-shell">
      {/* Top Right Theme Switcher */}
      <div style={{ position: 'fixed', top: 20, right: 24, zIndex: 50 }}>
        <ThemeToggle />
      </div>

      {/* Background Ambient Glow */}
      <div className="ambient-glow glow-top-left" />
      <div className="ambient-glow glow-bottom-right" />

      <div className="login-container">
        {/* Left Side: Brand & Feature Highlights */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="login-brand-panel"
        >
          <div className="brand" style={{ padding: 0, marginBottom: 32 }}>
            <div className="brand-mark">
              <Sparkles size={20} />
            </div>
            <span style={{ fontSize: 24 }}>
              Edu<span className="brand-accent">Test</span>
            </span>
          </div>

          <div className="eyebrow" style={{ marginBottom: 12 }}>
            <span className="pulse-dot" /> NỀN TẢNG THI TRỰC TUYẾN & GIÁM SÁT THỜI GIAN THỰC
          </div>

          <h1 className="brand-heading">
            Khảo thí thông minh,<br />
            <span className="gradient-text">Giám sát trực tiếp</span>
          </h1>

          <p className="brand-description">
            Đăng nhập để vào không gian làm việc của Giáo viên, Phòng thi trực tuyến của Học sinh, hoặc Bảng quản trị hệ thống.
          </p>


        </motion.div>

        {/* Right Side: Auth Card */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="login-card"
        >
          {/* Header */}
          <div className="card-header">
            <h2>Đăng nhập tài khoản</h2>
            <p>Chọn vai trò và nhập thông tin để truy cập hệ thống</p>
          </div>

          {/* Role Tabs */}
          <div className="login-tabs">
            <button
              type="button"
              className={`tab-btn ${roleTab === 'teacher' ? 'active teacher-tab' : ''}`}
              onClick={() => handleTabChange('teacher')}
            >
              <GraduationCap size={16} />
              <span>Giáo viên</span>
            </button>
            <button
              type="button"
              className={`tab-btn ${roleTab === 'student' ? 'active student-tab' : ''}`}
              onClick={() => handleTabChange('student')}
            >
              <BookOpen size={16} />
              <span>Học sinh</span>
            </button>
            <button
              type="button"
              className={`tab-btn ${roleTab === 'admin' ? 'active' : ''}`}
              onClick={() => handleTabChange('admin')}
              style={roleTab === 'admin' ? { borderColor: '#f59e0b', color: '#f59e0b', background: 'rgba(245,158,11,0.08)' } : {}}
            >
              <Shield size={16} />
              <span>Admin</span>
            </button>
          </div>

          {/* Messages */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="alert-banner error"
              >
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </motion.div>
            )}

            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="alert-banner success"
              >
                <CheckCircle2 size={16} />
                <span>{successMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label>Email hoặc Mã số tài khoản</label>
              <div className="input-wrap">
                <Mail size={16} className="input-icon" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={rolePlaceholders[roleTab]}
                />
              </div>
            </div>

            <div className="form-group">
              <div className="label-row">
                <label>Mật khẩu</label>
              </div>
              <div className="input-wrap">
                <Lock size={16} className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu của bạn"
                />
                <button
                  type="button"
                  className="eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`submit-btn ${roleTab === 'student' ? 'student-btn' : roleTab === 'admin' ? 'admin-btn' : ''}`}
              style={roleTab === 'admin' ? { background: 'linear-gradient(135deg, #f59e0b, #d97706)' } : {}}
            >
              {isLoading ? (
                <span>Đang xác thực...</span>
              ) : (
                <>
                  <span>Đăng nhập {roleLabels[roleTab]}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
