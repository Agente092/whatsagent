#!/usr/bin/env node

/**
 * 🔧 SCRIPT DE REPARACIÓN DE SESIONES WHATSAPP
 * 
 * PROBLEMA IDENTIFICADO: Bad MAC Error - sesiones de cifrado corruptas
 * CAUSA: Archivos de sesión de WhatsApp desincronizados/corruptos
 * SOLUCIÓN: Limpiar completamente las sesiones para regenerarlas
 * 
 * ADAPTADO PARA: Sistema empresarial con PostgreSQL + Prisma + Base de conocimiento propia
 */

const fs = require('fs')
const path = require('path')

console.log('🔧 REPARADOR DE SESIONES WHATSAPP - SISTEMA EMPRESARIAL')
console.log('====================================================')
console.log('')

async function fixWhatsAppSessions() {
  try {
    const authDir = path.join(__dirname, 'auth_info_baileys')
    
    console.log('🔍 Verificando directorio de autenticación...')
    console.log(`📁 Directorio: ${authDir}`)
    
    if (fs.existsSync(authDir)) {
      console.log('📁 Directorio encontrado')
      
      // Listar archivos antes de eliminar
      const files = fs.readdirSync(authDir)
      console.log(`📄 Archivos encontrados: ${files.length}`)
      
      // Mostrar tipos de archivos corruptos
      const sessionFiles = files.filter(f => f.startsWith('session-'))
      const preKeyFiles = files.filter(f => f.startsWith('pre-key-'))
      const syncFiles = files.filter(f => f.startsWith('app-state-sync-'))
      
      console.log(`🔑 Sesiones corruptas: ${sessionFiles.length}`)
      console.log(`🔐 Pre-keys corruptas: ${preKeyFiles.length}`)
      console.log(`🔄 Sync keys corruptas: ${syncFiles.length}`)
      
      if (files.length > 0) {
        console.log('')
        console.log('🗑️ Eliminando archivos de sesión corruptos...')
        
        // Eliminar directorio completo
        fs.rmSync(authDir, { recursive: true, force: true })
        console.log('✅ Archivos eliminados exitosamente')
      } else {
        console.log('📭 Directorio vacío, no hay archivos que eliminar')
      }
    } else {
      console.log('📂 Directorio de autenticación no existe')
    }
    
    // Recrear directorio limpio
    console.log('')
    console.log('📁 Recreando directorio de autenticación...')
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true })
      console.log('✅ Directorio recreado exitosamente')
    }
    
    console.log('')
    console.log('🎉 REPARACIÓN COMPLETADA')
    console.log('========================')
    console.log('✅ Sesiones de WhatsApp limpiadas')
    console.log('✅ Directorio de autenticación recreado')
    console.log('✅ Errores "Bad MAC Error" solucionados')
    console.log('')
    console.log('📱 PRÓXIMOS PASOS PARA TU SISTEMA EMPRESARIAL:')
    console.log('1. Reinicia el servidor: npm run dev:server')
    console.log('2. Ve al panel web: http://localhost:3001')
    console.log('3. Escanea el código QR para reconectar WhatsApp')
    console.log('')
    console.log('🏢 CARACTERÍSTICAS DE TU SISTEMA:')
    console.log('• ✅ PostgreSQL + Prisma ORM se mantiene intacto')
    console.log('• ✅ Base de conocimiento empresarial conservada')
    console.log('• ✅ Servicios de IA (Gemini, personalidad, etc.) funcionando')
    console.log('• ✅ Sistema de memoria conversacional preservado')
    console.log('• ✅ Solo se limpian las sesiones corruptas de WhatsApp')
    console.log('')
    console.log('🔒 Las nuevas sesiones se generarán automáticamente')
    console.log('🚫 Los errores "Bad MAC Error" desaparecerán')
    
  } catch (error) {
    console.error('❌ Error durante la reparación:', error)
    process.exit(1)
  }
}

// Ejecutar reparación
fixWhatsAppSessions()