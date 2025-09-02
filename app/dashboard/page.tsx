'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, MessageSquare, Clock, TrendingUp, Plus, Search, Filter } from 'lucide-react'
import { Input } from '@/components/ui/input'
import ClientDialog from '@/components/ClientDialog'
import ClientList from '@/components/ClientList'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'

interface DashboardStats {
  totalClients: number
  activeClients: number
  expiredClients: number
  totalMessages: number
  todayMessages: number
  expiringToday: number
}

interface Client {
  id: string
  name: string
  phoneNumber: string  // 🔧 CAMBIO: phoneNumber en lugar de phone
  isNameConfirmed: boolean
  firstSeen: string
  lastSeen: string     // 🔧 CAMBIO: lastSeen en lugar de lastActivity
  messageCount: number
  status: 'new' | 'active' | 'vip'  // 🔧 CAMBIO: status en lugar de isActive
  topics: string[]
  preferences: Record<string, any>
  // Campos opcionales para compatibilidad con el sistema anterior
  phone?: string       // Compatibilidad
  expiryDate?: string  // Compatibilidad
  isActive?: boolean   // Compatibilidad  
  lastActivity?: string // Compatibilidad
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeClients: 0,
    expiredClients: 0,
    totalMessages: 0,
    todayMessages: 0,
    expiringToday: 0
  })
  
  const [clients, setClients] = useState<Client[]>([])
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired' | 'expiring'>('all')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check authentication on component mount
    const token = localStorage.getItem('token')
    if (!token) {
      window.location.href = '/login'
      return
    }

    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)

      // Get token from localStorage
      const token = localStorage.getItem('token')

      if (!token) {
        console.error('No authentication token found')
        // Redirect to login if no token
        window.location.href = '/login'
        return
      }

      const [statsResponse, clientsResponse] = await Promise.all([
        fetch('/api/dashboard/stats', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch('/api/clients', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      ])

      if (statsResponse.ok && clientsResponse.ok) {
        const statsData = await statsResponse.json()
        const clientsData = await clientsResponse.json()

        setStats(statsData)
        // 🔧 EXTRAER CORRECTAMENTE EL ARRAY DE CLIENTES
        setClients(clientsData.clients || [])
      } else {
        // Handle authentication errors
        if (statsResponse.status === 401 || clientsResponse.status === 401) {
          console.error('Authentication failed - redirecting to login')
          localStorage.removeItem('token')
          window.location.href = '/login'
          return
        }

        console.error('Error fetching data:', {
          statsStatus: statsResponse.status,
          clientsStatus: clientsResponse.status
        })
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClientAdded = () => {
    fetchDashboardData()
    setIsClientDialogOpen(false)
  }

  const filteredClients = clients.filter(client => {
    // 🔧 ADAPTAR A LA NUEVA ESTRUCTURA DE DATOS
    const phoneNumber = client.phoneNumber || client.phone || ''
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         phoneNumber.includes(searchTerm)
    
    if (!matchesSearch) return false

    // 🔧 Los nuevos datos no tienen fechas de expiración, así que adaptamos los filtros
    switch (filterStatus) {
      case 'active':
        return client.status === 'active' || client.status === 'vip'
      case 'expired':
        return client.status === 'new' // Los clientes nuevos podrían necesitar seguimiento
      case 'expiring':
        return false // No hay sistema de expiración en los nuevos datos
      default:
        return true
    }
  })

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="loading-dots">
            <div></div>
            <div></div>
            <div></div>
            <div></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalClients}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.activeClients} activos
                </p>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Mensajes Hoy</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.todayMessages}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalMessages} total
                </p>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Expiran Hoy</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.expiringToday}</div>
                <p className="text-xs text-muted-foreground">
                  Requieren renovación
                </p>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tasa Actividad</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {stats.totalClients > 0 ? Math.round((stats.activeClients / stats.totalClients) * 100) : 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Clientes activos
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Client Management Section */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>Gestión de Clientes</CardTitle>
                  <CardDescription>
                    Administra las suscripciones y accesos de tus clientes
                  </CardDescription>
                </div>
                <Button onClick={() => setIsClientDialogOpen(true)} className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Cliente
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Buscar por nombre o teléfono..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={filterStatus === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('all')}
                  >
                    Todos
                  </Button>
                  <Button
                    variant={filterStatus === 'active' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('active')}
                  >
                    Activos
                  </Button>
                  <Button
                    variant={filterStatus === 'expiring' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('expiring')}
                  >
                    Por Vencer
                  </Button>
                  <Button
                    variant={filterStatus === 'expired' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('expired')}
                  >
                    Expirados
                  </Button>
                </div>
              </div>

              <ClientList 
                clients={filteredClients} 
                onClientUpdated={fetchDashboardData}
              />
            </CardContent>
          </Card>
        </main>
      </div>

      <ClientDialog
        isOpen={isClientDialogOpen}
        onClose={() => setIsClientDialogOpen(false)}
        onClientAdded={handleClientAdded}
      />
    </div>
  )
}
