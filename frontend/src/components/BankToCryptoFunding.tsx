import React, { useState } from 'react'
import { 
  BanknotesIcon, 
  CreditCardIcon, 
  ArrowRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface BankToCryptoFundingProps {
  onClose: () => void
  onSuccess?: (data: any) => void
}

interface FundingMethod {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  minAmount: number
  maxAmount: number
  fee: string
  processingTime: string
  available: boolean
}

export default function BankToCryptoFunding({ onClose, onSuccess }: BankToCryptoFundingProps) {
  const [selectedMethod, setSelectedMethod] = useState<FundingMethod | null>(null)
  const [amount, setAmount] = useState('')
  const [step, setStep] = useState<'select' | 'details' | 'confirm' | 'success'>('select')
  const [isProcessing, setIsProcessing] = useState(false)

  const fundingMethods: FundingMethod[] = [
    {
      id: 'bank_transfer',
      name: 'Bank Transfer',
      description: 'Direct transfer from your bank account',
      icon: <BanknotesIcon className="h-6 w-6" />,
      minAmount: 100,
      maxAmount: 10000,
      fee: '1.5%',
      processingTime: '1-3 business days',
      available: true
    },
    {
      id: 'credit_card',
      name: 'Credit/Debit Card',
      description: 'Instant purchase with your card',
      icon: <CreditCardIcon className="h-6 w-6" />,
      minAmount: 50,
      maxAmount: 5000,
      fee: '3.5%',
      processingTime: 'Instant',
      available: true
    },
    {
      id: 'mobile_money',
      name: 'M-Pesa',
      description: 'Transfer from your M-Pesa account',
      icon: <BanknotesIcon className="h-6 w-6" />,
      minAmount: 100,
      maxAmount: 150000,
      fee: '2%',
      processingTime: 'Instant',
      available: true
    }
  ]

  const handleMethodSelect = (method: FundingMethod) => {
    setSelectedMethod(method)
    setStep('details')
  }

  const handleConfirm = async () => {
    if (!selectedMethod || !amount) {
      toast.error('Please fill in all fields')
      return
    }

    setIsProcessing(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setStep('success')
      onSuccess?.({
        method: selectedMethod.name,
        amount: parseFloat(amount),
        fee: selectedMethod.fee,
        processingTime: selectedMethod.processingTime
      })
      
      toast.success('Funding request submitted successfully!')
    } catch (error) {
      console.error('Error processing funding:', error)
      toast.error('Failed to process funding request')
    } finally {
      setIsProcessing(false)
    }
  }

  const calculateFee = () => {
    if (!selectedMethod || !amount) return 0
    const feePercentage = parseFloat(selectedMethod.fee.replace('%', '')) / 100
    return parseFloat(amount) * feePercentage
  }

  const calculateTotal = () => {
    if (!amount) return 0
    return parseFloat(amount) + calculateFee()
  }

  if (step === 'success') {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white mx-4">
          <div className="text-center">
            <CheckCircleIcon className="mx-auto h-12 w-12 text-green-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Funding Request Submitted!
            </h3>
            <p className="text-gray-600 mb-6">
              Your request to fund your crypto wallet has been submitted. 
              You'll receive a confirmation email shortly.
            </p>
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
            <h3 className="text-lg font-medium text-gray-900">Confirm Funding</h3>
            <button
              onClick={() => setStep('details')}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Funding Details</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Method:</span>
                  <span className="text-sm font-medium text-gray-900">{selectedMethod?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Amount:</span>
                  <span className="text-sm font-medium text-gray-900">KES {parseFloat(amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Fee ({selectedMethod?.fee}):</span>
                  <span className="text-sm font-medium text-gray-900">KES {calculateFee().toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm font-medium text-gray-700">Total:</span>
                  <span className="text-sm font-bold text-gray-900">KES {calculateTotal().toLocaleString()}</span>
                </div>
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
                  'Confirm & Pay'
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
            <h3 className="text-lg font-medium text-gray-900">Funding Details</h3>
            <button
              onClick={() => setStep('select')}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="space-y-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="bg-blue-100 p-2 rounded-full mr-3">
                  {selectedMethod?.icon}
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
            </div>

            {amount && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Cost Breakdown</h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Amount:</span>
                    <span className="text-gray-900">KES {parseFloat(amount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Fee ({selectedMethod?.fee}):</span>
                    <span className="text-gray-900">KES {calculateFee().toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium border-t pt-1">
                    <span className="text-gray-700">Total:</span>
                    <span className="text-gray-900">KES {calculateTotal().toLocaleString()}</span>
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
                disabled={!amount || parseFloat(amount) < (selectedMethod?.minAmount || 0) || parseFloat(amount) > (selectedMethod?.maxAmount || 0)}
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
          <h3 className="text-lg font-medium text-gray-900">Fund Your Crypto Wallet</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">How it works</p>
                <p className="text-sm text-blue-700 mt-1">
                  Choose a funding method, enter the amount, and we'll convert it to crypto 
                  and add it to your connected wallet.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {fundingMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => handleMethodSelect(method)}
                disabled={!method.available}
                className="w-full p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="bg-gray-100 p-2 rounded-full mr-3">
                      {method.icon}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">{method.name}</p>
                      <p className="text-xs text-gray-500">{method.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Fee: {method.fee}</p>
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
