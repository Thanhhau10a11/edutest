'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

type ThemeMode = 'dark' | 'light'

interface ThemeContextType {
  theme: ThemeMode
  isDark: boolean
  toggleTheme: () => void
  setTheme: (mode: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  isDark: true,
  toggleTheme: () => {},
  setTheme: () => {}
})

const STORAGE_KEY = 'edutest_theme'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('dark')

  const applyDomTheme = (mode: ThemeMode) => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    root.setAttribute('data-theme', mode)
    if (mode === 'light') {
      root.classList.add('light-mode')
      root.classList.remove('dark')
    } else {
      root.classList.remove('light-mode')
      root.classList.add('dark')
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
    const initial: ThemeMode = saved === 'light' || saved === 'dark' ? saved : 'dark'
    setThemeState(initial)
    applyDomTheme(initial)
  }, [])

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode)
    applyDomTheme(mode)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, mode)
    }
  }

  const toggleTheme = () => {
    const next: ThemeMode = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: theme === 'dark',
        toggleTheme,
        setTheme
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)

