import React, { useState } from 'react'
import { PhoneIcon, BanknotesIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface WithdrawProps {
  onClose: () => void
  onSuccess: (data: any) => void
  availableBalance: number
}

export default function Withdraw({ onClose, onSuccess, availableBalance }: WithdrawProps) {
  const [amount, setAmount] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [pin, setPin] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) < 10) {
      toast.error('Minimum withdrawal amount is KES 10')
      return
    }

    if (parseFloat(amount) > availableBalance) {
      toast.error('Insufficient wallet balance')
      return
    }

    if (!phoneNumber) {
      toast.error('Please enter your M-Pesa phone number')
      return
    }

    if (!pin || pin.length !== 4) {
      toast.error('Please enter your 4-digit wallet PIN')
      return
    }

    setIsLoading(true)

    try {
      // For now, simulate API call
      setTimeout(() => {
        toast.success('Withdrawal initiated successfully!')
        onSuccess({
          method: 'mpesa',
          amount: parseFloat(amount),
          phone: phoneNumber,
          reference: `WTH${Date.now()}`
        })
        onClose()
      }, 2000)
    } catch (error) {
      toast.error('Withdrawal failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Withdraw Money</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Available Balance */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="text-center">
            <p className="text-sm text-gray-600">Available Balance</p>
            <p className="text-2xl font-bold text-gray-900">KES {availableBalance.toLocaleString()}</p>
          </div>
        </div>

        {/* Amount Input */}
        <div className="mb-4">
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
            Withdrawal Amount (KES)
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
              min="10"
              max={availableBalance}
              step="100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Minimum: KES 10 | Maximum: KES {Math.min(70000, availableBalance).toLocaleString()}
          </p>
        </div>

        {/* Phone Number */}
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

        {/* Wallet PIN */}
        <div className="mb-6">
          <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-1">
            Wallet PIN
          </label>
          <input
            type="password"
            id="pin"
            className="input-field text-center text-lg tracking-widest"
            placeholder="****"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter your 4-digit wallet PIN to confirm
          </p>
        </div>

        {/* Withdrawal Info */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-2" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">Withdrawal Details</p>
              <p>Processing time: 1-3 business days</p>
              <p>Daily limit: KES 70,000 | Max withdrawals: 5 per day</p>
            </div>
          </div>
        </div>

        {/* Fee Information */}
        <div className="bg-gray-50 rounded-lg p-3 mb-6">
          <div className="flex justify-between text-sm">
            <span>Amount:</span>
            <span>KES {amount ? parseFloat(amount).toLocaleString() : '0'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Fee:</span>
            <span>KES {amount ? (parseFloat(amount) * 0.01).toFixed(2) : '0.00'}</span>
          </div>
          <div className="flex justify-between text-sm font-medium border-t pt-2">
            <span>Total:</span>
            <span>
              KES {amount ? (parseFloat(amount) * 1.01).toFixed(2) : '0.00'}
            </span>
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
            onClick={handleWithdraw}
            className="flex-1 btn-primary"
            disabled={isLoading || !amount || !phoneNumber || pin.length !== 4}
          >
            {isLoading ? 'Processing...' : 'Withdraw to M-Pesa'}
          </button>
        </div>
      </div>
    </div>
  )
}
