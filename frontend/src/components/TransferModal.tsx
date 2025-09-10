import React, { useState, useEffect } from 'react'
import { 
  BanknotesIcon, 
  CreditCardIcon, 
  PhoneIcon,
  CurrencyDollarIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { transferService, TransferMethod, TransferRequest, TransferResult } from '../services/transferService'
import toast from 'react-hot-toast'

interface TransferModalProps {
  onClose: () => void
  onSuccess?: (result: TransferResult) => void
  transferType?: 'bank_to_wallet' | 'wallet_to_crypto' | 'wallet_to_mpesa' | 'wallet_to_bank'
  availableBalance?: number
}

export default function TransferModal({ 
  onClose, 
  onSuccess, 
  transferType,
  availableBalance = 0 
}: TransferModalProps) {
  const [step, setStep] = useState<'select' | 'details' | 'confirm' | 'success'>('select')
  const [selectedMethod, setSelectedMethod] = useState<TransferMethod | null>(null)
  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState('')
  const [description, setDescription] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [transferResult, setTransferResult] = useState<TransferResult | null>(null)
  const [availableMethods, setAvailableMethods] = useState<TransferMethod[]>([])

  useEffect(() => {
    loadAvailableMethods()
  }, [transferType])

  const loadAvailableMethods = () => {
    let methods: TransferMethod[] = []
    
    if (transferType === 'bank_to_wallet') {
      methods = transferService.getTransferMethods('bank').filter(m => 
        m.id === 'bank_to_wallet' || m.id === 'card_to_wallet' || m.id === 'mpesa_to_wallet'
      )
    } else if (transferType === 'wallet_to_crypto') {
      methods = transferService.getTransferMethods('crypto')
    } else if (transferType === 'wallet_to_mpesa') {
      methods = transferService.getTransferMethods('mpesa')
    } else if (transferType === 'wallet_to_bank') {
      methods = transferService.getTransferMethods('bank').filter(m => m.id === 'wallet_to_bank')
    } else {
      // Show all methods
      methods = transferService.getTransferMethods()
    }
    
    setAvailableMethods(methods)
  }

  const handleMethodSelect = (method: TransferMethod) => {
    setSelectedMethod(method)
    setStep('details')
  }

  const handleConfirm = async () => {
    if (!selectedMethod || !amount || !recipient) {
      toast.error('Please fill in all required fields')
      return
    }

    const amountNum = parseFloat(amount)
    if (amountNum < selectedMethod.minAmount || amountNum > selectedMethod.maxAmount) {
      toast.error(`Amount must be between KES ${selectedMethod.minAmount.toLocaleString()} and KES ${selectedMethod.maxAmount.toLocaleString()}`)
      return
    }

    // Check available balance for wallet transfers
    if (selectedMethod.type === 'crypto' || selectedMethod.type === 'mpesa' || selectedMethod.id === 'wallet_to_bank') {
      const total = transferService.calculateTotal(amountNum, selectedMethod.id)
      if (total > availableBalance) {
        toast.error('Insufficient balance in your wallet')
        return
      }
    }

    setIsProcessing(true)
    try {
      const request: TransferRequest = {
        from: 'user_wallet',
        to: recipient,
        amount: amountNum,
        method: selectedMethod.id,
        description: description || undefined
      }

      const result = await transferService.processTransfer(request)
      setTransferResult(result)
      
      if (result.success) {
        setStep('success')
        onSuccess?.(result)
        toast.success('Transfer completed successfully!')
      } else {
        toast.error(result.message || 'Transfer failed')
      }
    } catch (error: any) {
      console.error('Transfer error:', error)
      toast.error(error.message || 'Transfer failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const getIcon = (iconName: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      'banknotes': <BanknotesIcon className="h-6 w-6" />,
      'credit-card': <CreditCardIcon className="h-6 w-6" />,
      'phone': <PhoneIcon className="h-6 w-6" />,
      'currency-dollar': <CurrencyDollarIcon className="h-6 w-6" />
    }
    return iconMap[iconName] || <BanknotesIcon className="h-6 w-6" />
  }

  const getRecipientPlaceholder = () => {
    if (!selectedMethod) return 'Enter recipient details'
    
    switch (selectedMethod.id) {
      case 'wallet_to_crypto':
        return 'Enter crypto wallet address (0x...)'
      case 'wallet_to_mpesa':
        return 'Enter M-Pesa phone number (e.g., 254700000000)'
      case 'wallet_to_bank':
        return 'Enter bank account number'
      case 'bank_to_wallet':
      case 'card_to_wallet':
      case 'mpesa_to_wallet':
        return 'Your wallet will be credited'
      default:
        return 'Enter recipient details'
    }
  }

  const getRecipientLabel = () => {
    if (!selectedMethod) return 'Recipient'
    
    switch (selectedMethod.id) {
      case 'wallet_to_crypto':
        return 'Crypto Wallet Address'
      case 'wallet_to_mpesa':
        return 'M-Pesa Phone Number'
      case 'wallet_to_bank':
        return 'Bank Account Number'
      case 'bank_to_wallet':
      case 'card_to_wallet':
      case 'mpesa_to_wallet':
        return 'Destination'
      default:
        return 'Recipient'
    }
  }

  const isRecipientRequired = () => {
    if (!selectedMethod) return true
    return !['bank_to_wallet', 'card_to_wallet', 'mpesa_to_wallet'].includes(selectedMethod.id)
  }

  const feeBreakdown = selectedMethod && amount ? 
    transferService.getFeeBreakdown(parseFloat(amount), selectedMethod.id) : null

  if (step === 'success' && transferResult) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white mx-4">
          <div className="text-center">
            <CheckCircleIcon className="mx-auto h-12 w-12 text-green-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Transfer Successful!
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Reference:</span>
                  <span className="font-mono font-medium">{transferResult.reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium">KES {transferResult.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fee:</span>
                  <span className="font-medium">KES {transferResult.fee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-700 font-medium">Total:</span>
                  <span className="font-bold">KES {transferResult.total.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="btn-primary"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'confirm') {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white mx-4">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">Confirm Transfer</h3>
            <button
              onClick={() => setStep('details')}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Transfer Details</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Method:</span>
                  <span className="text-sm font-medium text-gray-900">{selectedMethod?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Recipient:</span>
                  <span className="text-sm font-medium text-gray-900">{recipient}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Amount:</span>
                  <span className="text-sm font-medium text-gray-900">KES {parseFloat(amount).toLocaleString()}</span>
                </div>
                {feeBreakdown && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Fee ({feeBreakdown.feePercentage}%):</span>
                      <span className="text-sm font-medium text-gray-900">KES {feeBreakdown.fee.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-sm font-medium text-gray-700">Total:</span>
                      <span className="text-sm font-bold text-gray-900">KES {feeBreakdown.total.toLocaleString()}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Processing Time:</span>
                  <span className="text-sm font-medium text-gray-900">{selectedMethod?.processingTime}</span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Important Notice</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    By proceeding, you agree to our terms and conditions. 
                    This transaction cannot be cancelled once initiated.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setStep('details')}
                className="flex-1 btn-secondary"
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={isProcessing}
                className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  'Confirm & Transfer'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'details') {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white mx-4">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">Transfer Details</h3>
            <button
              onClick={() => setStep('select')}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="bg-blue-100 p-2 rounded-full mr-3">
                  {selectedMethod && getIcon(selectedMethod.icon)}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-blue-900">{selectedMethod?.name}</h4>
                  <p className="text-xs text-blue-700">{selectedMethod?.description}</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (KES)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                min={selectedMethod?.minAmount}
                max={selectedMethod?.maxAmount}
                className="input-field"
              />
              <p className="text-xs text-gray-500 mt-1">
                Min: KES {selectedMethod?.minAmount.toLocaleString()} | 
                Max: KES {selectedMethod?.maxAmount.toLocaleString()}
              </p>
              {availableBalance > 0 && (selectedMethod?.type === 'crypto' || selectedMethod?.type === 'mpesa' || selectedMethod?.id === 'wallet_to_bank') && (
                <p className="text-xs text-gray-500 mt-1">
                  Available: KES {availableBalance.toLocaleString()}
                </p>
              )}
            </div>

            {isRecipientRequired() && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {getRecipientLabel()}
                </label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder={getRecipientPlaceholder()}
                  className="input-field"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a note for this transfer"
                className="input-field"
              />
            </div>

            {feeBreakdown && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Cost Breakdown</h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Amount:</span>
                    <span className="text-gray-900">KES {feeBreakdown.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Fee ({feeBreakdown.feePercentage}%):</span>
                    <span className="text-gray-900">KES {feeBreakdown.fee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium border-t pt-1">
                    <span className="text-gray-700">Total:</span>
                    <span className="text-gray-900">KES {feeBreakdown.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => setStep('select')}
                className="flex-1 btn-secondary"
              >
                Back
              </button>
              <button
                onClick={() => setStep('confirm')}
                disabled={!amount || !recipient || (isRecipientRequired() && !recipient)}
                className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white mx-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Transfer Money</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">Transfer Options</p>
                <p className="text-sm text-blue-700 mt-1">
                  Choose your preferred transfer method. Fees are clearly displayed for each option.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {availableMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => handleMethodSelect(method)}
                disabled={!method.available}
                className="w-full p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="bg-gray-100 p-2 rounded-full mr-3">
                      {getIcon(method.icon)}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">{method.name}</p>
                      <p className="text-xs text-gray-500">{method.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      Fee: {method.fee.percentage > 0 ? `${method.fee.percentage}%` : 'Free'}
                    </p>
                    <p className="text-xs text-gray-500">{method.processingTime}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
