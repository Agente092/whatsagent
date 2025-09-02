'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar, Clock, User, Phone } from 'lucide-react'
import { formatPhone, validatePhone } from '@/lib/utils'

interface ClientDialogProps {
  isOpen: boolean
  onClose: () => void
  onClientAdded: () => void
  client?: {
    id: string
    name: string
    phone: string
    expiryDate: string
  }
}

export default function ClientDialog({ isOpen, onClose, onClientAdded, client }: ClientDialogProps) {
  const [formData, setFormData] = useState({
    name: client?.name || '',
    phone: client?.phone || '',
    expiryDate: client?.expiryDate ? new Date(client.expiryDate).toISOString().slice(0, 16) : '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'El teléfono es requerido'
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Formato de teléfono inválido'
    }

    // 🔧 ADAPTACIÓN: Solo validar fecha de expiración para clientes nuevos
    if (!client && !formData.expiryDate) {
      newErrors.expiryDate = 'La fecha de expiración es requerida para clientes nuevos'
    } else if (formData.expiryDate) {
      const expiryDate = new Date(formData.expiryDate)
      const now = new Date()
      if (expiryDate <= now) {
        newErrors.expiryDate = 'La fecha debe ser futura'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsLoading(true)

    try {
      const url = client ? `/api/clients/${client.id}` : '/api/clients'
      const method = client ? 'PUT' : 'POST'

      // 🔧 ADAPTACIÓN: Solo enviar datos que el backend espera
      const requestBody = client ? {
        // Para actualizar cliente existente - solo nombre y teléfono
        name: formData.name.trim(),
        phone: formatPhone(formData.phone)
      } : {
        // Para crear nuevo cliente - incluir fecha de expiración
        name: formData.name.trim(),
        phone: formatPhone(formData.phone),
        expiryDate: new Date(formData.expiryDate).toISOString()
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        onClientAdded()
        handleClose()
      } else {
        const errorData = await response.json()
        if (errorData.field) {
          setErrors({ [errorData.field]: errorData.message })
        } else {
          setErrors({ general: errorData.message || errorData.error || 'Error al guardar cliente' })
        }
      }
    } catch (error) {
      console.error('Error submitting client:', error)
      setErrors({ general: 'Error de conexión. Intenta nuevamente.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      name: '',
      phone: '',
      expiryDate: '',
    })
    setErrors({})
    onClose()
  }

  const handlePhoneChange = (value: string) => {
    // Remove non-numeric characters and format
    const cleaned = value.replace(/\D/g, '')
    let formatted = cleaned

    // Add formatting for display
    if (cleaned.length >= 2) {
      if (cleaned.startsWith('51')) {
        formatted = `+51 ${cleaned.slice(2)}`
      } else if (cleaned.length === 9) {
        formatted = `+51 ${cleaned}`
      }
    }

    setFormData(prev => ({ ...prev, phone: formatted }))
  }

  // Set default expiry date to 30 days from now
  const getDefaultExpiryDate = () => {
    const date = new Date()
    date.setDate(date.getDate() + 30)
    return date.toISOString().slice(0, 16)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="w-5 h-5" />
            <span>{client ? 'Editar Cliente' : 'Agregar Nuevo Cliente'}</span>
          </DialogTitle>
          <DialogDescription>
            {client 
              ? 'Modifica los datos del cliente y su fecha de expiración.'
              : 'Completa los datos del cliente para otorgar acceso al servicio.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span>Nombre Completo</span>
            </Label>
            <Input
              id="name"
              placeholder="Ej: Juan Pérez García"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center space-x-2">
              <Phone className="w-4 h-4" />
              <span>Número de WhatsApp</span>
            </Label>
            <Input
              id="phone"
              placeholder="Ej: +51 987654321"
              value={formData.phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              className={errors.phone ? 'border-red-500' : ''}
            />
            {errors.phone && <p className="text-sm text-red-600">{errors.phone}</p>}
            <p className="text-xs text-gray-500">
              Formato: +51 seguido del número de 9 dígitos
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiryDate" className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>Fecha y Hora de Expiración{client ? ' (opcional)' : ''}</span>
            </Label>
            <Input
              id="expiryDate"
              type="datetime-local"
              value={formData.expiryDate || (client ? '' : getDefaultExpiryDate())}
              onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
              className={errors.expiryDate ? 'border-red-500' : ''}
              min={new Date().toISOString().slice(0, 16)}
            />
            {errors.expiryDate && <p className="text-sm text-red-600">{errors.expiryDate}</p>}
            <p className="text-xs text-gray-500">
              {client 
                ? 'Solo se actualizará el nombre del cliente en el sistema de ChatBot'
                : 'El cliente perderá acceso automáticamente en esta fecha'
              }
            </p>
          </div>

          {errors.general && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {errors.general}
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Guardando...</span>
                </div>
              ) : (
                client ? 'Actualizar Cliente' : 'Agregar Cliente'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
