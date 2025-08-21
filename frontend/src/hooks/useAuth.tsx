import React, { useState, useEffect, createContext, useContext } from 'react'

interface User {
  id: string
  email: string
  full_name: string
  profile_picture?: string
  phone_number?: string
  country: string
  currency: string
  wallet_balance_kes: number
  wallet_balance_usdt: number
  wallet_status: string
  is_verified: boolean
}

interface AuthTokens {
  access_token: string
  refresh_token?: string
  token_type: string
}

interface AuthContextType {
  user: User | null
  login: (userData: User, tokens: AuthTokens) => void
  logout: () => void
  isLoading: boolean
  tokens: AuthTokens | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [tokens, setTokens] = useState<AuthTokens | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in from localStorage
    const savedUser = localStorage.getItem('user')
    const savedTokens = localStorage.getItem('tokens')
    
    if (savedUser && savedTokens) {
      try {
        setUser(JSON.parse(savedUser))
        setTokens(JSON.parse(savedTokens))
      } catch (error) {
        console.error('Error parsing saved user/tokens:', error)
        localStorage.removeItem('user')
        localStorage.removeItem('tokens')
      }
    }
    setIsLoading(false)
  }, [])

  const login = (userData: User, tokens: AuthTokens) => {
    setUser(userData)
    setTokens(tokens)
    localStorage.setItem('user', JSON.stringify(userData))
    localStorage.setItem('tokens', JSON.stringify(tokens))
    localStorage.setItem('access_token', tokens.access_token)
    if (tokens.refresh_token) {
      localStorage.setItem('refresh_token', tokens.refresh_token)
    }
  }

  const logout = () => {
    setUser(null)
    setTokens(null)
    localStorage.removeItem('user')
    localStorage.removeItem('tokens')
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, tokens }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
