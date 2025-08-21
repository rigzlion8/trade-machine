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

export class WebSocketService {
  private walletSocket: WebSocket | null = null
  private botsSocket: WebSocket | null = null
  private notificationsSocket: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private callbacks: WebSocketCallbacks = {}
  private isConnecting = false

  constructor(private baseUrl: string, private authToken: string, private userId: string) {}

  setCallbacks(callbacks: WebSocketCallbacks) {
    this.callbacks = callbacks
  }

  async connect() {
    if (this.isConnecting) return
    this.isConnecting = true

    try {
      // Connect to wallet WebSocket
      await this.connectWallet()
      
      // Connect to bots WebSocket
      await this.connectBots()
      
      // Connect to notifications WebSocket
      await this.connectNotifications()
      
      this.reconnectAttempts = 0
      this.isConnecting = false
      
      console.log('All WebSocket connections established')
      
    } catch (error) {
      console.error('Error connecting WebSockets:', error)
      this.isConnecting = false
      this.scheduleReconnect()
    }
  }

  private async connectWallet() {
    return new Promise<void>((resolve, reject) => {
      try {
        const wsUrl = `${this.baseUrl.replace('http', 'ws')}/ws/wallet/${this.userId}?token=${this.authToken}`
        this.walletSocket = new WebSocket(wsUrl)
        
        this.walletSocket.onopen = () => {
          console.log('Wallet WebSocket connected')
          resolve()
        }
        
        this.walletSocket.onmessage = (event) => {
          this.handleMessage(event.data, 'wallet')
        }
        
        this.walletSocket.onclose = () => {
          console.log('Wallet WebSocket disconnected')
          this.callbacks.onDisconnect?.()
          this.scheduleReconnect()
        }
        
        this.walletSocket.onerror = (error) => {
          console.error('Wallet WebSocket error:', error)
          reject(error)
        }
        
      } catch (error) {
        reject(error)
      }
    })
  }

  private async connectBots() {
    return new Promise<void>((resolve, reject) => {
      try {
        const wsUrl = `${this.baseUrl.replace('http', 'ws')}/ws/bots/${this.userId}?token=${this.authToken}`
        this.botsSocket = new WebSocket(wsUrl)
        
        this.botsSocket.onopen = () => {
          console.log('Bots WebSocket connected')
          resolve()
        }
        
        this.botsSocket.onmessage = (event) => {
          this.handleMessage(event.data, 'bots')
        }
        
        this.botsSocket.onclose = () => {
          console.log('Bots WebSocket disconnected')
          this.scheduleReconnect()
        }
        
        this.botsSocket.onerror = (error) => {
          console.error('Bots WebSocket error:', error)
          reject(error)
        }
        
      } catch (error) {
        reject(error)
      }
    })
  }

  private async connectNotifications() {
    return new Promise<void>((resolve, reject) => {
      try {
        const wsUrl = `${this.baseUrl.replace('http', 'ws')}/ws/notifications/${this.userId}?token=${this.authToken}`
        this.notificationsSocket = new WebSocket(wsUrl)
        
        this.notificationsSocket.onopen = () => {
          console.log('Notifications WebSocket connected')
          resolve()
        }
        
        this.notificationsSocket.onmessage = (event) => {
          this.handleMessage(event.data, 'notifications')
        }
        
        this.notificationsSocket.onclose = () => {
          console.log('Notifications WebSocket disconnected')
          this.scheduleReconnect()
        }
        
        this.notificationsSocket.onerror = (error) => {
          console.error('Notifications WebSocket error:', error)
          reject(error)
        }
        
      } catch (error) {
        reject(error)
      }
    })
  }

