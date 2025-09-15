'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DollarSign, Users, Cpu, BarChart, TrendingUp, RefreshCw, AlertCircle } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import MobileMenuButton from '@/components/MobileMenuButton'

interface ApiUsageData {
  userId: string
  userName: string
  phone: string
  totalRequests: number
  inputTokens: number
  outputTokens: number
  totalCost: number
  lastRequest: string
  avgRequestsPerDay: number
}

interface ApiStats {
  totalUsers: number
  totalCosts: number
  totalRequests: number
  totalTokens: number
  avgCostPerUser: number
  costToday: number
}

export default function ApiUsagePage() {
  const [apiUsageData, setApiUsageData] = useState<ApiUsageData[]>([])
  const [apiStats, setApiStats] = useState<ApiStats>({
    totalUsers: 0,
    totalCosts: 0,
    totalRequests: 0,
    totalTokens: 0,
    avgCostPerUser: 0,
    costToday: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Costos de Gemini 1.5 Flash
  const GEMINI_COSTS = {
    inputTokenCost: 0.075 / 1000000, // $0.075 per million tokens
    outputTokenCost: 0.30 / 1000000, // $0.30 per million tokens
    model: 'gemini-1.5-flash'
  }

  useEffect(() => {
    fetchApiUsageData()
  }, [])

  const fetchApiUsageData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/api-usage/stats')
      if (!response.ok) {
        throw new Error('Error al obtener datos de uso de API')
      }

      const data = await response.json()
      setApiUsageData(data.users || [])
      setApiStats(data.stats || apiStats)
    } catch (error) {
      console.error('Error fetching API usage data:', error)
      setError(error instanceof Error ? error.message : 'Error desconocido')
      
      // Datos de ejemplo para demostración
      const mockData: ApiUsageData[] = [
        {
          userId: '1',
          userName: 'Luis García',
          phone: '+51987654321',
          totalRequests: 245,
          inputTokens: 123000,
          outputTokens: 89000,
          totalCost: 0.0362,
          lastRequest: '2025-01-15T10:30:00Z',
          avgRequestsPerDay: 8.2
        },
        {
          userId: '2',
          userName: 'María Rodríguez',
          phone: '+51987654322',
          totalRequests: 189,
          inputTokens: 94500,
          outputTokens: 67000,
          totalCost: 0.0271,
          lastRequest: '2025-01-15T09:15:00Z',
          avgRequestsPerDay: 6.3
        },
        {
          userId: '3',
          userName: 'Carlos Mendoza',
          phone: '+51987654323',
          totalRequests: 456,
          inputTokens: 230000,
          outputTokens: 178000,
          totalCost: 0.0707,
          lastRequest: '2025-01-15T11:45:00Z',
          avgRequestsPerDay: 15.2
        }
      ]

      setApiUsageData(mockData)
      
      // Calcular estadísticas mock
      const totalCosts = mockData.reduce((sum, user) => sum + user.totalCost, 0)
      const totalRequests = mockData.reduce((sum, user) => sum + user.totalRequests, 0)
      const totalTokens = mockData.reduce((sum, user) => sum + user.inputTokens + user.outputTokens, 0)
      
      setApiStats({
        totalUsers: mockData.length,
        totalCosts: totalCosts,
        totalRequests: totalRequests,
        totalTokens: totalTokens,
        avgCostPerUser: totalCosts / mockData.length,
        costToday: totalCosts * 0.15 // Estimación del 15% para hoy
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 6
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-PE').format(num)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">Cargando datos de consumo API...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50 w-full max-w-full overflow-x-hidden">
      {/* Mobile Menu Button */}
      <MobileMenuButton 
        isOpen={isMobileMenuOpen} 
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
      />
      
      {/* Sidebar */}
      <Sidebar 
        isMobileMenuOpen={isMobileMenuOpen} 
        setIsMobileMenuOpen={setIsMobileMenuOpen} 
      />
      
      <div className="flex-1 flex flex-col overflow-hidden w-full max-w-full min-w-0">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 w-full max-w-full">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Consumo de API</h1>
                <p className="text-gray-600 mt-2">
                  Monitoreo de costos por usuario - Modelo: {GEMINI_COSTS.model}
                </p>
              </div>
              <Button onClick={fetchApiUsageData} className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Actualizar
              </Button>
            </div>

            {/* Error Alert */}
            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="flex items-center gap-3 pt-6">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="text-red-800 font-medium">Error al cargar datos</p>
                    <p className="text-red-600 text-sm">{error}</p>
                    <p className="text-red-600 text-xs mt-1">Mostrando datos de ejemplo</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Costo Total</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(apiStats.totalCosts)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(apiStats.costToday)} hoy
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{apiStats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(apiStats.avgCostPerUser)} promedio
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                  <BarChart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(apiStats.totalRequests)}</div>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(Math.round(apiStats.totalRequests / apiStats.totalUsers))} por usuario
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(apiStats.totalTokens)}</div>
                  <p className="text-xs text-muted-foreground">
                    Input + Output tokens
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Pricing Info */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg text-blue-900">Información de Precios</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-blue-800">Modelo:</p>
                    <p className="text-blue-700">{GEMINI_COSTS.model}</p>
                  </div>
                  <div>
                    <p className="font-medium text-blue-800">Input Tokens:</p>
                    <p className="text-blue-700">$0.075 / 1M tokens</p>
                  </div>
                  <div>
                    <p className="font-medium text-blue-800">Output Tokens:</p>
                    <p className="text-blue-700">$0.30 / 1M tokens</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Users Table */}
            <Card>
              <CardHeader>
                <CardTitle>Consumo por Usuario</CardTitle>
                <CardDescription>
                  Detalle de costos y uso de API por cada usuario activo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium">Usuario</th>
                        <th className="text-left p-2 font-medium">Requests</th>
                        <th className="text-left p-2 font-medium">Input Tokens</th>
                        <th className="text-left p-2 font-medium">Output Tokens</th>
                        <th className="text-left p-2 font-medium">Costo Total</th>
                        <th className="text-left p-2 font-medium">Último Request</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apiUsageData.map((user) => (
                        <tr key={user.userId} className="border-b hover:bg-gray-50">
                          <td className="p-2">
                            <div>
                              <p className="font-medium">{user.userName}</p>
                              <p className="text-sm text-gray-500">{user.phone}</p>
                            </div>
                          </td>
                          <td className="p-2">
                            <Badge variant="outline">
                              {formatNumber(user.totalRequests)}
                            </Badge>
                            <p className="text-xs text-gray-500 mt-1">
                              {user.avgRequestsPerDay.toFixed(1)}/día
                            </p>
                          </td>
                          <td className="p-2">
                            <span className="text-sm">{formatNumber(user.inputTokens)}</span>
                          </td>
                          <td className="p-2">
                            <span className="text-sm">{formatNumber(user.outputTokens)}</span>
                          </td>
                          <td className="p-2">
                            <span className="font-medium text-green-600">
                              {formatCurrency(user.totalCost)}
                            </span>
                          </td>
                          <td className="p-2">
                            <span className="text-sm text-gray-600">
                              {formatDate(user.lastRequest)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {apiUsageData.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Cpu className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No hay datos de uso de API disponibles</p>
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