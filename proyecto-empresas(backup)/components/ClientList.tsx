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
      <div className="space-y-4">
        {clients.map((client) => {
          // 🔧 OBTENER PROPIEDADES CON FALLBACKS DE COMPATIBILIDAD
          const phoneNumber = client.phoneNumber || client.phone || 'No disponible'
          const lastActivity = client.lastSeen || client.lastActivity
          
          return (
            <Card key={client.id} className="card-hover">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
                  {/* Client Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-semibold text-gray-900">{client.name}</h3>
                          {getStatusBadge(client)}
                          {client.isNameConfirmed && (
                            <Badge variant="outline" className="text-xs">Verificado</Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Phone className="w-4 h-4" />
                            <span>{phoneNumber}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MessageSquare className="w-4 h-4" />
                            <span>{client.messageCount} mensajes</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      {client.firstSeen && (
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <div>
                            <span className="text-gray-600">Primer contacto:</span>
                            <div className="font-medium">{formatDate(client.firstSeen)}</div>
                          </div>
                        </div>
                      )}
                      
                      {lastActivity && (
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <div>
                            <span className="text-gray-600">Última actividad:</span>
                            <div className="font-medium">{formatDate(lastActivity)}</div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Mostrar tópicos si existen */}
                    {client.topics && client.topics.length > 0 && (
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

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    {client.status !== 'vip' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => promoteToVIP(client.id, client.phoneNumber || client.phone || '')}
                      >
                        👑 Promocionar a VIP
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingClient(client)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClient(client.id)}
                      disabled={deletingClient === client.id}
                      className="text-red-600 hover:text-red-700 hover:border-red-300"
                    >
                      {deletingClient === client.id ? (
                        <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
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
