#!/usr/bin/env node

/**
 * 🧪 Script de prueba para el endpoint de limpieza de datos
 */

const axios = require('axios')

async function testCleanupEndpoint() {
  console.log('🧪 Probando endpoint de limpieza de datos...')
  
  const baseURL = 'http://localhost:3001'
  
  try {
    // 1. Verificar que existen datos antes de la limpieza
    console.log('1️⃣ Verificando datos existentes...')
    const clientsResponse = await axios.get(`${baseURL}/api/clients`)
    const clients = clientsResponse.data.clients || clientsResponse.data
    console.log(`✅ Clientes encontrados: ${Array.isArray(clients) ? clients.length : 0}`)
    
    // 2. Probar el endpoint de limpieza (sin autenticación para prueba)
    console.log('2️⃣ Probando endpoint de limpieza...')
    try {
      const cleanupResponse = await axios.delete(`${baseURL}/api/admin/cleanup-all`)
      console.log('✅ Limpieza exitosa:', cleanupResponse.data)
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('⚠️  Endpoint requiere autenticación (esto es correcto)')
        console.log('   Mensaje:', error.response.data.message)
      } else {
        throw error
      }
    }
    
    // 3. Verificar que los datos fueron eliminados
    console.log('3️⃣ Verificando datos después de la limpieza...')
    const afterClientsResponse = await axios.get(`${baseURL}/api/clients`)
    const afterClients = afterClientsResponse.data.clients || afterClientsResponse.data
    console.log(`✅ Clientes después de limpieza: ${Array.isArray(afterClients) ? afterClients.length : 0}`)
    
    console.log('🎉 ¡Prueba completada exitosamente!')
    
  } catch (error) {
    console.error('❌ Error en prueba:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    })
  }
}

// Ejecutar prueba
testCleanupEndpoint()