import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import type { User } from '../types'

interface AuthContextType {
  user: User | null
  isSuperAdmin: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName: string, inviteToken?: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const refreshUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        setUser(null)
        setLoading(false)
        return
      }
      const userData = await authApi.getCurrentUser()
      setUser(userData)
    } catch {
      localStorage.removeItem('authToken')
      localStorage.removeItem('userId')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login(email, password)
    localStorage.setItem('authToken', response.access_token)
    localStorage.setItem('userId', response.user.id)
    setUser(response.user)
  }, [])

  const register = useCallback(async (email: string, password: string, fullName: string, inviteToken?: string) => {
    const response = await authApi.register(email, password, fullName, inviteToken)
    localStorage.setItem('authToken', response.access_token)
    localStorage.setItem('userId', response.user.id)
    setUser(response.user)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('userId')
    setUser(null)
    navigate('/login')
  }, [navigate])

  return (
    <AuthContext.Provider
      value={{
        user,
        isSuperAdmin: user?.isSuperAdmin ?? false,
        loading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
