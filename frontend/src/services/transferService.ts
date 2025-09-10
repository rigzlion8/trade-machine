export interface TransferFee {
  percentage: number
  fixed: number
  minimum: number
  maximum: number
}

export interface TransferMethod {
  id: string
  name: string
  description: string
  icon: string
  minAmount: number
  maxAmount: number
  fee: TransferFee
  processingTime: string
  available: boolean
  type: 'bank' | 'crypto' | 'mpesa' | 'wallet'
}

export interface TransferRequest {
  from: string
  to: string
  amount: number
  method: string
  description?: string
}

export interface TransferResult {
  success: boolean
  transactionId: string
  reference: string
  amount: number
  fee: number
  total: number
  processingTime: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  message?: string
}

export class TransferService {
  private transferMethods: TransferMethod[] = [
    // Bank to Wallet
    {
      id: 'bank_to_wallet',
      name: 'Bank Transfer to Wallet',
      description: 'Transfer from your bank account to Trade Machine wallet',
      icon: 'banknotes',
      minAmount: 100,
      maxAmount: 100000,
      fee: { percentage: 0, fixed: 0, minimum: 0, maximum: 0 }, // No fee for bank to wallet
      processingTime: '1-3 business days',
      available: true,
      type: 'bank'
    },
    {
      id: 'card_to_wallet',
      name: 'Card to Wallet',
      description: 'Instant transfer from your card to wallet',
      icon: 'credit-card',
      minAmount: 50,
      maxAmount: 50000,
      fee: { percentage: 2.5, fixed: 0, minimum: 10, maximum: 1000 },
      processingTime: 'Instant',
      available: true,
      type: 'bank'
    },
    {
      id: 'mpesa_to_wallet',
      name: 'M-Pesa to Wallet',
      description: 'Transfer from M-Pesa to your wallet',
      icon: 'phone',
      minAmount: 100,
      maxAmount: 150000,
      fee: { percentage: 1.5, fixed: 0, minimum: 5, maximum: 500 },
      processingTime: 'Instant',
      available: true,
      type: 'bank'
    },
    
    // Wallet to Crypto
    {
      id: 'wallet_to_crypto',
      name: 'Wallet to Crypto',
      description: 'Convert KES to crypto and send to your crypto wallet',
      icon: 'currency-dollar',
      minAmount: 500,
      maxAmount: 1000000,
      fee: { percentage: 2.0, fixed: 0, minimum: 20, maximum: 2000 },
      processingTime: '5-15 minutes',
      available: true,
      type: 'crypto'
    },
    
    // Wallet to M-Pesa
    {
      id: 'wallet_to_mpesa',
      name: 'Wallet to M-Pesa',
      description: 'Send money from wallet to M-Pesa account',
      icon: 'phone',
      minAmount: 100,
      maxAmount: 150000,
      fee: { percentage: 1.0, fixed: 0, minimum: 5, maximum: 300 },
      processingTime: 'Instant',
      available: true,
      type: 'mpesa'
    },
    
    // Wallet to Bank
    {
      id: 'wallet_to_bank',
      name: 'Wallet to Bank',
      description: 'Transfer from wallet to your bank account',
      icon: 'banknotes',
      minAmount: 500,
      maxAmount: 500000,
      fee: { percentage: 1.5, fixed: 0, minimum: 10, maximum: 1000 },
      processingTime: '1-2 business days',
      available: true,
      type: 'bank'
    }
  ]

  getTransferMethods(type?: string): TransferMethod[] {
    if (type) {
      return this.transferMethods.filter(method => method.type === type)
    }
    return this.transferMethods
  }

  getTransferMethod(id: string): TransferMethod | undefined {
    return this.transferMethods.find(method => method.id === id)
  }

  calculateFee(amount: number, methodId: string): number {
    const method = this.getTransferMethod(methodId)
    if (!method) return 0

    const { fee } = method
    
    // Calculate percentage fee
    const percentageFee = (amount * fee.percentage) / 100
    
    // Add fixed fee
    const totalFee = percentageFee + fee.fixed
    
    // Apply minimum and maximum limits
    const finalFee = Math.max(fee.minimum, Math.min(fee.maximum, totalFee))
    
    return Math.round(finalFee * 100) / 100 // Round to 2 decimal places
  }

  calculateTotal(amount: number, methodId: string): number {
    const fee = this.calculateFee(amount, methodId)
    return amount + fee
  }

  async processTransfer(request: TransferRequest): Promise<TransferResult> {
    try {
      const method = this.getTransferMethod(request.method)
      if (!method) {
        throw new Error('Invalid transfer method')
      }

      // Validate amount
      if (request.amount < method.minAmount || request.amount > method.maxAmount) {
        throw new Error(`Amount must be between KES ${method.minAmount.toLocaleString()} and KES ${method.maxAmount.toLocaleString()}`)
      }

      const fee = this.calculateFee(request.amount, request.method)
      const total = this.calculateTotal(request.amount, request.method)

      // Generate transaction reference
      const reference = this.generateReference()
      const transactionId = this.generateTransactionId()

      // Simulate API call (replace with actual API call)
      await this.simulateProcessing(request.method)

      return {
        success: true,
        transactionId,
        reference,
        amount: request.amount,
        fee,
        total,
        processingTime: method.processingTime,
        status: 'completed',
        message: 'Transfer completed successfully'
      }
    } catch (error: any) {
      return {
        success: false,
        transactionId: '',
        reference: '',
        amount: request.amount,
        fee: 0,
        total: 0,
        processingTime: '0',
        status: 'failed',
        message: error.message || 'Transfer failed'
      }
    }
  }

  private generateReference(): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substr(2, 5)
    return `TM${timestamp}${random}`.toUpperCase()
  }

  private generateTransactionId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private async simulateProcessing(methodId: string): Promise<void> {
    // Simulate different processing times based on method
    const processingTimes: { [key: string]: number } = {
      'card_to_wallet': 1000,
      'mpesa_to_wallet': 1500,
      'wallet_to_mpesa': 2000,
      'wallet_to_crypto': 3000,
      'bank_to_wallet': 5000,
      'wallet_to_bank': 4000
    }

    const delay = processingTimes[methodId] || 2000
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  // Get fee breakdown for display
  getFeeBreakdown(amount: number, methodId: string) {
    const method = this.getTransferMethod(methodId)
    if (!method) return null

    const fee = this.calculateFee(amount, methodId)
    const total = this.calculateTotal(amount, methodId)

    return {
      amount,
      fee,
      total,
      feePercentage: method.fee.percentage,
      feeFixed: method.fee.fixed,
      feeMinimum: method.fee.minimum,
      feeMaximum: method.fee.maximum,
      method: method.name
    }
  }

  // Get available balance for different transfer types
  async getAvailableBalance(type: 'wallet' | 'crypto' | 'mpesa'): Promise<number> {
    // This would typically make API calls to get real balances
    // For now, return mock balances
    const mockBalances = {
      wallet: 50000,
      crypto: 0.5, // ETH
      mpesa: 25000
    }
    
    return mockBalances[type] || 0
  }
}

// Export singleton instance
export const transferService = new TransferService()
