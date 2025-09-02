'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Users, Search, Filter, MoreVertical, MessageCircle, Calendar, Phone, Star } from 'lucide-react'

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
        setClients(data.clients || [])
      } else {
        showNotification('Error al cargar clientes', 'error')
      }
    } catch (error) {
      console.error('Error loading clients:', error)
      showNotification('Error de conexión', 'error')
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

  const filteredClients = clients.filter(client => {
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              onClick={() => router.push('/dashboard')} 
              variant="outline"
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver al Dashboard</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestión de Clientes</h1>
              <p className="text-gray-600">Administra y monitorea la base de clientes</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-600">Nuevos</p>
                  <p className="text-2xl font-bold">{stats.new}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-600">Activos</p>
                  <p className="text-2xl font-bold">{stats.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Star className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="text-sm text-gray-600">VIP</p>
                  <p className="text-2xl font-bold">{stats.vip}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-600">Identificados</p>
                  <p className="text-2xl font-bold">{stats.withConfirmedNames}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
              <div className="flex items-center space-x-2 flex-1">
                <Search className="w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre o teléfono..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
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
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold">
                            {client.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-gray-900">{client.name}</h3>
                            {client.isNameConfirmed && (
                              <Badge variant="secondary" className="text-xs">Verificado</Badge>
                            )}
                            <Badge className={getStatusColor(client.status)}>
                              {getStatusLabel(client.status)}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                            <div className="flex items-center space-x-1">
                              <Phone className="w-3 h-3" />
                              <span>{client.phoneNumber}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <MessageCircle className="w-3 h-3" />
                              <span>{client.messageCount} mensajes</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>Último: {formatDate(client.lastSeen)}</span>
                            </div>
                          </div>
                          
                          {client.topics.length > 0 && (
                            <div className="flex items-center space-x-2 mt-2">
                              <span className="text-xs text-gray-500">Temas:</span>
                              {client.topics.slice(0, 3).map((topic, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {topic}
                                </Badge>
                              ))}
                              {client.topics.length > 3 && (
                                <span className="text-xs text-gray-400">
                                  +{client.topics.length - 3} más
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {client.status !== 'vip' && (
                          <Button
                            size="sm"
                            onClick={() => promoteToVIP(client.id, client.phoneNumber)}
                            className="flex items-center space-x-1"
                          >
                            <Star className="w-3 h-3" />
                            <span>Promocionar a VIP</span>
                          </Button>
                        )}
                        
                        <Button size="sm" variant="outline">
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
    </div>
  )
}