#!/usr/bin/env node

/**
 * 🧪 Test del endpoint de eliminación de clientes
 */

const axios = require('axios')

async function testClientDeletion() {
  console.log('🧪 Probando endpoint de eliminación de clientes...')
  
  const baseURL = 'http://localhost:3001'
  
  try {
    // 1. Crear un cliente de prueba
    console.log('1️⃣ Creando cliente de prueba...')
    const testClient = {
      name: 'Cliente Prueba',
      phone: '+51999999999',
      expiryDate: '2025-10-15T12:00:00Z'
    }
    
    const createResponse = await axios.post(`${baseURL}/api/clients`, testClient)
    console.log('✅ Cliente creado:', createResponse.data)
    
    // 2. Verificar que existe
    console.log('2️⃣ Verificando que el cliente existe...')
    const getResponse = await axios.get(`${baseURL}/api/clients`)
    const clients = getResponse.data.clients || getResponse.data
    const createdClient = clients.find(c => c.phoneNumber === '51999999999')
    
    if (createdClient) {
      console.log('✅ Cliente encontrado:', createdClient.name)
      
      // 3. Intentar eliminarlo
      console.log('3️⃣ Intentando eliminar cliente...')
      const deleteResponse = await axios.delete(`${baseURL}/api/clients/51999999999`)
      console.log('✅ Respuesta de eliminación:', deleteResponse.data)
      
      // 4. Verificar que fue eliminado
      console.log('4️⃣ Verificando que fue eliminado...')
      const verifyResponse = await axios.get(`${baseURL}/api/clients`)
      const remainingClients = verifyResponse.data.clients || verifyResponse.data
      const deletedClient = remainingClients.find(c => c.phoneNumber === '51999999999')
      
      if (!deletedClient) {
        console.log('🎉 ¡ÉXITO! Cliente eliminado correctamente')
      } else {
        console.log('❌ ERROR: Cliente aún existe después de eliminación')
      }
    } else {
      console.log('❌ ERROR: Cliente de prueba no fue encontrado')
    }
    
  } catch (error) {
    console.error('❌ Error en test:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    })
  }
}

testClientDeletion()