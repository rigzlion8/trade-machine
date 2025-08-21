import React, { useState } from 'react'
import { PhoneIcon, UserIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { WalletService } from '../services/api'
import toast from 'react-hot-toast'

interface P2PTransferProps {
  onClose: () => void
  onSuccess: (data: any) => void
}

export default function P2PTransfer({ onClose, onSuccess }: P2PTransferProps) {
  const [formData, setFormData] = useState({
    recipientPhone: '',
    amount: '',
    description: '',
    pin: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState(1) // 1: details, 2: confirmation, 3: success

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      // Validate form data
      if (!formData.recipientPhone || !formData.amount || !formData.pin) {
        toast.error('Please fill in all required fields')
        setIsLoading(false)
        return
      }

      // Move to confirmation step
      setStep(2)
    } catch (error) {
      toast.error('Error processing transfer request')
      console.error('Transfer error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirm = async () => {
    setIsLoading(true)
    
    try {
      // Call real API
      const response = await WalletService.p2pTransfer({
        recipient_phone: formData.recipientPhone,
        amount: parseFloat(formData.amount),
        description: formData.description,
        pin: formData.pin
      })

      toast.success('Transfer completed successfully!')
      setStep(3)
      onSuccess({
        transaction_id: response.transaction_id,
        amount: parseFloat(formData.amount),
        recipient_phone: formData.recipientPhone,
        reference: response.reference
      })
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Transfer failed. Please try again.'
      toast.error(errorMessage)
      console.error('Transfer error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatPhoneNumber = (phone: string) => {
    if (phone.startsWith('0')) {
      return '+254' + phone.slice(1)
    }
    if (!phone.startsWith('+254')) {
      return '+254' + phone
    }
    return phone
  }

  if (step === 3) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Transfer Successful!</h3>
          <p className="text-sm text-gray-600 mb-6">
            KES {formData.amount} has been sent to {formatPhoneNumber(formData.recipientPhone)}
          </p>
          <button
            onClick={onClose}
            className="w-full btn-primary"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  if (step === 2) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Transfer</h3>
          
          <div className="space-y-4 mb-6">
            <div className="flex justify-between">
              <span className="text-gray-600">Recipient:</span>
              <span className="font-medium">{formatPhoneNumber(formData.recipientPhone)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Amount:</span>
              <span className="font-medium">KES {parseFloat(formData.amount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Fee:</span>
              <span className="font-medium">KES {(parseFloat(formData.amount) * 0.005).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-900 font-medium">Total:</span>
              <span className="text-gray-900 font-bold">
                KES {(parseFloat(formData.amount) * 1.005).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-1">
                Enter Wallet PIN
              </label>
              <input
                type="password"
                id="pin"
                maxLength={4}
                className="input-field text-center text-lg tracking-widest"
                placeholder="****"
                value={formData.pin}
                onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 btn-secondary"
                disabled={isLoading}
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 btn-primary"
                disabled={isLoading || formData.pin.length !== 4}
              >
                {isLoading ? 'Processing...' : 'Confirm Transfer'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Send Money</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="recipientPhone" className="block text-sm font-medium text-gray-700 mb-1">
              Recipient Phone Number
            </label>
            <div className="relative">
              <PhoneIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="tel"
                id="recipientPhone"
                className="input-field pl-10"
                placeholder="e.g., 0700123456"
                value={formData.recipientPhone}
                onChange={(e) => setFormData({ ...formData, recipientPhone: e.target.value })}
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Enter phone number with or without country code
            </p>
          </div>

          <div>
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
                min="100"
                step="100"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Minimum amount: KES 100
            </p>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              id="description"
              className="input-field"
              placeholder="What's this for?"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-2" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Transfer Fee: 0.5%</p>
                <p>Daily limit: KES 100,000 | Max transfers: 10 per day</p>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 btn-primary"
              disabled={isLoading || !formData.recipientPhone || !formData.amount}
            >
              {isLoading ? 'Processing...' : 'Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
