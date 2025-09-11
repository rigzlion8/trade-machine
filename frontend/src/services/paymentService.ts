import { api } from './api'

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

export interface ExchangeRates {
  base: string
  rates: Record<string, number>
  last_updated: string
}

export interface MobileMoneyProvider {
  code: string
  name: string
  country: string
  currency: string
  logo: string
}

export interface CurrencyConversion {
  original_amount: number
  original_currency: string
  converted_amount: number
  target_currency: string
  rate: number
}

export class PaymentService {
  // Deposit operations
  static async initializeDeposit(amount: number, paymentMethod: string = 'card', phoneNumber?: string) {
    const payload: any = { 
      amount, 
      payment_method: paymentMethod
    }
    
    // Add phone number for mobile money payments
    if (phoneNumber) {
      payload.phone_number = phoneNumber
    }
    
    // Add provider for mobile money payments
    if (paymentMethod === 'mpesa' || paymentMethod === 'airtel_money') {
      // Map payment method to provider code
      payload.provider = paymentMethod === 'airtel_money' ? 'airtel' : 'mpesa'
    }
    
    const response = await api.post('/payments/deposit/initialize', payload)
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

  // Exchange rate operations
  static async getExchangeRates(): Promise<ExchangeRates> {
    const response = await api.get('/payments/exchange-rates')
    return response.data
  }

  static async convertCurrency(amount: number, fromCurrency: string = 'KES', toCurrency: string = 'USD'): Promise<CurrencyConversion> {
    const response = await api.post('/payments/convert-currency', {
      amount,
      from_currency: fromCurrency,
      to_currency: toCurrency
    })
    return response.data
  }

  // Mobile money operations
  static async getMobileMoneyProviders(): Promise<{ providers: MobileMoneyProvider[] }> {
    const response = await api.get('/payments/mobile-money-providers')
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
