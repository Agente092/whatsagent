import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import fs from 'fs/promises'
import path from 'path'

const prisma = new PrismaClient()

// 🔄 CONFIGURACIÓN COMPARTIDA ENTRE FRONTEND Y BACKEND
const CONFIG_FILE = path.join(process.cwd(), 'data', 'system-config.json')

// Configuración por defecto
const DEFAULT_CONFIG = {
  company_name: 'Tu Empresa',
  company_description: 'Especialistas en estrategias empresariales',
  representative_name: '',
  representative_role: 'Asesor Empresarial',
  greeting_style: 'dynamic',
  response_tone: 'professional',
  business_hours_start: '09:00',
  business_hours_end: '18:00',
  auto_responses: true,
  welcome_message: '',
  fallback_message: 'Disculpa, estoy experimentando dificultades técnicas. ¿Podrías reformular tu consulta?',
  api_rotation: true,
  max_apis_to_use: 15,
  client_recognition: true,
  personalized_greetings: true,
  save_conversation_history: true,
  response_delay_simulation: false,
  typing_indicator: true
}

async function ensureConfigFile() {
  try {
    // Crear directorio si no existe
    const dataDir = path.dirname(CONFIG_FILE)
    await fs.mkdir(dataDir, { recursive: true })
    
    // Verificar si el archivo existe
    try {
      await fs.access(CONFIG_FILE)
    } catch {
      // Crear archivo con configuración por defecto
      await fs.writeFile(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf8')
      console.log('✅ Archivo de configuración compartido creado')
    }
  } catch (error) {
    console.error('❌ Error ensuring config file:', error)
  }
}

async function loadConfig() {
  try {
    await ensureConfigFile()
    const data = await fs.readFile(CONFIG_FILE, 'utf8')
    const savedConfig = JSON.parse(data)
    return { ...DEFAULT_CONFIG, ...savedConfig }
  } catch (error) {
    console.error('Error loading config:', error)
    return DEFAULT_CONFIG
  }
}

async function saveConfig(newConfig: any) {
  try {
    await ensureConfigFile()
    const currentConfig = await loadConfig()
    const updatedConfig = { ...currentConfig, ...newConfig }
    await fs.writeFile(CONFIG_FILE, JSON.stringify(updatedConfig, null, 2), 'utf8')
    console.log('✅ Configuración guardada en archivo compartido')
    return updatedConfig
  } catch (error) {
    console.error('Error saving config:', error)
    throw error
  }
}

export async function GET() {
  try {
    const config = await loadConfig()
    return NextResponse.json(config)
  } catch (error) {
    console.error('Error loading settings:', error)
    return NextResponse.json(
      { error: 'Error al cargar la configuración' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validar datos requeridos
    const requiredFields = ['company_name', 'greeting_style', 'response_tone']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `El campo ${field} es requerido` },
          { status: 400 }
        )
      }
    }

    // 🔄 GUARDAR EN ARCHIVO COMPARTIDO
    const updatedConfig = await saveConfig(body)
    
    // 🔄 NOTIFICAR AL BACKEND QUE RECARGUE LA CONFIGURACIÓN
    try {
      const backendResponse = await fetch('http://localhost:3001/api/server/config/reload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (backendResponse.ok) {
        console.log('✅ Backend notificado para recargar configuración')
      } else {
        console.warn('⚠️ Backend reload notification failed')
      }
    } catch (syncError) {
      // Corrección de tipo: syncError puede ser de tipo unknown
      const errorMessage = syncError instanceof Error ? syncError.message : String(syncError);
      console.warn('⚠️ No se pudo notificar al backend:', errorMessage)
    }
    
    console.log('✅ Configuración guardada:', {
      company_name: body.company_name,
      representative_name: body.representative_name,
      greeting_style: body.greeting_style,
      response_tone: body.response_tone,
      auto_responses: body.auto_responses,
      api_rotation: body.api_rotation
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Configuración guardada y sincronizada exitosamente',
      config: updatedConfig
    })
  } catch (error) {
    console.error('Error saving settings:', error)
    return NextResponse.json(
      { error: 'Error al guardar la configuración' },
      { status: 500 }
    )
  }
}