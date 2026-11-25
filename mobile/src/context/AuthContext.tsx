import React, { createContext, useContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { STORAGE_KEYS } from '../constants/config'
import { studentApi } from '../api/student.api'

export interface StudentUser {
  id: number
  student_code: string
  full_name: string
  email?: string
  role: 'student'
  classroom_id?: number
  classroom_name?: string
  grade_name?: string
  wallet_coins?: number
  reward_points?: number
}

interface AuthContextType {
  user: StudentUser | null
  token: string | null
  isLoading: boolean
  login: (credentials: { student_code?: string; username?: string; password: string }) => Promise<{ success: boolean; message?: string }>
  logout: () => Promise<void>
  refreshUserData: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<StudentUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN)
      const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.USER)
      if (storedToken && storedUser) {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))
      }
    } catch (e) {
      console.error('Error loading stored auth:', e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadStoredAuth()
  }, [])

  const login = async (credentials: { student_code?: string; username?: string; password: string }) => {
    try {
      const res = await studentApi.login(credentials)
      if (res.success && res.data) {
        const authToken = res.data.token || res.data.accessToken
        const studentInfo = res.data.student || res.data.user
        
        await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, authToken)
        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(studentInfo))
        
        setToken(authToken)
        setUser(studentInfo)
        return { success: true }
      }
      return { success: false, message: res.message || 'Đăng nhập không thành công' }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Lỗi kết nối tới máy chủ EduTest'
      return { success: false, message: msg }
    }
  }

  const logout = async () => {
    await AsyncStorage.multiRemove([STORAGE_KEYS.TOKEN, STORAGE_KEYS.USER])
    setToken(null)
    setUser(null)
  }

  const refreshUserData = async () => {
    try {
      const res = await studentApi.getProfile()
      if (res.success && res.data) {
        setUser((prev) => ({ ...prev, ...res.data }))
        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(res.data))
      }
    } catch (e) {}
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

