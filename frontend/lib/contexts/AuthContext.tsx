'use client'

import { createContext, useContext } from 'react'

interface User {
  id: string
  email: string
  fullName: string
  role?: string
}

interface AuthContextType {
  user: User | null
  logout: () => void
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within DashboardLayout')
  }
  return context
}
