import axios from 'axios'
import i18n from '../i18n/config'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  // Add Accept-Language header based on current language preference
  const currentLanguage = i18n.language || 'en'
  config.headers['Accept-Language'] = currentLanguage

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isAuthEndpoint = error.config?.url?.includes('/auth/')
      const isAlreadyOnLogin = window.location.pathname === '/login' || window.location.pathname === '/'
      if (!isAuthEndpoint && !isAlreadyOnLogin) {
        localStorage.removeItem('authToken')
        window.dispatchEvent(new CustomEvent('auth:logout'))
      }
    }
    return Promise.reject(error)
  }
)
