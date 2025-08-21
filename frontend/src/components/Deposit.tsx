import React, { useState } from 'react'
import { CreditCardIcon, PhoneIcon, BanknotesIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface DepositProps {
  onClose: () => void
  onSuccess: (data: any) => void
}

export default function Deposit({ onClose, onSuccess }: DepositProps) {
  const [amount, setAmount] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<'paystack' | 'mpesa'>('paystack')

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) < 100) {
      toast.error('Minimum deposit amount is KES 100')
      return
    }

    if (selectedMethod === 'mpesa' && !phoneNumber) {
      toast.error('Please enter your phone number for M-Pesa')
      return
    }

    setIsLoading(true)

    try {
      if (selectedMethod === 'paystack') {
        // For Paystack, we'd redirect to their payment page
        // For now, simulate success
        setTimeout(() => {
          toast.success('Redirecting to Paystack payment...')
          onSuccess({
            method: 'paystack',
            amount: parseFloat(amount),
            reference: `DEP${Date.now()}`
          })
          onClose()
        }, 2000)
      } else {
        // For M-Pesa, we'd make API call
        // For now, simulate success
        setTimeout(() => {
          toast.success('M-Pesa STK push sent to your phone!')
          onSuccess({
            method: 'mpesa',
            amount: parseFloat(amount),
            phone: phoneNumber,
            reference: `MPESA${Date.now()}`
          })
          onClose()
        }, 2000)
      }
    } catch (error) {
      toast.error('Deposit failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const paymentMethods = [
    {
      id: 'paystack',
      name: 'Paystack (Cards & Banks)',
      description: 'Pay with credit/debit cards or bank transfers',
      icon: CreditCardIcon,
      minAmount: 100,
      maxAmount: 1000000
    },
    {
      id: 'mpesa',
      name: 'M-Pesa Mobile Money',
      description: 'Pay with your M-Pesa account',
      icon: PhoneIcon,
      minAmount: 10,
      maxAmount: 70000
    }
  ]

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Deposit Money</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Payment Method Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select Payment Method
          </label>
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id as 'paystack' | 'mpesa')}
                className={`w-full p-3 border rounded-lg text-left transition-colors ${
                  selectedMethod === method.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <method.icon className="h-6 w-6 text-primary-600 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">{method.name}</p>
                    <p className="text-sm text-gray-500">{method.description}</p>
                    <p className="text-xs text-gray-400">
                      Min: KES {method.minAmount.toLocaleString()} | Max: KES {method.maxAmount.toLocaleString()}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Amount Input */}
        <div className="mb-4">
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
            Amount (KES)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
              KES
            </span>
            <input
              type="number"
              id="amount"
              className="input-field pl-16"
              placeholder="0.00"
              min={selectedMethod === 'mpesa' ? 10 : 100}
              step="100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {selectedMethod === 'mpesa' 
              ? 'Minimum: KES 10 | Maximum: KES 70,000'
              : 'Minimum: KES 100 | Maximum: KES 1,000,000'
            }
          </p>
        </div>

        {/* Phone Number for M-Pesa */}
        {selectedMethod === 'mpesa' && (
          <div className="mb-4">
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
              M-Pesa Phone Number
            </label>
            <div className="relative">
              <PhoneIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="tel"
                id="phoneNumber"
                className="input-field pl-10"
                placeholder="e.g., 0700123456"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Enter the phone number registered with M-Pesa
            </p>
          </div>
        )}

        {/* Payment Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
          <div className="flex">
            <BanknotesIcon className="h-5 w-5 text-blue-400 mr-2" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Payment Details</p>
              {selectedMethod === 'paystack' ? (
                <p>You will be redirected to a secure payment page</p>
              ) : (
                <p>You will receive an STK push on your phone</p>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 btn-secondary"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleDeposit}
            className="flex-1 btn-primary"
            disabled={isLoading || !amount || (selectedMethod === 'mpesa' && !phoneNumber)}
          >
            {isLoading ? 'Processing...' : `Deposit with ${selectedMethod === 'paystack' ? 'Paystack' : 'M-Pesa'}`}
          </button>
        </div>
      </div>
    </div>
  )
}
