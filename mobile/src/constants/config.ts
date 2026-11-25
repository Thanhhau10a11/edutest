import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Mặc định cho Android Emulator dùng 10.0.2.2, iOS simulator dùng localhost, hoặc IP mạng LAN
const DEFAULT_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost'
const DEFAULT_PORT = '5000'

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
  return `http://${DEFAULT_HOST}:${DEFAULT_PORT}/api/v1`
}

export const getSocketUrl = async (): Promise<string> => {
  const baseUrl = await getBaseUrl()
  return baseUrl.replace('/api/v1', '')
}

export const saveCustomBaseUrl = async (url: string): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEYS.BASE_URL, url)
}

