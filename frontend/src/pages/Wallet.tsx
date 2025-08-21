import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { 
  WalletIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CreditCardIcon,
  PhoneIcon,
  BanknotesIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import P2PTransfer from '../components/P2PTransfer'
import BankTransfer from '../components/BankTransfer'
import Deposit from '../components/Deposit'
import Withdraw from '../components/Withdraw'
import { WalletService } from '../services/api'
import { initializeWebSocket, getWebSocketService, disconnectWebSocket } from '../services/websocket'
import toast from 'react-hot-toast'

export default function Wallet() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [showP2PTransfer, setShowP2PTransfer] = useState(false)
  const [showBankTransfer, setShowBankTransfer] = useState(false)
  const [showDeposit, setShowDeposit] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [walletData, setWalletData] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [wsConnected, setWsConnected] = useState(false)

  useEffect(() => {
    if (user) {
      loadWalletData()
      loadTransactions()
      
      // Initialize WebSocket connection for real-time updates
      const token = localStorage.getItem('access_token')
      if (token) {
        const wsService = initializeWebSocket(
          (import.meta as any).env.VITE_API_URL || 'http://localhost:8000',
          token,
          user.id,
          {
            onBalanceUpdate: (data) => {
              // Update wallet data in real-time
              setWalletData(prev => ({
                ...prev,
                balance_kes: data.balance_kes,
                balance_usdt: data.balance_usdt
              }))
            },
            onTransactionNotification: (data) => {
              // Add new transaction to the list
              if (data.transaction) {
                setTransactions(prev => [data.transaction, ...prev.slice(0, 9)])
              }
            },
            onConnectionEstablished: (data) => {
              console.log('WebSocket connected:', data)
              setWsConnected(true)
              // Subscribe to transaction updates
              const ws = getWebSocketService()
              if (ws) {
                ws.subscribeToTransactions()
              }
            },
            onDisconnect: () => {
              console.log('WebSocket disconnected')
              setWsConnected(false)
            }
          }
        )
        
        // Connect to WebSocket
        wsService.connect()
      }
    }
    
    // Cleanup WebSocket on unmount
    return () => {
      disconnectWebSocket()
    }
  }, [user])

  const loadWalletData = async () => {
    try {
      setIsLoading(true)
      const data = await WalletService.getBalance()
      setWalletData(data)
    } catch (error) {
      console.error('Error loading wallet data:', error)
      toast.error('Failed to load wallet data')
    } finally {
      setIsLoading(false)
    }
  }

  const loadTransactions = async () => {
    try {
      const data = await WalletService.getTransactions(10, 0)
      setTransactions(data)
    } catch (error) {
      console.error('Error loading transactions:', error)
      toast.error('Failed to load transactions')
    }
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Please log in to access your wallet.</p>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: WalletIcon },
    { id: 'transactions', name: 'Transactions', icon: ClockIcon },
    { id: 'send', name: 'Send Money', icon: ArrowUpIcon },
    { id: 'receive', name: 'Receive', icon: ArrowDownIcon },
  ]

  const handleTransferSuccess = async (data: any) => {
    // Refresh wallet data after successful transfer
    await loadWalletData()
    await loadTransactions()
    
    // Close the modal
    setShowP2PTransfer(false)
    setShowBankTransfer(false)
    
    // Show success message
    toast.success(`Transfer completed! Reference: ${data.reference}`)
  }

  const formatTransactionType = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'p2p_send': 'Sent to Phone',
      'p2p_receive': 'Received from Phone',
      'bank_transfer': 'Bank Transfer',
      'bank_receive': 'Bank Receive',
      'mpesa_send': 'M-Pesa Send',
      'mpesa_receive': 'M-Pesa Receive'
    }
    return typeMap[type] || type
  }

  const formatTransactionStatus = (status: string) => {
    const statusMap: { [key: string]: { text: string; color: string } } = {
      'completed': { text: 'Completed', color: 'bg-success-500' },
      'pending': { text: 'Pending', color: 'bg-warning-500' },
      'failed': { text: 'Failed', color: 'bg-red-500' },
      'cancelled': { text: 'Cancelled', color: 'bg-gray-500' }
    }
    return statusMap[status] || { text: status, color: 'bg-gray-500' }
  }

  return (
    <div className="space-y-6">
      {/* Wallet Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Wallet</h1>
            <p className="text-primary-100">Manage your money securely</p>
            {/* Real-time Connection Status */}
            <div className="flex items-center mt-2">
              <div className={`w-2 h-2 rounded-full mr-2 ${wsConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className="text-xs text-primary-200">
                {wsConnected ? 'Live Updates Connected' : 'Connecting...'}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-primary-200">Wallet Number</p>
            <p className="text-lg font-mono font-bold">TM{user.id?.slice(-8) || '12345678'}</p>
          </div>
        </div>
      </div>

      {/* Balance Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* KES Balance */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-kenya-green">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">KES Balance</p>
                <p className="text-3xl font-bold text-gray-900">
                  KES {walletData?.balance_kes?.toLocaleString() || '0'}
                </p>
                <p className="text-sm text-gray-500 mt-1">Available for transfers</p>
              </div>
              <div className="bg-kenya-green bg-opacity-20 p-3 rounded-full">
                <BanknotesIcon className="h-8 w-8 text-kenya-green" />
              </div>
            </div>
            <div className="flex space-x-2 mt-4">
              <button
                onClick={() => setShowDeposit(true)}
                className="flex-1 btn-primary text-sm py-2"
              >
                Deposit
              </button>
              <button
                onClick={() => setShowWithdraw(true)}
                className="flex-1 btn-secondary text-sm py-2"
                disabled={!walletData?.balance_kes || walletData.balance_kes < 10}
              >
                Withdraw
              </button>
            </div>
          </div>

        {/* USDT Balance */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">USDT Balance</p>
              <p className="text-3xl font-bold text-gray-900">
                {walletData?.balance_usdt?.toFixed(2) || '0.00'} USDT
              </p>
              <p className="text-sm text-gray-500 mt-1">Crypto trading balance</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <CreditCardIcon className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button 
            onClick={() => setShowP2PTransfer(true)}
            className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
          >
            <div className="bg-primary-100 p-3 rounded-full mb-2">
              <ArrowUpIcon className="h-6 w-6 text-primary-600" />
            </div>
            <span className="text-sm font-medium text-gray-900">Send Money</span>
            <span className="text-xs text-gray-500">P2P or Bank</span>
          </button>

          <button 
            onClick={() => setActiveTab('receive')}
            className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-success-300 hover:bg-success-50 transition-colors"
          >
            <div className="bg-success-100 p-3 rounded-full mb-2">
              <ArrowDownIcon className="h-6 w-6 text-success-600" />
            </div>
            <span className="text-sm font-medium text-gray-900">Receive</span>
            <span className="text-xs text-gray-500">Get money</span>
          </button>

          <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-warning-300 hover:bg-warning-50 transition-colors">
            <div className="bg-warning-100 p-3 rounded-full mb-2">
              <PhoneIcon className="h-6 w-6 text-warning-600" />
            </div>
            <span className="text-sm font-medium text-gray-900">M-Pesa</span>
            <span className="text-xs text-gray-500">Mobile money</span>
          </button>

          <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors">
            <div className="bg-purple-100 p-3 rounded-full mb-2">
              <BanknotesIcon className="h-6 w-6 text-purple-600" />
            </div>
            <span className="text-sm font-medium text-gray-900">Banks</span>
            <span className="text-xs text-gray-500">Local banks</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <tab.icon className="h-5 w-5 mr-2" />
                  {tab.name}
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Panels */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Wallet Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-primary-600">{walletData?.daily_transfer_count || 0}</p>
                  <p className="text-sm text-gray-600">Today's Transfers</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-success-600">KES {walletData?.total_received?.toLocaleString() || '0'}</p>
                  <p className="text-sm text-gray-600">Total Received</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-warning-600">KES {walletData?.total_sent?.toLocaleString() || '0'}</p>
                  <p className="text-sm text-gray-600">Total Sent</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Recent Transactions</h3>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Loading transactions...</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No transactions yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((transaction) => {
                    const status = formatTransactionStatus(transaction.status)
                    const isCredit = transaction.transaction_type.includes('receive')
                    
                    return (
                      <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <div className={`w-2 h-2 ${status.color} rounded-full mr-3`}></div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {formatTransactionType(transaction.transaction_type)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(transaction.created_at).toLocaleString()}
                            </p>
                            {transaction.reference && (
                              <p className="text-xs text-gray-400">Ref: {transaction.reference}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm font-medium ${isCredit ? 'text-success-600' : 'text-primary-600'}`}>
                            {isCredit ? '+' : '-'}KES {transaction.amount.toLocaleString()}
                          </span>
                          <p className="text-xs text-gray-500">{status.text}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'send' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Send Money</h3>
              <p className="text-gray-600">Choose how you want to send money:</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={() => setShowP2PTransfer(true)}
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
                >
                  <PhoneIcon className="h-8 w-8 text-primary-600 mr-3" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Send to Phone Number</p>
                    <p className="text-sm text-gray-500">P2P transfer to any user</p>
                  </div>
                </button>
                
                <button 
                  onClick={() => setShowBankTransfer(true)}
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
                >
                  <BanknotesIcon className="h-8 w-8 text-primary-600 mr-3" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Bank Transfer</p>
                    <p className="text-sm text-gray-500">Send to local bank account</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'receive' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Receive Money</h3>
              <p className="text-gray-600">Share your details to receive money:</p>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-700">Your Wallet Number:</span>
                  <span className="font-mono font-bold text-lg">TM{user.id?.slice(-8) || '12345678'}</span>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-700">Your Phone:</span>
                  <span className="font-mono font-bold text-lg">{user.phone_number || '+254700000000'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Your Name:</span>
                  <span className="font-bold text-lg">{user.full_name}</span>
                </div>
              </div>
              
              <div className="text-center p-4 bg-primary-50 rounded-lg">
                <p className="text-sm text-primary-700">
                  Share your wallet number or phone number with anyone to receive money instantly!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* P2P Transfer Modal */}
      {showP2PTransfer && (
        <P2PTransfer
          onClose={() => setShowP2PTransfer(false)}
          onSuccess={handleTransferSuccess}
        />
      )}

      {/* Bank Transfer Modal */}
      {showBankTransfer && (
        <BankTransfer
          onClose={() => setShowBankTransfer(false)}
          onSuccess={handleTransferSuccess}
        />
      )}

      {/* Deposit Modal */}
      {showDeposit && (
        <Deposit
          onClose={() => setShowDeposit(false)}
          onSuccess={handleTransferSuccess}
        />
      )}

      {/* Withdraw Modal */}
      {showWithdraw && (
        <Withdraw
          onClose={() => setShowWithdraw(false)}
          onSuccess={handleTransferSuccess}
          availableBalance={walletData?.balance_kes || 0}
        />
      )}
    </div>
  )
}
