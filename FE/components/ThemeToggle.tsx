'use client'

import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/lib/theme-context'

interface ThemeToggleProps {
  compact?: boolean
  style?: React.CSSProperties
  className?: string
}

export function ThemeToggle({ compact = false, style, className = '' }: ThemeToggleProps) {
  const { isDark, setTheme, toggleTheme } = useTheme()

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`theme-toggle-btn ${className}`}
        title={isDark ? 'Đang ở Giao diện Tối — Bấm để sang Sáng' : 'Đang ở Giao diện Sáng — Bấm để sang Tối'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '7px 10px',
          borderRadius: 10,
          border: '1px solid var(--line)',
          background: isDark ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
          color: 'var(--text)',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          ...style
        }}
      >
        {isDark ? <Moon size={15} style={{ color: '#a78bfa' }} /> : <Sun size={15} style={{ color: '#f59e0b' }} />}
      </button>
    )
  }

  return (
    <div
      className={`theme-toggle-segmented ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        padding: 3,
        borderRadius: 10,
        border: '1px solid var(--line)',
        background: isDark ? 'rgba(255, 255, 255, 0.04)' : '#f1f5f9',
        ...style
      }}
    >
      <button
        type="button"
        onClick={() => setTheme('light')}
        title="Giao diện Sáng (Light Mode)"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '5px 10px',
          borderRadius: 7,
          border: 0,
          background: !isDark ? '#ffffff' : 'transparent',
          color: !isDark ? '#0f172a' : '#8891a9',
          boxShadow: !isDark ? '0 1px 4px rgba(15, 23, 42, 0.08)' : 'none',
          fontSize: 11.5,
          fontWeight: !isDark ? 700 : 500,
          cursor: 'pointer',
          transition: 'all 0.18s ease'
        }}
      >
        <Sun size={13.5} style={{ color: !isDark ? '#f59e0b' : '#8891a9' }} />
        <span>Sáng</span>
      </button>

      <button
        type="button"
        onClick={() => setTheme('dark')}
        title="Giao diện Tối (Dark Mode)"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '5px 10px',
          borderRadius: 7,
          border: 0,
          background: isDark ? '#252841' : 'transparent',
          color: isDark ? '#f8fafc' : '#64748b',
          boxShadow: isDark ? '0 1px 6px rgba(0, 0, 0, 0.28)' : 'none',
          fontSize: 11.5,
          fontWeight: isDark ? 700 : 500,
          cursor: 'pointer',
          transition: 'all 0.18s ease'
        }}
      >
        <Moon size={13.5} style={{ color: isDark ? '#a78bfa' : '#64748b' }} />
        <span>Tối</span>
      </button>
    </div>
  )
}