  private handleMessage(data: string, source: string) {
    try {
      const message: WebSocketMessage = JSON.parse(data)
      console.log(`WebSocket message from ${source}:`, message)
      
      switch (message.type) {
        case 'connection_established':
          this.callbacks.onConnectionEstablished?.(message.data)
          break
          
        case 'balance_update':
          this.callbacks.onBalanceUpdate?.(message.data)
          break
          
        case 'transaction_notification':
          this.callbacks.onTransactionNotification?.(message.data)
          // Show toast notification
          if (message.data.transaction) {
            const tx = message.data.transaction
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
          break
          
        case 'bot_status_update':
          this.callbacks.onBotStatusUpdate?.(message.data)
          break
          
        case 'system_notification':
          this.callbacks.onSystemNotification?.(message.data)
          // Show toast notification
          if (message.data.message) {
            const level = message.data.level || 'info'
            if (level === 'error') {
              toast.error(message.data.message)
            } else if (level === 'warning') {
              toast(message.data.message, { icon: '⚠️' })
            } else {
              toast.success(message.data.message)
            }
          }
          break
          
        case 'error_notification':
          this.callbacks.onError?.(message.data)
          // Show error toast
          if (message.data.error) {
            toast.error(message.data.error)
          }
          break
          
        case 'pong':
          // Handle ping-pong for connection health
          break
          
        default:
          console.log('Unknown WebSocket message type:', message.type)
      }
      
    } catch (error) {
      console.error('Error parsing WebSocket message:', error)
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
      
      console.log(`Scheduling WebSocket reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`)
      
      setTimeout(() => {
        this.connect()
      }, delay)
    } else {
      console.error('Max WebSocket reconnection attempts reached')
      toast.error('Connection lost. Please refresh the page.')
    }
  }

  sendMessage(message: any, socketType: 'wallet' | 'bots' | 'notifications' = 'wallet') {
    try {
      let socket: WebSocket | null = null
      
      switch (socketType) {
        case 'wallet':
          socket = this.walletSocket
          break
        case 'bots':
          socket = this.botsSocket
          break
        case 'notifications':
          socket = this.notificationsSocket
          break
      }
      
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message))
      } else {
        console.warn(`WebSocket ${socketType} is not connected`)
      }
    } catch (error) {
      console.error(`Error sending message to ${socketType} WebSocket:`, error)
    }
  }

  ping(socketType: 'wallet' | 'bots' | 'notifications' = 'wallet') {
    this.sendMessage({ type: 'ping' }, socketType)
  }

  subscribeToTransactions() {
    this.sendMessage({ type: 'subscribe_transactions' }, 'wallet')
  }

  getWalletStatus() {
    this.sendMessage({ type: 'get_wallet_status' }, 'wallet')
  }

  subscribeToBotUpdates(botId: string) {
    this.sendMessage({ type: 'subscribe_bot_updates', bot_id: botId }, 'bots')
  }

  disconnect() {
    if (this.walletSocket) {
      this.walletSocket.close()
      this.walletSocket = null
    }
    
    if (this.botsSocket) {
      this.botsSocket.close()
      this.botsSocket = null
    }
    
    if (this.notificationsSocket) {
      this.notificationsSocket.close()
      this.notificationsSocket = null
    }
    
    console.log('All WebSocket connections closed')
  }

  isConnected(): boolean {
    return (
      (this.walletSocket?.readyState === WebSocket.OPEN) ||
      (this.botsSocket?.readyState === WebSocket.OPEN) ||
      (this.notificationsSocket?.readyState === WebSocket.OPEN)
    )
  }
}

// Global WebSocket service instance
let websocketService: WebSocketService | null = null

export const initializeWebSocket = (
  baseUrl: string,
  authToken: string,
  userId: string,
  callbacks: WebSocketCallbacks
): WebSocketService => {
  if (websocketService) {
    websocketService.disconnect()
  }
  
  websocketService = new WebSocketService(baseUrl, authToken, userId)
  websocketService.setCallbacks(callbacks)
  
  return websocketService
}

export const getWebSocketService = (): WebSocketService | null => {
  return websocketService
}

export const disconnectWebSocket = () => {
  if (websocketService) {
    websocketService.disconnect()
    websocketService = null
  }
}
