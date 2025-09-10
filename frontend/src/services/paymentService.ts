import axios, { AxiosResponse } from 'axios'

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
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

export interface Payment {
  id: string
  user_id: string
  amount: number
  payment_type: 'deposit' | 'withdrawal' | 'transfer' | 'fee' | 'refund'
  payment_method: 'bank_transfer' | 'card' | 'mobile_money' | 'crypto' | 'wallet'
  payment_channel: 'paystack' | 'internal' | 'crypto'
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded'
  description?: string
  reference: string
  gateway_reference?: string
  recipient_account?: string
  recipient_bank?: string
  recipient_name?: string
  fees: number
  net_amount: number
  authorization_url?: string
  callback_url?: string
  metadata?: any
  created_at: string
  updated_at: string
  completed_at?: string
}

export interface PaymentStats {
  total_deposits: number
  total_withdrawals: number
  total_fees: number
  pending_deposits: number
  pending_withdrawals: number
  completed_transactions: number
  failed_transactions: number
  monthly_deposits: number
  monthly_withdrawals: number
}

export interface BankAccount {
  id: string
  user_id: string
  account_number: string
  bank_code: string
  bank_name: string
  account_name: string
  is_verified: boolean
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface Bank {
  id: number
  name: string
  code: string
  longcode: string
  gateway: string
  pay_with_bank: boolean
  active: boolean
  is_deleted: boolean
  country: string
  currency: string
  type: string
}

export interface PaymentFilters {
  payment_type?: string
  payment_method?: string
  status?: string
  start_date?: string
  end_date?: string
  min_amount?: number
  max_amount?: number
  search?: string
  limit?: number
  skip?: number
}

export class PaymentService {
  // Deposit operations
  static async initializeDeposit(amount: number) {
    const response = await api.post('/payments/deposit/initialize', { amount })
    return response.data
  }

  // Withdrawal operations
  static async initializeWithdrawal(amount: number, bankAccountId: string) {
    const response = await api.post('/payments/withdrawal/initialize', { 
      amount, 
      bank_account_id: bankAccountId 
    })
    return response.data
  }

  // Payment verification
  static async verifyPayment(reference: string) {
    const response = await api.post(`/payments/verify/${reference}`)
    return response.data
  }

  // Payment history
  static async getPaymentHistory(filters: PaymentFilters = {}) {
    const params = new URLSearchParams()
    
    if (filters.payment_type) params.append('payment_type', filters.payment_type)
    if (filters.payment_method) params.append('payment_method', filters.payment_method)
    if (filters.status) params.append('status', filters.status)
    if (filters.start_date) params.append('start_date', filters.start_date)
    if (filters.end_date) params.append('end_date', filters.end_date)
    if (filters.min_amount) params.append('min_amount', filters.min_amount.toString())
    if (filters.max_amount) params.append('max_amount', filters.max_amount.toString())
    if (filters.search) params.append('search', filters.search)
    if (filters.limit) params.append('limit', filters.limit.toString())
    if (filters.skip) params.append('skip', filters.skip.toString())

    const response = await api.get(`/payments/history?${params.toString()}`)
    return response.data
  }

  // Payment statistics
  static async getPaymentStats(): Promise<PaymentStats> {
    const response = await api.get('/payments/stats')
    return response.data
  }

  // Bank operations
  static async getSupportedBanks(): Promise<{ banks: Bank[] }> {
    const response = await api.get('/payments/banks')
    return response.data
  }

  static async resolveAccountNumber(accountNumber: string, bankCode: string) {
    const response = await api.post('/payments/banks/resolve', {
      account_number: accountNumber,
      bank_code: bankCode
    })
    return response.data
  }

  // Bank account management
  static async addBankAccount(bankAccount: {
    account_number: string
    bank_code: string
    account_name: string
  }): Promise<BankAccount> {
    const response = await api.post('/payments/bank-accounts', bankAccount)
    return response.data
  }

  static async getBankAccounts(): Promise<BankAccount[]> {
    const response = await api.get('/payments/bank-accounts')
    return response.data
  }

  static async deleteBankAccount(accountId: string) {
    const response = await api.delete(`/payments/bank-accounts/${accountId}`)
    return response.data
  }

  // Utility methods
  static formatAmount(amount: number): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  static formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  static getStatusColor(status: string): string {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100'
      case 'pending':
        return 'text-yellow-600 bg-yellow-100'
      case 'processing':
        return 'text-blue-600 bg-blue-100'
      case 'failed':
        return 'text-red-600 bg-red-100'
      case 'cancelled':
        return 'text-gray-600 bg-gray-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  static getPaymentTypeIcon(paymentType: string): string {
    switch (paymentType) {
      case 'deposit':
        return '📥'
      case 'withdrawal':
        return '📤'
      case 'transfer':
        return '🔄'
      case 'fee':
        return '💳'
      case 'refund':
        return '↩️'
      default:
        return '💰'
    }
  }

  static getPaymentMethodIcon(paymentMethod: string): string {
    switch (paymentMethod) {
      case 'bank_transfer':
        return '🏦'
      case 'card':
        return '💳'
      case 'mobile_money':
        return '📱'
      case 'crypto':
        return '₿'
      case 'wallet':
        return '👛'
      default:
        return '💰'
    }
  }
}

export default PaymentService
