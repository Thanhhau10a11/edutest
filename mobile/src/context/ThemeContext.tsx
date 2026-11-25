import React, { createContext, useContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { DARK_COLORS, LIGHT_COLORS, ThemeColors, applyThemeColors } from '../constants/theme'

type ThemeMode = 'dark' | 'light'

interface ThemeContextType {
  theme: ThemeMode
  isDark: boolean
  colors: ThemeColors
  toggleTheme: () => void
  setTheme: (mode: ThemeMode) => void
}

const THEME_STORAGE_KEY = '@edutest_theme_mode'

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  isDark: true,
  colors: DARK_COLORS,
  toggleTheme: () => {},
  setTheme: () => {}
})

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>('dark')

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark') {
          applyThemeColors(saved)
          setThemeState(saved)
        }
      })
      .catch(() => {})
  }, [])

  const setTheme = async (mode: ThemeMode) => {
    applyThemeColors(mode)
    setThemeState(mode)
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode)
    } catch {}
  }

  const toggleTheme = () => {
    const next: ThemeMode = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
  }

  const isDark = theme === 'dark'
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS

  return (
    <ThemeContext.Provider value={{ theme, isDark, colors, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)

