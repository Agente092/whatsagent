'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bell, Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { io } from 'socket.io-client'

interface BotStatus {
  isConnected: boolean
  lastSeen: string
  qrCode?: string
}

export default function Header() {
  const [botStatus, setBotStatus] = useState<BotStatus>({
    isConnected: false,
    lastSeen: 'Nunca',
  })
  const [notifications, setNotifications] = useState(0)
  const [connectionStatus, setConnectionStatus] = useState('disconnected')

  useEffect(() => {
    // Connect to Socket.IO server
    const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001')

    // Listen to WhatsApp status events
    socket.on('whatsapp-status', (status: string) => {
      console.log('WhatsApp status received:', status)
      setConnectionStatus(status)
      setBotStatus(prev => ({
        ...prev,
        isConnected: status === 'connected',
        lastSeen: status === 'connected' ? new Date().toISOString() : prev.lastSeen
      }))
    })

    // Fetch notifications (keep REST API for this)
    fetchNotifications()

    return () => {
      socket.close()
    }
  }, [])

  // Keep REST API for notifications since it's simpler
  const fetchNotifications = async () => {
    try {
      // Get token from localStorage
      const token = localStorage.getItem('token')

      const response = await fetch('/api/notifications/count', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        }
      })

      if (response.ok) {
        const data = await response.json()
        setNotifications(data.count)
      } else {
        console.log('Notifications API not available or not authenticated')
        setNotifications(0)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
      setNotifications(0)
    }
  }

  const handleRefreshBot = () => {
    // Redirect to Bot Status page instead of trying to connect from header
    window.location.href = '/dashboard/bot'
  }

  return (
    <header className="bg-white border-b border-gray-200 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 w-full max-w-full overflow-hidden">
      <div className="flex items-center justify-between w-full max-w-full overflow-hidden gap-2 sm:gap-4">
        <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0 overflow-hidden">
          {/* Mobile spacing for hamburger button */}
          <div className="w-14 flex-shrink-0 lg:hidden"></div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Dashboard</h1>
            <p className="text-xs sm:text-sm text-gray-600 hidden sm:block truncate">
              {new Date().toLocaleDateString('es-PE', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
            <p className="text-xs text-gray-600 sm:hidden truncate">
              {new Date().toLocaleDateString('es-PE', {
                day: 'numeric',
                month: 'short'
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0 overflow-hidden">
          {/* Bot Status - Responsive */}
          <div className="flex items-center space-x-1 sm:space-x-2 overflow-hidden">
            <div className="flex items-center space-x-1 sm:space-x-2 overflow-hidden">
              {botStatus.isConnected ? (
                <Wifi className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 flex-shrink-0" />
              ) : (
                <WifiOff className="w-3 h-3 sm:w-4 sm:h-4 text-red-600 flex-shrink-0" />
              )}
              <Badge 
                variant={botStatus.isConnected ? 'success' : 'destructive'}
                className="text-xs hidden sm:inline-flex whitespace-nowrap"
              >
                {botStatus.isConnected ? 'Bot Conectado' : 'Bot Desconectado'}
              </Badge>
              <Badge 
                variant={botStatus.isConnected ? 'success' : 'destructive'}
                className="text-xs sm:hidden whitespace-nowrap"
              >
                {botStatus.isConnected ? 'On' : 'Off'}
              </Badge>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshBot}
              className="h-7 sm:h-8 px-2 sm:px-3 text-xs whitespace-nowrap flex-shrink-0"
            >
              <RefreshCw className="w-3 h-3 mr-0 sm:mr-1 flex-shrink-0" />
              <span className="hidden sm:inline">
                {connectionStatus === 'connected' ? 'Conectado' :
                 connectionStatus === 'connecting' ? 'Conectando...' :
                 'Ir a Bot Status'}
              </span>
            </Button>
          </div>

          {/* Notifications - Mobile Optimized */}
          <div className="relative flex-shrink-0">
            <Button variant="outline" size="icon" className="relative h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
              <Bell className="w-3 h-3 sm:w-4 sm:h-4" />
              {notifications > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center text-xs p-0"
                >
                  {notifications > 99 ? '99+' : notifications}
                </Badge>
              )}
            </Button>
          </div>

          {/* Quick Stats - Hidden on small screens */}
          <div className="hidden lg:flex items-center space-x-4 text-sm text-gray-600">
            <div className="text-center">
              <div className="font-semibold text-gray-900">
                {new Date().toLocaleTimeString('es-PE', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
              <div className="text-xs">Hora Local</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bot disconnected warning - Responsive */}
      {!botStatus.isConnected && (
        <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-yellow-50 border border-yellow-200 rounded-lg w-full max-w-full overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 w-full max-w-full overflow-hidden gap-2">
            <div className="flex items-center space-x-2 flex-1 min-w-0 overflow-hidden">
              <WifiOff className="w-4 h-4 text-yellow-600 flex-shrink-0" />
              <span className="text-xs sm:text-sm text-yellow-800 truncate">
                <span className="hidden sm:inline">El bot de WhatsApp está desconectado. Los clientes no pueden enviar mensajes.</span>
                <span className="sm:hidden">Bot desconectado</span>
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshBot}
              className="text-yellow-700 border-yellow-300 hover:bg-yellow-100 w-full sm:w-auto text-xs sm:text-sm flex-shrink-0 whitespace-nowrap"
            >
              <span className="hidden sm:inline">Reconectar</span>
              <span className="sm:hidden">Reconectar</span>
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}
