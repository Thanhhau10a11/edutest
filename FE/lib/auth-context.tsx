'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { api, setToken, removeToken, getToken } from './api'

export interface User {
  id: number
  code: string
  full_name: string
  role: 'admin' | 'teacher' | 'student'
  email?: string
  phone?: string
  class_id?: number
  classroom?: any
  reward_points?: number
  wallet_coins?: number
}

interface AuthContextType {
  user: User | null
  token: string | null
  role: 'admin' | 'teacher' | 'student' | null
  isLoading: boolean
  isApiConnected: boolean
  loginTeacher: (credentials: { teacher_code?: string; full_name?: string; email?: string; password?: string } | string, full_name?: string) => Promise<void>
  loginStudent: (credentials: { student_code?: string; full_name?: string; email?: string; password?: string } | string, full_name?: string) => Promise<void>
  loginAdmin: (credentials: { email: string; password: string }) => Promise<void>
  logout: () => void
  setRole: (role: 'admin' | 'teacher' | 'student') => void
  refreshUserData: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRoleState] = useState<'admin' | 'teacher' | 'student' | null>(null)
  const [token, setTokenState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isApiConnected, setIsApiConnected] = useState(true)

  // Initialize from saved token in localStorage
  useEffect(() => {
    const existingToken = getToken()
    if (existingToken) {
      setTokenState(existingToken)
      api.auth.getMe()
        .then((res) => {
          if (res.data) {
            setUser(res.data)
            setRoleState(res.data.role || 'teacher')
            setIsApiConnected(true)
          } else {
            removeToken()
            setTokenState(null)
            setUser(null)
            setRoleState(null)
          }
        })
        .catch(() => {
          removeToken()
          setTokenState(null)
          setUser(null)
          setRoleState(null)
        })
        .finally(() => setIsLoading(false))
    } else {
      setTokenState(null)
      setUser(null)
      setRoleState(null)
      setIsLoading(false)
    }
  }, [])

  const setRole = (newRole: 'admin' | 'teacher' | 'student') => {
    setRoleState(newRole)
  }

  const loginTeacher = async (credentials: { teacher_code?: string; full_name?: string; email?: string; password?: string } | string, legacyName?: string) => {
    setIsLoading(true)
    const payload = typeof credentials === 'string'
      ? (credentials.includes('@') ? { email: credentials, password: legacyName } : { teacher_code: credentials, full_name: legacyName || '' })
      : credentials

    try {
      const res = await api.auth.loginTeacher(payload)
      if (res.data?.token) {
        setToken(res.data.token)
        setTokenState(res.data.token)
        setUser(res.data.user)
        setRoleState('teacher')
        setIsApiConnected(true)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const loginStudent = async (credentials: { student_code?: string; full_name?: string; email?: string; password?: string } | string, legacyName?: string) => {
    setIsLoading(true)
    const payload = typeof credentials === 'string'
      ? (credentials.includes('@') ? { email: credentials, password: legacyName } : { student_code: credentials, full_name: legacyName || '' })
      : credentials

    try {
      const res = await api.auth.loginStudent(payload)
      if (res.data?.token) {
        setToken(res.data.token)
        setTokenState(res.data.token)
        setUser(res.data.user)
        setRoleState('student')
        setIsApiConnected(true)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const loginAdmin = async (credentials: { email: string; password: string }) => {
    setIsLoading(true)
    try {
      const res = await api.auth.loginAdmin(credentials)
      if (res.data?.token) {
        setToken(res.data.token)
        setTokenState(res.data.token)
        setUser(res.data.user)
        setRoleState('admin')
        setIsApiConnected(true)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    removeToken()
    setTokenState(null)
    setUser(null)
    setRoleState(null)
  }

  const refreshUserData = async () => {
    try {
      if (role === 'student') {
        const walletRes = await api.student.getWallet()
        if (walletRes.data?.balance) {
          setUser((prev) => prev ? {
            ...prev,
            wallet_coins: walletRes.data.balance.wallet_coins,
            reward_points: walletRes.data.balance.reward_points
          } : null)
        }
      }
    } catch (err) {
      console.debug('Failed to refresh user data:', err)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        isLoading,
        isApiConnected,
        loginTeacher,
        loginStudent,
        loginAdmin,
        logout,
        setRole,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
