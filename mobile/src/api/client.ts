import axios, { AxiosInstance } from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getBaseUrl, STORAGE_KEYS } from '../constants/config'

let apiInstance: AxiosInstance | null = null

export const getApiClient = async (): Promise<AxiosInstance> => {
  const currentBaseUrl = await getBaseUrl()
  
  const instance = axios.create({
    baseURL: currentBaseUrl,
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json'
    }
  })

  instance.interceptors.request.use(
    async (config) => {
      try {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN)
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
      } catch (err) {}
      return config
    },
    (error) => Promise.reject(error)
  )

  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401) {
        // Token hết hạn hoặc không hợp lệ
        await AsyncStorage.multiRemove([STORAGE_KEYS.TOKEN, STORAGE_KEYS.USER])
      }
      return Promise.reject(error)
    }
  )

  return instance
}

