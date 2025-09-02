'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Settings, 
  Building, 
  MessageCircle, 
  Palette, 
  Save, 
  RefreshCw,
  User,
  Phone,
  Clock,
  Bot,
  ArrowLeft
} from 'lucide-react'

interface ConfigSettings {
  company_name: string
  company_description: string
  representative_name: string
  representative_role: string
  greeting_style: string
  response_tone: string
  business_hours_start: string
  business_hours_end: string
  auto_responses: boolean
  welcome_message: string
  fallback_message: string
  api_rotation: boolean
}

export default function SettingsPage() {
  const router = useRouter()
  const [config, setConfig] = useState<ConfigSettings>({
    company_name: '',
    company_description: '',
    representative_name: '',
    representative_role: '',
    greeting_style: 'dynamic',
    response_tone: 'professional',
    business_hours_start: '09:00',
    business_hours_end: '18:00',
    auto_responses: true,
    welcome_message: '',
    fallback_message: '',
    api_rotation: true
  })
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        setConfig(prev => ({ ...prev, ...data }))
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      setMessage({ type: 'error', text: 'Error al cargar la configuración' })
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Configuración guardada y sincronizada exitosamente' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        throw new Error('Error al guardar')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage({ type: 'error', text: 'Error al guardar la configuración' })
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field: keyof ConfigSettings, value: string | boolean) => {
    setConfig(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-2 text-lg text-gray-600">Cargando configuración...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              onClick={() => router.push('/dashboard')}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al Dashboard
            </Button>
            
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Settings className="w-8 h-8 text-blue-600" />
                Configuración del Sistema
              </h1>
              <p className="text-gray-600 mt-2">
                Personaliza el comportamiento y la identidad de tu asesor empresarial
              </p>
            </div>
          </div>
          
          <Button 
            onClick={saveSettings}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>

        {/* Messages */}
        {message && (
          <div className={`p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Identidad de la Empresa */}
          <Card className="p-6 bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center gap-3 mb-6">
              <Building className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Identidad de la Empresa</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="company_name" className="text-sm font-medium text-gray-700">
                  Nombre de la Empresa
                </Label>
                <Input
                  id="company_name"
                  value={config.company_name}
                  onChange={(e) => handleChange('company_name', e.target.value)}
                  placeholder="Ej: Consultora Estratégica Perú"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Este nombre aparecerá en las presentaciones del agente
                </p>
              </div>

              <div>
                <Label htmlFor="company_description" className="text-sm font-medium text-gray-700">
                  Descripción de la Empresa
                </Label>
                <Input
                  id="company_description"
                  value={config.company_description}
                  onChange={(e) => handleChange('company_description', e.target.value)}
                  placeholder="Especialistas en estrategias fiscales y estructuras empresariales"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="representative_name" className="text-sm font-medium text-gray-700">
                  Nombre del Representante (Opcional)
                </Label>
                <Input
                  id="representative_name"
                  value={config.representative_name}
                  onChange={(e) => handleChange('representative_name', e.target.value)}
                  placeholder="Ej: Carlos Mendoza"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="representative_role" className="text-sm font-medium text-gray-700">
                  Cargo del Representante
                </Label>
                <Input
                  id="representative_role"
                  value={config.representative_role}
                  onChange={(e) => handleChange('representative_role', e.target.value)}
                  placeholder="Ej: Consultor Senior"
                  className="mt-1"
                />
              </div>
            </div>
          </Card>

          {/* Personalidad y Comunicación */}
          <Card className="p-6 bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center gap-3 mb-6">
              <User className="w-6 h-6 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">Personalidad y Comunicación</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Estilo de Saludo</Label>
                <div className="mt-2 space-y-2">
                  {[
                    { value: 'dynamic', label: 'Dinámico (cambia según la hora)' },
                    { value: 'professional', label: 'Profesional estándar' },
                    { value: 'friendly', label: 'Amigable y cercano' },
                    { value: 'formal', label: 'Formal y corporativo' }
                  ].map((option) => (
                    <label key={option.value} className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="greeting_style"
                        value={option.value}
                        checked={config.greeting_style === option.value}
                        onChange={(e) => handleChange('greeting_style', e.target.value)}
                        className="text-blue-600"
                      />
                      <span className="text-sm text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Tono de Respuesta</Label>
                <div className="mt-2 space-y-2">
                  {[
                    { value: 'professional', label: 'Profesional y directo' },
                    { value: 'consultative', label: 'Consultivo y analítico' },
                    { value: 'expert', label: 'Técnico y especializado' },
                    { value: 'innovative', label: 'Creativo e innovador' }
                  ].map((option) => (
                    <label key={option.value} className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="response_tone"
                        value={option.value}
                        checked={config.response_tone === option.value}
                        onChange={(e) => handleChange('response_tone', e.target.value)}
                        className="text-green-600"
                      />
                      <span className="text-sm text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Mensajes Personalizados */}
          <Card className="p-6 bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center gap-3 mb-6">
              <MessageCircle className="w-6 h-6 text-purple-600" />
              <h2 className="text-xl font-semibold text-gray-900">Mensajes Personalizados</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="welcome_message" className="text-sm font-medium text-gray-700">
                  Mensaje de Bienvenida
                </Label>
                <textarea
                  id="welcome_message"
                  value={config.welcome_message}
                  onChange={(e) => handleChange('welcome_message', e.target.value)}
                  placeholder="¡Hola! Soy tu asesor empresarial especializado. ¿En qué puedo ayudarte hoy?"
                  className="mt-1 w-full p-3 border border-gray-300 rounded-md resize-none h-20"
                />
              </div>

              <div>
                <Label htmlFor="fallback_message" className="text-sm font-medium text-gray-700">
                  Mensaje de Respaldo (cuando hay errores)
                </Label>
                <textarea
                  id="fallback_message"
                  value={config.fallback_message}
                  onChange={(e) => handleChange('fallback_message', e.target.value)}
                  placeholder="Disculpa, estoy experimentando dificultades técnicas. ¿Podrías reformular tu consulta?"
                  className="mt-1 w-full p-3 border border-gray-300 rounded-md resize-none h-20"
                />
              </div>
            </div>
          </Card>

          {/* Configuración Técnica */}
          <Card className="p-6 bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center gap-3 mb-6">
              <Bot className="w-6 h-6 text-orange-600" />
              <h2 className="text-xl font-semibold text-gray-900">Configuración Técnica</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Respuestas Automáticas</Label>
                  <p className="text-xs text-gray-500">Activar respuestas automáticas del bot</p>
                </div>
                <input
                  type="checkbox"
                  checked={config.auto_responses}
                  onChange={(e) => handleChange('auto_responses', e.target.checked)}
                  className="w-5 h-5 text-orange-600"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Rotación de APIs</Label>
                  <p className="text-xs text-gray-500">Usar rotación inteligente de APIs para mayor disponibilidad</p>
                </div>
                <input
                  type="checkbox"
                  checked={config.api_rotation}
                  onChange={(e) => handleChange('api_rotation', e.target.checked)}
                  className="w-5 h-5 text-orange-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="business_hours_start" className="text-sm font-medium text-gray-700">
                    Hora de Inicio
                  </Label>
                  <Input
                    id="business_hours_start"
                    type="time"
                    value={config.business_hours_start}
                    onChange={(e) => handleChange('business_hours_start', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="business_hours_end" className="text-sm font-medium text-gray-700">
                    Hora de Fin
                  </Label>
                  <Input
                    id="business_hours_end"
                    type="time"
                    value={config.business_hours_end}
                    onChange={(e) => handleChange('business_hours_end', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Vista Previa */}
        <Card className="p-6 bg-white shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <Palette className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-semibold text-gray-900">Vista Previa</h2>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-2">Así se presentará tu agente:</div>
            <div className="bg-white p-4 rounded border-l-4 border-blue-500">
              <p className="text-gray-900">
                {config.greeting_style === 'dynamic' 
                  ? `¡Buenos días! ${config.representative_name ? config.representative_name + ', s' : 'S'}oy su asesor empresarial especializado${config.company_name ? ` de ${config.company_name}` : ''}. ¿En qué aspecto estratégico puedo asistirle?`
                  : config.welcome_message || '¡Hola! Soy tu asesor empresarial especializado. ¿En qué puedo ayudarte hoy?'
                }
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}