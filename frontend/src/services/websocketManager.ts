import { toast } from 'react-hot-toast'

export interface WebSocketMessage {
  type: string
  user_id?: string
  data: any
  timestamp: string
}

export interface WebSocketCallbacks {
  onBalanceUpdate?: (data: any) => void
  onTransactionNotification?: (data: any) => void
  onBotStatusUpdate?: (data: any) => void
  onSystemNotification?: (data: any) => void
  onError?: (data: any) => void
  onConnectionEstablished?: (data: any) => void
  onDisconnect?: () => void
}

interface ConnectionConfig {
  baseUrl: string
  authToken: string
  userId: string
  callbacks: WebSocketCallbacks
}

interface ConnectionPool {
  wallet: WebSocket | null
  bots: WebSocket | null
  notifications: WebSocket | null
}

interface ConnectionState {
  isConnecting: boolean
  reconnectAttempts: number
  lastPingTime: number
  isHealthy: boolean
}

export class WebSocketManager {
  private pool: ConnectionPool = {
    wallet: null,
    bots: null,
    notifications: null
  }
  
  private state: ConnectionState = {
    isConnecting: false,
    reconnectAttempts: 0,
    lastPingTime: 0,
    isHealthy: false
  }
  
  private config: ConnectionConfig | null = null
  private pingInterval: NodeJS.Timeout | null = null
  private reconnectTimeout: NodeJS.Timeout | null = null
  private healthCheckInterval: NodeJS.Timeout | null = null
  
  // Configuration constants
  private readonly MAX_RECONNECT_ATTEMPTS = 5
  private readonly INITIAL_RECONNECT_DELAY = 1000
  private readonly MAX_RECONNECT_DELAY = 30000
  private readonly PING_INTERVAL = 30000 // 30 seconds
  private readonly HEALTH_CHECK_INTERVAL = 10000 // 10 seconds
  private readonly CONNECTION_TIMEOUT = 10000 // 10 seconds

  constructor() {
    this.setupVisibilityHandlers()
  }

  async initialize(config: ConnectionConfig): Promise<void> {
    this.config = config
    await this.connectAll()
    this.startKeepAlive()
    this.startHealthCheck()
  }

