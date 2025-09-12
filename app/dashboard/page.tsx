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
import MobileMenuButton from '@/components/MobileMenuButton'

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    // 🛡️ TEMPORAL: Deshabilitar verificación de autenticación para debugging
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)

      // 🛡️ TEMPORAL: Remover autenticación para debugging
      const [statsResponse, clientsResponse] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/clients')
      ])

      if (statsResponse.ok && clientsResponse.ok) {
        const statsData = await statsResponse.json()
        const clientsData = await clientsResponse.json()

        setStats(statsData)
        // 🔧 EXTRAER CORRECTAMENTE EL ARRAY DE CLIENTES CON PROTECCIÓN
        if (clientsData && clientsData.success && Array.isArray(clientsData.clients)) {
          setClients(clientsData.clients)
        } else if (clientsData && Array.isArray(clientsData)) {
          setClients(clientsData)
        } else {
          console.warn('Estructura de datos de clientes inesperada:', clientsData)
          setClients([])
        }
      } else {
        console.error('Error fetching data:', {
          statsStatus: statsResponse.status,
          clientsStatus: clientsResponse.status
        })
        
        // Intentar al menos cargar los datos que funcionan
        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          setStats(statsData)
        }
        if (clientsResponse.ok) {
          const clientsData = await clientsResponse.json()
          if (clientsData && clientsData.success && Array.isArray(clientsData.clients)) {
            setClients(clientsData.clients)
          } else {
            setClients([])
          }
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setStats({
        totalClients: 0,
        activeClients: 0,
        expiredClients: 0,
        totalMessages: 0,
        todayMessages: 0,
        expiringToday: 0
      })
      setClients([])
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
      <div className="flex min-h-screen">
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="loading-dots mb-3">
              <div></div>
              <div></div>
              <div></div>
              <div></div>
            </div>
            <p className="text-sm sm:text-base text-gray-600">Cargando dashboard...</p>
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
          {/* Stats Cards - Responsive Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 lg:mb-8">
            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{stats.totalClients}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.activeClients} activos
                </p>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Mensajes Hoy</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{stats.todayMessages}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalMessages} total
                </p>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Expiran Hoy</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-yellow-600">{stats.expiringToday}</div>
                <p className="text-xs text-muted-foreground">
                  Requieren renovación
                </p>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tasa Actividad</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-green-600">
                  {stats.totalClients > 0 ? Math.round((stats.activeClients / stats.totalClients) * 100) : 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Clientes activos
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Client Management Section - Fully Responsive */}
          <Card className="shadow-lg w-full max-w-full overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex flex-col space-y-4 lg:flex-row lg:justify-between lg:items-center lg:space-y-0 w-full max-w-full overflow-hidden">
                <div className="space-y-1 flex-1 min-w-0 overflow-hidden">
                  <CardTitle className="text-lg sm:text-xl truncate">Gestión de Clientes</CardTitle>
                  <CardDescription className="text-sm sm:text-base">
                    Administra las suscripciones y accesos de tus clientes
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => setIsClientDialogOpen(true)} 
                  className="w-full sm:w-auto text-sm sm:text-base flex-shrink-0 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="hidden sm:inline">Agregar Cliente</span>
                  <span className="sm:hidden">Agregar</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden">
              {/* Filters - Mobile Optimized */}
              <div className="space-y-3 sm:space-y-4 w-full max-w-full overflow-hidden">
                <div className="relative w-full max-w-full">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 flex-shrink-0" />
                  <Input
                    placeholder="Buscar por nombre o teléfono..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 text-sm sm:text-base w-full"
                  />
                </div>
                
                {/* Filter Buttons - Responsive Layout */}
                <div className="flex flex-wrap gap-2 sm:gap-3 w-full max-w-full overflow-hidden">
                  <Button
                    variant={filterStatus === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('all')}
                    className="text-xs sm:text-sm flex-1 sm:flex-none min-w-0 whitespace-nowrap"
                  >
                    Todos
                  </Button>
                  <Button
                    variant={filterStatus === 'active' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('active')}
                    className="text-xs sm:text-sm flex-1 sm:flex-none min-w-0 whitespace-nowrap"
                  >
                    Activos
                  </Button>
                  <Button
                    variant={filterStatus === 'expiring' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('expiring')}
                    className="text-xs sm:text-sm flex-1 sm:flex-none min-w-0 whitespace-nowrap"
                  >
                    <span className="hidden sm:inline">Por Vencer</span>
                    <span className="sm:hidden">Vencer</span>
                  </Button>
                  <Button
                    variant={filterStatus === 'expired' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('expired')}
                    className="text-xs sm:text-sm flex-1 sm:flex-none min-w-0 whitespace-nowrap"
                  >
                    <span className="hidden sm:inline">Expirados</span>
                    <span className="sm:hidden">Exp.</span>
                  </Button>
                </div>
              </div>

              <div className="w-full max-w-full overflow-hidden">
                <ClientList 
                  clients={filteredClients} 
                  onClientUpdated={fetchDashboardData}
                />
              </div>
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
