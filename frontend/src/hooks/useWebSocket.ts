import { useEffect, useRef, useCallback, useState } from 'react'
import { useAuth } from './useAuth'
import { initializeWebSocket, getWebSocketService, disconnectWebSocket, WebSocketCallbacks } from '../services/websocketManager'

interface UseWebSocketOptions {
  autoConnect?: boolean
  callbacks?: WebSocketCallbacks
}

interface WebSocketStatus {
  isConnected: boolean
  isHealthy: boolean
  connectionStatus: {
    wallet: string
    bots: string
    notifications: string
  }
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const { autoConnect = true, callbacks = {} } = options
  const { user, token } = useAuth()
  const [status, setStatus] = useState<WebSocketStatus>({
    isConnected: false,
    isHealthy: false,
    connectionStatus: {
      wallet: 'disconnected',
      bots: 'disconnected',
      notifications: 'disconnected'
    }
  })
  
  const wsServiceRef = useRef<any>(null)
  const statusUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isInitializedRef = useRef(false)

  // Update status periodically
  const updateStatus = useCallback(() => {
    const service = getWebSocketService()
    if (service) {
      setStatus({
        isConnected: service.isConnected(),
        isHealthy: service.isHealthy(),
        connectionStatus: service.getConnectionStatus()
      })
    }
  }, [])

  // Initialize WebSocket connection
  const connect = useCallback(async () => {
    if (!user || !token || isInitializedRef.current) return

    try {
      isInitializedRef.current = true
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      
      wsServiceRef.current = await initializeWebSocket(
        API_BASE_URL,
        token,
        user.id,
        {
          onConnectionEstablished: (data) => {
            console.log('WebSocket connection established:', data)
            updateStatus()
            callbacks.onConnectionEstablished?.(data)
          },
          onBalanceUpdate: (data) => {
            callbacks.onBalanceUpdate?.(data)
          },
          onTransactionNotification: (data) => {
            callbacks.onTransactionNotification?.(data)
          },
          onBotStatusUpdate: (data) => {
            callbacks.onBotStatusUpdate?.(data)
          },
          onSystemNotification: (data) => {
            callbacks.onSystemNotification?.(data)
          },
          onError: (data) => {
            callbacks.onError?.(data)
          },
          onDisconnect: () => {
            updateStatus()
            callbacks.onDisconnect?.()
          }
        }
      )

      // Start status updates
      statusUpdateIntervalRef.current = setInterval(updateStatus, 5000)
      updateStatus()

    } catch (error) {
      console.error('Failed to initialize WebSocket:', error)
      isInitializedRef.current = false
    }
  }, [user, token, callbacks, updateStatus])

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (statusUpdateIntervalRef.current) {
      clearInterval(statusUpdateIntervalRef.current)
      statusUpdateIntervalRef.current = null
    }
    
    disconnectWebSocket()
    wsServiceRef.current = null
    isInitializedRef.current = false
    
    setStatus({
      isConnected: false,
      isHealthy: false,
      connectionStatus: {
        wallet: 'disconnected',
        bots: 'disconnected',
        notifications: 'disconnected'
      }
    })
  }, [])

  // Reconnect WebSocket
  const reconnect = useCallback(async () => {
    disconnect()
    await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
    await connect()
  }, [disconnect, connect])

  // Send message
  const sendMessage = useCallback((message: any, socketType: 'wallet' | 'bots' | 'notifications' = 'wallet') => {
    const service = getWebSocketService()
    if (service) {
      service.sendMessage(message, socketType)
    }
  }, [])

  // Subscribe to transactions
  const subscribeToTransactions = useCallback(() => {
    const service = getWebSocketService()
    if (service) {
      service.subscribeToTransactions()
    }
  }, [])

  // Get wallet status
  const getWalletStatus = useCallback(() => {
    const service = getWebSocketService()
    if (service) {
      service.getWalletStatus()
    }
  }, [])

  // Subscribe to bot updates
  const subscribeToBotUpdates = useCallback((botId: string) => {
    const service = getWebSocketService()
    if (service) {
      service.subscribeToBotUpdates(botId)
    }
  }, [])

  // Auto-connect on mount and when user/token changes
  useEffect(() => {
    if (autoConnect && user && token && !isInitializedRef.current) {
      connect()
    }
  }, [autoConnect, user, token, connect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (statusUpdateIntervalRef.current) {
        clearInterval(statusUpdateIntervalRef.current)
      }
    }
  }, [])

  return {
    status,
    connect,
    disconnect,
    reconnect,
    sendMessage,
    subscribeToTransactions,
    getWalletStatus,
    subscribeToBotUpdates,
    isConnected: status.isConnected,
    isHealthy: status.isHealthy
  }
}
