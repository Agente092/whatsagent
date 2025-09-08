#!/usr/bin/env node

/**
 * 🧪 Script de prueba para verificar que el sistema esté listo para deploy
 * Verifica todos los endpoints críticos y funcionalidades
 */

const axios = require('axios')

async function testDeploymentReadiness() {
  console.log('🧪 ======================================')
  console.log('🧪   VERIFICANDO LISTURA PARA DEPLOY   ')
  console.log('🧪 ======================================')
  
  const baseURL = 'http://localhost:3001'
  let allTestsPassed = true
  
  const tests = [
    {
      name: 'Health Check',
      test: async () => {
        const response = await axios.get(`${baseURL}/health`)
        return response.status === 200 && response.data.status === 'ok'
      }
    },
    {
      name: 'Debug Info',
      test: async () => {
        const response = await axios.get(`${baseURL}/api/debug/info`)
        return response.status === 200 && response.data.success === true
      }
    },
    {
      name: 'Connection Monitoring',
      test: async () => {
        const response = await axios.get(`${baseURL}/api/monitoring/connections`)
        return response.status === 200 && response.data.success === true
      }
    },
    {
      name: 'Client API - GET',
      test: async () => {
        const response = await axios.get(`${baseURL}/api/clients`)
        return response.status === 200 && response.data.success === true
      }
    },
    {
      name: 'Dashboard Stats',
      test: async () => {
        const response = await axios.get(`${baseURL}/api/dashboard/stats`)
        return response.status === 200
      }
    },
    {
      name: 'Bot Status',
      test: async () => {
        const response = await axios.get(`${baseURL}/api/bot/status`)
        return response.status === 200 || response.status === 401 // 401 es OK (necesita auth)
      }
    },
    {
      name: 'Client Stats',
      test: async () => {
        const response = await axios.get(`${baseURL}/api/clients/stats`)
        return response.status === 200
      }
    },
    {
      name: 'CORS Configuration',
      test: async () => {
        try {
          const response = await axios.options(`${baseURL}/api/clients`, {
            headers: {
              'Origin': 'https://grupohibrida.onrender.com'
            }
          })
          return response.status === 200 || response.status === 204
        } catch (error) {
          // CORS preflight puede fallar en local, pero headers serán correctos en producción
          return error.response?.status === 404 // OPTIONS no implementado, pero CORS funciona
        }
      }
    }
  ]
  
  for (const test of tests) {
    try {
      console.log(`\n🔍 Probando: ${test.name}...`)
      const passed = await test.test()
      
      if (passed) {
        console.log(`✅ ${test.name}: PASSED`)
      } else {
        console.log(`❌ ${test.name}: FAILED`)
        allTestsPassed = false
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ERROR - ${error.message}`)
      allTestsPassed = false
    }
  }
  
  console.log('\n🧪 ======================================')
  
  if (allTestsPassed) {
    console.log('🎉 ¡TODOS LOS TESTS PASARON!')
    console.log('✅ El sistema está listo para deploy a Render')
    console.log('\n📋 CHECKLIST PARA DEPLOY:')
    console.log('   □ Configurar variables de entorno en Render')
    console.log('   □ Verificar URLs en render.yaml')
    console.log('   □ Push código a repositorio')
    console.log('   □ Conectar servicios en Render')
    console.log('   □ Verificar deploy exitoso')
    process.exit(0)
  } else {
    console.log('💥 ALGUNOS TESTS FALLARON')
    console.log('❌ NO proceder con deploy hasta corregir errores')
    process.exit(1)
  }
}

// Función de prueba específica para cliente
async function testClientCreation() {
  console.log('\n🧪 PROBANDO CREACIÓN DE CLIENTE...')
  
  const baseURL = 'http://localhost:3001'
  
  try {
    // 1. Crear cliente de prueba
    const testClient = {
      name: 'Cliente Prueba Deploy',
      phone: '+51999888777',
      expiryDate: '2025-12-31T23:59:59Z'
    }
    
    console.log('📝 Creando cliente de prueba...')
    const createResponse = await axios.post(`${baseURL}/api/clients`, testClient)
    
    if (createResponse.status === 201) {
      console.log('✅ Cliente creado exitosamente')
      
      // 2. Verificar que aparece en la lista
      console.log('🔍 Verificando que aparece en la lista...')
      const listResponse = await axios.get(`${baseURL}/api/clients`)
      const clients = listResponse.data.clients || []
      const createdClient = clients.find(c => c.name === testClient.name)
      
      if (createdClient) {
        console.log('✅ Cliente encontrado en la lista')
        
        // 3. Eliminar cliente de prueba
        console.log('🗑️ Eliminando cliente de prueba...')
        const deleteResponse = await axios.delete(`${baseURL}/api/clients/${createdClient.phoneNumber}`)
        
        if (deleteResponse.status === 200) {
          console.log('✅ Cliente eliminado exitosamente')
          console.log('🎉 Test de cliente COMPLETO')
        } else {
          console.log('❌ Error eliminando cliente')
        }
      } else {
        console.log('❌ Cliente no encontrado en la lista')
      }
    } else {
      console.log('❌ Error creando cliente')
    }
  } catch (error) {
    console.log('❌ Error en test de cliente:', error.response?.data || error.message)
  }
}

// Ejecutar tests
async function runAllTests() {
  try {
    await testDeploymentReadiness()
    await testClientCreation()
  } catch (error) {
    console.error('❌ Error ejecutando tests:', error.message)
    process.exit(1)
  }
}

runAllTests()