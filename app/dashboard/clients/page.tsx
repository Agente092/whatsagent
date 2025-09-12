'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Users, Search, Filter, MoreVertical, MessageCircle, Calendar, Phone, Star } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import MobileMenuButton from '@/components/MobileMenuButton'

interface Client {
  id: string
  name: string
  phoneNumber: string
  isNameConfirmed: boolean
  firstSeen: string
  lastSeen: string
  messageCount: number
  status: 'new' | 'active' | 'vip'
  topics: string[]
  preferences: Record<string, any>
}

interface ClientStats {
  total: number
  new: number
  active: number
  vip: number
  withConfirmedNames: number
}

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [stats, setStats] = useState<ClientStats>({
    total: 0,
    new: 0,
    active: 0,
    vip: 0,
    withConfirmedNames: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false) // 🔧 NUEVO: Estado para menú móvil

  // 🗏 SISTEMA DE NOTIFICACIONES SIMPLE
  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    const notification = document.createElement('div')
    notification.className = `fixed top-4 right-4 z-50 px-4 py-2 rounded-md text-white ${
      type === 'success' ? 'bg-green-500' : 'bg-red-500'
    } transition-opacity duration-300`
    notification.textContent = message
    
    document.body.appendChild(notification)
    
    setTimeout(() => {
      notification.style.opacity = '0'
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification)
        }
      }, 300)
    }, 3000)
  }

  useEffect(() => {
    loadClients()
    loadStats()
  }, [])

  const loadClients = async () => {
    try {
      const response = await fetch('/api/clients')
      if (response.ok) {
        const data = await response.json()
        // 🛡️ PROTECCIÓN: Verificar que data existe y tiene estructura correcta
        if (data && data.success && Array.isArray(data.clients)) {
          setClients(data.clients)
        } else if (data && Array.isArray(data)) {
          // Fallback para respuestas directas de array
          setClients(data)
        } else {
          console.warn('Estructura de datos inesperada:', data)
          setClients([])
        }
      } else {
        console.error('Error response:', response.status, response.statusText)
        showNotification('Error al cargar clientes', 'error')
        setClients([])
      }
    } catch (error) {
      console.error('Error loading clients:', error)
      showNotification('Error de conexión', 'error')
      setClients([])
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await fetch('/api/clients/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const promoteToVIP = async (clientId: string, phone: string) => {
    try {
      const response = await fetch('/api/clients/promote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone })
      })

      if (response.ok) {
        showNotification('Cliente promocionado a VIP')
        loadClients()
        loadStats()
      } else {
        showNotification('Error al promocionar cliente', 'error')
      }
    } catch (error) {
      console.error('Error promoting client:', error)
      showNotification('Error de conexión', 'error')
    }
  }

  const filteredClients = (clients || []).filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.phoneNumber.includes(searchTerm)
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800'
      case 'active': return 'bg-green-100 text-green-800'
      case 'vip': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) {
      return 'No disponible'
    }
    
    try {
      const date = new Date(dateString)
      
      // Verificar si la fecha es válida
      if (isNaN(date.getTime())) {
        return 'Fecha inválida'
      }
      
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      console.error('Error formatting date:', error, 'Input:', dateString)
      return 'Fecha inválida'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new': return 'Nuevo'
      case 'active': return 'Activo'
      case 'vip': return 'VIP'
      default: return status
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        {/* Mobile Menu Button durante la carga */}
        <MobileMenuButton 
          isOpen={isMobileMenuOpen} 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
        />
        
        {/* Sidebar durante la carga */}
        <Sidebar 
          isMobileMenuOpen={isMobileMenuOpen} 
          setIsMobileMenuOpen={setIsMobileMenuOpen} 
        />
        
        <div className="flex-1 flex flex-col overflow-hidden w-full max-w-full min-w-0">
          <Header />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
              <span className="text-sm sm:text-base text-gray-600">Cargando clientes...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50 w-full max-w-full overflow-x-hidden">
      {/* Mobile Menu Button - Always visible on mobile */}
      <MobileMenuButton 
        isOpen={isMobileMenuOpen} 
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
      />
      
      {/* Unified Sidebar - Responsive */}
      <Sidebar 
        isMobileMenuOpen={isMobileMenuOpen} 
        setIsMobileMenuOpen={setIsMobileMenuOpen} 
      />
      
      <div className="flex-1 flex flex-col overflow-hidden w-full max-w-full min-w-0">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 w-full max-w-full">
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 w-full max-w-full">
            {/* Header - Responsive */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                <Button 
                  onClick={() => router.push('/dashboard')} 
                  variant="outline"
                  className="flex items-center space-x-2 mb-2 sm:mb-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Volver al Dashboard</span>
                  <span className="sm:hidden">Volver</span>
                </Button>
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">Gestión de Clientes</h1>
                  <p className="text-sm sm:text-base text-gray-600">Administra y monitorea la base de clientes</p>
                </div>
              </div>
            </div>

        {/* Stats Cards - Responsive Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-600">Total</p>
                  <p className="text-lg sm:text-2xl font-bold truncate">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0"></div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-600">Nuevos</p>
                  <p className="text-lg sm:text-2xl font-bold truncate">{stats.new}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0"></div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-600">Activos</p>
                  <p className="text-lg sm:text-2xl font-bold truncate">{stats.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center space-x-2">
                <Star className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-600">VIP</p>
                  <p className="text-lg sm:text-2xl font-bold truncate">{stats.vip}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-2 sm:col-span-1">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full flex-shrink-0"></div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-600">Identificados</p>
                  <p className="text-lg sm:text-2xl font-bold truncate">{stats.withConfirmedNames}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters - Mobile Optimized */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4">
              <div className="flex items-center space-x-2 flex-1">
                <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <Input
                  placeholder="Buscar por nombre o teléfono..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 text-sm sm:text-base"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filtrar por estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="new">Nuevos</SelectItem>
                    <SelectItem value="active">Activos</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Clients List */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Clientes ({filteredClients.length})</CardTitle>
            <CardDescription>
              Gestiona la información y estado de tus clientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredClients.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No se encontraron clientes</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredClients.map((client) => (
                  <div
                    key={client.id}
                    className="border rounded-lg p-3 sm:p-4 hover:bg-gray-50 transition-colors w-full max-w-full overflow-hidden"
                  >
                    <div className="flex items-center justify-between w-full max-w-full overflow-hidden gap-2 sm:gap-4">
                      <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0 overflow-hidden">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-600 font-semibold text-sm sm:text-base">
                            {client.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 w-full overflow-hidden">
                            <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate flex-1 min-w-0">{client.name}</h3>
                            <div className="flex items-center space-x-2 flex-shrink-0 flex-wrap">
                              {client.isNameConfirmed && (
                                <Badge variant="secondary" className="text-xs whitespace-nowrap">Verificado</Badge>
                              )}
                              <Badge className={`${getStatusColor(client.status)} text-xs whitespace-nowrap`}>
                                {getStatusLabel(client.status)}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0 text-xs sm:text-sm text-gray-600 mt-1 w-full overflow-hidden">
                            <div className="flex items-center space-x-1 min-w-0 overflow-hidden">
                              <Phone className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{client.phoneNumber}</span>
                            </div>
                            <div className="flex items-center space-x-1 flex-shrink-0">
                              <MessageCircle className="w-3 h-3 flex-shrink-0" />
                              <span className="whitespace-nowrap">{client.messageCount} mensajes</span>
                            </div>
                            <div className="flex items-center space-x-1 min-w-0 overflow-hidden">
                              <Calendar className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">Último: {formatDate(client.lastSeen)}</span>
                            </div>
                          </div>
                          
                          {client.topics.length > 0 && (
                            <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 mt-2 w-full overflow-hidden">
                              <span className="text-xs text-gray-500 flex-shrink-0">Temas:</span>
                              <div className="flex flex-wrap gap-1 w-full overflow-hidden">
                                {client.topics.slice(0, 3).map((topic, index) => (
                                  <Badge key={index} variant="outline" className="text-xs whitespace-nowrap flex-shrink-0">
                                    {topic}
                                  </Badge>
                                ))}
                                {client.topics.length > 3 && (
                                  <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                                    +{client.topics.length - 3} más
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-end sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 flex-shrink-0">
                        {client.status !== 'vip' && (
                          <Button
                            size="sm"
                            onClick={() => promoteToVIP(client.id, client.phoneNumber)}
                            className="flex items-center space-x-1 text-xs whitespace-nowrap"
                          >
                            <Star className="w-3 h-3 flex-shrink-0" />
                            <span className="hidden sm:inline">Promocionar a VIP</span>
                            <span className="sm:hidden">VIP</span>
                          </Button>
                        )}
                        
                        <Button size="sm" variant="outline" className="whitespace-nowrap">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
          </div>
        </main>
      </div>
    </div>
  )
}