import React, { useState, useEffect } from 'react'
import { 
  WalletIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  ArrowTopRightOnSquareIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline'
import { cryptoWalletService, CryptoWallet, SupportedToken } from '../services/cryptoWallet'
import toast from 'react-hot-toast'

interface CryptoWalletConnectionProps {
  onWalletConnected?: (wallet: CryptoWallet) => void
  onWalletDisconnected?: () => void
}

export default function CryptoWalletConnection({ 
  onWalletConnected, 
  onWalletDisconnected 
}: CryptoWalletConnectionProps) {
  const [wallet, setWallet] = useState<CryptoWallet | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [supportedTokens, setSupportedTokens] = useState<SupportedToken[]>([])
  const [showTokenBalances, setShowTokenBalances] = useState(false)

  useEffect(() => {
    // Check if wallet is already connected
    checkWalletConnection()
  }, [])

  const checkWalletConnection = async () => {
    try {
      const walletInfo = await cryptoWalletService.getWalletInfo()
      if (walletInfo) {
        setWallet(walletInfo)
        onWalletConnected?.(walletInfo)
        await loadTokenBalances()
      }
    } catch (error) {
      console.error('Error checking wallet connection:', error)
    }
  }

  const connectWallet = async () => {
    setIsConnecting(true)
    try {
      const connectedWallet = await cryptoWalletService.connectWallet()
      setWallet(connectedWallet)
      onWalletConnected?.(connectedWallet)
      await loadTokenBalances()
      toast.success('Wallet connected successfully!')
    } catch (error: any) {
      console.error('Error connecting wallet:', error)
      toast.error(error.message || 'Failed to connect wallet')
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = async () => {
    try {
      await cryptoWalletService.disconnectWallet()
      setWallet(null)
      setSupportedTokens([])
      onWalletDisconnected?.()
      toast.success('Wallet disconnected')
    } catch (error) {
      console.error('Error disconnecting wallet:', error)
      toast.error('Failed to disconnect wallet')
    }
  }

  const loadTokenBalances = async () => {
    try {
      const tokens = await cryptoWalletService.getSupportedTokens()
      setSupportedTokens(tokens)
    } catch (error) {
      console.error('Error loading token balances:', error)
    }
  }

  const copyAddress = () => {
    if (wallet?.address) {
      navigator.clipboard.writeText(wallet.address)
      toast.success('Address copied to clipboard!')
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatBalance = (balance: string, decimals: number = 4) => {
    const num = parseFloat(balance)
    if (num === 0) return '0'
    if (num < 0.0001) return '< 0.0001'
    return num.toFixed(decimals)
  }

  if (!wallet) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <WalletIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Connect Your Crypto Wallet
          </h3>
          <p className="text-gray-600 mb-6">
            Connect your MetaMask or compatible wallet to manage your crypto assets
          </p>
          
          <button
            onClick={connectWallet}
            disabled={isConnecting}
            className="btn-primary flex items-center justify-center mx-auto"
          >
            {isConnecting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Connecting...
              </>
            ) : (
              <>
                <WalletIcon className="h-5 w-5 mr-2" />
                Connect Wallet
              </>
            )}
          </button>
          
          <p className="text-xs text-gray-500 mt-4">
            We support MetaMask, WalletConnect, and other compatible wallets
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="bg-green-100 p-2 rounded-full mr-3">
            <CheckCircleIcon className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">Wallet Connected</h3>
            <p className="text-sm text-gray-500">{wallet.network}</p>
          </div>
        </div>
        
        <button
          onClick={disconnectWallet}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Disconnect
        </button>
      </div>

      {/* Wallet Address */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Wallet Address</p>
            <p className="text-sm text-gray-900 font-mono">{formatAddress(wallet.address)}</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={copyAddress}
              className="p-2 text-gray-400 hover:text-gray-600"
              title="Copy address"
            >
              <DocumentDuplicateIcon className="h-4 w-4" />
            </button>
            <a
              href={`https://etherscan.io/address/${wallet.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-400 hover:text-gray-600"
              title="View on Etherscan"
            >
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      {/* ETH Balance */}
      <div className="bg-blue-50 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">ETH Balance</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatBalance(wallet.balance)} ETH
            </p>
          </div>
          <div className="bg-blue-100 p-3 rounded-full">
            <WalletIcon className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Token Balances */}
      <div className="mb-4">
        <button
          onClick={() => setShowTokenBalances(!showTokenBalances)}
          className="flex items-center justify-between w-full text-left"
        >
          <span className="text-sm font-medium text-gray-700">
            Token Balances ({supportedTokens.length})
          </span>
          <span className={`transform transition-transform ${showTokenBalances ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>
        
        {showTokenBalances && (
          <div className="mt-3 space-y-2">
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
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {formatBalance(token.balance || '0')}
                  </p>
                  <p className="text-xs text-gray-500">{token.symbol}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Warning for unsupported networks */}
      {wallet.network !== 'homestead' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2" />
            <p className="text-sm text-yellow-800">
              You're connected to {wallet.network}. Make sure you're on the Ethereum mainnet for full functionality.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
