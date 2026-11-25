export const DARK_COLORS = {
  bg: '#080b13',
  panel: 'rgba(16, 20, 32, 0.85)',
  panelSolid: '#111524',
  panelStrong: '#121727',
  headerBg: 'rgba(16, 20, 32, 0.98)',
  tabBarBg: '#0c0f1c',
  card: '#161b2e',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  cardBorderActive: 'rgba(139, 124, 246, 0.45)',
  subtleBg: 'rgba(255, 255, 255, 0.04)',
  subtleBorder: 'rgba(255, 255, 255, 0.06)',
  inputBg: 'rgba(255, 255, 255, 0.04)',

  text: '#edf0f8',
  textStrong: '#ffffff',
  textMuted: '#8991a8',
  textSubtle: '#626a82',

  primary: '#8b7cf6',
  primaryDark: '#6d5be2',
  primaryGlow: 'rgba(139, 124, 246, 0.25)',

  secondary: '#38bdf8',
  success: '#31d5a0',
  successBg: 'rgba(49, 213, 160, 0.12)',
  warning: '#f5ad52',
  warningBg: 'rgba(245, 173, 82, 0.12)',
  danger: '#ef5f70',
  dangerBg: 'rgba(239, 95, 112, 0.12)',

  coin: '#f59e0b',
  point: '#a78bfa'
}

export const LIGHT_COLORS: typeof DARK_COLORS = {
  bg: '#f1f5f9',
  panel: 'rgba(255, 255, 255, 0.94)',
  panelSolid: '#ffffff',
  panelStrong: '#f8fafc',
  headerBg: '#ffffff',
  tabBarBg: '#ffffff',
  card: '#ffffff',
  cardBorder: 'rgba(15, 23, 42, 0.09)',
  cardBorderActive: 'rgba(109, 91, 226, 0.45)',
  subtleBg: 'rgba(15, 23, 42, 0.04)',
  subtleBorder: 'rgba(15, 23, 42, 0.07)',
  inputBg: '#f8fafc',

  text: '#0f172a',
  textStrong: '#0f172a',
  textMuted: '#475569',
  textSubtle: '#64748b',

  primary: '#6d5be2',
  primaryDark: '#5b4bc4',
  primaryGlow: 'rgba(109, 91, 226, 0.18)',

  secondary: '#0284c7',
  success: '#059669',
  successBg: 'rgba(16, 185, 129, 0.12)',
  warning: '#d97706',
  warningBg: 'rgba(245, 158, 11, 0.12)',
  danger: '#e11d48',
  dangerBg: 'rgba(225, 29, 72, 0.1)',

  coin: '#d97706',
  point: '#7c3aed'
}

export type ThemeColors = typeof DARK_COLORS

export const COLORS: ThemeColors = { ...DARK_COLORS }

export const applyThemeColors = (mode: 'dark' | 'light') => {
  Object.assign(COLORS, mode === 'dark' ? DARK_COLORS : LIGHT_COLORS)
}

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24
}

export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  full: 9999
}
