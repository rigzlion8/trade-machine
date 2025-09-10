import React, { useState, useEffect } from 'react'
import { 
  ArrowUpIcon, 
  ArrowDownIcon, 
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { cryptoWalletService, SupportedToken, CryptoTransaction } from '../services/cryptoWallet'
import toast from 'react-hot-toast'

interface CryptoTransferProps {
  onClose: () => void
  onSuccess?: (transaction: CryptoTransaction) => void
  mode: 'send' | 'receive'
}

export default function CryptoTransfer({ onClose, onSuccess, mode }: CryptoTransferProps) {
  const [supportedTokens, setSupportedTokens] = useState<SupportedToken[]>([])
  const [selectedToken, setSelectedToken] = useState<SupportedToken | null>(null)
  const [recipientAddress, setRecipientAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [gasEstimate, setGasEstimate] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isEstimatingGas, setIsEstimatingGas] = useState(false)
  const [step, setStep] = useState<'form' | 'confirm' | 'success'>('form')

  useEffect(() => {
    loadSupportedTokens()
  }, [])

  useEffect(() => {
    if (selectedToken && recipientAddress && amount && mode === 'send') {
      estimateGas()
    }
  }, [selectedToken, recipientAddress, amount, mode])

  const loadSupportedTokens = async () => {
    try {
      const tokens = await cryptoWalletService.getSupportedTokens()
      setSupportedTokens(tokens)
      // Default to ETH
      const ethToken = tokens.find(token => token.symbol === 'ETH')
      if (ethToken) {
        setSelectedToken(ethToken)
      }
    } catch (error) {
      console.error('Error loading supported tokens:', error)
      toast.error('Failed to load supported tokens')
    }
  }

  const estimateGas = async () => {
    if (!selectedToken || !recipientAddress || !amount) return

    setIsEstimatingGas(true)
    try {
      const gas = await cryptoWalletService.estimateGas(
        recipientAddress,
        amount,
        selectedToken.address
      )
      setGasEstimate(gas)
    } catch (error) {
      console.error('Error estimating gas:', error)
      setGasEstimate('0')
    } finally {
      setIsEstimatingGas(false)
    }
  }

  const handleSend = async () => {
    if (!selectedToken || !recipientAddress || !amount) {
      toast.error('Please fill in all fields')
      return
    }

    setIsLoading(true)
    try {
      const transaction = await cryptoWalletService.sendCrypto(
        recipientAddress,
        amount,
        selectedToken.address
      )

      setStep('success')
      onSuccess?.(transaction)
      toast.success('Transaction sent successfully!')
    } catch (error: any) {
      console.error('Error sending crypto:', error)
      toast.error(error.message || 'Failed to send transaction')
    } finally {
      setIsLoading(false)
    }
  }

  const copyAddress = () => {
    const wallet = cryptoWalletService.getCurrentWallet()
    if (wallet?.address) {
      navigator.clipboard.writeText(wallet.address)
      toast.success('Address copied to clipboard!')
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const validateAddress = (address: string) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }

  const validateAmount = (amount: string, balance: string) => {
    const numAmount = parseFloat(amount)
    const numBalance = parseFloat(balance)
    return numAmount > 0 && numAmount <= numBalance
  }

  if (step === 'success') {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white mx-4">
          <div className="text-center">
            <CheckCircleIcon className="mx-auto h-12 w-12 text-green-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Transaction Successful!
            </h3>
            <p className="text-gray-600 mb-6">
              Your {mode === 'send' ? 'crypto has been sent' : 'address is ready to receive crypto'}
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

  if (mode === 'receive') {
    const wallet = cryptoWalletService.getCurrentWallet()
    
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white mx-4">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">Receive Crypto</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="space-y-6">
            <div className="text-center">
              <div className="bg-gray-100 p-4 rounded-lg mb-4">
                <p className="text-sm text-gray-600 mb-2">Your Wallet Address</p>
                <p className="text-lg font-mono text-gray-900 break-all">
                  {wallet?.address || 'Not connected'}
                </p>
              </div>
              
              <button
                onClick={copyAddress}
                className="btn-secondary flex items-center justify-center mx-auto"
              >
                <ArrowDownIcon className="h-5 w-5 mr-2" />
                Copy Address
              </button>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Important</p>
                  <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                    <li>• Only send supported tokens to this address</li>
                    <li>• Double-check the address before sending</li>
                    <li>• Transactions cannot be reversed</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Supported Tokens</h4>
              {supportedTokens.map((token) => (
                <div key={token.symbol} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <img
                      src={token.logo}
                      alt={token.name}
                      className="h-6 w-6 rounded-full mr-3"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/24x24?text=' + token.symbol
                      }}
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{token.symbol}</p>
                      <p className="text-xs text-gray-500">{token.name}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    {parseFloat(token.balance || '0').toFixed(4)}
                  </p>
                </div>
              ))}
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
          <h3 className="text-lg font-medium text-gray-900">Send Crypto</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Token Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Token
            </label>
            <select
              value={selectedToken?.symbol || ''}
              onChange={(e) => {
                const token = supportedTokens.find(t => t.symbol === e.target.value)
                setSelectedToken(token || null)
              }}
              className="input-field"
            >
              {supportedTokens.map((token) => (
                <option key={token.symbol} value={token.symbol}>
                  {token.symbol} - {token.name}
                </option>
              ))}
            </select>
          </div>

          {/* Recipient Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipient Address
            </label>
            <input
              type="text"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder="0x..."
              className="input-field"
            />
            {recipientAddress && !validateAddress(recipientAddress) && (
              <p className="text-red-600 text-sm mt-1">Invalid address format</p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                step="0.000001"
                className="input-field pr-20"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <span className="text-gray-500 text-sm">
                  {selectedToken?.symbol}
                </span>
              </div>
            </div>
            {selectedToken && (
              <p className="text-gray-500 text-sm mt-1">
                Balance: {parseFloat(selectedToken.balance || '0').toFixed(6)} {selectedToken.symbol}
              </p>
            )}
            {amount && selectedToken && !validateAmount(amount, selectedToken.balance || '0') && (
              <p className="text-red-600 text-sm mt-1">Insufficient balance</p>
            )}
          </div>

          {/* Gas Estimate */}
          {gasEstimate && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-600">
                Estimated Gas: {gasEstimate} units
                {isEstimatingGas && <span className="ml-2">(estimating...)</span>}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={
                isLoading ||
                !selectedToken ||
                !recipientAddress ||
                !amount ||
                !validateAddress(recipientAddress) ||
                !validateAmount(amount, selectedToken?.balance || '0')
              }
              className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <ArrowUpIcon className="h-4 w-4 mr-2" />
                  Send
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
