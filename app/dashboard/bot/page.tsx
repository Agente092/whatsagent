'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { QrCode, Smartphone, Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import { io } from 'socket.io-client'

export default function BotStatusPage() {
  const [socket, setSocket] = useState(null)
  const [whatsappStatus, setWhatsappStatus] = useState('disconnected')
  const [qrCode, setQrCode] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)

  useEffect(() => {
    // Connect to Socket.IO server
    const newSocket = io('http://localhost:3001')
    setSocket(newSocket)

    // Listen to WhatsApp events
    newSocket.on('whatsapp-status', (status) => {
      setWhatsappStatus(status)
      if (status === 'connected') {
        setIsConnecting(false)
        setQrCode('')
      }
    })

    newSocket.on('qr-code', (qr) => {
      setQrCode(qr)
      setIsConnecting(false)
    })

    newSocket.on('whatsapp-ready', () => {
      setWhatsappStatus('connected')
      setQrCode('')
      setIsConnecting(false)
    })

    newSocket.on('session-cleared', () => {
      setWhatsappStatus('ready-to-connect')
      setQrCode('')
      setIsConnecting(false)
    })

    return () => {
      newSocket.close()
    }
  }, [])

  const handleConnectWhatsApp = () => {
    if (socket) {
      setIsConnecting(true)
      socket.emit('connect-whatsapp')
      setWhatsappStatus('connecting')
    }
  }

  const handleDisconnectWhatsApp = () => {
    if (socket) {
      socket.emit('disconnect-whatsapp')
      setWhatsappStatus('disconnected')
      setQrCode('')
    }
  }

  const handleClearSession = () => {
    if (socket) {
      socket.emit('clear-whatsapp-session')
    }
  }

  const getStatusBadge = () => {
    switch (whatsappStatus) {
      case 'connected':
        return <Badge className="bg-green-500 hover:bg-green-600">Conectado</Badge>
      case 'connecting':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Conectando...</Badge>
      case 'ready-to-connect':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Listo para Conectar</Badge>
      default:
        return <Badge variant="destructive">Desconectado</Badge>
    }
  }

  const getStatusIcon = () => {
    switch (whatsappStatus) {
      case 'connected':
        return <Wifi className="w-6 h-6 text-green-600" />
      case 'connecting':
        return <RefreshCw className="w-6 h-6 text-yellow-600 animate-spin" />
      default:
        return <WifiOff className="w-6 h-6 text-red-600" />
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Estado del WhatsApp Bot</h1>
              <p className="text-gray-600 mt-2">
                Gestiona la conexión de WhatsApp para tu servicio de asesoría empresarial
              </p>
            </div>

            {/* Status Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon()}
                    <div>
                      <CardTitle>Estado de Conexión</CardTitle>
                      <CardDescription>
                        Estado actual del bot de WhatsApp
                      </CardDescription>
                    </div>
                  </div>
                  {getStatusBadge()}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Disconnected State */}
                  {whatsappStatus === 'disconnected' && (
                    <div className="text-center py-8">
                      <WifiOff className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        WhatsApp Desconectado
                      </h3>
                      <p className="text-gray-600 mb-6">
                        El bot no está conectado. Los clientes no pueden enviar mensajes.
                      </p>
                      <Button 
                        onClick={handleConnectWhatsApp}
                        disabled={isConnecting}
                        className="w-full sm:w-auto"
                      >
                        {isConnecting ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Conectando...
                          </>
                        ) : (
                          <>
                            <Wifi className="w-4 h-4 mr-2" />
                            Conectar WhatsApp
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Connecting State with QR */}
                  {whatsappStatus === 'connecting' && qrCode && (
                    <div className="text-center py-8">
                      <div className="max-w-md mx-auto">
                        <QrCode className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          Escanea el Código QR
                        </h3>
                        <p className="text-gray-600 mb-6">
                          Usa WhatsApp en tu teléfono para escanear este código
                        </p>
                        
                        <div className="bg-white p-6 rounded-lg border-2 border-dashed border-gray-300 mb-6">
                          <img 
                            src={qrCode} 
                            alt="Código QR de WhatsApp"
                            className="mx-auto max-w-full h-auto"
                            style={{ maxWidth: '256px' }}
                          />
                        </div>

                        <div className="text-left space-y-3 text-sm text-gray-600">
                          <div className="flex items-center space-x-3">
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-xs">1</div>
                            <span>Abre WhatsApp en tu teléfono</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-xs">2</div>
                            <span>Ve a Configuración → Dispositivos vinculados</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-xs">3</div>
                            <span>Toca "Vincular un dispositivo" y escanea este código</span>
                          </div>
                        </div>

                        <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            <strong>⚠️ Importante:</strong> Este código QR es único y temporal. 
                            No lo compartas con nadie más.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Connected State */}
                  {whatsappStatus === 'connected' && (
                    <div className="text-center py-8">
                      <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        ¡WhatsApp Conectado!
                      </h3>
                      <p className="text-gray-600 mb-6">
                        El bot está activo y listo para recibir mensajes de clientes.
                      </p>
                      <div className="flex justify-center space-x-4">
                        <Button 
                          variant="outline"
                          onClick={handleDisconnectWhatsApp}
                        >
                          <WifiOff className="w-4 h-4 mr-2" />
                          Desconectar
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={handleClearSession}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Limpiar Sesión
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Session Invalid State */}
                  {whatsappStatus === 'session-invalid' && (
                    <div className="text-center py-8">
                      <AlertTriangle className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Sesión Cerrada desde WhatsApp
                      </h3>
                      <p className="text-gray-600 mb-6">
                        Detectamos que cerraste la sesión desde tu teléfono. Limpiando automáticamente...
                      </p>
                      <div className="w-8 h-8 border-4 border-yellow-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    </div>
                  )}

                  {/* Ready to Connect State */}
                  {whatsappStatus === 'ready-to-connect' && (
                    <div className="text-center py-8">
                      <RefreshCw className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        ¡Listo para Reconectar!
                      </h3>
                      <p className="text-gray-600 mb-6">
                        Sesión limpiada exitosamente. Puedes conectar WhatsApp nuevamente.
                      </p>
                      <Button onClick={handleConnectWhatsApp}>
                        <Wifi className="w-4 h-4 mr-2" />
                        Conectar WhatsApp
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Instructions Card */}
            <Card>
              <CardHeader>
                <CardTitle>Información Importante</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">¿Cómo funciona?</h4>
                  <p className="text-blue-800 text-sm">
                    El bot de WhatsApp permite que tus clientes interactúen con el sistema de asesoría empresarial. 
                    Una vez conectado, los clientes con suscripción activa podrán hacer consultas y recibir respuestas inteligentes.
                  </p>
                </div>
                
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2">Seguridad</h4>
                  <p className="text-green-800 text-sm">
                    Solo los clientes registrados en el sistema con suscripción activa pueden usar el servicio. 
                    El sistema verifica automáticamente el acceso antes de responder.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
