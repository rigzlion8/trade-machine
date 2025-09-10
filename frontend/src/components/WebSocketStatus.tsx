import React from 'react'
import { useWebSocket } from '../hooks/useWebSocket'

interface WebSocketStatusProps {
  showDetails?: boolean
  className?: string
}

export default function WebSocketStatus({ showDetails = false, className = '' }: WebSocketStatusProps) {
  const { status } = useWebSocket({ autoConnect: false }) // Don't auto-connect here, just get status

  const getStatusColor = () => {
    if (!status.isConnected) return 'bg-red-500'
    if (!status.isHealthy) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getStatusText = () => {
    if (!status.isConnected) return 'Disconnected'
    if (!status.isHealthy) return 'Unhealthy'
    return 'Connected'
  }

  const getConnectionDetails = () => {
    const { wallet, bots, notifications } = status.connectionStatus
    return { wallet, bots, notifications }
  }

  if (showDetails) {
    const details = getConnectionDetails()
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
        <span className="text-xs text-gray-600">{getStatusText()}</span>
        <div className="flex space-x-1">
          <div className={`w-1.5 h-1.5 rounded-full ${
            details.wallet === 'connected' ? 'bg-green-400' : 'bg-red-400'
          }`} title="Wallet"></div>
          <div className={`w-1.5 h-1.5 rounded-full ${
            details.bots === 'connected' ? 'bg-green-400' : 'bg-red-400'
          }`} title="Bots"></div>
          <div className={`w-1.5 h-1.5 rounded-full ${
            details.notifications === 'connected' ? 'bg-green-400' : 'bg-red-400'
          }`} title="Notifications"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
      <span className="text-xs text-gray-600">{getStatusText()}</span>
    </div>
  )
}
