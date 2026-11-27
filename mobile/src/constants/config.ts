import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Mặc định kết nối tới Production API trên VPS
const PRODUCTION_API_URL = 'https://edutest.io.vn/api/v1'

export const STORAGE_KEYS = {
  TOKEN: '@edutest_token',
  USER: '@edutest_user',
  DEVICE_ID: '@edutest_device_id',
  BASE_URL: '@edutest_base_url'
}

export const getBaseUrl = async (): Promise<string> => {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEYS.BASE_URL)
    if (saved) return saved
  } catch {}
  return PRODUCTION_API_URL
}

export const getSocketUrl = async (): Promise<string> => {
  const baseUrl = await getBaseUrl()
  return baseUrl.replace('/api/v1', '')
}

export const saveCustomBaseUrl = async (url: string): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEYS.BASE_URL, url)
}

