const express = require('express')
const router = express.Router()

// Endpoint para obtener estadísticas del pool de APIs
router.get('/stats', async (req, res) => {
  try {
    // Obtener instancia del servicio Gemini desde el app
    const geminiService = req.app.get('geminiService')
    
    if (!geminiService) {
      return res.status(500).json({
        success: false,
        message: 'Gemini service not available'
      })
    }

    const stats = geminiService.getServiceStats()
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats: {
        apiPool: {
          totalApis: stats.apiPool.totalApis,
          activeApis: stats.apiPool.activeApis,
          totalRequestsToday: stats.apiPool.totalRequestsToday,
          availableRequests: stats.apiPool.availableRequests,
          currentApiIndex: stats.apiPool.currentApiIndex,
          utilizationRate: ((stats.apiPool.totalRequestsToday / (stats.apiPool.totalApis * 45)) * 100).toFixed(2) + '%'
        },
        cache: {
          size: stats.cache.size,
          maxSize: stats.cache.maxSize,
          hitRate: stats.cache.hitRate || 'N/A',
          ttlMinutes: Math.round(stats.cache.ttl / 1000 / 60)
        },
        service: {
          lastRequestAgo: stats.service.lastRequest ? Date.now() - stats.service.lastRequest : null,
          minIntervalMs: stats.service.minInterval
        }
      }
    })

  } catch (error) {
    console.error('Error getting API stats:', error)
    res.status(500).json({
      success: false,
      message: 'Error retrieving API statistics',
      error: error.message
    })
  }
})

// Endpoint para obtener estadísticas detalladas de cada API
router.get('/detailed', async (req, res) => {
  try {
    const geminiService = req.app.get('geminiService')
    
    if (!geminiService) {
      return res.status(500).json({
        success: false,
        message: 'Gemini service not available'
      })
    }

    const stats = geminiService.getServiceStats()
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      detailedStats: stats.apiPool.apiDetails.map(api => ({
        id: api.id,
        apiKey: api.apiKey,
        status: api.isActive ? 'Active' : 'Inactive',
        requestsToday: api.requestsToday,
        errorsToday: api.errorsToday,
        utilizationRate: ((api.requestsToday / 45) * 100).toFixed(1) + '%',
        lastUsed: api.lastUsed ? new Date(api.lastUsed).toLocaleString() : 'Never',
        remainingRequests: Math.max(0, 45 - api.requestsToday)
      }))
    })

  } catch (error) {
    console.error('Error getting detailed API stats:', error)
    res.status(500).json({
      success: false,
      message: 'Error retrieving detailed API statistics',
      error: error.message
    })
  }
})

// Endpoint para probar la conexión del pool
router.get('/test', async (req, res) => {
  try {
    const geminiService = req.app.get('geminiService')
    
    if (!geminiService) {
      return res.status(500).json({
        success: false,
        message: 'Gemini service not available'
      })
    }

    const testResult = await geminiService.testConnection()
    
    res.json({
      success: testResult.success,
      message: testResult.message,
      timestamp: new Date().toISOString(),
      poolStats: testResult.poolStats
    })

  } catch (error) {
    console.error('Error testing API connection:', error)
    res.status(500).json({
      success: false,
      message: 'Error testing API connection',
      error: error.message
    })
  }
})

module.exports = router