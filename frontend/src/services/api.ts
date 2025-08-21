import axios, { AxiosInstance, AxiosResponse } from 'axios'

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, try to refresh
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        try {
          const response = await api.post('/auth/refresh', { refresh_token: refreshToken })
          const { access_token } = response.data
          localStorage.setItem('access_token', access_token)
          
          // Retry original request
          error.config.headers.Authorization = `Bearer ${access_token}`
          return api.request(error.config)
        } catch (refreshError) {
          // Refresh failed, redirect to login
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          localStorage.removeItem('user')
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

// API Service Classes
export class AuthService {
  static async googleAuth(code: string, redirectUri: string) {
    const response = await api.post('/auth/google', { code, redirect_uri: redirectUri })
    return response.data
  }

  static async login(email: string, password: string) {
    const response = await api.post('/auth/login', { email, password })
    return response.data
  }

  static async register(userData: {
    email: string
    full_name: string
    phone_number?: string
  }) {
    const response = await api.post('/auth/register', userData)
    return response.data
  }

  static async getCurrentUser() {
    const response = await api.get('/auth/me')
    return response.data
  }

  static async updateProfile(userData: {
    full_name?: string
    phone_number?: string
    profile_picture?: string
  }) {
    const response = await api.put('/auth/me', userData)
    return response.data
  }

  static async verifyPhone(phoneNumber: string, verificationCode: string) {
    const response = await api.post('/auth/verify-phone', {
      phone_number: phoneNumber,
      verification_code: verificationCode,
    })
    return response.data
  }

  static async setWalletPin(pin: string, currentPin?: string) {
    const response = await api.post('/auth/set-wallet-pin', {
      new_pin: pin,
      current_pin: currentPin,
    })
    return response.data
  }

  static async logout() {
    const response = await api.post('/auth/logout')
    return response.data
  }
}

export class WalletService {
  static async getBalance() {
    const response = await api.get('/wallet/balance')
    return response.data
  }

  static async getTransactions(limit = 20, offset = 0) {
    const response = await api.get(`/wallet/transactions?limit=${limit}&offset=${offset}`)
    return response.data
  }

  static async p2pTransfer(transferData: {
    recipient_phone: string
    amount: number
    description?: string
    pin: string
  }) {
    const response = await api.post('/wallet/p2p-transfer', transferData)
    return response.data
  }

  static async bankTransfer(transferData: {
    bank_code: string
    account_number: string
    account_name: string
    amount: number
    description?: string
    pin: string
  }) {
    const response = await api.post('/wallet/bank-transfer', transferData)
    return response.data
  }
}

export class BotService {
  static async getUserBots() {
    const response = await api.get('/bots/')
    return response.data
  }

  static async createBot(botData: {
    name: string
    strategy: string
    initial_capital: number
  }) {
    const response = await api.post('/bots/', botData)
    return response.data
  }

  static async getBot(botId: string) {
    const response = await api.get(`/bots/${botId}`)
    return response.data
  }

  static async startBot(botId: string) {
    const response = await api.put(`/bots/${botId}/start`)
    return response.data
  }

  static async stopBot(botId: string) {
    const response = await api.put(`/bots/${botId}/stop`)
    return response.data
  }

  static async deleteBot(botId: string) {
    const response = await api.delete(`/bots/${botId}`)
    return response.data
  }
}

// Export the api instance for direct use if needed
export default api
