#!/usr/bin/env node

/**
 * 🧪 Script para probar la API REST de clientes y verificar que funcione
 */

const axios = require('axios')

async function testClientAPI() {
  console.log('🧪 Probando API REST de clientes...')
  
  const baseURL = 'http://localhost:3001'
  
  try {
    // Test 1: Obtener clientes existentes
    console.log('1️⃣ Test GET /api/clients...')
    const getResponse = await axios.get(`${baseURL}/api/clients`)
    console.log('✅ GET /api/clients:', getResponse.status, getResponse.data)
    
    // Test 2: Crear nuevo cliente 
    console.log('2️⃣ Test POST /api/clients...')
    const clientData = {
      name: 'María Rodriguez',
      phone: '+51987654321',
      expiryDate: '2025-10-15T12:00:00Z'
    }
    
    const postResponse = await axios.post(`${baseURL}/api/clients`, clientData)
    console.log('✅ POST /api/clients:', postResponse.status, postResponse.data)
    
    // Test 3: Obtener estadísticas del dashboard
    console.log('3️⃣ Test GET /api/dashboard/stats...')
    const statsResponse = await axios.get(`${baseURL}/api/dashboard/stats`)
    console.log('✅ GET /api/dashboard/stats:', statsResponse.status, statsResponse.data)
    
    console.log('🎉 ¡Todos los tests de API pasaron exitosamente!')
    
  } catch (error) {
    console.error('❌ Error en test de API:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    })
    process.exit(1)
  }
}

testClientAPI()