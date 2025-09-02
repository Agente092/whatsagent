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
    const socket = io('http://localhost:3001')

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
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-600">
              {new Date().toLocaleDateString('es-PE', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Bot Status */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              {botStatus.isConnected ? (
                <Wifi className="w-4 h-4 text-green-600" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-600" />
              )}
              <Badge 
                variant={botStatus.isConnected ? 'success' : 'destructive'}
                className="text-xs"
              >
                {botStatus.isConnected ? 'Bot Conectado' : 'Bot Desconectado'}
              </Badge>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshBot}
              className="h-8 px-3 text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              {connectionStatus === 'connected' ? 'Conectado' :
               connectionStatus === 'connecting' ? 'Conectando...' :
               'Ir a Bot Status'}
            </Button>
          </div>

          {/* Notifications */}
          <div className="relative">
            <Button variant="outline" size="icon" className="relative">
              <Bell className="w-4 h-4" />
              {notifications > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs p-0"
                >
                  {notifications > 99 ? '99+' : notifications}
                </Badge>
              )}
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="hidden md:flex items-center space-x-4 text-sm text-gray-600">
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

      {/* Bot disconnected warning */}
      {!botStatus.isConnected && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <WifiOff className="w-4 h-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">
                El bot de WhatsApp está desconectado. Los clientes no pueden enviar mensajes.
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshBot}
              className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
            >
              Reconectar
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}
