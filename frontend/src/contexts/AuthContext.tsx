import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import type { User } from '../types'

interface AuthContextType {
  user: User | null
  isSuperAdmin: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: (credential: string) => Promise<void>
  loginWithWebAuthn: (email: string) => Promise<void>
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

  useEffect(() => {
    const handleForceLogout = () => {
      setUser(null)
      navigate('/login')
    }
    window.addEventListener('auth:logout', handleForceLogout)
    return () => window.removeEventListener('auth:logout', handleForceLogout)
  }, [navigate])

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login(email, password)
    localStorage.setItem('authToken', response.accessToken)
    localStorage.setItem('userId', response.user.id)
    setUser(response.user)
  }, [])

  const loginWithGoogle = useCallback(async (credential: string) => {
    const response = await authApi.googleLogin(credential)
    localStorage.setItem('authToken', response.accessToken)
    localStorage.setItem('userId', response.user.id)
    setUser(response.user)
  }, [])

  const loginWithWebAuthn = useCallback(async (email: string) => {
    let options
    try {
      const result = await authApi.webauthnLoginBegin(email)
      options = result.options
    } catch (err) {
      console.warn('WebAuthn login begin failed:', err)
      throw err
    }
    const credential = await navigator.credentials.get({ publicKey: options }) as PublicKeyCredential
    if (!credential) throw new Error('No credential returned')
    const response = await authApi.webauthnLoginComplete(email, credential)
    localStorage.setItem('authToken', response.accessToken)
    localStorage.setItem('userId', response.user.id)
    localStorage.setItem('webauthn_email', email)
    setUser(response.user)
  }, [])

  const register = useCallback(async (email: string, password: string, fullName: string, inviteToken?: string) => {
    const response = await authApi.register(email, password, fullName, inviteToken)
    localStorage.setItem('authToken', response.accessToken)
    localStorage.setItem('userId', response.user.id)
    setUser(response.user)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('userId')
    localStorage.removeItem('webauthn_email')
    setUser(null)
    navigate('/login')
  }, [navigate])

  const value = useMemo(() => ({
    user,
    isSuperAdmin: user?.isSuperAdmin ?? false,
    loading,
    login,
    loginWithGoogle,
    loginWithWebAuthn,
    register,
    logout,
    refreshUser,
  }), [user, loading, login, loginWithGoogle, loginWithWebAuthn, register, logout, refreshUser])

  return (
    <AuthContext.Provider value={value}>
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
