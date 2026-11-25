'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Send,
  X,
  Bot,
  User as UserIcon,
  Trash2,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  CornerDownLeft,
  Wand2,
  PlusCircle
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { useTheme } from '@/lib/theme-context'
import {
  cleanMathText,
  renderRichMathMarkdown,
  parseQuestionsFromAIText
} from '@/lib/math-format'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  model?: string
  isError?: boolean
}

const SUGGESTIONS_BY_ROLE: Record<string, string[]> = {
  teacher: [
    'Soạn 3 câu trắc nghiệm Toán 10 về Phương trình bậc hai kèm đáp án và giải thích',
    'Tổng hợp công thức nghiệm và định lý Vi-ét để chép vào đề cương',
    'Soạn 3 câu trắc nghiệm Vật Lý 10 về Chuyển động thẳng biến đổi đều',
  ],
  student: [
    'Giải thích công thức nghiệm và định lý Vi-ét phương trình bậc 2',
    'Mẹo làm bài thi trắc nghiệm nhanh và chính xác',
    'Cách tính điểm thưởng và tích xu trên hệ thống EduTest',
  ],
  admin: [
    'Soạn 3 câu trắc nghiệm Toán 10 về Hàm số bậc hai kèm đáp án',
    'Tổng hợp các công thức Toán 10 chuẩn đẹp để soạn câu hỏi',
    'Hướng dẫn quản lý tài khoản giáo viên và phân lớp học sinh',
  ],
}

