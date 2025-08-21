import React, { useState } from 'react'
import { BanknotesIcon, BuildingOfficeIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { WalletService } from '../services/api'
import toast from 'react-hot-toast'

interface BankTransferProps {
  onClose: () => void
  onSuccess: (data: any) => void
}

const KENYAN_BANKS = [
  { code: 'EQUITY', name: 'Equity Bank', logo: '🏦' },
  { code: 'KCB', name: 'KCB Bank', logo: '🏛️' },
  { code: 'COOP', name: 'Co-operative Bank', logo: '🏢' },
  { code: 'ABSA', name: 'ABSA Bank', logo: '🏦' },
  { code: 'STANBIC', name: 'Stanbic Bank', logo: '🏛️' },
  { code: 'NCBA', name: 'NCBA Bank', logo: '🏢' },
  { code: 'DTB', name: 'Diamond Trust Bank', logo: '🏦' },
  { code: 'HF', name: 'Housing Finance', logo: '🏛️' },
  { code: 'IM', name: 'I&M Bank', logo: '🏢' },
  { code: 'CFC', name: 'CFC Stanbic', logo: '🏦' },
]

export default function BankTransfer({ onClose, onSuccess }: BankTransferProps) {
  const [formData, setFormData] = useState({
    bankCode: '',
    accountNumber: '',
    accountName: '',
    amount: '',
    description: '',
    pin: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState(1) // 1: details, 2: confirmation, 3: success
  const [selectedBank, setSelectedBank] = useState<any>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      // Validate form data
      if (!selectedBank || !formData.accountNumber || !formData.accountName || !formData.amount) {
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
      const response = await WalletService.bankTransfer({
        bank_code: selectedBank.code,
        account_number: formData.accountNumber,
        account_name: formData.accountName,
        amount: parseFloat(formData.amount),
        description: formData.description,
        pin: formData.pin
      })

      toast.success('Bank transfer initiated successfully!')
      setStep(3)
      onSuccess({
        transaction_id: response.transaction_id,
        amount: parseFloat(formData.amount),
        bank: selectedBank?.name,
        account_number: formData.accountNumber,
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

  const handleBankSelect = (bank: any) => {
    setSelectedBank(bank)
    setFormData({ ...formData, bankCode: bank.code })
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">Bank Transfer Initiated!</h3>
          <p className="text-sm text-gray-600 mb-6">
            KES {formData.amount} will be sent to {selectedBank?.name} account {formData.accountNumber}
          </p>
          <p className="text-xs text-gray-500 mb-6">
            Bank transfers typically take 1-3 business days to complete.
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
          <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Bank Transfer</h3>
          
          <div className="space-y-4 mb-6">
            <div className="flex justify-between">
              <span className="text-gray-600">Bank:</span>
              <span className="font-medium">{selectedBank?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Account Number:</span>
              <span className="font-medium">{formData.accountNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Account Name:</span>
              <span className="font-medium">{formData.accountName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Amount:</span>
              <span className="font-medium">KES {parseFloat(formData.amount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Fee:</span>
              <span className="font-medium">KES {(parseFloat(formData.amount) * 0.01).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-900 font-medium">Total:</span>
              <span className="text-gray-900 font-bold">
                KES {(parseFloat(formData.amount) * 1.01).toFixed(2)}
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
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Bank Transfer</h3>
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
          {/* Bank Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Bank
            </label>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
              {KENYAN_BANKS.map((bank) => (
                <button
                  key={bank.code}
                  type="button"
                  onClick={() => handleBankSelect(bank)}
                  className={`flex items-center p-3 border rounded-lg text-left transition-colors ${
                    selectedBank?.code === bank.code
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl mr-3">{bank.logo}</span>
                  <span className="font-medium text-gray-900">{bank.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Account Details */}
          <div>
            <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Account Number
            </label>
            <input
              type="text"
              id="accountNumber"
              className="input-field"
              placeholder="Enter account number"
              value={formData.accountNumber}
              onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
              required
            />
          </div>

          <div>
            <label htmlFor="accountName" className="block text-sm font-medium text-gray-700 mb-1">
              Account Holder Name
            </label>
            <input
              type="text"
              id="accountName"
              className="input-field"
              placeholder="Enter account holder name"
              value={formData.accountName}
              onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
              required
            />
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
                min="1000"
                step="100"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Minimum amount: KES 1,000
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
              placeholder="What's this transfer for?"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Transfer Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex">
              <BuildingOfficeIcon className="h-5 w-5 text-blue-400 mr-2" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Bank Transfer Details</p>
                <p>Transfer fee: 1% | Processing time: 1-3 business days</p>
                <p>Daily limit: KES 500,000 | Max transfers: 5 per day</p>
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
              disabled={isLoading || !selectedBank || !formData.accountNumber || !formData.accountName || !formData.amount}
            >
              {isLoading ? 'Processing...' : 'Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
