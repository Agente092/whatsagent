#!/usr/bin/env node

/**
 * 🆘 SCRIPT DE EMERGENCIA PARA LIMPIAR SESIONES WHATSAPP
 * 
 * USO: node emergency-clear-whatsapp.js
 * 
 * Este script limpia completamente todas las sesiones de WhatsApp
 * cuando hay problemas de conexión persistentes o errores 405.
 */

const fs = require('fs')
const path = require('path')

console.log('🆘 SCRIPT DE EMERGENCIA - LIMPIEZA TOTAL WHATSAPP')
console.log('='.repeat(60))
console.log('')

async function emergencyClearWhatsApp() {
  try {
    const authDir = path.join(__dirname, 'auth_info_baileys')
    
    console.log('🔍 Verificando directorio de autenticación...')
    console.log(`📁 Directorio: ${authDir}`)
    
    if (fs.existsSync(authDir)) {
      console.log('📁 Directorio encontrado')
      
      // Listar archivos antes de eliminar
      const files = fs.readdirSync(authDir)
      console.log(`📄 Archivos encontrados: ${files.length}`)
      
      if (files.length > 0) {
        console.log('🗑️ Eliminando archivos de sesión...')
        
        files.forEach(file => {
          try {
            const filePath = path.join(authDir, file)
            fs.unlinkSync(filePath)
            console.log(`   ✅ Eliminado: ${file}`)
          } catch (error) {
            console.log(`   ❌ Error eliminando ${file}: ${error.message}`)
          }
        })
        
        console.log('✅ Limpieza completada')
      } else {
        console.log('ℹ️ No hay archivos de sesión para eliminar')
      }
    } else {
      console.log('ℹ️ No existe directorio de autenticación')
    }
    
    console.log('')
    console.log('🎉 LIMPIEZA DE EMERGENCIA COMPLETADA')
    console.log('📱 Ahora puedes intentar conectar WhatsApp nuevamente')
    console.log('🔗 Ve al dashboard y usa "Nueva Sesión Limpia"')
    
  } catch (error) {
    console.error('❌ Error durante la limpieza de emergencia:', error)
    process.exit(1)
  }
}

// Ejecutar limpieza
emergencyClearWhatsApp()