export default function AIChatboxWidget() {
  const { user, role } = useAuth()
  const { isDark } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [importedId, setImportedId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const storageKey = `edutest_ai_chat_${user?.code || role || 'guest'}`

  const getInitialMessage = (): ChatMessage => {
    const greetingName = user?.full_name || (role === 'teacher' ? 'Thầy/Cô' : role === 'admin' ? 'Quản trị viên' : 'bạn')
    const roleDesc =
      role === 'teacher' || role === 'admin'
        ? 'Em hỗ trợ soạn câu hỏi trắc nghiệm chuẩn công thức Toán học (x², √Δ, ±, ≤, ≥, ⇒, ⇔...) để nạp thẳng hoặc sao chép sạch vào Ngân hàng câu hỏi.'
        : 'Mình là Gia sư AI của EduTest! Mình có thể giải thích công thức Toán - Lý - Hóa - Anh rõ đẹp, dễ hiểu và hướng dẫn bạn ôn thi tích xu thưởng.'

    return {
      id: 'welcome-msg',
      role: 'assistant',
      content: `Xin chào **${greetingName}**! ✨\n${roleDesc}\n\nBạn cần hỗ trợ gì ngay lúc này?`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    }
  }

  const [messages, setMessages] = useState<ChatMessage[]>([getInitialMessage()])

  // Load saved conversation from localStorage when user/role changes
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed)
          return
        }
      }
    } catch {
      // ignore parse errors
    }
    setMessages([getInitialMessage()])
  }, [storageKey, user?.full_name, role])

  // Save conversation to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (messages.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(messages.slice(-30)))
      }
    } catch {
      // ignore storage quota errors
    }
  }, [messages, storageKey])

  // Listen to custom event `edutest:open-chatbox` from anywhere in the app
  useEffect(() => {
    const handleOpen = (e: Event) => {
      setIsOpen(true)
      const customEvt = e as CustomEvent<{ prompt?: string }>
      if (customEvt.detail?.prompt) {
        setInput(customEvt.detail.prompt)
      }
    }
    const handleToggle = () => setIsOpen((prev) => !prev)
    window.addEventListener('edutest:open-chatbox', handleOpen)
    window.addEventListener('edutest:toggle-chatbox', handleToggle)
    return () => {
      window.removeEventListener('edutest:open-chatbox', handleOpen)
      window.removeEventListener('edutest:toggle-chatbox', handleToggle)
    }
  }, [])

  // Auto-scroll to bottom when messages change or chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        inputRef.current?.focus()
      }, 80)
    }
  }, [messages, isOpen, isLoading])

  const handleSend = async (customText?: string) => {
    const textToSend = (customText !== undefined ? customText : input).trim()
    if (!textToSend || isLoading) return

    const nowTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: nowTime,
    }

    const updatedHistory = [...messages, userMsg]
    setMessages(updatedHistory)
    if (customText === undefined) setInput('')
    setIsLoading(true)

    try {
      const historyForApi = messages
        .filter((m) => m.id !== 'welcome-msg' && !m.isError)
        .slice(-8)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }))

      const res = await api.chat.sendMessage({
        message: textToSend,
        history: historyForApi,
        userRole: role || 'student',
        userName: user?.full_name,
      })

      const rawReply =
        res.data?.reply ||
        (res as any).reply ||
        'Tôi chưa thể phản hồi câu hỏi này ngay lúc này.'
      const replyText = cleanMathText(rawReply)
      const usedModel = res.data?.model || (res as any).model

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: replyText,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        model: usedModel,
      }

      setMessages((prev) => [...prev, botMsg])
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: err?.message || 'Không thể kết nối tới máy chủ AI. Vui lòng kiểm tra Backend hoặc thử lại sau.',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearChat = () => {
    const reset = [getInitialMessage()]
    setMessages(reset)
    if (typeof window !== 'undefined') {
      localStorage.removeItem(storageKey)
    }
  }

  // Copy cleaned math text (without raw markdown ## or ** or LaTeX \(...\))
  const handleCopy = (id: string, content: string) => {
    const cleanForCopy = cleanMathText(content)
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/^#{1,4}\s+/gm, '')
      .trim()
    navigator.clipboard.writeText(cleanForCopy)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1800)
  }

  // Import parsed AI questions directly into QuestionBankModule
  const handleImportToQuestionBank = (id: string, content: string) => {
    const parsed = parseQuestionsFromAIText(content)
    if (parsed.length === 0) return

    if (typeof window !== 'undefined') {
      localStorage.setItem('edutest_pending_ai_questions', JSON.stringify(parsed))
      window.dispatchEvent(
        new CustomEvent('edutest:import-ai-questions', {
          detail: { questions: parsed },
        })
      )
    }
    setImportedId(id)
    setTimeout(() => setImportedId(null), 2500)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const suggestions = SUGGESTIONS_BY_ROLE[role || 'student'] || SUGGESTIONS_BY_ROLE.student

  return (
    <>
      {/* Floating Launcher Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setIsOpen(true)}
            title="Mở Trợ lý AI EduTest"
            style={{
              position: 'fixed',
              right: 24,
              bottom: 24,
              zIndex: 9998,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 18px',
              borderRadius: 999,
              border: '1px solid rgba(167, 139, 250, 0.45)',
              background: 'linear-gradient(135deg, #6d5dfc 0%, #9b51e0 100%)',
              color: '#ffffff',
              boxShadow: '0 12px 32px rgba(109, 93, 252, 0.45), 0 0 0 4px rgba(139, 124, 246, 0.15)',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.18)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Sparkles size={15} />
            </div>
            <span>Trợ lý AI EduTest</span>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#34d399',
                boxShadow: '0 0 10px #34d399',
              }}
            />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chatbox Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              right: 24,
              bottom: 24,
              width: isExpanded ? 'min(720px, calc(100vw - 48px))' : 'min(440px, calc(100vw - 32px))',
              height: isExpanded ? 'min(800px, calc(100vh - 48px))' : 'min(630px, calc(100vh - 48px))',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 20,
              border: isDark ? '1px solid rgba(139, 124, 246, 0.35)' : '1px solid rgba(109, 91, 226, 0.25)',
              background: isDark ? 'rgba(13, 17, 29, 0.97)' : '#ffffff',
              backdropFilter: 'blur(20px)',
              boxShadow: isDark
                ? '0 24px 64px rgba(0, 0, 0, 0.65), 0 0 40px rgba(109, 93, 252, 0.2)'
                : '0 20px 56px rgba(15, 23, 42, 0.16), 0 0 32px rgba(109, 91, 226, 0.1)',
              overflow: 'hidden',
              color: isDark ? '#edf0f8' : '#0f172a',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '14px 18px',
                background: isDark
                  ? 'linear-gradient(135deg, rgba(109, 93, 252, 0.24) 0%, rgba(49, 213, 160, 0.08) 100%)'
                  : 'linear-gradient(135deg, rgba(109, 93, 252, 0.1) 0%, rgba(16, 185, 129, 0.06) 100%)',
                borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #6d5dfc, #a855f7)',
                    display: 'grid',
                    placeItems: 'center',
                    color: '#fff',
                    boxShadow: '0 6px 18px rgba(109, 93, 252, 0.4)',
                    flexShrink: 0,
                  }}
                >
                  <Bot size={20} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <strong style={{ fontSize: 14, color: isDark ? '#fff' : '#0f172a', letterSpacing: '-0.01em' }}>
                      EduTest AI Assistant
                    </strong>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 6,
                        background: 'rgba(52, 211, 153, 0.15)',
                        color: isDark ? '#34d399' : '#059669',
                        border: '1px solid rgba(52, 211, 153, 0.3)',
                      }}
                    >
                      MATH FORMAT · LIVE
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#475569', marginTop: 2 }}>
                    {role === 'teacher' || role === 'admin'
                      ? 'Soạn câu hỏi & chuẩn hóa công thức Toán học'
                      : 'Gia sư AI & giải thích công thức trực quan'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  onClick={handleClearChat}
                  title="Làm mới cuộc trò chuyện"
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.1)',
                    background: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
                    color: isDark ? '#94a3b8' : '#475569',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <Trash2 size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  title={isExpanded ? 'Thu nhỏ khung chat' : 'Mở rộng khung chat'}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.1)',
                    background: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
                    color: isDark ? '#94a3b8' : '#475569',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Đóng cửa sổ chat"
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.1)',
                    background: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
                    color: isDark ? '#cbd5e1' : '#334155',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Messages Container */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              {messages.map((msg) => {
                const isUser = msg.role === 'user'
                const parsedQuestions =
                  !isUser && !msg.isError && msg.id !== 'welcome-msg'
                    ? parseQuestionsFromAIText(msg.content)
                    : []

                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: isUser ? 'row-reverse' : 'row',
                      alignItems: 'flex-start',
                      gap: 9,
                    }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 9,
                        flexShrink: 0,
                        display: 'grid',
                        placeItems: 'center',
                        background: isUser
                          ? 'linear-gradient(135deg, #3b82f6, #6366f1)'
                          : msg.isError
                          ? 'rgba(239, 68, 68, 0.2)'
                          : 'rgba(139, 124, 246, 0.16)',
                        border: isUser
                          ? 'none'
                          : `1px solid ${msg.isError ? 'rgba(239,68,68,0.4)' : 'rgba(139,124,246,0.35)'}`,
                        color: isUser ? '#fff' : msg.isError ? '#ef4444' : isDark ? '#a78bfa' : '#6d5be2',
                        marginTop: 2,
                      }}
                    >
                      {isUser ? <UserIcon size={14} /> : <Sparkles size={14} />}
                    </div>

                    {/* Message Bubble */}
                    <div
                      style={{
                        maxWidth: '86%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isUser ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          padding: '11px 14px',
                          borderRadius: isUser ? '15px 4px 15px 15px' : '4px 15px 15px 15px',
                          background: isUser
                            ? 'linear-gradient(135deg, #6d5dfc 0%, #8b5cf6 100%)'
                            : msg.isError
                            ? 'rgba(239, 68, 68, 0.1)'
                            : isDark
                            ? 'rgba(23, 29, 46, 0.95)'
                            : '#f8fafc',
                          border: isUser
                            ? 'none'
                            : `1px solid ${
                                msg.isError
                                  ? 'rgba(239, 68, 68, 0.35)'
                                  : isDark
                                  ? 'rgba(255, 255, 255, 0.09)'
                                  : 'rgba(15, 23, 42, 0.09)'
                              }`,
                          color: isUser ? '#ffffff' : msg.isError ? (isDark ? '#fca5a5' : '#dc2626') : isDark ? '#e2e8f0' : '#0f172a',
                          fontSize: 13,
                          boxShadow: isUser
                            ? '0 4px 15px rgba(109, 93, 252, 0.25)'
                            : isDark
                            ? '0 2px 10px rgba(0, 0, 0, 0.22)'
                            : '0 2px 8px rgba(15, 23, 42, 0.04)',
                          width: '100%',
                        }}
                      >
                        {isUser ? (
                          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                            {cleanMathText(msg.content)}
                          </div>
                        ) : (
                          renderRichMathMarkdown(msg.content)
                        )}
                      </div>

                      {/* Timestamp & Actions */}
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          gap: 10,
                          marginTop: 5,
                          padding: '0 4px',
                          fontSize: 10,
                          color: '#64748b',
                        }}
                      >
                        <span>{msg.timestamp}</span>
                        {!isUser && !msg.isError && (
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.id, msg.content)}
                            title="Sao chép văn bản đã chuẩn hóa công thức Toán (không dính ký tự LaTeX)"
                            style={{
                              border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.1)',
                              background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                              color: copiedId === msg.id ? '#10b981' : isDark ? '#94a3b8' : '#475569',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '2px 7px',
                              borderRadius: 5,
                              fontSize: 10,
                              fontWeight: 600,
                            }}
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check size={11} /> Đã chép sạch công thức
                              </>
                            ) : (
                              <>
                                <Copy size={11} /> Sao chép sạch
                              </>
                            )}
                          </button>
                        )}

                        {/* Nút nạp thẳng câu hỏi vào Trình soạn câu hỏi cho Giáo viên / Admin */}
                        {parsedQuestions.length > 0 && (role === 'teacher' || role === 'admin') && (
                          <button
                            type="button"
                            onClick={() => handleImportToQuestionBank(msg.id, msg.content)}
                            title="Đưa các câu hỏi trắc nghiệm này vào Trình soạn thảo Ngân hàng câu hỏi"
                            style={{
                              border: '1px solid rgba(49, 213, 160, 0.35)',
                              background: 'rgba(49, 213, 160, 0.12)',
                              color: isDark ? '#34d399' : '#059669',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '2px 8px',
                              borderRadius: 5,
                              fontSize: 10,
                              fontWeight: 700,
                            }}
                          >
                            {importedId === msg.id ? (
                              <>
                                <Check size={11} /> Đã nạp vào trình soạn câu hỏi!
                              </>
                            ) : (
                              <>
                                <PlusCircle size={11} /> Nạp vào soạn câu hỏi ({parsedQuestions.length} câu)
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Loading Indicator */}
              {isLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 9,
                      display: 'grid',
                      placeItems: 'center',
                      background: 'rgba(139, 124, 246, 0.18)',
                      border: '1px solid rgba(139, 124, 246, 0.35)',
                      color: isDark ? '#a78bfa' : '#6d5be2',
                    }}
                  >
                    <Sparkles size={14} />
                  </div>
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: '4px 15px 15px 15px',
                      background: isDark ? 'rgba(25, 31, 49, 0.92)' : '#f8fafc',
                      border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.08)',
                      color: isDark ? '#a78bfa' : '#6d5be2',
                      fontSize: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: isDark ? '#a78bfa' : '#6d5be2',
                        animation: 'pulse 1.2s infinite',
                      }}
                    />
                    <span>AI đang biên soạn và định dạng công thức...</span>
                  </div>
                </div>
              )}

              {/* Quick Suggestions when conversation only has welcome message */}
              {messages.length <= 1 && !isLoading && (
                <div style={{ marginTop: 6 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      color: isDark ? '#94a3b8' : '#475569',
                      marginBottom: 8,
                    }}
                  >
                    <Wand2 size={12} color={isDark ? '#a78bfa' : '#6d5be2'} />
                    <span>Gợi ý câu hỏi nhanh:</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {suggestions.map((item, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSend(item)}
                        style={{
                          textAlign: 'left',
                          padding: '9px 12px',
                          borderRadius: 10,
                          border: '1px solid rgba(139, 124, 246, 0.25)',
                          background: isDark ? 'rgba(139, 124, 246, 0.07)' : 'rgba(109, 91, 226, 0.05)',
                          color: isDark ? '#cbd5e1' : '#1e293b',
                          fontSize: 12,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Math Symbols Bar inside Chat Input */}
            <div
              style={{
                padding: '6px 14px',
                borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.08)',
                background: isDark ? 'rgba(14, 18, 31, 0.95)' : '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                overflowX: 'auto',
              }}
            >
              <span style={{ fontSize: 10, color: isDark ? '#8b7cf6' : '#6d5be2', fontWeight: 700, marginRight: 4, whiteSpace: 'nowrap' }}>
                Chèn nhanh:
              </span>
              {['x²', 'x³', 'x₁', 'x₂', 'Δ', '√', '±', '≤', '≥', '≠', '∈', '⇒', '⇔', 'π', '∞'].map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => {
                    setInput((prev) => prev + sym)
                    inputRef.current?.focus()
                  }}
                  style={{
                    padding: '2px 7px',
                    borderRadius: 5,
                    border: '1px solid rgba(139, 124, 246, 0.25)',
                    background: isDark ? 'rgba(139, 124, 246, 0.1)' : '#ffffff',
                    color: isDark ? '#ddd6fe' : '#5b4bc4',
                    fontSize: 11,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {sym}
                </button>
              ))}
            </div>

            {/* Input Area */}
            <div
              style={{
                padding: '10px 14px 12px',
                borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.08)',
                background: isDark ? 'rgba(10, 13, 23, 0.95)' : '#ffffff',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 8,
                  padding: '8px 10px',
                  borderRadius: 13,
                  border: '1px solid rgba(139, 124, 246, 0.35)',
                  background: isDark ? 'rgba(20, 26, 42, 0.9)' : '#f8fafc',
                }}
              >
                <textarea
                  ref={inputRef}
                  className="chatbox-textarea"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Nhập câu hỏi hoặc yêu cầu AI soạn đề Toán, Lý, Hóa..."
                  rows={1}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 0,
                    outline: 'none',
                    color: isDark ? '#f1f5f9' : '#0f172a',
                    fontSize: 13,
                    resize: 'none',
                    maxHeight: 96,
                    lineHeight: 1.45,
                    fontFamily: 'inherit',
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                  title="Gửi tin nhắn"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    border: 0,
                    background:
                      !input.trim() || isLoading
                        ? 'rgba(139, 124, 246, 0.2)'
                        : 'linear-gradient(135deg, #6d5dfc, #9b51e0)',
                    color: !input.trim() || isLoading ? '#64748b' : '#ffffff',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Send size={15} />
                </button>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 6,
                  padding: '0 4px',
                  fontSize: 10,
                  color: '#64748b',
                }}
              >
                <span>Tự động chuẩn hóa công thức Toán học</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <CornerDownLeft size={10} /> Enter để gửi
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
