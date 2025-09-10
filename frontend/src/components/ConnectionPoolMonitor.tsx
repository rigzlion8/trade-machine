import React, { useState, useEffect } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'
import { ChartBarIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

interface ConnectionPoolMonitorProps {
  show?: boolean
}

export default function ConnectionPoolMonitor({ show = false }: ConnectionPoolMonitorProps) {
  const { status, reconnect } = useWebSocket({ autoConnect: false })
  const [isExpanded, setIsExpanded] = useState(false)
  const [connectionHistory, setConnectionHistory] = useState<Array<{
    timestamp: number
    status: string
    details: any
  }>>([])

  useEffect(() => {
    // Add to connection history when status changes
    const timestamp = Date.now()
    setConnectionHistory(prev => [
      { timestamp, status: status.isConnected ? 'connected' : 'disconnected', details: status },
      ...prev.slice(0, 9) // Keep last 10 entries
    ])
  }, [status.isConnected, status.isHealthy])

  if (!show) return null

  const getConnectionStats = () => {
    const total = connectionHistory.length
    const connected = connectionHistory.filter(h => h.status === 'connected').length
    const disconnected = total - connected
    
    return {
      total,
      connected,
      disconnected,
      uptime: total > 0 ? Math.round((connected / total) * 100) : 0
    }
  }

  const stats = getConnectionStats()
  const details = status.connectionStatus

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">Connection Pool</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-400 hover:text-gray-600"
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>

      {/* Status Overview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">Overall Status</span>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              status.isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className="text-xs font-medium">
              {status.isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">Health</span>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              status.isHealthy ? 'bg-green-500' : 'bg-yellow-500'
            }`}></div>
            <span className="text-xs font-medium">
              {status.isHealthy ? 'Healthy' : 'Unhealthy'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">Uptime</span>
          <span className="text-xs font-medium">{stats.uptime}%</span>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="space-y-3">
            {/* Individual Connection Status */}
            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-2">Connections</h4>
              <div className="space-y-1">
                {Object.entries(details).map(([type, state]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 capitalize">{type}</span>
                    <div className="flex items-center space-x-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        state === 'connected' ? 'bg-green-500' : 
                        state === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>
                      <span className="text-xs">{state}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Connection History */}
            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-2">Recent Activity</h4>
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {connectionHistory.slice(0, 5).map((entry, index) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                    <div className="flex items-center space-x-1">
                      <div className={`w-1 h-1 rounded-full ${
                        entry.status === 'connected' ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <span className="text-gray-600">{entry.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2">
              <button
                onClick={reconnect}
                className="w-full text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors"
              >
                Reconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
