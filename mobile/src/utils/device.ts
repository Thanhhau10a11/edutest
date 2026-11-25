import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'
import { STORAGE_KEYS } from '../constants/config'

/**
 * Sinh và duy trì một mã Device ID duy nhất cho thiết bị di động
 * Phục vụ cơ chế bảo mật phòng thi "Khóa 1 Thiết Bị Duy Nhất (Anti-Proxy)"
 */
export const getOrCreateDeviceId = async (): Promise<string> => {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID)
    if (existing) return existing

    const randomSuffix = Math.random().toString(36).substring(2, 10).toUpperCase()
    const timestamp = Date.now().toString(36).toUpperCase()
    const newId = `MOBILE_${Platform.OS.toUpperCase()}_${timestamp}_${randomSuffix}`

    await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, newId)
    return newId
  } catch (error) {
    return `MOBILE_FALLBACK_${Date.now()}`
  }
}

