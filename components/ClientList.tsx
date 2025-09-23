'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  MessageSquare, 
  Clock,
  User,
  Phone,
  Calendar
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import ClientDialog from './ClientDialog'

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
  // Campos opcionales para compatibilidad
  phone?: string       // Para compatibilidad con versiones anteriores
  expiryDate?: string  // Para sistemas con fechas de expiración
  isActive?: boolean   // Para compatibilidad con versiones anteriores
  lastActivity?: string // Para compatibilidad con versiones anteriores
}

interface ClientListProps {
  clients: Client[]
  onClientUpdated: () => void
}

export default function ClientList({ clients, onClientUpdated }: ClientListProps) {
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [deletingClient, setDeletingClient] = useState<string | null>(null)

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este cliente?')) return

    setDeletingClient(clientId)
    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        onClientUpdated()
      }
    } catch (error) {
      console.error('Error deleting client:', error)
    } finally {
      setDeletingClient(null)
    }
  }

  const handleToggleStatus = async (clientId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/clients/${clientId}/toggle`, {
        method: 'PATCH'
      })

      if (response.ok) {
        onClientUpdated()
      }
    } catch (error) {
      console.error('Error toggling client status:', error)
    }
  }

  // 🔧 NUEVA FUNCIÓN: Promocionar a VIP
  const promoteToVIP = async (clientId: string, phoneNumber: string) => {
    try {
      const response = await fetch('/api/clients/promote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone: phoneNumber })
      })

      if (response.ok) {
        onClientUpdated() // Recargar la lista
        console.log('Cliente promocionado a VIP exitosamente')
      } else {
        console.error('Error al promocionar cliente')
      }
    } catch (error) {
      console.error('Error promoting client to VIP:', error)
    }
  }

  const getStatusBadge = (client: Client) => {
    // 🔧 ADAPTAR A LA NUEVA ESTRUCTURA DE DATOS
    switch (client.status) {
      case 'new':
        return <Badge variant="secondary">Nuevo</Badge>
      case 'active':
        return <Badge variant="success">Activo</Badge>
      case 'vip':
        return <Badge variant="warning">VIP</Badge>
      default:
        return <Badge variant="secondary">Desconocido</Badge>
    }
  }

  if (clients.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay clientes</h3>
        <p className="text-gray-500">
          Agrega tu primer cliente para comenzar a gestionar suscripciones.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3 sm:space-y-4">
        {clients.map((client) => {
          // 🔧 OBTENER PROPIEDADES CON FALLBACKS DE COMPATIBILIDAD
          const phoneNumber = client.phoneNumber || client.phone || 'No disponible'
          const lastActivity = client.lastSeen || client.lastActivity
          
          return (
            <Card key={client.id} className="card-hover w-full max-w-full overflow-hidden">
              <CardContent className="p-3 sm:p-4 lg:p-6 w-full max-w-full">
                <div className="flex flex-col space-y-3 sm:space-y-4 w-full max-w-full overflow-hidden">
                  {/* Header Row - Name and Status */}
                  <div className="flex items-start justify-between gap-2 w-full max-w-full overflow-hidden">
                    <div className="flex-1 min-w-0 space-y-1 overflow-hidden">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full overflow-hidden">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate flex-1 min-w-0">{client.name}</h3>
                        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                          {getStatusBadge(client)}
                          {client.isNameConfirmed && (
                            <Badge variant="outline" className="text-xs whitespace-nowrap">Verificado</Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-gray-600 w-full overflow-hidden">
                        <div className="flex items-center space-x-1 min-w-0 overflow-hidden">
                          <Phone className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="truncate flex-1 min-w-0">{phoneNumber}</span>
                        </div>
                        <div className="flex items-center space-x-1 flex-shrink-0">
                          <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="whitespace-nowrap">{client.messageCount} mensajes</span>
                        </div>
                      </div>
                    </div>

                    {/* Mobile Actions Menu */}
                    <div className="flex items-center space-x-1 sm:hidden flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingClient(client)}
                        className="h-8 w-8 p-0 flex-shrink-0"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClient(client.id)}
                        disabled={deletingClient === client.id}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:border-red-300 flex-shrink-0"
                      >
                        {deletingClient === client.id ? (
                          <div className="w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Details Grid - Responsive */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm w-full max-w-full overflow-hidden">
                    {client.firstSeen && (
                      <div className="flex items-start space-x-2 min-w-0 overflow-hidden">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <span className="text-gray-600 block text-xs">Primer contacto:</span>
                          <div className="font-medium truncate">{formatDate(client.firstSeen)}</div>
                        </div>
                      </div>
                    )}
                    
                    {lastActivity && (
                      <div className="flex items-start space-x-2 min-w-0 overflow-hidden">
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <span className="text-gray-600 block text-xs">Última actividad:</span>
                          <div className="font-medium truncate">{formatDate(lastActivity)}</div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Topics - Responsive */}
                  {client.topics && client.topics.length > 0 && (
                    <div className="space-y-1 w-full max-w-full overflow-hidden">
                      <span className="text-xs text-gray-500">Temas:</span>
                      <div className="flex flex-wrap gap-1 w-full max-w-full overflow-hidden">
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

                  {/* Desktop Actions - Hidden on mobile */}
                  <div className="hidden sm:flex items-center justify-end space-x-2 pt-2 border-t border-gray-100 w-full max-w-full overflow-hidden">
                    {client.status !== 'vip' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => promoteToVIP(client.id, client.phoneNumber || client.phone || '')}
                        className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0"
                      >
                        👑 <span className="hidden sm:inline ml-1">Promocionar a VIP</span>
                        <span className="sm:hidden ml-1">VIP</span>
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingClient(client)}
                      className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0"
                    >
                      <Edit className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                      Editar
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClient(client.id)}
                      disabled={deletingClient === client.id}
                      className="text-red-600 hover:text-red-700 hover:border-red-300 text-xs sm:text-sm whitespace-nowrap flex-shrink-0"
                    >
                      {deletingClient === client.id ? (
                        <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      )}
                    </Button>
                  </div>

                  {/* Mobile VIP Promotion - Shown only on mobile if not VIP */}
                  {client.status !== 'vip' && (
                    <div className="sm:hidden w-full max-w-full">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => promoteToVIP(client.id, client.phoneNumber || client.phone || '')}
                        className="w-full text-xs whitespace-nowrap"
                      >
                        👑 Promocionar a VIP
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Edit Client Dialog */}
      {editingClient && (
        <ClientDialog
          isOpen={!!editingClient}
          onClose={() => setEditingClient(null)}
          onClientAdded={() => {
            onClientUpdated()
            setEditingClient(null)
          }}
          client={{
            id: editingClient.id,
            name: editingClient.name,
            phone: editingClient.phoneNumber || editingClient.phone || '',  // 🔧 ADAPTADOR
            expiryDate: editingClient.expiryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()  // 🔧 FALLBACK: 30 días
          }}
        />
      )}
    </>
  )
}
