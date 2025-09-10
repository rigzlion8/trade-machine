import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { 
  CurrencyDollarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CreditCardIcon,
  BanknotesIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import CryptoWalletConnection from '../components/CryptoWalletConnection'
import CryptoTransfer from '../components/CryptoTransfer'
import TransferModal from '../components/TransferModal'
import { cryptoWalletService, CryptoWallet } from '../services/cryptoWallet'
import { useWebSocket } from '../hooks/useWebSocket'
import toast from 'react-hot-toast'

export default function Crypto() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [showCryptoTransfer, setShowCryptoTransfer] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [transferType, setTransferType] = useState<'bank_to_wallet' | 'wallet_to_crypto' | 'wallet_to_mpesa' | 'wallet_to_bank' | undefined>()
  const [cryptoTransferMode, setCryptoTransferMode] = useState<'send' | 'receive'>('send')
  const [cryptoWallet, setCryptoWallet] = useState<CryptoWallet | null>(null)
  const [cryptoTransactions, setCryptoTransactions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Use optimized WebSocket hook for real-time crypto updates
  const { status: wsStatus } = useWebSocket({
    autoConnect: true,
    callbacks: {
      onBalanceUpdate: (data) => {
        // Update crypto wallet data when balance changes
        if (cryptoWallet) {
          setCryptoWallet(prev => prev ? { ...prev, balance: data.balance } : null)
        }
      }
    }
  })

  useEffect(() => {
    if (user) {
      loadCryptoTransactions()
    }
  }, [user])

  const loadCryptoTransactions = async () => {
    try {
      setIsLoading(true)
      // Mock crypto transactions - replace with actual API call
      const mockTransactions = [
        {
          id: '1',
          type: 'send',
          amount: '0.5',
          token: 'ETH',
          to: '0x742d35Cc6634C0532925a3b8D',
          status: 'confirmed',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          hash: '0x1234567890abcdef...',
          fee: '0.001'
        },
        {
          id: '2',
          type: 'receive',
          amount: '100',
          token: 'USDT',
          from: '0x9876543210fedcba...',
          status: 'confirmed',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          hash: '0xabcdef1234567890...',
          fee: '0'
        },
        {
          id: '3',
          type: 'send',
          amount: '0.1',
          token: 'ETH',
          to: '0x5555555555555555...',
          status: 'pending',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          hash: '0x5555555555555555...',
          fee: '0.002'
        }
      ]
      setCryptoTransactions(mockTransactions)
    } catch (error) {
      console.error('Error loading crypto transactions:', error)
      toast.error('Failed to load crypto transactions')
    } finally {
      setIsLoading(false)
    }
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'transactions', name: 'Transactions', icon: ClockIcon },
    { id: 'send', name: 'Send Crypto', icon: ArrowUpIcon },
    { id: 'receive', name: 'Receive Crypto', icon: ArrowDownIcon },
    { id: 'fund', name: 'Fund Wallet', icon: CreditCardIcon },
  ]

  const handleCryptoWalletConnected = (wallet: CryptoWallet) => {
    setCryptoWallet(wallet)
    toast.success('Crypto wallet connected successfully!')
  }

  const handleCryptoWalletDisconnected = () => {
    setCryptoWallet(null)
    toast.success('Crypto wallet disconnected')
  }

  const handleCryptoTransferSuccess = (transaction: any) => {
    toast.success('Crypto transaction completed!')
    setShowCryptoTransfer(false)
    loadCryptoTransactions() // Refresh transactions
  }

  const handleTransferSuccess = (result: any) => {
    toast.success('Transfer completed successfully!')
    setShowTransferModal(false)
    loadCryptoTransactions() // Refresh transactions
  }

  const openCryptoTransfer = (mode: 'send' | 'receive') => {
    setCryptoTransferMode(mode)
    setShowCryptoTransfer(true)
  }

  const openTransferModal = (type: 'bank_to_wallet' | 'wallet_to_crypto' | 'wallet_to_mpesa' | 'wallet_to_bank') => {
    setTransferType(type)
    setShowTransferModal(true)
  }

  const formatTransactionType = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'send': 'Sent',
      'receive': 'Received',
      'swap': 'Swapped',
      'stake': 'Staked',
      'unstake': 'Unstaked'
    }
    return typeMap[type] || type
  }

  const formatTransactionStatus = (status: string) => {
    const statusMap: { [key: string]: { text: string; color: string } } = {
      'confirmed': { text: 'Confirmed', color: 'text-green-600' },
      'pending': { text: 'Pending', color: 'text-yellow-600' },
      'failed': { text: 'Failed', color: 'text-red-600' }
    }
    return statusMap[status] || { text: status, color: 'text-gray-600' }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">Please log in to access your crypto wallet.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-primary-600 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Crypto Wallet</h1>
              <p className="text-primary-100">Manage your cryptocurrency assets</p>
              {/* Real-time Connection Status */}
              <div className="flex items-center mt-2">
                <div className={`w-2 h-2 rounded-full mr-2 ${wsStatus.isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className="text-xs text-primary-200">
                  {wsStatus.isConnected ? 'Live Updates Connected' : 'Connecting...'}
                </span>
                {wsStatus.isConnected && (
                  <div className={`w-2 h-2 rounded-full ml-2 ${wsStatus.isHealthy ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-primary-200">User ID</p>
              <p className="text-lg font-mono font-bold">{user.id?.slice(-8) || '12345678'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow mb-6">
          <nav className="overflow-x-auto scrollbar-hide px-4 sm:px-6">
            <div className="flex space-x-6 sm:space-x-8 min-w-max">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                    <span className="text-xs sm:text-sm">{tab.name}</span>
                  </button>
                )
              })}
            </div>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Crypto Overview</h3>
              
              {/* Crypto Wallet Connection */}
              <CryptoWalletConnection
                onWalletConnected={handleCryptoWalletConnected}
                onWalletDisconnected={handleCryptoWalletDisconnected}
              />

              {/* Quick Actions */}
              {cryptoWallet && (
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-900">Quick Actions</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button
                      onClick={() => openCryptoTransfer('send')}
                      className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
                    >
                      <ArrowUpIcon className="h-8 w-8 text-primary-600 mr-3" />
                      <div className="text-left">
                        <p className="font-medium text-gray-900">Send Crypto</p>
                        <p className="text-sm text-gray-500">Send to any address</p>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => openCryptoTransfer('receive')}
                      className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-success-300 hover:bg-success-50 transition-colors"
                    >
                      <ArrowDownIcon className="h-8 w-8 text-success-600 mr-3" />
                      <div className="text-left">
                        <p className="font-medium text-gray-900">Receive Crypto</p>
                        <p className="text-sm text-gray-500">Get your address</p>
                      </div>
                    </button>

                    <button
                      onClick={() => openTransferModal('wallet_to_crypto')}
                      className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <CreditCardIcon className="h-8 w-8 text-blue-600 mr-3" />
                      <div className="text-left">
                        <p className="font-medium text-gray-900">Buy Crypto</p>
                        <p className="text-sm text-gray-500">Convert KES to crypto</p>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => openTransferModal('bank_to_wallet')}
                      className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors"
                    >
                      <BanknotesIcon className="h-8 w-8 text-purple-600 mr-3" />
                      <div className="text-left">
                        <p className="font-medium text-gray-900">Fund Wallet</p>
                        <p className="text-sm text-gray-500">Add KES to wallet</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Recent Transactions Preview */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900">Recent Transactions</h4>
                {cryptoTransactions.length > 0 ? (
                  <div className="space-y-3">
                    {cryptoTransactions.slice(0, 3).map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <div className={`p-2 rounded-full mr-3 ${
                            transaction.type === 'send' ? 'bg-red-100' : 'bg-green-100'
                          }`}>
                            {transaction.type === 'send' ? (
                              <ArrowUpIcon className="h-4 w-4 text-red-600" />
                            ) : (
                              <ArrowDownIcon className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {formatTransactionType(transaction.type)} {transaction.amount} {transaction.token}
                            </p>
                            <p className="text-xs text-gray-500">
                              {transaction.type === 'send' ? 'To' : 'From'}: {formatAddress(transaction.to || transaction.from)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-xs font-medium ${formatTransactionStatus(transaction.status).color}`}>
                            {formatTransactionStatus(transaction.status).text}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(transaction.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ClockIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">No transactions yet</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Crypto Transactions</h3>
              
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Loading transactions...</p>
                </div>
              ) : cryptoTransactions.length > 0 ? (
                <div className="space-y-3">
                  {cryptoTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center">
                        <div className={`p-3 rounded-full mr-4 ${
                          transaction.type === 'send' ? 'bg-red-100' : 'bg-green-100'
                        }`}>
                          {transaction.type === 'send' ? (
                            <ArrowUpIcon className="h-5 w-5 text-red-600" />
                          ) : (
                            <ArrowDownIcon className="h-5 w-5 text-green-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {formatTransactionType(transaction.type)} {transaction.amount} {transaction.token}
                          </p>
                          <p className="text-xs text-gray-500">
                            {transaction.type === 'send' ? 'To' : 'From'}: {formatAddress(transaction.to || transaction.from)}
                          </p>
                          <p className="text-xs text-gray-500">
                            Hash: {formatAddress(transaction.hash)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${formatTransactionStatus(transaction.status).color}`}>
                          {formatTransactionStatus(transaction.status).text}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(transaction.timestamp).toLocaleString()}
                        </p>
                        {transaction.fee && transaction.fee !== '0' && (
                          <p className="text-xs text-gray-500">
                            Fee: {transaction.fee} ETH
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <ClockIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Transactions</h3>
                  <p className="text-gray-500 mb-6">You haven't made any crypto transactions yet.</p>
                  <button
                    onClick={() => openCryptoTransfer('send')}
                    className="btn-primary"
                  >
                    Send Your First Transaction
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'send' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Send Crypto</h3>
              <p className="text-gray-600">Send cryptocurrency to any address</p>
              
              {cryptoWallet ? (
                <div className="text-center py-8">
                  <ArrowUpIcon className="mx-auto h-16 w-16 text-primary-600 mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Ready to Send</h4>
                  <p className="text-gray-500 mb-6">Click the button below to start sending crypto</p>
                  <button
                    onClick={() => openCryptoTransfer('send')}
                    className="btn-primary"
                  >
                    Send Crypto
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <ExclamationTriangleIcon className="mx-auto h-16 w-16 text-yellow-500 mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Connect Your Wallet</h4>
                  <p className="text-gray-500 mb-6">You need to connect your crypto wallet first</p>
                  <CryptoWalletConnection
                    onWalletConnected={handleCryptoWalletConnected}
                    onWalletDisconnected={handleCryptoWalletDisconnected}
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'receive' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Receive Crypto</h3>
              <p className="text-gray-600">Share your wallet address to receive cryptocurrency</p>
              
              {cryptoWallet ? (
                <div className="text-center py-8">
                  <ArrowDownIcon className="mx-auto h-16 w-16 text-success-600 mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Ready to Receive</h4>
                  <p className="text-gray-500 mb-6">Click the button below to get your wallet address</p>
                  <button
                    onClick={() => openCryptoTransfer('receive')}
                    className="btn-primary"
                  >
                    Get Address
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <ExclamationTriangleIcon className="mx-auto h-16 w-16 text-yellow-500 mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Connect Your Wallet</h4>
                  <p className="text-gray-500 mb-6">You need to connect your crypto wallet first</p>
                  <CryptoWalletConnection
                    onWalletConnected={handleCryptoWalletConnected}
                    onWalletDisconnected={handleCryptoWalletDisconnected}
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'fund' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Fund Your Wallet</h3>
              <p className="text-gray-600">Add funds to your wallet to buy crypto</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <button
                  onClick={() => openTransferModal('bank_to_wallet')}
                  className="flex items-center p-6 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
                >
                  <BanknotesIcon className="h-12 w-12 text-primary-600 mr-4" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Fund with Bank</p>
                    <p className="text-sm text-gray-500">Transfer from bank account</p>
                    <p className="text-xs text-green-600 mt-1">Free transfer</p>
                  </div>
                </button>
                
                <button
                  onClick={() => openTransferModal('wallet_to_crypto')}
                  className="flex items-center p-6 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <CreditCardIcon className="h-12 w-12 text-blue-600 mr-4" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Buy Crypto</p>
                    <p className="text-sm text-gray-500">Convert KES to crypto</p>
                    <p className="text-xs text-blue-600 mt-1">2% fee</p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Crypto Transfer Modal */}
      {showCryptoTransfer && (
        <CryptoTransfer
          onClose={() => setShowCryptoTransfer(false)}
          onSuccess={handleCryptoTransferSuccess}
          mode={cryptoTransferMode}
        />
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <TransferModal
          onClose={() => setShowTransferModal(false)}
          onSuccess={handleTransferSuccess}
          transferType={transferType}
          availableBalance={50000} // Mock balance - replace with actual balance
        />
      )}
    </div>
  )
}