  private setupVisibilityHandlers(): void {
    // Handle page visibility changes to manage connections
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseConnections()
      } else {
        this.resumeConnections()
      }
    })

    // Handle page unload
    window.addEventListener('beforeunload', () => {
      this.cleanup()
    })

    // Handle online/offline events
    window.addEventListener('online', () => {
      this.handleOnline()
    })

    window.addEventListener('offline', () => {
      this.handleOffline()
    })
  }

  private async connectAll(): Promise<void> {
    if (this.state.isConnecting || !this.config) return
    
    this.state.isConnecting = true
    this.state.isHealthy = false

    try {
      // Connect all sockets in parallel for better performance
      const connections = await Promise.allSettled([
        this.connectSocket('wallet'),
        this.connectSocket('bots'),
        this.connectSocket('notifications')
      ])

      // Check if at least one connection succeeded
      const successfulConnections = connections.filter(result => result.status === 'fulfilled').length
      
      if (successfulConnections > 0) {
        this.state.reconnectAttempts = 0
        this.state.isHealthy = true
        console.log(`WebSocket connections established: ${successfulConnections}/3`)
      } else {
        throw new Error('All WebSocket connections failed')
      }

    } catch (error) {
      console.error('Error connecting WebSockets:', error)
      this.scheduleReconnect()
    } finally {
      this.state.isConnecting = false
    }
  }

  private async connectSocket(type: keyof ConnectionPool): Promise<void> {
    if (!this.config) throw new Error('Configuration not set')

    return new Promise((resolve, reject) => {
      try {
        const wsUrl = this.buildWebSocketUrl(type)
        const socket = new WebSocket(wsUrl)
        
        // Set connection timeout
        const timeout = setTimeout(() => {
          if (socket.readyState === WebSocket.CONNECTING) {
            socket.close()
            reject(new Error(`Connection timeout for ${type} WebSocket`))
          }
        }, this.CONNECTION_TIMEOUT)

        socket.onopen = () => {
          clearTimeout(timeout)
          this.pool[type] = socket
          console.log(`${type} WebSocket connected`)
          resolve()
        }

        socket.onmessage = (event) => {
          this.handleMessage(event.data, type)
        }

        socket.onclose = (event) => {
          clearTimeout(timeout)
          console.log(`${type} WebSocket disconnected:`, event.code, event.reason)
          
          // Only trigger reconnect if it wasn't a manual close
          if (event.code !== 1000 && this.config) {
            this.scheduleReconnect()
          }
        }

        socket.onerror = (error) => {
          clearTimeout(timeout)
          console.error(`${type} WebSocket error:`, error)
          reject(error)
        }

      } catch (error) {
        reject(error)
      }
    })
  }

  private buildWebSocketUrl(type: keyof ConnectionPool): string {
    if (!this.config) throw new Error('Configuration not set')
    
    const wsBaseUrl = this.config.baseUrl.replace('http', 'ws')
    return `${wsBaseUrl}/ws/${type}/${this.config.userId}?token=${this.config.authToken}`
  }

  private handleMessage(data: string, source: keyof ConnectionPool): void {
    try {
      const message: WebSocketMessage = JSON.parse(data)
      console.log(`WebSocket message from ${source}:`, message)
      
      // Update last ping time for health check
      if (message.type === 'pong') {
        this.state.lastPingTime = Date.now()
        return
      }
      
      // Handle different message types
      switch (message.type) {
        case 'connection_established':
          this.config?.callbacks.onConnectionEstablished?.(message.data)
          break
          
        case 'balance_update':
          this.config?.callbacks.onBalanceUpdate?.(message.data)
          break
          
        case 'transaction_notification':
          this.config?.callbacks.onTransactionNotification?.(message.data)
          this.showTransactionToast(message.data)
          break
          
        case 'bot_status_update':
          this.config?.callbacks.onBotStatusUpdate?.(message.data)
          break
          
        case 'system_notification':
          this.config?.callbacks.onSystemNotification?.(message.data)
          this.showSystemToast(message.data)
          break
          
        case 'error_notification':
          this.config?.callbacks.onError?.(message.data)
          if (message.data.error) {
            toast.error(message.data.error)
          }
          break
          
        default:
          console.log('Unknown WebSocket message type:', message.type)
      }
      
    } catch (error) {
      console.error('Error parsing WebSocket message:', error)
    }
  }

  private showTransactionToast(data: any): void {
    if (data.transaction) {
      const tx = data.transaction
      const isReceive = tx.transaction_type?.includes('receive')
      const amount = tx.amount?.toLocaleString() || '0'
      
      toast.success(
        `${isReceive ? 'Received' : 'Sent'} KES ${amount}`,
        {
          duration: 4000,
          icon: isReceive ? '💰' : '💸'
        }
      )
    }
  }

  private showSystemToast(data: any): void {
    if (data.message) {
      const level = data.level || 'info'
      if (level === 'error') {
        toast.error(data.message)
      } else if (level === 'warning') {
        toast(data.message, { icon: '⚠️' })
      } else {
        toast.success(data.message)
      }
    }
  }

  private startKeepAlive(): void {
    this.pingInterval = setInterval(() => {
      this.pingAll()
    }, this.PING_INTERVAL)
  }

  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(() => {
      this.checkConnectionHealth()
    }, this.HEALTH_CHECK_INTERVAL)
  }

  private pingAll(): void {
    Object.entries(this.pool).forEach(([type, socket]) => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        this.sendMessage({ type: 'ping' }, type as keyof ConnectionPool)
      }
    })
  }

  private checkConnectionHealth(): void {
    const now = Date.now()
    const timeSinceLastPong = now - this.state.lastPingTime
    
    // If no pong received in 2 ping intervals, consider connection unhealthy
    if (timeSinceLastPong > this.PING_INTERVAL * 2) {
      console.warn('WebSocket connection health check failed')
      this.state.isHealthy = false
      
      // Try to reconnect if we have active connections but no recent pong
      if (this.isAnyConnected()) {
        this.scheduleReconnect()
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout || this.state.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      if (this.state.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
        console.error('Max WebSocket reconnection attempts reached')
        toast.error('Connection lost. Please refresh the page.')
      }
      return
    }

    this.state.reconnectAttempts++
    const delay = Math.min(
      this.INITIAL_RECONNECT_DELAY * Math.pow(2, this.state.reconnectAttempts - 1),
      this.MAX_RECONNECT_DELAY
    )
    
    console.log(`Scheduling WebSocket reconnect in ${delay}ms (attempt ${this.state.reconnectAttempts})`)
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null
      this.connectAll()
    }, delay)
  }

  private pauseConnections(): void {
    console.log('Pausing WebSocket connections (page hidden)')
    this.clearIntervals()
  }

  private resumeConnections(): void {
    console.log('Resuming WebSocket connections (page visible)')
    if (this.config && !this.isAnyConnected()) {
      this.connectAll()
    }
    this.startKeepAlive()
    this.startHealthCheck()
  }

  private handleOnline(): void {
    console.log('Network connection restored')
    if (this.config && !this.isAnyConnected()) {
      this.connectAll()
    }
  }

  private handleOffline(): void {
    console.log('Network connection lost')
    this.state.isHealthy = false
  }

  sendMessage(message: any, socketType: keyof ConnectionPool = 'wallet'): void {
    const socket = this.pool[socketType]
    
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify(message))
      } catch (error) {
        console.error(`Error sending message to ${socketType} WebSocket:`, error)
      }
    } else {
      console.warn(`${socketType} WebSocket is not connected`)
    }
  }

  subscribeToTransactions(): void {
    this.sendMessage({ type: 'subscribe_transactions' }, 'wallet')
  }

  getWalletStatus(): void {
    this.sendMessage({ type: 'get_wallet_status' }, 'wallet')
  }

  subscribeToBotUpdates(botId: string): void {
    this.sendMessage({ type: 'subscribe_bot_updates', bot_id: botId }, 'bots')
  }

  isConnected(): boolean {
    return this.isAnyConnected()
  }

  isHealthy(): boolean {
    return this.state.isHealthy
  }

  private isAnyConnected(): boolean {
    return Object.values(this.pool).some(socket => 
      socket && socket.readyState === WebSocket.OPEN
    )
  }

  getConnectionStatus(): { [key in keyof ConnectionPool]: string } {
    return {
      wallet: this.getSocketState('wallet'),
      bots: this.getSocketState('bots'),
      notifications: this.getSocketState('notifications')
    }
  }

  private getSocketState(type: keyof ConnectionPool): string {
    const socket = this.pool[type]
    if (!socket) return 'disconnected'
    
    switch (socket.readyState) {
      case WebSocket.CONNECTING: return 'connecting'
      case WebSocket.OPEN: return 'connected'
      case WebSocket.CLOSING: return 'closing'
      case WebSocket.CLOSED: return 'closed'
      default: return 'unknown'
    }
  }

  private clearIntervals(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
  }

  disconnect(): void {
    this.clearIntervals()
    
    Object.entries(this.pool).forEach(([type, socket]) => {
      if (socket) {
        socket.close(1000, 'Manual disconnect')
        this.pool[type as keyof ConnectionPool] = null
      }
    })
    
    this.state.isHealthy = false
    console.log('All WebSocket connections closed')
  }

  cleanup(): void {
    this.disconnect()
    this.config = null
  }
}

// Global WebSocket manager instance
let websocketManager: WebSocketManager | null = null

export const initializeWebSocket = (
  baseUrl: string,
  authToken: string,
  userId: string,
  callbacks: WebSocketCallbacks
): Promise<WebSocketManager> => {
  if (websocketManager) {
    websocketManager.cleanup()
  }
  
  websocketManager = new WebSocketManager()
  return websocketManager.initialize({ baseUrl, authToken, userId, callbacks })
    .then(() => websocketManager!)
}

export const getWebSocketService = (): WebSocketManager | null => {
  return websocketManager
}

export const disconnectWebSocket = (): void => {
  if (websocketManager) {
    websocketManager.cleanup()
    websocketManager = null
  }
}
