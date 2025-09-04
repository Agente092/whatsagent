/**
 * 🚀 WHATSAPP SERVICE ENHANCED - INTEGRACIÓN DE SISTEMAS INTELIGENTES
 * 
 * Integra ConversationStateManager, ContextValidator y RAG System
 * para eliminatear completamente la pérdida de contexto
 */

import ConversationStateManager from './conversation-state-manager.js'
import ContextValidator from './context-validator.js'
import IntelligentRAGSystem from './intelligent-rag-system.js'
import HumanReasoningEngine from './human-reasoning-engine.js'

export class WhatsAppServiceEnhanced {
  constructor(originalWhatsAppService, supabaseDbService, geminiService) {
    this.original = originalWhatsAppService
    this.db = supabaseDbService // 🔧 CORREGIDO: usar db.client en lugar de supabase directo
    this.gemini = geminiService
    
    // Inicializar sistemas inteligentes
    this.conversationManager = new ConversationStateManager(supabaseDbService)
    this.contextValidator = new ContextValidator()
    this.ragSystem = new IntelligentRAGSystem(supabaseDbService, geminiService)
    this.humanReasoning = new HumanReasoningEngine(originalWhatsAppService)
    
    // PREVENCIÓN DE BUCLE INFINITO
    this.processingMessages = new Set() // Tracker de mensajes en procesamiento
    
    this.initialized = false
  }

  /**
   * 🚀 INICIALIZAR SISTEMAS MEJORADOS
   */
  async initialize() {
    try {
      console.log('🚀 Inicializando WhatsApp Service Enhanced...')
      
      // Inicializar RAG System
      await this.ragSystem.initialize()
      
      // Reindexar productos para RAG
      await this.ragSystem.reindexAllProducts()
      
      this.initialized = true
      console.log('✅ WhatsApp Service Enhanced inicializado')
      
      return true

    } catch (error) {
      console.error('❌ Error inicializando Enhanced Service:', error)
      return false
    }
  }

  /**
   * 🧠 PROCESAR MENSAJE CON INTELIGENCIA MEJORADA
   */
  async processMessageWithIntelligence(userId, message, originalContext) {
    // PREVENIR BUCLE INFINITO
    const messageKey = `${userId}:${message}:${Date.now()}`
    if (this.processingMessages.has(messageKey)) {
      console.warn('⚠️ Bucle infinito detectado - usando procesamiento original directo')
      return { processed: false, reason: 'loop_detected', fallback: true }
    }

    this.processingMessages.add(messageKey)
    
    try {
      if (!this.initialized) {
        console.warn('⚠️ Sistema Enhanced no inicializado, usando procesamiento original')
        return { processed: false, reason: 'not_initialized', fallback: true }
      }

      // 🔒 COORDINACIÓN JERÁRQUICA: Verificar estado transaccional antes de procesar
      const currentState = await this.checkTransactionalState(userId)
      if (currentState.isTransactional) {
        console.log(`🔒 DELEGANDO AL SISTEMA PRINCIPAL: Estado ${currentState.state} es transaccional`)
        return { 
          processed: false, 
          reason: 'transactional_state_detected', 
          state: currentState.state,
          shouldDelegate: true,
          fallback: true 
        }
      }

      console.log(`🧠 Procesando mensaje inteligente de ${userId}: "${message}"`)

      // 🧠 PASO 1: GENERAR RAZONAMIENTO CONTEXTUAL INTELIGENTE (NUEVO)
      console.log(`🧠 GENERANDO RAZONAMIENTO CONTEXTUAL para ${userId}...`)
      await this.generateContextualReasoning(userId, message)

      // 1. OBTENER CONTEXTO ENRIQUECIDO
      const enrichedContext = await this.conversationManager.getEnrichedContext(userId, message)
      
      // 2. GENERAR RESPUESTA AUMENTADA CON RAG MEJORADO
      let ragResponse = null
      let relevantProducts = []
      
      // 🔍 USAR BÚSQUEDA INTELIGENTE EN LUGAR DE RAG BÁSICO
      const intent = await this.detectMessageIntent(message)
      if (intent.needsProductSearch) {
        relevantProducts = await this.searchProductsIntelligently(userId, message, intent)
        console.log(`🔍 Productos encontrados con búsqueda inteligente: ${relevantProducts.length}`)
        
        // Crear respuesta RAG con productos encontrados
        ragResponse = {
          relevantProducts: relevantProducts,
          validation: { isValid: true, confidence: 1 },
          conversationContext: [],
          source: 'enhanced_intelligent_search'
        }
      } else {
        // Para mensajes no relacionados con productos, usar RAG mejorado con búsqueda inteligente
        ragResponse = await this.ragSystem.generateAugmentedResponse(
          message, 
          userId, 
          this.contextValidator,
          this.original.semanticSearch // 🔄 Pasar el servicio de búsqueda inteligente
        )
      }

      // 3. VALIDAR COHERENCIA DEL CONTEXTO
      const validation = this.contextValidator.validateContext(
        message,
        enrichedContext,
        ragResponse
      )

      // 4. CORREGIR CONTEXTO SI ES NECESARIO
      if (!validation.isValid) {
        console.log('🔧 Aplicando correcciones de contexto...')
        await this.contextValidator.fixContext(validation, userId, this.conversationManager)
        
        // Regenerar contexto después de la corrección
        const correctedContext = await this.conversationManager.getEnrichedContext(userId, message)
        enrichedContext.state = correctedContext.state
      }

      // 5. ACTUALIZAR ESTADO CONVERSACIONAL (con manejo de errores mejorado)
      try {
        await this.conversationManager.updateUserState(userId, {
          last_message: message,
          state_confidence: validation.confidence,
          current_product: enrichedContext.currentProduct
        })
      } catch (stateError) {
        console.error('❌ Error actualizando estado - continuando sin bloquear:', stateError)
      }

      // 6. CONSTRUIR RESPUESTA MEJORADA
      const enhancedResponse = await this.buildEnhancedResponse(
        userId,
        message,
        enrichedContext,
        ragResponse,
        validation
      )

      return enhancedResponse

    } catch (error) {
      console.error('❌ Error en procesamiento inteligente:', error)
      // NO llamar al procesamiento original aquí para evitar bucle
      return { processed: false, error: error.message, fallback: true }
    } finally {
      // Limpiar tracking después de 5 segundos para evitar acumulación
      setTimeout(() => {
        this.processingMessages.delete(messageKey)
      }, 5000)
    }
  }

  /**
   * 🔒 VERIFICAR ESTADO TRANSACCIONAL PARA COORDINACIÓN JERÁRQUICA
   */
  async checkTransactionalState(userId) {
    try {
      // Estados que requieren delegación al sistema principal
      const TRANSACTIONAL_STATES = [
        'specifying',     // Cliente especificando cantidad
        'confirming',     // Cliente confirmando pedido
        'ordering',       // Procesando pedido
        'asking_data',    // Pidiendo datos de entrega
        'asking_name',    // Pidiendo nombre del cliente
        'waiting_payment' // Esperando confirmación de pago
      ]

      // Verificar estado actual del sistema principal
      const currentState = await this.original.getConversationState(userId)
      const isTransactional = TRANSACTIONAL_STATES.includes(currentState)

      if (isTransactional) {
        console.log(`🔒 ESTADO TRANSACCIONAL DETECTADO: ${currentState} para ${userId}`)
      }

      return {
        state: currentState,
        isTransactional: isTransactional,
        requiresDelegation: isTransactional
      }
    } catch (error) {
      console.error('❌ Error verificando estado transaccional:', error)
      // En caso de error, asumir que NO es transaccional para permitir procesamiento
      return {
        state: 'unknown',
        isTransactional: false,
        requiresDelegation: false
      }
    }
  }

  /**
   * 🧠 NUEVO: GENERAR RAZONAMIENTO CONTEXTUAL INTELIGENTE
   * Este método replica la lógica de razonamiento del sistema principal
   */
  async generateContextualReasoning(userId, message) {
    try {
      console.log(`🧠 Iniciando generación de razonamiento contextual para ${userId}`)
      
      // Verificar si los sistemas de razonamiento están disponibles
      if (!this.original.contextManager || !this.original.personalitySystem || !this.original.rlEngine) {
        console.log(`⚠️ Sistemas de razonamiento no disponibles en Enhanced`)
        return null
      }
      
      // Obtener contexto semántico
      const semanticContext = await this.original.contextManager.getConversationContext(userId, true)
      console.log(`🧠 Contexto semántico obtenido: ${semanticContext.hasContext}`)
      
      // Analizar personalidad del cliente
      const adaptedPersonality = await this.original.personalitySystem.analyzeClientPersonality(
        userId,
        semanticContext.hasContext ? semanticContext.summary.topicsDiscussed : [],
        {
          currentMessage: message,
          messageContext: 'enhanced_processing'
        }
      )
      console.log(`🧠 Personalidad adaptada: ${adaptedPersonality.basePersonality}`)
      
      // Obtener recomendaciones de RL
      const rlRecommendations = await this.original.rlEngine.generateConversationalRecommendations(
        userId,
        'interested', // Estado por defecto para Enhanced
        {
          customerType: semanticContext.hasContext ? 'returning' : 'new',
          messageComplexity: message.length > 50 ? 'complex' : 'simple',
          messageLength: message.length > 100 ? 'long' : 'short'
        }
      )
      console.log(`🧠 Recomendaciones RL generadas: ${rlRecommendations.length} recomendaciones`)
      
      // Generar instrucciones de personalidad
      const personalityInstructions = this.original.personalitySystem.generatePersonalityInstructions(adaptedPersonality)
      console.log(`🧠 Instrucciones de personalidad generadas: ${personalityInstructions.tone}`)
      
      // Crear objeto de razonamiento
      const reasoning = {
        semanticContext,
        adaptedPersonality,
        rlRecommendations,
        personalityInstructions
      }
      
      // Guardar en conversationData del sistema original
      if (this.original.conversationData) {
        this.original.conversationData.reasoning = reasoning
        console.log(`🧠 Razonamiento guardado en conversationData original`)
      }
      
      // Asegurar que HumanReasoningEngine tenga acceso
      if (this.humanReasoning && this.humanReasoning.original) {
        this.humanReasoning.original.conversationData = this.humanReasoning.original.conversationData || {}
        this.humanReasoning.original.conversationData.reasoning = reasoning
        this.humanReasoning.original.customerName = await this.original.getCustomerName(userId)
        console.log(`🧠 Razonamiento compartido con HumanReasoningEngine`)
      }
      
      console.log(`✅ Razonamiento contextual generado exitosamente para ${userId}`)
      return reasoning
      
    } catch (error) {
      console.error('❌ Error generando razonamiento contextual:', error)
      return null
    }
  }

  /**
   * 🎯 CONSTRUIR RESPUESTA MEJORADA CON LÓGICA CONVERSACIONAL INTELIGENTE
   */
  async buildEnhancedResponse(userId, message, context, ragResponse, validation) {
    try {
      console.log(`🧠 Construyendo respuesta mejorada para: "${message}"`)
      
      // 🔍 DETECCIÓN ESPECIAL: Respuestas numéricas que podrían ser cantidades
      const isNumericResponse = /^\d+$/.test(message.trim())
      if (isNumericResponse) {
        console.log(`🔢 RESPUESTA NUMÉRICA DETECTADA: "${message}" - Verificando contexto de cantidad`)
        
        // Verificar si hay un contexto de especificación de cantidad activo
        const recentHistory = await this.original.getRecentHistory(userId, 3) || []
        const hasQuantityContext = recentHistory.some(msg => 
          msg.role === 'assistant' && (
            msg.content.toLowerCase().includes('cantidad') ||
            msg.content.toLowerCase().includes('cuántos') ||
            msg.content.toLowerCase().includes('cuantos') ||
            msg.content.toLowerCase().includes('¿cantidad')
          )
        )
        
        if (hasQuantityContext) {
          console.log(`🔒 CONTEXTO DE CANTIDAD DETECTADO - DELEGANDO AL SISTEMA PRINCIPAL`)
          return {
            processed: false,
            reason: 'numeric_response_quantity_context',
            shouldDelegate: true,
            quantity: parseInt(message.trim()),
            fallback: true
          }
        }
      }
      
      // 🔁 VERIFICAR ESTADO DE CONVERSACIÓN PRIMERO
      const currentState = await this.original.getConversationState(userId)
      
      // 📝 MANEJAR ESTADO ASKING_NAME (CLIENTE ESCRIBIENDO SU NOMBRE)
      if (currentState === this.original.STATES.ASKING_NAME) {
        console.log(`📝 Procesando nombre en estado asking_name para ${userId}`)
        const processedName = await this.processReceivedName(userId, message)
        if (processedName) {
          console.log(`✅ Nombre guardado: ${processedName} para ${userId}`)
          return {
            processed: true,
            source: 'enhanced_name_processed',
            customerName: processedName,
            message: `¡Perfecto ${processedName}! 😊 Ahora puedo ayudarte mejor. ¿Qué tipo de producto te interesa?`,
            user: userId,
            timestamp: new Date().toISOString()
          }
        } else {
          return {
            processed: true,
            source: 'enhanced_name_retry',
            message: 'Disculpa, no pude entender tu nombre. ¿Podrías decirme solo tu nombre? Por ejemplo: "María" 😊',
            user: userId,
            timestamp: new Date().toISOString()
          }
        }
      }
      
      // 1. OBTENER INFORMACIÓN DEL CLIENTE
      const customerName = await this.getCustomerName(userId)
      const isVipClient = await this.checkVipStatus(userId)
      
      // 2. DETECTAR INTENCIÓN DEL MENSAJE
      const intent = await this.detectMessageIntent(message)
      console.log(`🎯 Intención detectada:`, intent)
      
      // 🔒 VERIFICACIÓN ADICIONAL: Si hay intención de compra, delegar
      if (intent.isConfirmation || intent.hasSpecificModel || intent.isProductInquiry) {
        const transactionCheck = await this.checkTransactionalState(userId)
        if (transactionCheck.isTransactional) {
          console.log(`🔒 INTENCIÓN DE COMPRA EN ESTADO TRANSACCIONAL - DELEGANDO`)
          return {
            processed: false,
            reason: 'purchase_intent_in_transactional_state',
            state: transactionCheck.state,
            shouldDelegate: true,
            fallback: true
          }
        }
      }
      
      // 🧠 PRIORIDAD ALTA: Usar RAZONAMIENTO HUMANO para referencias contextuales Y confirmaciones
      if (intent.hasContextualReference || intent.isFunctionalityQuestion || intent.isConfirmation) {
        console.log(`🧠 Aplicando razonamiento humano para: "${message}"`)        
        
        // Obtener historial conversacional para contexto
        const conversationHistory = await this.original.getRecentHistory(userId, 5) || []
        
        // Aplicar razonamiento humano
        const humanReasoning = await this.humanReasoning.reasonAboutMessage(userId, message, conversationHistory)
        
        if (humanReasoning.confidence > 0.7 && (humanReasoning.targetProduct || humanReasoning.action)) {
          console.log(`✅ RAZONAMIENTO HUMANO EXITOSO: ${humanReasoning.reasoning}`)
          
          // 🎯 MANEJAR CONFIRMACIONES CONTEXTUALES DIRECTAMENTE
          if (humanReasoning.type === 'contextual_confirmation') {
            console.log(`🎯 CONFIRMACIÓN CONTEXTUAL detectada: ${humanReasoning.intention}`)
            
            // 🚀 ENVIAR LA RESPUESTA DE CONFIRMACIÓN AL USUARIO
            console.log(`🚀 Enviando confirmación contextual: "${humanReasoning.suggestedResponse}"`)
            
            try {
              await this.original.sendMessage(userId, humanReasoning.suggestedResponse)
              await this.original.addToHistory(userId, 'assistant', humanReasoning.suggestedResponse)
              
              console.log(`✅ Confirmación contextual enviada exitosamente sobre: ${humanReasoning.targetProduct?.name}`)
              
              // Responder directamente basado en el razonamiento
              const confirmationResponse = {
                processed: true,
                source: 'human_reasoning_confirmation',
                reasoning: humanReasoning.reasoning,
                confidence: humanReasoning.confidence,
                intention: humanReasoning.intention,
                targetProduct: humanReasoning.targetProduct?.name,
                lastAgentQuestion: humanReasoning.lastAgentQuestion,
                message: humanReasoning.suggestedResponse,
                messageSent: true, // 🚀 CONFIRMACIÓN DE ENVÍO
                shouldDelegate: false, // No delegar - respuesta completa
                user: userId,
                timestamp: new Date().toISOString()
              }
              
              return confirmationResponse
              
            } catch (error) {
              console.error('❌ Error enviando confirmación contextual:', error)
              
              // Fallback: retornar respuesta para que index.js la envíe
              const confirmationResponse = {
                processed: true,
                source: 'human_reasoning_confirmation',
                reasoning: humanReasoning.reasoning,
                confidence: humanReasoning.confidence,
                intention: humanReasoning.intention,
                targetProduct: humanReasoning.targetProduct?.name,
                lastAgentQuestion: humanReasoning.lastAgentQuestion,
                message: humanReasoning.suggestedResponse,
                messageSent: false, // 🚨 ERROR EN ENVÍO
                shouldDelegate: false,
                user: userId,
                timestamp: new Date().toISOString()
              }
              
              return confirmationResponse
            }
          }
          
          // Usar la respuesta sugerida por el motor de razonamiento para otros tipos
          const contextualMessage = humanReasoning.suggestedResponse || this.generateContextualResponseFromReasoning(humanReasoning)
          
          // 🚀 MANEJO ESPECIAL PARA PURCHASE_INTENT
          if (humanReasoning.intention === 'purchase_intent' && humanReasoning.targetProduct) {
            console.log(`🛋️ PURCHASE_INTENT detectado - delegando al sistema original para manejar flujo de compra`)
            
            // 🎯 DELEGAR AL SISTEMA ORIGINAL para manejar la transición de estado y flujo de compra
            const purchaseResponse = {
              processed: false, // 🔄 DELEGAR - no procesado por Enhanced
              source: 'human_reasoning_purchase_intent',
              reasoning: humanReasoning.reasoning,
              confidence: humanReasoning.confidence,
              intention: humanReasoning.intention,
              targetProduct: humanReasoning.targetProduct?.name,
              action: 'delegate_purchase_flow',
              shouldDelegate: true, // 🔄 DELEGAR al sistema original
              delegateReason: 'purchase_intent_requires_state_transition',
              contextualProduct: humanReasoning.targetProduct,
              suggestedMessage: contextualMessage,
              user: userId,
              timestamp: new Date().toISOString()
            }
            
            return purchaseResponse
          }
          
          // 🚀 ENVIAR LA RESPUESTA CONTEXTUAL AL USUARIO (para otros tipos de intención)
          console.log(`🚀 Enviando respuesta contextual: "${contextualMessage}"`)
          
          try {
            await this.original.sendMessage(userId, contextualMessage)
            await this.original.addToHistory(userId, 'assistant', contextualMessage)
            
            console.log(`✅ Respuesta contextual enviada exitosamente sobre: ${humanReasoning.targetProduct?.name}`)
            
            const contextualResponse = {
              processed: true,
              source: 'human_reasoning_contextual',
              reasoning: humanReasoning.reasoning,
              confidence: humanReasoning.confidence,
              targetProduct: humanReasoning.targetProduct?.name,
              message: contextualMessage,
              messageSent: true, // 🚀 CONFIRMACIÓN DE ENVÍO
              shouldDelegate: false, // No delegar - respuesta completa
              user: userId,
              timestamp: new Date().toISOString()
            }
            
            return contextualResponse
            
          } catch (error) {
            console.error('❌ Error enviando respuesta contextual:', error)
            
            // Fallback: retornar respuesta para que index.js la envíe
            const contextualResponse = {
              processed: true,
              source: 'human_reasoning_contextual',
              reasoning: humanReasoning.reasoning,
              confidence: humanReasoning.confidence,
              targetProduct: humanReasoning.targetProduct?.name,
              message: contextualMessage,
              messageSent: false, // 🚨 ERROR EN ENVÍO
              shouldDelegate: false,
              user: userId,
              timestamp: new Date().toISOString()
            }
            
            return contextualResponse
          }
        } else {
          console.log(`⚠️ Razonamiento humano con baja confianza (${humanReasoning.confidence}) - usando sistema original`)
          
          // ✅ FALLBACK: Buscar producto EN ENHANCED MEMORY (más reciente)
          const conversationData = await this.original.getConversationData(userId) || {}
          let contextualProduct = null
          
          // ✅ Verificar displayed_products de Enhanced primero
          if (conversationData.displayed_products && conversationData.displayed_products.length > 0) {
            contextualProduct = conversationData.displayed_products[0] // El más reciente
            console.log(`🎯 Producto contextual encontrado en Enhanced memory: ${contextualProduct.name}`)
          } else {
            // ✅ Fallback: Buscar en sistema original
            contextualProduct = await this.original.interpretContextualReference(
              message, 
              conversationData,
              userId
            )
            if (contextualProduct) {
              console.log(`🎯 Producto contextual encontrado en Original memory: ${contextualProduct.name || contextualProduct.nombre}`)
            }
          }
          
          if (contextualProduct) {
            // ✅ RESPONDER LA PREGUNTA EN LUGAR DE BUSCAR PRODUCTOS
            const questionResponse = await this.answerContextualQuestion(userId, message, contextualProduct, customerName)
            if (questionResponse) {
              return questionResponse
            }
          } else {
            console.log(`❌ No hay productos en contexto - buscando en memoria reciente`)
            
            // ✅ FALLBACK FINAL: Usar memoria de sesión pero dar prioridad a últimos productos Enhanced
            try {
              // ✅ Verificación robusta de sessionMemory
              if (this.original.sessionMemory && typeof this.original.sessionMemory.getMemory === 'function') {
                const sessionMemory = await this.original.sessionMemory.getMemory(userId)
                if (sessionMemory && sessionMemory.ultimo_producto) {
                  const fallbackProduct = {
                    name: sessionMemory.ultimo_producto,
                    nombre: sessionMemory.ultimo_producto,
                    id: 'session_fallback'
                  }
                  console.log(`💬 Usando producto de sesión como fallback: ${fallbackProduct.name}`)
                  
                  const questionResponse = await this.answerContextualQuestion(userId, message, fallbackProduct, customerName)
                  if (questionResponse) {
                    return questionResponse
                  }
                }
              } else {
                console.log(`⚠️ SessionMemory no disponible o método getMemory no existe (normal en tests)`)
              }
            } catch (error) {
              console.log(`❌ Error accediendo memoria de sesión: ${error.message}`)
            }
          }
        }
      }
      
      // 3. GENERAR RESPUESTA SEGÚN CONTEXTO Y TIPO DE CLIENTE
      if (intent.isGreeting) {
        return await this.handleGreetingWithPersonality(userId, customerName, isVipClient)
      }
      
      // 4. BUSCAR PRODUCTOS RELEVANTES SEGÚN LA INTENCIÓN
      let relevantProducts = []
      
      // 🎯 NUEVA LÓGICA: Verificar si es referencia contextual PRIMERO
      if (intent.hasContextualReference) {
        console.log(`🎯 Referencia contextual detectada - buscando producto en contexto en lugar de productos nuevos`)
        
        // Buscar producto en contexto del sistema original
        const conversationData = await this.original.getConversationData(userId) || {}
        const contextualProduct = await this.original.interpretContextualReference(
          message, 
          conversationData,
          userId
        )
        
        if (contextualProduct) {
          console.log(`🎯 Producto contextual encontrado: ${contextualProduct.name || contextualProduct.nombre}`)
          
          // ✅ RESPONDER LA PREGUNTA EN LUGAR DE BUSCAR PRODUCTOS
          const questionResponse = await this.answerContextualQuestion(userId, message, contextualProduct, customerName)
          if (questionResponse) {
            return questionResponse
          }
        } else {
          console.log(`❌ No hay productos en contexto para interpretar: "${message.toLowerCase()}"`)  
        }
      }
      
      // Buscar productos solo si NO es referencia contextual o si no encontró contexto
      if (intent.needsProductSearch && !intent.hasContextualReference) {
        relevantProducts = await this.searchProductsIntelligently(userId, message, intent)
        console.log(`🔍 Productos encontrados: ${relevantProducts.length}`)
      }
      
      // 🔄 GESTIÓN DE ESTADOS CONVERSACIONALES MEJORADA
      await this.manageConversationState(userId, message, intent, relevantProducts, currentState)
      
      // 5. GENERAR RESPUESTA SEGÚN EL CONTEXTO
      if (relevantProducts.length > 0) {
        // 🎯 PRODUCTO ESPECÍFICO ENCONTRADO - MOSTRAR DIRECTAMENTE CON SISTEMA RAG
        if (relevantProducts.length === 1 && intent.hasSpecificModel) {
          console.log(`🎯 MOSTRANDO producto específico encontrado: ${relevantProducts[0].nombre}`)
          
          const product = relevantProducts[0]
          
          // 📱 ENVIAR PRODUCTO CON IMAGEN DIRECTAMENTE
          try {
            // ✅ ACTUALIZAR MEMORIA PARA REFERENCIAS CONTEXTUALES ANTES DEL ENVÍO
            const currentConversationData = await this.original.getConversationData(userId) || {}
            
            // ✅ LIMPIAR MEMORIA VIP OBSOLETA SI ES DIFERENTE
            try {
              // ✅ Verificación robusta de sessionMemory y getMemory
              if (this.original.sessionMemory && typeof this.original.sessionMemory.getMemory === 'function') {
                const sessionMemory = await this.original.sessionMemory.getMemory(userId)
              if (sessionMemory && sessionMemory.ultimo_producto && 
                  sessionMemory.ultimo_producto !== product.nombre) {
                console.log(`🧽 Limpiando memoria VIP obsoleta: ${sessionMemory.ultimo_producto} -> ${product.nombre}`)
                
                // Limpiar memoria VIP antigua
                if (this.original.sessionMemory && typeof this.original.sessionMemory.clearMemory === 'function') {
                  await this.original.sessionMemory.clearMemory(userId)
                }
                
                // Limpiar productos VIP antiguos en memoria
                if (this.original.productMemory && typeof this.original.productMemory.clearMemory === 'function') {
                  await this.original.productMemory.clearMemory(userId)
                }
              }
              } else {
                console.log(`⚠️ SessionMemory no disponible para limpieza (normal en tests)`)
              }
            } catch (error) {
              console.log(`⚠️ Error limpiando memoria obsoleta: ${error.message}`)
            }
            
            // 🔥 ACTUALIZAR ESTADO CONVERSACIONAL CON CONTEXTO ENHANCED PERSISTENTE
            await this.original.setConversationState(userId, this.original.STATES.INTERESTED, {
              ...currentConversationData,
              current_product: product.id,
              selected_products: [product],
              enhanced_detection: true,
              context_preserved: true,
              source: 'enhanced_specific_search',
              // ✅ AGREGAR displayed_products para referencias contextuales
              displayed_products: [{
                id: product.id,
                name: product.nombre,
                price: product.precio,
                description: product.descripcion,
                stock: product.stock,
                isVip: product.es_vip,
                displayOrder: 0,
                timestamp: Date.now(),
                source: 'enhanced_direct',
                sent_by: 'enhanced_system'
              }],
              last_product_sent: {
                name: product.nombre,
                timestamp: Date.now(),
                source: 'enhanced_direct'
              },
              // ✅ MARCAR QUE ENHANCED TIENE CONTROL DE CONTEXTO
              enhanced_context_active: true,
              enhanced_last_product: product.nombre
            })
            
            // 🔥 PERSISTIR EN MEMORIA DE SESIÓN PARA ASEGURAR CONTEXTO
            try {
              if (this.original.sessionMemory && this.original.sessionMemory.updateMemory) {
                await this.original.sessionMemory.updateMemory(userId, {
                  productos_mostrados: 1,
                  ultimo_producto: product.nombre,
                  enhanced_context: true,
                  enhanced_last_product: product.nombre,
                  vip_activo: product.es_vip
                })
                console.log(`💾 Contexto Enhanced persistido en SessionMemory: ${product.nombre}`)
              }
            } catch (error) {
              console.log(`⚠️ Error persistiendo en SessionMemory: ${error.message}`)
            }
                        
            console.log(`🔄 Memoria actualizada ANTES del envío para referencias contextuales: ${product.nombre}`)
            console.log(`🎯 CONTEXTO ENHANCED ACTIVADO: ${product.nombre} es ahora el producto de referencia`)
            
            // 🔥 ACTUALIZAR TAMBIÉN ProductMemory PARA REFERENCIAS FUTURAS
            try {
              if (this.original.productMemory && this.original.productMemory.addProductOfInterest) {
                await this.original.productMemory.addProductOfInterest(userId, product.nombre)
                console.log(`📦 ProductMemory actualizada con Enhanced product: ${product.nombre}`)
              }
            } catch (error) {
              console.log(`⚠️ Error actualizando ProductMemory: ${error.message}`)
            }
            // Generar mensaje completo del producto
            let productMessage = `📱 **${product.nombre}**\n\n`
            
            if (product.descripcion) {
              productMessage += `📝 **Características:**\n${product.descripcion}\n\n`
            }
            
            productMessage += `💰 **Precio:** S/ ${product.precio}`
            
            if (product.es_vip) {
              productMessage += ` 👑 **(Oferta VIP - ${Math.round(((product.precio_original - product.precio) / product.precio_original) * 100)}% desc.)**`
            }
            
            productMessage += `\n📦 **Stock:** ${product.stock > 0 ? 'Disponible' : 'Agotado'}`
            
            if (customerName) {
              productMessage = `¡Hola ${customerName}! 😊\n\n` + productMessage
            }
            
            productMessage += `\n\n¿Te interesa este producto? 😊`
            
            // ✅ USAR MÉTODO CORRECTO DEL SISTEMA ORIGINAL
            if (this.original.sendProductWithImage) {
              await this.original.sendProductWithImage(userId, product, productMessage)
              console.log(`📷 Producto con imagen enviado exitosamente: ${product.nombre}`)
            } else {
              // Fallback: enviar solo mensaje
              await this.original.sendMessage(userId, productMessage)
              console.log(`📝 Producto enviado sin imagen: ${product.nombre}`)
            }
            
            // ✅ AGREGAR AL HISTORIAL PARA CONTINUIDAD
            await this.original.addToHistory(userId, 'assistant', productMessage)
            
            // 🔥 FORZAR ACTUALIZACIÓN DE MEMORIA PRODUCTO PARA CONTEXTO INMEDIATO
            try {
              // Usar método directo para asegurar que el contexto se guarde inmediatamente
              await this.original.productMemory?.addProductOfInterest(userId, product.nombre)
              console.log(`🧠 Producto guardado en memoria Redis: ${await this.original.productMemory?.getLastProduct(userId) || 'undefined'} para ${userId}`)
            } catch (error) {
              console.log(`⚠️ Error forzando actualización de ProductMemory: ${error.message}`)
            }
            
            console.log(`✅ Producto Enhanced enviado exitosamente: ${product.nombre}`)
            
            return {
              processed: true,
              source: 'enhanced_product_direct',
              productSent: product.nombre,
              productId: product.id,
              price: product.precio,
              isVip: product.es_vip,
              customerName,
              isVipClient: isVipClient.isVip,
              // ✅ EVITAR REENVÍO: Señalar explícitamente que NO delegue
              shouldDelegate: false,
              delegateReason: 'enhanced_already_sent_product',
              // ❌ NO incluir 'message' para evitar reenvío por index.js
              user: userId,
              timestamp: new Date().toISOString()
            }
            
          } catch (error) {
            console.error('❌ Error enviando producto directamente:', error)
            // Si falla el envío directo, delegar al sistema original
            return {
              processed: false,
              source: 'enhanced_product_found_delegate',
              productFound: product.nombre,
              shouldDelegate: true,
              delegateReason: 'direct_send_failed',
              user: userId,
              timestamp: new Date().toISOString()
            }
          }
        }
        
        // Encontramos productos múltiples - generar respuesta con personalidad
        return await this.generateIntelligentProductResponse(userId, message, relevantProducts, intent, customerName, isVipClient)
      } else if (intent.isProductInquiry) {
        // Pregunta sobre productos pero no encontramos nada específico
        // 🎯 ANALIZAR DINÁMICAMENTE QUÉ PRODUCTOS SOLICITÓ
        const requestedProducts = this.extractRequestedProductsDynamically(message)
        
        if (requestedProducts.length > 0) {
          // Cliente solicitó productos específicos pero no los encontramos - respuesta informativa
          let response = `¡Hola`
          if (customerName) response += ` ${customerName}`
          response += `! Entiendo que buscas ${requestedProducts.join(', ')}.\n\n`
          
          if (isVipClient.isVip) {
            response += '👑 Como cliente VIP, te muestro las mejores opciones disponibles:\n\n'
          } else {
            response += 'Te muestro los productos disponibles que tengo:\n\n'
          }
          
          // Mostrar productos disponibles dinámicamente (CON FILTROS VIP)
          let availableProducts = await this.original.inventory.getAllProducts()
          
          // 🚫 APLICAR FILTRO VIP si NO es cliente VIP
          const conversationData = await this.original.getConversationData(userId) || {}
          const isVipClient = conversationData.cliente_nivel === 'VIP' || 
                             (conversationData.es_recurrente && conversationData.total_pedidos >= 3)
          const isClienteCurioso = conversationData.cliente_tipo === 'curioso' || conversationData.es_curioso
          
          if (!isVipClient || isClienteCurioso) {
            const originalCount = availableProducts.length
            availableProducts = availableProducts.filter(product => {
              const productName = product.nombre || ''
              const isVipProduct = product.es_vip || 
                                  productName.includes('VIP') || 
                                  productName.includes('- VIP')
              return !isVipProduct
            })
            
            console.log(`🚫 [ENHANCED-FALLBACK] FILTRO VIP: ${originalCount} productos → ${availableProducts.length} productos`)
          }
          const topProducts = this.selectBestAvailableProducts(availableProducts, requestedProducts)
          
          topProducts.slice(0, 3).forEach((product, index) => {
            response += `${index + 1}. ${product.nombre}\n`
            response += `   💰 S/ ${product.precio}`
            if (product.es_vip) response += ' (VIP 👑)'
            response += '\n\n'
          })
          
          response += '¿Te interesa alguno de estos productos disponibles? 😊'
          
          return {
            processed: true,
            source: 'enhanced_specific_products_not_found',
            requestedProducts,
            customerName,
            isVipClient: isVipClient.isVip,
            message: response,
            user: userId,
            timestamp: new Date().toISOString()
          }
        } else {
          // Consulta general de productos
          return await this.generatePersonalizedGeneralResponse(userId, message, intent, customerName, isVipClient)
        }
      } else {
        // Mensaje general - respuesta conversacional
        return await this.generateConversationalResponse(userId, message, customerName, isVipClient)
      }

    } catch (error) {
      console.error('❌ Error construyendo respuesta:', error)
      return {
        processed: false,
        source: 'enhanced_error',
        message: 'Disculpa, tuve un problema procesando tu mensaje. ¿Puedes intentar de nuevo? 🤖',
        error: error.message
      }
    }
  }
  
  /**
   * 🔄 GESTIONAR ESTADOS CONVERSACIONALES INTELIGENTES (CON REFERENCIAS CONTEXTUALES)
   */
  async manageConversationState(userId, message, intent, relevantProducts, currentState) {
    try {
      let newState = currentState
      const conversationData = await this.original.getConversationData(userId) || {}
      
        // 🎯 MANEJAR REFERENCIAS CONTEXTUALES PRIMERO
        if (intent.hasContextualReference) {
          console.log(`🎯 Referencia contextual detectada en: "${message}"`)
          
          // Buscar producto en contexto usando la función del sistema original
          const contextualProduct = await this.original.interpretContextualReference(
            message, 
            conversationData,  // ✅ CORREGIDO: conversationData completo
            userId             // ✅ CORREGIDO: userId como clientId
          )
          
          if (contextualProduct) {
            console.log(`🎯 Producto contextual encontrado: ${contextualProduct.name}`)
            
            // ✅ RESPONDER LA PREGUNTA EN LUGAR DE BUSCAR PRODUCTOS
            const questionResponse = await this.answerContextualQuestion(userId, message, contextualProduct, await this.getCustomerName(userId))
            if (questionResponse) {
              return
            }
            
            // Si no se pudo responder la pregunta, actualizar estado normalmente
            // Cambiar a estado SPECIFYING si pide información
            if (intent.isInfoRequest) {
              newState = this.original.STATES.SPECIFYING
            }
            // Cambiar a CONFIRMING si muestra intención de compra
            else if (intent.isConfirmation) {
              newState = this.original.STATES.CONFIRMING
            }
            // Mantener INTERESTED para seguir explorando
            else {
              newState = this.original.STATES.INTERESTED
            }
            
            // Actualizar contexto con el producto referenciado
            await this.original.setConversationState(userId, newState, {
              ...conversationData,
              current_product: contextualProduct,
              context_maintained: true,
              last_reference: {
                message: message,
                product: contextualProduct.name,
                timestamp: Date.now()
              }
            })
            
            console.log(`🔄 Estado contextual: ${currentState} -> ${newState} (producto: ${contextualProduct.name})`)
            return
          } else {
            console.log(`❌ No hay productos en contexto para interpretar la referencia`)
          }
        }
      
      // 🔄 LÓGICA DE TRANSICIÓN DE ESTADOS NORMAL
      if (intent.isGreeting && currentState !== this.original.STATES.ASKING_NAME) {
        // Saludo -> mantener en BROWSING para mostrar productos
        newState = this.original.STATES.BROWSING
      }
      else if (intent.isProductInquiry && intent.hasSpecificModel && relevantProducts.length > 0) {
        // Pregunta específica sobre producto -> INTERESTED
        newState = this.original.STATES.INTERESTED
        
        // Guardar productos de interés en contexto
        await this.original.setConversationState(userId, newState, {
          ...conversationData,
          interested_products: relevantProducts.map(p => ({
            id: p.id,
            name: p.nombre,
            price: p.precio,
            description: p.descripcion,
            stock: p.stock,
            isVip: p.es_vip
          })),
          // 🎯 CORRECCIÓN: Agregar displayed_products para que interpretContextualReference funcione
          displayed_products: relevantProducts.map((p, index) => ({
            id: p.id,
            name: p.nombre,
            price: p.precio,
            description: p.descripcion,
            stock: p.stock,
            isVip: p.es_vip,
            position: index + 1, // Para referencias como "el primero", "el segundo"
            displayOrder: index,
            timestamp: Date.now()
          })),
          last_recommendation: {
            message: message,
            products: relevantProducts.map(p => p.nombre),
            timestamp: Date.now(),
            isVip: relevantProducts.some(p => p.es_vip)
          }
        })
        
        console.log(`🔄 Estado cambiado: ${currentState} -> ${newState} (productos de interés: ${relevantProducts.length})`)
        return
      }
      else if (intent.isProductInquiry && !intent.hasSpecificModel) {
        // Consulta general de productos -> mantener BROWSING
        newState = this.original.STATES.BROWSING
      }
      else if (this.isAskingForSpecification(message, intent) || intent.isInfoRequest || intent.isFunctionalityQuestion) {
        // ✅ CORREGIDO: Pidiendo especificaciones O pregunta funcional -> SPECIFYING
        newState = this.original.STATES.SPECIFYING
      }
      else if (this.isConfirmingPurchase(message, intent)) {
        // Confirmando compra -> CONFIRMING
        newState = this.original.STATES.CONFIRMING
      }
      else if (intent.hasContextualReference) {
        // ✅ NUEVO: Referencia contextual -> mantener estado actual o ir a SPECIFYING si es pregunta
        if (intent.isInfoRequest || intent.isFunctionalityQuestion) {
          newState = this.original.STATES.SPECIFYING
        } else {
          newState = currentState // Mantener estado actual
        }
      }
      
      // Actualizar estado si hay cambio
      if (newState !== currentState) {
        await this.original.setConversationState(userId, newState, {
          ...conversationData,
          state_change_reason: this.getStateChangeReason(intent),
          timestamp: Date.now()
        })
        console.log(`🔄 Estado conversacional actualizado: ${currentState} -> ${newState}`)
      }
      
    } catch (error) {
      console.error('❌ Error gestionando estado conversacional:', error)
    }
  }
  
  /**
   * 📝 OBTENER RAZÓN DEL CAMBIO DE ESTADO
   */
  getStateChangeReason(intent) {
    if (intent.isGreeting) return 'greeting_detected'
    if (intent.hasContextualReference) return 'contextual_reference'
    if (intent.isConfirmation) return 'purchase_confirmation'
    if (intent.isInfoRequest) return 'information_request'
    if (intent.isFunctionalityQuestion) return 'functionality_question' // ✅ NUEVO
    if (intent.hasSpecificModel) return 'specific_product_inquiry'
    if (intent.isGeneralQuery) return 'general_product_inquiry'
    return 'general_interaction'
  }
  
  /**
   * 💬 RESPONDER PREGUNTAS CONTEXTUALES SOBRE PRODUCTOS
   */
  async answerContextualQuestion(userId, question, contextualProduct, customerName) {
    try {
      console.log(`💬 Respondiendo pregunta contextual: "${question}" sobre ${contextualProduct.name || contextualProduct.nombre}`)
      
      const questionLC = question.toLowerCase()
      const productName = contextualProduct.name || contextualProduct.nombre || 'el producto'
      
      let response = ''
      
      if (customerName) {
        response = `¡Hola ${customerName}! 😊\n\n`
      }
      
      // Detectar tipo de pregunta y responder apropiadamente
      if (questionLC.includes('viajes') || questionLC.includes('viajar') || questionLC.includes('viaje') ||
          questionLC.includes('llevar') || questionLC.includes('usar') || questionLC.includes('funciona')) {
        response += `🌍 ¡Por supuesto! El **${productName}** es perfecto para tus viajes:\n\n`
        response += `✈️ **Para viajes:**\n`
        response += `• Excelente duración de batería para vuelos largos\n`
        response += `• Cámara profesional para capturar momentos únicos\n`
        response += `• GPS preciso para navegación en lugares nuevos\n`
        response += `• Almacenamiento amplio para fotos y videos de viaje\n`
        response += `• Resistente y duradero para aventuras\n\n`
        
        if (questionLC.includes('grabar') || questionLC.includes('grabación') || questionLC.includes('video') || questionLC.includes('ruta')) {
          response += `🎥 **Para grabar rutas:**\n`
          response += `• Video 4K para grabar paisajes increíbles\n`
          response += `• Estabilización óptica para videos suaves\n`
          response += `• Grabación continua sin interrupciones\n`
          response += `• Función time-lapse para rutas largas\n`
          response += `• Gran capacidad de almacenamiento para videos largos\n\n`
        }
        
        response += `¿Te gustaría conocer más características para viajes? 😊`
        
      } else if (questionLC.includes('características') || questionLC.includes('especificaciones') || questionLC.includes('cómo es')) {
        response += `📱 **Características del ${productName}:**\n\n`
        if (contextualProduct.descripcion || contextualProduct.description) {
          response += `${contextualProduct.descripcion || contextualProduct.description}\n\n`
        }
        response += `¿Qué característica específica te interesa más? 😊`
        
      } else if (questionLC.includes('precio') || questionLC.includes('cuesta') || questionLC.includes('costo')) {
        response += `💰 **Precio del ${productName}:**\n\n`
        if (contextualProduct.precio || contextualProduct.price) {
          response += `S/ ${contextualProduct.precio || contextualProduct.price}`
          if (contextualProduct.es_vip || contextualProduct.isVip) {
            response += ` 👑 (Precio VIP especial)`
          }
          response += `\n\n`
        }
        response += `¿Te interesa conocer las opciones de pago? 😊`
        
      } else if (questionLC.includes('stock') || questionLC.includes('disponible') || questionLC.includes('hay')) {
        response += `📦 **Disponibilidad del ${productName}:**\n\n`
        if (contextualProduct.stock !== undefined) {
          response += contextualProduct.stock > 0 ? `✅ **Disponible** (${contextualProduct.stock} unidades)` : `❌ **Agotado temporalmente**`
        } else {
          response += `✅ **Disponible**`
        }
        response += `\n\n¿Te gustaría separarlo? 😊`
        
      } else if (questionLC.includes('comprar') || questionLC.includes('quiero') || questionLC.includes('llevar')) {
        response += `🛒 **¡Perfecto! ¿Quieres adquirir el ${productName}?**\n\n`
        if (contextualProduct.precio || contextualProduct.price) {
          response += `💰 Precio: S/ ${contextualProduct.precio || contextualProduct.price}`
          if (contextualProduct.es_vip || contextualProduct.isVip) {
            response += ` 👑 (Oferta VIP)`
          }
          response += `\n\n`
        }
        response += `¿Confirmas tu pedido? 😊`
        
      } else {
        // Pregunta general sobre el producto
        response += `💬 **Sobre el ${productName}:**\n\n`
        response += `Es un excelente producto con grandes características. `
        if (contextualProduct.descripcion || contextualProduct.description) {
          response += `\n\n${(contextualProduct.descripcion || contextualProduct.description).substring(0, 200)}...`
        }
        response += `\n\n¿Qué aspecto específico te interesa conocer? 😊`
      }
      
      // Enviar respuesta
      await this.original.sendMessage(userId, response)
      await this.original.addToHistory(userId, 'assistant', response)
      
      console.log(`✅ Pregunta contextual respondida exitosamente`)
      
      return {
        processed: true,
        source: 'enhanced_contextual_answer',
        questionAnswered: true,
        product: productName,
        customerName,
        shouldDelegate: false,
        delegateReason: 'contextual_question_answered_by_enhanced',
        user: userId,
        timestamp: new Date().toISOString()
      }
      
    } catch (error) {
      console.error('❌ Error respondiendo pregunta contextual:', error)
      return null
    }
  }

  /**
   * 🤔 DETECTAR SI ESTÁ PIDIENDO ESPECIFICACIONES
   */
  isAskingForSpecification(message, intent) {
    const specificationKeywords = [
      'información', 'detalles', 'especificaciones', 'características',
      'dime más', 'cuéntame', 'cómo es', 'qué tal es',
      'tiene', 'incluye', 'viene con', 'capacidad', 'color', 'tamaño'
    ]
    
    const messageLC = message.toLowerCase()
    return specificationKeywords.some(keyword => messageLC.includes(keyword))
  }
  
  /**
   * ✅ DETECTAR SI ESTÁ CONFIRMANDO COMPRA
   */
  isConfirmingPurchase(message, intent) {
    const confirmationKeywords = [
      'quiero', 'comprar', 'llevar', 'me interesa', 'lo quiero',
      'sí', 'si', 'dale', 'perfecto', 'excelente', 'ok',
      'cuánto cuesta', 'precio', 'cuanto', 'cómo lo compro'
    ]
    
    const messageLC = message.toLowerCase()
    return confirmationKeywords.some(keyword => messageLC.includes(keyword))
  }
  
  /**
   * 👤 OBTENER NOMBRE DEL CLIENTE (IMPLEMENTACIÓN COMPLETA DEL BACKUP)
   */
  async getCustomerName(phoneNumber) {
    try {
      // 1. 🔍 BUSCAR EN ESTADO DE CONVERSACIÓN ACTUAL
      const conversationData = await this.original.getConversationData(phoneNumber)
      if (conversationData && conversationData.customer_name) {
        console.log(`📝 Cliente encontrado en conversación: ${conversationData.customer_name}`)
        return conversationData.customer_name
      }
      
      // 2. 🔍 BÚSQUEDA EN CLIENTES CURIOSOS
      const clienteCurioso = await this.getClienteCurioso(phoneNumber)
      if (clienteCurioso && clienteCurioso.cliente_nombre) {
        console.log(`🔍 Cliente curioso encontrado: ${clienteCurioso.cliente_nombre} (${clienteCurioso.veces_consultado} consultas)`)
        
        // 🛑 VERIFICAR ESTADO ACTUAL ANTES DE SOBRESCRIBIR
        const currentState = await this.original.getConversationState(phoneNumber)
        if (currentState === this.original.STATES.SPECIFYING || currentState === this.original.STATES.CONFIRMING) {
          console.log(`🛑 NO sobrescribir estado ${currentState} con BROWSING para cliente curioso`)
          return clienteCurioso.cliente_nombre
        }
        
        // Actualizar estado de conversación con información de cliente curioso
        await this.original.setConversationState(phoneNumber, this.original.STATES.BROWSING, {
          customer_name: clienteCurioso.cliente_nombre,
          cliente_tipo: 'curioso',
          veces_consultado: clienteCurioso.veces_consultado,
          es_curioso: true
        })
        return clienteCurioso.cliente_nombre
      }
      
      // 3. 👑 BÚSQUEDA EN SUPABASE PARA CLIENTES VIP/RECURRENTES
      const clienteInfo = await this.getClienteRecurrenteInfo(phoneNumber)
      if (clienteInfo && clienteInfo.cliente_nombre) {
        console.log(`👑 Cliente VIP/Recurrente encontrado: ${clienteInfo.cliente_nombre} (Nivel: ${clienteInfo.nivel_cliente})`)
        
        // 🛑 VERIFICAR ESTADO ACTUAL ANTES DE SOBRESCRIBIR
        const currentState = await this.original.getConversationState(phoneNumber)
        if (currentState === this.original.STATES.SPECIFYING || currentState === this.original.STATES.CONFIRMING) {
          console.log(`🛑 NO sobrescribir estado ${currentState} con BROWSING para cliente VIP/recurrente`)
          return clienteInfo.cliente_nombre
        }
        
        // Actualizar estado de conversación con información VIP
        await this.original.setConversationState(phoneNumber, this.original.STATES.BROWSING, {
          customer_name: clienteInfo.cliente_nombre,
          cliente_nivel: clienteInfo.nivel_cliente,
          es_recurrente: true,
          total_pedidos: clienteInfo.total_pedidos
        })
        return clienteInfo.cliente_nombre
      }
      
      // 4. 📈 BÚSQUEDA EN PEDIDOS PARA CLIENTES NORMALES
      const clienteNormal = await this.getClienteNormalInfo(phoneNumber)
      if (clienteNormal && clienteNormal.cliente_nombre) {
        console.log(`📈 Cliente normal encontrado: ${clienteNormal.cliente_nombre} (${clienteNormal.total_pedidos} pedidos)`)
        
        // 🛑 VERIFICAR ESTADO ACTUAL ANTES DE SOBRESCRIBIR
        const currentState = await this.original.getConversationState(phoneNumber)
        if (currentState === this.original.STATES.SPECIFYING || currentState === this.original.STATES.CONFIRMING) {
          console.log(`🛑 NO sobrescribir estado ${currentState} con BROWSING para cliente normal`)
          return clienteNormal.cliente_nombre
        }
        
        // Actualizar estado de conversación con información de cliente normal
        await this.original.setConversationState(phoneNumber, this.original.STATES.BROWSING, {
          customer_name: clienteNormal.cliente_nombre,
          cliente_nivel: 'Normal',
          es_recurrente: clienteNormal.total_pedidos > 1,
          total_pedidos: clienteNormal.total_pedidos
        })
        return clienteNormal.cliente_nombre
      }
      
      // 5. 📞 INTENTAR OBTENER NOMBRE DEL CONTACTO DE WHATSAPP
      try {
        const contact = await this.original.sock?.onWhatsApp(phoneNumber)
        const contactName = contact?.[0]?.notify

        // Si el nombre del contacto es diferente al número, usarlo
        if (contactName && contactName !== phoneNumber.replace('@s.whatsapp.net', '')) {
          console.log(`📞 Nombre de contacto WhatsApp: ${contactName}`)
          return contactName
        }
      } catch (error) {
        console.error('Error obteniendo contacto de WhatsApp:', error)
      }
      
      // 6. 🆕 CLIENTE COMPLETAMENTE NUEVO
      console.log(`🆕 Cliente nuevo detectado: ${phoneNumber}`)
      return null
      
    } catch (error) {
      console.error('❌ Error obteniendo nombre del cliente:', error)
      return null
    }
  }
  
  /**
   * 🔍 OBTENER CLIENTE CURIOSO
   */
  async getClienteCurioso(phoneNumber) {
    try {
      const { data, error } = await this.db.client
        .from('clientes_curiosos')
        .select('*')
        .eq('telefono', phoneNumber)
        .single()
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error obteniendo cliente curioso:', error)
      }
      
      if (data) {
        return {
          cliente_nombre: data.nombre,
          veces_consultado: data.veces_consultado,
          primera_interaccion: data.primera_interaccion,
          ultima_interaccion: data.ultima_interaccion,
          tipo: 'curioso'
        }
      }
      
      return null
    } catch (error) {
      console.error('Error en getClienteCurioso:', error)
      return null
    }
  }
  
  /**
   * 👑 OBTENER CLIENTE VIP/RECURRENTE
   */
  async getClienteRecurrenteInfo(phoneNumber) {
    try {
      // Buscar en pedidos agrupados por cliente
      const { data, error } = await this.db.client
        .from('pedidos')
        .select('cliente_nombre, cliente_whatsapp')
        .eq('cliente_whatsapp', phoneNumber)
        .not('cliente_nombre', 'is', null)
        .order('fecha_creacion', { ascending: false })
        .limit(1)
      
      if (data && data.length > 0) {
        // Contar total de pedidos
        const { count } = await this.db.client
          .from('pedidos')
          .select('*', { count: 'exact' })
          .eq('cliente_whatsapp', phoneNumber)
        
        return {
          cliente_nombre: data[0].cliente_nombre,
          nivel_cliente: count > 3 ? 'VIP' : 'Recurrente',
          total_pedidos: count || 0
        }
      }
      
      return null
    } catch (error) {
      console.error('Error obteniendo cliente recurrente:', error)
      return null
    }
  }
  
  /**
   * 📈 OBTENER CLIENTE NORMAL
   */
  async getClienteNormalInfo(phoneNumber) {
    try {
      const { data, error } = await this.db.client
        .from('pedidos')
        .select('cliente_nombre')
        .eq('cliente_whatsapp', phoneNumber)
        .not('cliente_nombre', 'is', null)
        .order('fecha_creacion', { ascending: false })
        .limit(1)
      
      if (data && data.length > 0) {
        const { count } = await this.db.client
          .from('pedidos')
          .select('*', { count: 'exact' })
          .eq('cliente_whatsapp', phoneNumber)
        
        return {
          cliente_nombre: data[0].cliente_nombre,
          total_pedidos: count || 0
        }
      }
      
      return null
    } catch (error) {
      console.error('Error obteniendo cliente normal:', error)
      return null
    }
  }
  
  /**
   * 👑 VERIFICAR ESTADO VIP DEL CLIENTE (CORREGIDO)
   */
  async checkVipStatus(phoneNumber) {
    try {
      // Verificar en la tabla de clientes VIP
      const { data, error } = await this.db.client
        .from('clientes_vip')
        .select('*')
        .eq('whatsapp_id', phoneNumber)
        .single()
      
      if (data && data.activo) {
        console.log(`👑 Cliente VIP detectado: ${phoneNumber}`)
        return {
          isVip: true,
          nivel: data.nivel || 'VIP',
          descuento: data.descuento_porcentaje || 0,
          fecha_vencimiento: data.fecha_vencimiento
        }
      }
      
      return { isVip: false }
    } catch (error) {
      console.error('❌ Error verificando estado VIP:', error)
      return { isVip: false }
    }
  }
  
  /**
   * 👋 MANEJAR SALUDO CON PERSONALIDAD (INTEGRACIÓN COMPLETA CON BACKUP)
   */
  async handleGreetingWithPersonality(userId, customerName, vipStatus) {
    // Si NO tenemos el nombre del cliente, solicitar nombre primero
    if (!customerName) {
      console.log(`🆕 Cliente nuevo detectado en saludo - solicitando nombre`)
      
      // Cambiar estado a ASKING_NAME
      await this.original.setConversationState(userId, this.original.STATES.ASKING_NAME)
      
      // Usar mensaje de bienvenida personalizado
      const welcomeMessage = await this.original.getWelcomeMessage()
      
      return {
        processed: true,
        source: 'enhanced_new_customer_greeting',
        isNewCustomer: true,
        message: welcomeMessage,
        user: userId,
        timestamp: new Date().toISOString()
      }
    }
    
    // 👑 CLIENTE CONOCIDO - USAR LÓGICA COMPLETA DEL BACKUP
    console.log(`👑 Cliente conocido detectado: ${customerName}, VIP: ${vipStatus.isVip}`)
    
    try {
      // Usar la función completa handleReturningCustomerGreeting del sistema original
      // Esta función maneja todo: saludo personalizado + productos VIP automáticos
      await this.original.handleReturningCustomerGreeting(userId, customerName, [])
      
      return {
        processed: true,
        source: 'enhanced_backup_greeting_integration',
        isVip: vipStatus.isVip,
        customerName,
        message: 'Greeting handled by backup system with VIP products',
        user: userId,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('❌ Error usando handleReturningCustomerGreeting, usando fallback:', error)
      
      // FALLBACK: Saludo básico si falla la integración
      let greeting = `¡Hola ${customerName}! 👋`
      
      if (vipStatus.isVip) {
        greeting += ' 👑 ¡Qué gusto verte de nuevo! Como cliente VIP, tienes acceso a ofertas exclusivas.'
      } else {
        greeting += ' ¡Qué bueno verte de nuevo!'
      }
      
      greeting += '\n\nTengo productos increíbles para mostrarte. ¿Qué tipo de producto te interesa hoy?'
      
      // Enviar mensaje de fallback
      await this.original.sendMessage(userId, greeting)
      
      return {
        processed: true,
        source: 'enhanced_fallback_greeting',
        isVip: vipStatus.isVip,
        customerName,
        message: greeting,
        user: userId,
        timestamp: new Date().toISOString()
      }
    }
  }
  
  /**
   * 📱 GENERAR RESPUESTA INTELIGENTE DE PRODUCTOS (MEJORADA CON CONTEXTO)
   */
  async generateIntelligentProductResponse(userId, message, products, intent, customerName, vipStatus) {
    try {
      const productCount = products.length
      
      // 🎯 FILTRAR PRODUCTO ESPECÍFICO SI LO SOLICITA
      const specificProduct = await this.findSpecificProductMatch(message, products)
      
      if (specificProduct) {
        // 🎯 PRODUCTO ESPECÍFICO ENCONTRADO - DELEGAR AL SISTEMA ORIGINAL CON LIMPIEZA
        console.log(`🎯 Producto específico encontrado: ${specificProduct.nombre} - delegando al sistema original`)
        
        // 🔥 LIMPIAR CONTEXTO OBSOLETO ANTES DE DELEGAR
        await this.setCleanProductContext(userId, specificProduct.nombre, [specificProduct])
        
        // 🎯 RETORNAR CON INFORMACIÓN EXPLÍCITA PARA FORZAR USO CORRECTO
        return {
          processed: true,
          source: 'enhanced_specific_product_found',
          productFound: specificProduct.nombre,
          productId: specificProduct.id,
          price: specificProduct.precio,
          isVip: specificProduct.es_vip,
          customerName,
          isVipClient: vipStatus.isVip,
          forceProductUpdate: true, // ⭐ FLAG PARA FORZAR ACTUALIZACIÓN
          cleanMemory: true, // ⭐ FLAG PARA LIMPIAR MEMORIA
          targetProduct: specificProduct, // ⭐ PRODUCTO COMPLETO
          user: userId,
          timestamp: new Date().toISOString()
        }
      }
      
      // 📝 MÚTIPLES PRODUCTOS O SIN COINCIDENCIA ESPECÍFICA
      if (productCount === 1) {
        // Un solo producto - delegar al sistema original para imagen
        const product = products[0]
        console.log(`📱 Un solo producto encontrado: ${product.nombre} - delegando al sistema original`)
        
        return {
          processed: true,
          source: 'enhanced_single_product_found',
          productFound: product.nombre,
          price: product.precio,
          isVip: product.es_vip,
          customerName,
          isVipClient: vipStatus.isVip,
          // ❌ NO incluir 'message' para que se procese con imagen
          user: userId,
          timestamp: new Date().toISOString()
        }
      } else if (productCount <= 4) {
        // Pocos productos - generar respuesta con lista (SIN imágenes)
        let response = `¡Excelente`
        if (customerName) response += ` ${customerName}`
        response += `! Tengo ${productCount} productos disponibles`
        
        if (vipStatus.isVip) {
          response += ' (con ofertas VIP especiales para ti 👑)'
        }
        
        response += ':\n\n'
        
        products.forEach((product, index) => {
          response += `${index + 1}. ${product.nombre}\n`
          response += `   💰 S/ ${product.precio}`
          if (product.es_vip) response += ' (VIP 👑)'
          response += '\n\n'
        })
        
        response += '¿Te interesa alguno en particular? 😊\n\n📝 Puedes decir "Dame información del iPhone [modelo]" para ver detalles completos con imagen'
        
        return {
          processed: true,
          source: 'enhanced_multiple_products_list',
          productCount,
          customerName,
          isVipClient: vipStatus.isVip,
          message: response, // ✅ SÍ incluir mensaje para envío directo
          user: userId,
          timestamp: new Date().toISOString()
        }
      } else {
        // Muchos productos - respuesta general
        let response = `¡Genial`
        if (customerName) response += ` ${customerName}`
        response += `! Tengo ${productCount} productos que te pueden interesar.`
        
        if (vipStatus.isVip) {
          response += ' Como cliente VIP, tienes acceso a ofertas especiales 👑'
        }
        
        response += '\n\n¿Te interesa algún modelo específico? Por ejemplo: "iPhone 14", "iPhone 15", o "iPhone 16" 📱✨'
        
        return {
          processed: true,
          source: 'enhanced_many_products_guide',
          productCount,
          customerName,
          isVipClient: vipStatus.isVip,
          message: response, // ✅ SÍ incluir mensaje para envío directo
          user: userId,
          timestamp: new Date().toISOString()
        }
      }
      
    } catch (error) {
      console.error('❌ Error generando respuesta inteligente:', error)
      return this.generateFallbackProductResponse(products, customerName, vipStatus)
    }
  }
  
  /**
   * 🎯 ENCONTRAR COINCIDENCIA DE PRODUCTO ESPECÍFICO (TOTALMENTE DINÁMICO - SIN HARDCODEO)
   */
  async findSpecificProductMatch(message, products) {
    const messageLC = message.toLowerCase()
    console.log(`🔍 DEBUGGING: Buscando coincidencia para "${message}" en ${products.length} productos`)
    
    // 🔍 EXTRAER PATRONES DINÁMICAMENTE DE LOS PRODUCTOS EXISTENTES
    const dynamicPatterns = this.extractDynamicPatterns(products)
    console.log(`🧠 Patrones dinámicos extraidos: ${dynamicPatterns.length} patrones`)
    
    // 🚫 DETECTAR INTENCIÓN NEGATIVA DINÁMICA
    const negativeKeywords = ['no', 'no quiero', 'no es', 'no busco', 'no me interesa']
    const positiveKeywords = ['busco', 'quiero', 'necesito', 'información', 'dame', 'muestra']
    
    let rejectedTerms = []
    let requestedTerms = []
    
    // Detectar términos rechazados y solicitados dinámicamente
    this.analyzeIntentionDynamically(messageLC, negativeKeywords, positiveKeywords, rejectedTerms, requestedTerms)
    
    let bestMatch = null
    let bestScore = 0
    
    for (const product of products) {
      let score = 0
      const productNameLC = product.nombre.toLowerCase()
        console.log(`🔍 DEBUGGING: Evaluando "${product.nombre}"...`)
      
      // Calcular relevancia dinámica
      score = this.calculateDynamicRelevance(messageLC, productNameLC, dynamicPatterns, rejectedTerms, requestedTerms)
      
      // Bonus para productos VIP (solo si no está penalizado)
      if (product.es_vip && score > 0) {
        score += 2
        console.log(`  👑 Bonus VIP: +2 puntos (total: ${score})`)
      }
      
        console.log(`📊 Score final para "${product.nombre}": ${score}`)
      
        // Actualizar mejor coincidencia
      if (score > bestScore) {
        bestScore = score
        bestMatch = product
        console.log(`🏆 Nueva mejor coincidencia: ${product.nombre} (score: ${score})`)
      }
    }
    
    console.log(`🎯 Score final máximo: ${bestScore}, umbral requerido: 8`)
    
    // Solo devolver si hay una coincidencia significativa Y NO está penalizada
    if (bestScore >= 8) {
      console.log(`🎯 Coincidencia específica encontrada: ${bestMatch.nombre} (score: ${bestScore})`)
      return bestMatch
    } else {
      console.log(`❌ No se encontró coincidencia específica (score máximo: ${bestScore})`)
    }
    
    return null
  }
  
  /**
   * 🧠 EXTRAER PATRONES DINÁMICOS DE PRODUCTOS (SIN HARDCODEO)
   */
  extractDynamicPatterns(products) {
    const patterns = new Set()
    
    for (const product of products) {
      const name = product.nombre.toLowerCase()
      
      // Extraer palabras clave dinámicamente
      const words = name.split(/\s+/).filter(word => word.length > 2)
      
      // Extraer números (posibles modelos)
      const numbers = name.match(/\d+/g) || []
      
      // Extraer marcas y modelos dinámicamente
      words.forEach(word => {
        if (word.length > 3) { // Solo palabras significativas
          patterns.add({
            pattern: new RegExp(word.replace(/[^a-z0-9]/g, ''), 'i'),
            weight: this.calculateWordWeight(word),
            type: 'brand_model'
          })
        }
      })
      
      // Agregar patrones numéricos
      numbers.forEach(num => {
        patterns.add({
          pattern: new RegExp(`\\b${num}\\b`, 'i'),
          weight: 10, // Números tienen alta prioridad
          type: 'model_number'
        })
      })
    }
    
    return Array.from(patterns)
  }
  
  /**
   * ⚖️ CALCULAR PESO DINÁMICO DE PALABRAS
   */
  calculateWordWeight(word) {
    // Palabras más largas = mayor peso
    // Palabras comunes = menor peso
    const commonWords = ['apple', 'samsung', 'pro', 'max', 'plus', 'mini']
    const baseWeight = word.length
    const isCommon = commonWords.includes(word.toLowerCase())
    
    return isCommon ? Math.max(1, baseWeight - 2) : baseWeight
  }
  
  /**
   * 🧐 ANALIZAR INTENCIÓN DINÁMICAMENTE
   */
  analyzeIntentionDynamically(messageLC, negativeKeywords, positiveKeywords, rejectedTerms, requestedTerms) {
    // Detectar patrones negativos dinámicamente
    negativeKeywords.forEach(negKeyword => {
      const negPattern = new RegExp(`${negKeyword}\\s+([a-z0-9\\s]+)`, 'i')
      const match = messageLC.match(negPattern)
      if (match && match[1]) {
        rejectedTerms.push(match[1].trim())
        console.log(`🚫 TÉRMINO RECHAZADO detectado: "${match[1].trim()}"`)
      }
    })
    
    // Detectar patrones positivos dinámicamente
    positiveKeywords.forEach(posKeyword => {
      const posPattern = new RegExp(`${posKeyword}\\s+([a-z0-9\\s]+)`, 'i')
      const match = messageLC.match(posPattern)
      if (match && match[1]) {
        requestedTerms.push(match[1].trim())
        console.log(`✅ TÉRMINO SOLICITADO detectado: "${match[1].trim()}"`)
      }
    })
  }
  
  /**
   * 📈 CALCULAR RELEVANCIA DINÁMICA
   */
  /**
   * 📈 CALCULAR RELEVANCIA DINÁMICA
   */
  calculateDynamicRelevance(messageLC, productNameLC, patterns, rejectedTerms, requestedTerms) {
    let score = 0
    
    // Verificar coincidencias dinámicas
    patterns.forEach(({ pattern, weight, type }) => {
      const messageMatches = pattern.test(messageLC)
      const productMatches = pattern.test(productNameLC)
      
      if (messageMatches && productMatches) {
        let finalWeight = weight
        
        // Verificar si está en términos rechazados
        const isRejected = rejectedTerms.some(term => 
          pattern.test(term) || productNameLC.includes(term)
        )
        
        // Verificar si está en términos solicitados
        const isRequested = requestedTerms.some(term => 
          pattern.test(term) || productNameLC.includes(term)
        )
        
        if (isRejected) {
          finalWeight = -20 // Penalización por rechazo
          console.log(`  🚫 PENALIZACIÓN: Patrón rechazado: ${finalWeight} puntos`)
        } else if (isRequested) {
          finalWeight += 15 // Bonus por solicitud
          console.log(`  🎯 BONUS SOLICITUD: +15 puntos extra`)
        }
        
        score += finalWeight
        console.log(`  ${finalWeight > 0 ? '✅' : '🚫'} Patrón dinámico (${type}): ${finalWeight > 0 ? '+' : ''}${finalWeight} puntos (total: ${score})`)
      }
    })
    
    return score
  }
  
  /**
   * 🔍 BUSCAR COINCIDENCIAS PARCIALES DINÁMICAMENTE (SIN HARDCODEO)
   */
  findPartialMatches(message, products, searchTerms) {
    const messageLC = message.toLowerCase()
    const matches = []
    
    for (const product of products) {
      let relevanceScore = 0
      const productNameLC = product.nombre.toLowerCase()
      const productDesc = (product.descripcion || '').toLowerCase()
      
      // Evaluar cada término de búsqueda dinámicamente
      for (const term of searchTerms) {
        const termLower = term.toLowerCase()
        
        // Búsqueda en nombre (mayor peso)
        if (productNameLC.includes(termLower)) {
          relevanceScore += 5
        }
        
        // Búsqueda en descripción (menor peso)
        if (productDesc.includes(termLower)) {
          relevanceScore += 2
        }
        
        // Búsqueda por similitud de palabras
        const productWords = productNameLC.split(/\s+/)
        const similarity = this.calculateWordSimilarity(termLower, productWords)
        relevanceScore += similarity
      }
      
      if (relevanceScore > 0) {
        matches.push({
          ...product,
          _relevanceScore: relevanceScore
        })
      }
    }
    
    // Ordenar por relevancia y retornar top matches
    return matches
      .sort((a, b) => b._relevanceScore - a._relevanceScore)
      .slice(0, 5) // Máximo 5 coincidencias
      .map(m => {
        const { _relevanceScore, ...product } = m
        return product
      })
  }
  
  /**
   * 🔍 CALCULAR SIMILITUD DE PALABRAS DINÁMICAMENTE
   */
  calculateWordSimilarity(searchTerm, productWords) {
    let maxSimilarity = 0
    
    for (const word of productWords) {
      if (word.length < 2) continue
      
      // Similitud exacta
      if (word === searchTerm) {
        maxSimilarity = Math.max(maxSimilarity, 10)
        continue
      }
      
      // Similitud por contenido
      if (word.includes(searchTerm) || searchTerm.includes(word)) {
        maxSimilarity = Math.max(maxSimilarity, 3)
        continue
      }
      
      // Similitud por inicio/final
      if (word.startsWith(searchTerm.substring(0, 3)) || 
          word.endsWith(searchTerm.substring(-3))) {
        maxSimilarity = Math.max(maxSimilarity, 1)
      }
    }
    
    return maxSimilarity
  }
  
  /**
   * 🔍 EXTRAER PRODUCTOS SOLICITADOS DINÁMICAMENTE
   */
  async extractRequestedProductsDynamically(message) {
    const messageLC = message.toLowerCase()
    const requestedProducts = []
    
    // Palabras clave de solicitud
    const requestKeywords = ['busco', 'quiero', 'necesito', 'información sobre', 'dame', 'muestra']
    
    for (const keyword of requestKeywords) {
      const pattern = new RegExp(`${keyword}\\s+([a-z0-9\\s]+?)(?:\\s|$|\\.|\\,|\\?|\\!)`, 'gi')
      let match
      while ((match = pattern.exec(messageLC)) !== null) {
        const extractedProduct = match[1].trim()
        if (extractedProduct.length > 2) {
          requestedProducts.push(extractedProduct)
        }
      }
    }
    
    // Limpiar duplicados y retornar
    return [...new Set(requestedProducts)]
  }
  
  /**
   * 🎯 SELECCIONAR MEJORES PRODUCTOS DISPONIBLES DINÁMICAMENTE
   */
  async selectBestAvailableProducts(availableProducts, requestedProducts) {
    // Si no hay productos solicitados, retornar los primeros
    if (requestedProducts.length === 0) {
      return availableProducts
    }
    
    // Calcular similitud con productos solicitados
    const scoredProducts = availableProducts.map(product => {
      let similarity = 0
      const productNameLC = product.nombre.toLowerCase()
      
      requestedProducts.forEach(requested => {
        const requestedLC = requested.toLowerCase()
        
        // Similitud exacta
        if (productNameLC.includes(requestedLC)) {
          similarity += 10
        }
        
        // Similitud por palabras
        const requestedWords = requestedLC.split(/\s+/)
        const productWords = productNameLC.split(/\s+/)
        
        requestedWords.forEach(reqWord => {
          productWords.forEach(prodWord => {
            if (reqWord === prodWord) similarity += 5
            if (reqWord.includes(prodWord) || prodWord.includes(reqWord)) similarity += 2
          })
        })
      })
      
      return {
        ...product,
        _similarity: similarity
      }
    })
    
    // Ordenar por similitud y retornar
    return scoredProducts
      .sort((a, b) => b._similarity - a._similarity)
      .map(p => {
        const { _similarity, ...product } = p
        return product
      })
  }
  
  /**
   * 📝 GENERAR RESPUESTA DE TEXTO PARA PRODUCTO
   */
  generateTextProductResponse(product, customerName, vipStatus) {
    let response = `¡Perfecto`
    
    if (customerName) {
      response += ` ${customerName}`
    }
    
    response += `! Tengo el ${product.nombre} disponible. 📱\n\n`
    
    if (vipStatus.isVip && product.es_vip) {
      response += `👑 ¡Producto VIP especial para ti!\n`
    }
    
    response += `💰 Precio: S/ ${product.precio}`
    if (product.es_vip) response += ' (Oferta VIP 👑)'
    response += '\n\n¿Te interesa conocer más detalles de este modelo?'
    
    return {
      processed: true,
      source: 'enhanced_text_product_fallback',
      productFound: product.nombre,
      price: product.precio,
      isVip: product.es_vip,
      message: response
    }
  }
  
  /**
   * 🎨 CREAR PROMPT PERSONALIZADO PARA GEMINI
   */
  createPersonalizedPrompt(message, products, customerName, vipStatus, intent) {
    let prompt = `CONTEXTO DEL CLIENTE:\n`
    
    if (customerName) {
      prompt += `Nombre: ${customerName}\n`
    }
    
    if (vipStatus.isVip) {
      prompt += `CLIENTE VIP - Nivel: ${vipStatus.nivel}\n`
      if (vipStatus.descuento > 0) {
        prompt += `Descuento VIP: ${vipStatus.descuento}%\n`
      }
    }
    
    prompt += `\nMENSAJE DEL CLIENTE: "${message}"\n\n`
    prompt += `PRODUCTOS ENCONTRADOS:\n`
    
    products.forEach((product, index) => {
      prompt += `${index + 1}. ${product.nombre} - S/ ${product.precio}`
      if (product.es_vip) {
        prompt += ` (PRODUCTO VIP)`
      }
      prompt += `\n`
    })
    
    prompt += `\nINSTRUCCIONES:\n`
    prompt += `- Responde de manera natural y conversacional\n`
    prompt += `- Usa el nombre del cliente si está disponible\n`
    prompt += `- Si es cliente VIP, menciónalo y destaca beneficios especiales\n`
    prompt += `- Presenta los productos de manera atractiva\n`
    prompt += `- Máximo 3-4 líneas de respuesta\n`
    prompt += `- Incluye emojis relevantes\n`
    prompt += `- Termina con una pregunta para continuar la conversación\n`
    
    return prompt
  }
  
  /**
   * 🤖 GENERAR RESPUESTA NATURAL CON GEMINI (CON FALLBACKS)
   */
  async generateNaturalResponse(prompt, products, customerName, vipStatus) {
    try {
      // Usar el servicio Gemini del sistema original
      if (this.original.gemini) {
        const response = await this.original.gemini.generateSalesResponse(
          prompt,
          customerName || 'cliente',
          products,
          'browsing',
          [],
          this.original.inventory
        )
        
        if (response && response.trim()) {
          return response
        }
      }
      
      console.log('🤖 Gemini no disponible o no respondió, usando fallback inteligente')
      return this.generateIntelligentFallback(products, customerName, vipStatus)
      
    } catch (error) {
      console.error('❌ Error generando respuesta natural:', error)
      return this.generateIntelligentFallback(products, customerName, vipStatus)
    }
  }
  
  /**
   * 🎆 GENERAR FALLBACK INTELIGENTE (SIN GEMINI)
   */
  generateIntelligentFallback(products, customerName, vipStatus) {
    if (!products || products.length === 0) {
      let response = '¡Hola'
      if (customerName) response += ` ${customerName}`
      response += '! 👋'
      
      if (vipStatus.isVip) {
        response += ' 👑 Como cliente VIP, tienes acceso a ofertas exclusivas.'
      }
      
      response += ' Tengo excelentes productos para ti. ¿Qué tipo de producto te interesa? 😊'
      return response
    }
    
    if (products.length === 1) {
      const product = products[0]
      let response = '¡Perfecto'
      if (customerName) response += ` ${customerName}`
      response += `! Tengo el ${product.nombre} disponible. 📱\n\n`
      
      if (vipStatus.isVip && product.es_vip) {
        response += '👑 ¡Producto VIP especial para ti!\n'
      }
      
      response += `💰 Precio: S/ ${product.precio}`
      if (product.es_vip) response += ' (Oferta VIP 👑)'
      response += '\n\n¿Te interesa conocer más detalles?'
      
      return response
    }
    
    // Múltiples productos
    let response = '¡Excelente'
    if (customerName) response += ` ${customerName}`
    response += `! Tengo ${products.length} productos disponibles`
    
    if (vipStatus.isVip) {
      response += ' (con ofertas VIP especiales para ti 👑)'
    }
    
    response += ':\n\n'
    
    products.slice(0, 4).forEach((product, index) => {
      response += `${index + 1}. ${product.nombre}\n`
      response += `   💰 S/ ${product.precio}`
      if (product.es_vip) response += ' (VIP 👑)'
      response += '\n\n'
    })
    
    if (products.length > 4) {
      response += `... y ${products.length - 4} productos más\n\n`
    }
    
    response += '¿Te interesa alguno en particular? 😊'
    
    return response
  }

  /**
   * 🤖 EXTRAER NOMBRE INTELIGENTEMENTE
   */
  extractNameIntelligently(messageText) {
    const text = messageText.trim()
    
    // Patrones para detectar nombres inteligentemente
    const namePatterns = [
      // "Mi nombre es Elizabeth", "mi nombre es Juan"
      /(?:mi\s+nombre\s+es)\s+([a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+)/i,
      // "Me llamo Elizabeth", "me llamo Juan"
      /(?:me\s+llamo)\s+([a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+)/i,
      // "Hola me llamo Elizabeth", "hola mi nombre es Juan"
      /(?:hola,?\s+)(?:mi\s+nombre\s+es|me\s+llamo)\s+([a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+)/i,
      // "Soy Elizabeth", "soy Juan"
      /(?:soy)\s+([a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+)/i
    ]
    
    // Intentar cada patrón
    for (const pattern of namePatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        // Limpiar y extraer solo el primer nombre
        const extractedName = match[1].trim().split(' ')[0]
        const cleanName = extractedName.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, '')
        
        console.log(`🔥 NOMBRE DETECTADO: "${cleanName}" desde "${text}" usando patrón inteligente`)
        return cleanName
      }
    }
    
    // Fallback: si no coincide con patrones, usar la primera palabra limpia
    const firstWord = text.split(' ')[0].replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, '')
    console.log(`🔍 FALLBACK: Usando primera palabra "${firstWord}" desde "${text}"`)
    return firstWord
  }
  
  /**
   * 📝 PROCESAR NOMBRE RECIBIDO
   */
  async processReceivedName(phoneNumber, messageText) {
    try {
      // Detección inteligente de nombres
      const name = this.extractNameIntelligently(messageText)

      if (name && name.length > 1) {
        // Guardar cliente curioso en Supabase
        await this.saveClienteCurioso(phoneNumber, name)
        
        // 🛑 VERIFICAR ESTADO ACTUAL ANTES DE SOBRESCRIBIR
        const currentState = await this.original.getConversationState(phoneNumber)
        if (currentState === this.original.STATES.SPECIFYING || currentState === this.original.STATES.CONFIRMING) {
          console.log(`🛑 NO sobrescribir estado ${currentState} con BROWSING al procesar nombre`)
          return name
        }
        
        // Guardar nombre en conversationData usando el sistema original
        await this.original.setConversationState(phoneNumber, this.original.STATES.BROWSING, {
          customer_name: name,
          cliente_tipo: 'curioso',
          es_curioso: true
        })

        // Mensaje de confirmación personalizado
        console.log(`🎭 GENERANDO confirmación personalizada para: ${name}`)

        // Obtener categorías reales del inventario
        const categories = await this.original.inventory.getCategories()
        const categoriasTexto = categories.length > 0 ? categories.join(', ') : 'productos variados'

        const confirmMessage = `¡Perfecto ${name}! 😊 Bienvenido a nuestra tienda.

Tenemos excelentes productos disponibles: ${categoriasTexto}.

¿Qué tipo de producto te interesa?`

        await this.original.sendMessage(phoneNumber, confirmMessage)
        await this.original.addToHistory(phoneNumber, 'assistant', confirmMessage)
        
        return name
      } else {
        // Si el nombre no es válido, pedir de nuevo
        const retryMessage = `Disculpa, no pude entender tu nombre correctamente.

¿Podrías decirme solo tu nombre, por favor? Por ejemplo: "María" o "Juan" 😊`

        await this.original.sendMessage(phoneNumber, retryMessage)
        return null
      }
    } catch (error) {
      console.error('❌ Error procesando nombre recibido:', error)
      return null
    }
  }
  
  /**
   * 💾 GUARDAR CLIENTE CURIOSO
   */
  async saveClienteCurioso(phoneNumber, customerName) {
    try {
      console.log(`💾 Guardando cliente curioso: ${customerName} (${phoneNumber})`)
      
      // Verificar que la base de datos esté disponible
      if (!this.db || !this.db.client) {
        console.error('❌ Base de datos no disponible para clientes curiosos')
        return null
      }
      
      // Verificar si ya existe
      const { data: existingClient, error: checkError } = await this.db.client
        .from('clientes_curiosos')
        .select('*')
        .eq('telefono', phoneNumber)
        .single()
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error verificando cliente curioso existente:', checkError)
        return null
      }
      
      if (existingClient) {
        // Actualizar información existente
        const { data: updatedClient, error: updateError } = await this.db.client
          .from('clientes_curiosos')
          .update({
            nombre: customerName,
            ultima_interaccion: new Date(),
            veces_consultado: (existingClient.veces_consultado || 0) + 1
          })
          .eq('telefono', phoneNumber)
          .select()
          .single()
          
        if (updateError) {
          console.error('Error actualizando cliente curioso:', updateError)
          return null
        }
        
        console.log(`✅ Cliente curioso actualizado: ${customerName}`)
        return updatedClient
      } else {
        // Crear nuevo registro
        const { data: newClient, error: createError } = await this.db.client
          .from('clientes_curiosos')
          .insert({
            telefono: phoneNumber,
            nombre: customerName,
            primera_interaccion: new Date(),
            ultima_interaccion: new Date(),
            veces_consultado: 1
          })
          .select()
          .single()
          
        if (createError) {
          console.error('Error creando cliente curioso:', createError)
          return null
        }
        
        console.log(`✅ Nuevo cliente curioso guardado: ${customerName}`)
        return newClient
      }
    } catch (error) {
      console.error('Error guardando cliente curioso:', error)
      return null
    }
  }
  /**
   * 🧠 DETECTAR INTENCIÓN DEL MENSAJE (MEJORADA CON REFERENCIAS CONTEXTUALES)
   */
  async detectMessageIntent(message) {
    const messageLC = message.toLowerCase().trim()
    
    // ✅ PRIORIDAD 1: Detectar preguntas sobre funcionalidades PRIMERO
    const functionalityQuestions = [
      'sirve para', 'puedo usar', 'funciona para', 'es bueno para',
      'lo puedo llevar', 'se puede usar', 'me sirve para',
      'resiste', 'resistente', 'agua', 'malogra', 'bajo el agua',
      'graba', 'video', 'batería', 'duración', 'cámara'
    ]
    const isFunctionalityQuestion = functionalityQuestions.some(q => messageLC.includes(q))
    
    // ✅ PRIORIDAD 2: Detectar referencias contextuales
    const contextualReferences = [
      'ese', 'esa', 'este', 'esta', 'el que', 'la que', 'el anterior',
      'el de arriba', 'el primero', 'el segundo', 'el último',
      'lo quiero', 'me interesa', 'dame información', 'cuéntame más',
      'lo puedo', 'puedo usar', 'sirve para', 'funciona para',
      'quiero saber si', 'se puede', 'es bueno para',
      'llevar', 'viajes', 'grabar', 'ruta', 'video',
      'el celular', 'el teléfono', 'el producto', 'el equipo',
      'responde mi pregunta', 'mi pregunta', 'te pregunté', 'te estoy preguntando'
    ]
    const hasContextualReference = contextualReferences.some(ref => messageLC.includes(ref))
    
    // ✅ PRIORIDAD 3: Detectar saludos SOLO si no hay contexto previo
    const greetings = ['hola', 'hi', 'hello', 'buenas', 'buenos días', 'buenas tardes']
    const isGreeting = greetings.some(greeting => messageLC.includes(greeting)) && 
                      !hasContextualReference && 
                      !isFunctionalityQuestion
    
    // Detectar consultas de productos específicos
    const productKeywords = ['iphone', 'teléfono', 'celular', 'móvil', 'smartphone']
    const hasProductKeyword = productKeywords.some(keyword => messageLC.includes(keyword))
    
    // Detectar números de modelo
    const modelNumbers = ['14', '15', '16']
    const hasModelNumber = modelNumbers.some(model => messageLC.includes(model))
    
    // Detectar consultas generales de productos
    const generalQueries = [
      'qué productos', 'qué tienes', 'qué vendes', 'productos', 'modelos',
      'cuáles', 'cuales', 'qué hay', 'disponible', 'catálogo'
    ]
    const isGeneralProductQuery = generalQueries.some(query => messageLC.includes(query))
    
    // Detectar consultas de disponibilidad
    const availabilityQueries = ['vendes', 'tienes', 'hay', 'disponible']
    const isAvailabilityQuery = availabilityQueries.some(query => messageLC.includes(query))
    
    // 🔄 DETECTAR CONFIRMACIONES DE COMPRA (incluyendo confirmaciones cortas)
    const confirmationKeywords = [
      'quiero', 'comprar', 'llevar', 'me interesa', 'lo quiero',
      'si', 'sí', 'dale', 'perfecto', 'excelente', 'ok', 'yes'
    ]
    const isConfirmation = confirmationKeywords.some(keyword => messageLC.includes(keyword))
    
    // ✅ DETECCIÓN ESPECIAL: Confirmaciones cortas que necesitan contexto
    const shortConfirmations = ['si', 'sí', 'ok', 'dale', 'perfecto', 'excelente', 'no', 'nope']
    const isShortConfirmation = shortConfirmations.includes(messageLC.trim())
    
    // 📝 DETECTAR SOLICITUDES DE INFORMACIÓN
    const infoRequests = [
      'información', 'detalles', 'especificaciones', 'características',
      'dime más', 'cuéntame', 'cómo es', 'qué tal es'
    ]
    const isInfoRequest = infoRequests.some(req => messageLC.includes(req))
    
    return {
      isGreeting,
      isProductInquiry: hasProductKeyword || isGeneralProductQuery || isAvailabilityQuery,
      hasSpecificModel: hasModelNumber,
      isGeneralQuery: isGeneralProductQuery,
      needsProductSearch: hasProductKeyword || hasModelNumber || isGeneralProductQuery || isAvailabilityQuery,
      hasContextualReference: hasContextualReference || isFunctionalityQuestion,
      isConfirmation: isConfirmation || isShortConfirmation,
      isShortConfirmation,
      isInfoRequest,
      isFunctionalityQuestion,
      searchTerms: this.extractSearchTerms(messageLC)
    }
  }
  
  /**
   * 🔍 EXTRAER TÉRMINOS DE BÚSQUEDA DEL MENSAJE (SIN HARDCODING)
   */
  extractSearchTerms(messageLC) {
    const terms = []
    
    // 🚫 ELIMINADO: Hardcoding de productos específicos
    // En su lugar, extraer términos generales dinámicamente
    
    // Buscar palabras clave generales de tecnología
    const techKeywords = ['iphone', 'apple', 'teléfono', 'celular', 'móvil', 'smartphone']
    const numberPattern = /\b(\d{1,2})\b/g // Buscar números (modelos)
    
    techKeywords.forEach(keyword => {
      if (messageLC.includes(keyword)) {
        terms.push(keyword)
      }
    })
    
    // Extraer números que podrían ser modelos
    const numbers = messageLC.match(numberPattern)
    if (numbers) {
      numbers.forEach(num => {
        const numValue = parseInt(num)
        if (numValue >= 10 && numValue <= 20) { // Rango razonable para modelos de teléfonos
          terms.push(num)
        }
      })
    }
    
    return terms
  }
  
  /**
   * 🔍 BUSCAR PRODUCTOS INTELIGENTEMENTE (SIN HARDCODING)
   */
  async searchProductsIntelligently(userId, message, intent) {
    try {
      // 🔍 FILTRO VIP PARA CLIENTES CURIOSOS EN ENHANCED SYSTEM
      const conversationData = await this.original.getConversationData(userId) || {}
      const isVipClient = conversationData.cliente_nivel === 'VIP' || 
                         (conversationData.es_recurrente && conversationData.total_pedidos >= 3)
      const isClienteCurioso = conversationData.cliente_tipo === 'curioso' || conversationData.es_curioso
      
      console.log(`🔍 [ENHANCED] FILTRO VIP - Cliente VIP: ${isVipClient}, Cliente Curioso: ${isClienteCurioso}`)
      
      // Obtener todos los productos disponibles dinámicamente CON FILTRO VIP
      // ✅ OBTENER PRODUCTOS DE FORMA SEGURA Y UNIFICADA CON FILTRO VIP APLICADO
      const shouldApplyVipFilter = !isVipClient || isClienteCurioso
      let allProducts = await this.getUnifiedProducts(shouldApplyVipFilter, isVipClient)
      
      console.log(`📦 Total productos disponibles: ${allProducts.length}${shouldApplyVipFilter ? ' (filtrados por VIP)' : ''}`)
      
      if (!allProducts || allProducts.length === 0) {
        console.log('❌ No hay productos disponibles')
        return []
      }
      
      // 🎯 PRIMERO: INTENTAR BÚSQUEDA ESPECÍFICA CON MI FUNCIÓN MEJORADA (PRODUCTOS YA FILTRADOS POR VIP)
      const specificProduct = await this.findSpecificProductMatch(message, allProducts)
      if (specificProduct) {
        console.log(`🎯 Producto específico encontrado por findSpecificProductMatch: ${specificProduct.nombre}`)
        
        // 🔥 FORZANDO actualización de memoria para producto detectado: ${specificProduct.nombre}
        console.log(`🔥 FORZANDO actualización de memoria para producto detectado: ${specificProduct.nombre}`)
        
        // ✅ VALIDAR QUE USERID ESTÉ DEFINIDO ANTES DE USAR MEMORIA
        if (!userId) {
          console.log(`⚠️ userId no definido - omitiendo actualización de memoria`)
          return [specificProduct]
        }
        
        console.log(`🔥 FORZANDO actualización de memoria para producto detectado: ${specificProduct.nombre}`)
        
        // 🔥 PERSISTENCIA CRÍTICA INMEDIATA DEL CONTEXTO ENHANCED
        try {
          // 🚨 PERSISTENCIA DIRECTA EN SUPABASE - BYPASS MÉTODOS INEXISTENTES
          const criticalContext = {
            enhanced_context_active: true,
            enhanced_last_product: specificProduct.nombre,
            enhanced_detection: true,
            enhanced_product_price: specificProduct.precio,
            enhanced_timestamp: new Date().toISOString(),
            context_preserved: true,
            source: 'enhanced_specific_search',
            displayed_products: [{
              nombre: specificProduct.nombre,
              precio: specificProduct.precio,
              es_vip: specificProduct.es_vip,
              timestamp: new Date().toISOString()
            }]
          }

          // 🔥 PERSISTENCIA DIRECTA EN SUPABASE - CONVERSACIONES
          if (this.db && this.db.client) {
            const { error: updateError } = await this.db.client
              .from('conversaciones')
              .upsert({
                user_id: userId,
                enhanced_context_active: true,
                enhanced_last_product: specificProduct.nombre,
                enhanced_detection: true,
                enhanced_product_price: specificProduct.precio,
                enhanced_timestamp: new Date().toISOString(),
                context_preserved: true,
                source: 'enhanced_specific_search',
                displayed_products: JSON.stringify(criticalContext.displayed_products),
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'user_id'
              })

            if (updateError) {
              console.log(`❌ Error persistencia directa Supabase: ${updateError.message}`)
            } else {
              console.log(`💾 [DIRECT SUPABASE] Contexto Enhanced persistido DIRECTAMENTE: ${specificProduct.nombre}`)
            }
            
            // 🔥 CRUCIAL: ACTUALIZAR DUAL_MEMORY PARA SINCRONIZACIÓN
            const { error: dualMemoryError } = await this.db.client
              .from('dual_memory')
              .upsert({
                client_id: userId,
                memory_type: 'inventory',
                products: JSON.stringify([{
                  id: specificProduct.id,
                  nombre: specificProduct.nombre,
                  precio: specificProduct.precio,
                  es_vip: specificProduct.es_vip,
                  fromSpecificRequest: true,
                  enhanced_detection: true
                }]),
                last_shown_product: JSON.stringify({
                  id: specificProduct.id,
                  name: specificProduct.nombre,
                  precio: specificProduct.precio,
                  es_vip: specificProduct.es_vip
                }),
                is_active: true,
                last_interaction: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'client_id,memory_type'
              })
              
            if (dualMemoryError) {
              console.log(`❌ Error actualizando dual_memory: ${dualMemoryError.message}`)
            } else {
              console.log(`🔄 [DUAL MEMORY SYNC] DualMemory sincronizada con: ${specificProduct.nombre}`)
            }
          }

          // 🔥 BACKUP: Intentar método original si existe
          if (this.original.updateConversationData) {
            try {
              await this.original.updateConversationData(userId, criticalContext)
              console.log(`💾 [BACKUP PERSIST] Contexto Enhanced persistido via original: ${specificProduct.nombre}`)
            } catch (originalError) {
              console.log(`⚠️ Error método original: ${originalError.message}`)
            }
          }

          // 🔥 VERIFICACIÓN DE PERSISTENCIA DIRECTA
          let verification = null
          let attempts = 0
          while (attempts < 3) {
            if (this.db && this.db.client) {
              const { data: verifyData, error: verifyError } = await this.db.client
                .from('conversaciones')
                .select('enhanced_context_active, enhanced_last_product')
                .eq('user_id', userId)
                .single()

              if (!verifyError && verifyData?.enhanced_context_active && verifyData?.enhanced_last_product === specificProduct.nombre) {
                console.log(`✅ [VERIFICATION PASSED] Contexto verificado DIRECTAMENTE en intento ${attempts + 1}: ${specificProduct.nombre}`)
                verification = verifyData
                break
              }
            }
            
            console.log(`⏳ [VERIFICATION RETRY ${attempts + 1}/3] Esperando persistencia directa...`)
            await new Promise(resolve => setTimeout(resolve, 300))
            attempts++
          }

          if (!verification?.enhanced_context_active) {
            console.log(`❌ [VERIFICATION FAILED] Contexto NO persistido después de 3 intentos DIRECTOS`)
          }

        } catch (criticalError) {
          console.log(`🚨 Error en persistencia CRÍTICA Enhanced: ${criticalError.message}`)
        }
        
        // ✅ ACTUALIZAR MEMORIA USANDO MÉTODOS CORRECTOS DEL SISTEMA ORIGINAL
        try {
          // Actualizar ProductMemory si existe y tiene los métodos correctos
          if (this.original.productMemory && this.original.productMemory.addProductOfInterest) {
            await this.original.productMemory.addProductOfInterest(userId, specificProduct.nombre)
            console.log(`📦 ProductMemory actualizada con: ${specificProduct.nombre}`)
          }
          
          // Actualizar SessionMemory usando métodos correctos
          if (this.original.sessionMemory && this.original.sessionMemory.updateMemory) {
            await this.original.sessionMemory.updateMemory(userId, {
              productos_mostrados: 1,
              ultimo_producto: specificProduct.nombre,
              productos_inventario: specificProduct.es_vip ? [] : [specificProduct],
              productos_vip: specificProduct.es_vip ? [specificProduct] : [],
              vip_activo: specificProduct.es_vip,
              enhanced_detection: true,
              source: 'enhanced_search'
            })
            console.log(`🧐 SessionMemory actualizada con: ${specificProduct.nombre}`)
          }
          
          // 🎯 ACTUALIZAR ESTADO CONVERSACIONAL PARA QUE EL SISTEMA ORIGINAL CONTINÚe CORRECTAMENTE
          await this.original.setConversationState(userId, this.original.STATES.INTERESTED, {
            current_product: specificProduct.id,
            selected_products: [specificProduct],
            enhanced_product: {
              id: specificProduct.id,
              nombre: specificProduct.nombre,
              precio: specificProduct.precio,
              es_vip: specificProduct.es_vip,
              found_by: 'enhanced_search',
              timestamp: Date.now()
            },
            context_preserved: true
          })
          console.log(`🔄 Estado actualizado para continuidad: INTERESTED con producto ${specificProduct.nombre}`)
          
        } catch (error) {
          console.log(`⚠️ Error actualizando memoria del sistema original:`, error.message)
        }
        
        return [specificProduct]
      }
      
      // 🎯 FALLBACK INTELIGENTE: Buscar coincidencias parciales dinámicamente
      if (intent.searchTerms.length > 0) {
        const partialMatches = this.findPartialMatches(message, allProducts, intent.searchTerms)
        if (partialMatches.length > 0) {
          console.log(`🎯 FALLBACK: Encontradas ${partialMatches.length} coincidencias parciales`)
          return partialMatches
        }
      }
      
      // Si hay términos específicos, buscar coincidencias dinámicas
      if (intent.searchTerms.length > 0) {
        const matches = []
        
        for (const product of allProducts) {
          let relevanceScore = 0
          const productName = product.nombre.toLowerCase()
          const productDesc = (product.descripcion || '').toLowerCase()
          
          for (const term of intent.searchTerms) {
            const termLower = term.toLowerCase()
            
            // Búsqueda en nombre (mayor peso)
            if (productName.includes(termLower)) {
              relevanceScore += 3
            }
            
            // Búsqueda en descripción (menor peso)
            if (productDesc.includes(termLower)) {
              relevanceScore += 1
            }
            
            // Búsqueda aproximada para números
            if (/^\d+$/.test(termLower)) {
              if (productName.includes(termLower)) {
                relevanceScore += 5 // Mayor peso para coincidencias numéricas exactas
              }
            }
          }
          
          if (relevanceScore > 0) {
            matches.push({
              ...product,
              _relevanceScore: relevanceScore
            })
          }
        }
        
        // Ordenar por relevancia
        matches.sort((a, b) => b._relevanceScore - a._relevanceScore)
        
        console.log(`🎯 Productos encontrados con términos ${intent.searchTerms}: ${matches.length}`)
        return matches.map(m => {
          const { _relevanceScore, ...product } = m
          return product
        })
      }
      
      // Si es consulta general, devolver todos los productos
      if (intent.isGeneralQuery) {
        console.log(`📋 Consulta general - devolviendo todos los productos`)
        return allProducts
      }
      
      return []
      
    } catch (error) {
      console.error('❌ Error buscando productos inteligentemente:', error)
      return []
    }
  }
  
  /**
   * 📦 OBTENER PRODUCTOS UNIFICADOS (SEGURO)
   */
  async getUnifiedProducts(applyVipFilter = false, isVipClient = false) {
    try {
      // 1. Intentar obtener del sistema original
      if (this.original && this.original.inventory && this.original.inventory.getAllProducts) {
        let products = await this.original.inventory.getAllProducts()
        if (products && products.length > 0) {
          console.log(`📦 Productos obtenidos del sistema original: ${products.length}`)
          
          // 🚫 APLICAR FILTRO VIP ESTRICTO si es necesario
          if (applyVipFilter && !isVipClient) {
            const originalCount = products.length
            products = products.filter(product => {
              const productName = product.nombre || ''
              const isVipProduct = product.es_vip || 
                                  productName.includes('VIP') || 
                                  productName.includes('- VIP')
              
              if (isVipProduct) {
                console.log(`🚫 [UNIFIED] FILTRO VIP ESTRICTO: Ocultando producto VIP "${productName}" para cliente no-VIP`)
                return false
              }
              return true
            })
            
            console.log(`🔍 [UNIFIED] FILTRO VIP APLICADO: ${originalCount} productos → ${products.length} productos (${originalCount - products.length} VIP ocultos)`)
          }
          
          return products
        }
      }
      
      // 2. Fallback: Obtener directamente de Supabase
      let query = this.db.client
        .from('productos')
        .select('*')
        .eq('activo', true)
      
      // 🚫 APLICAR FILTRO VIP DESDE BASE DE DATOS si es necesario
      if (applyVipFilter && !isVipClient) {
        query = query.eq('es_vip', false)
        console.log(`🚫 [UNIFIED-DB] FILTRO VIP APLICADO: Solo productos regulares para cliente no-VIP`)
      }
      
      const { data, error } = await query
        .order('es_vip', { ascending: false })
        .order('nombre')
      
      if (error) {
        console.error('❌ Error obteniendo productos de Supabase:', error)
        return []
      }
      
      console.log(`📦 Productos obtenidos de Supabase: ${data?.length || 0}${applyVipFilter && !isVipClient ? ' (filtrados por VIP)' : ''}`)
      return data || []
      
    } catch (error) {
      console.error('❌ Error obteniendo productos unificados:', error)
      return []
    }
  }
  
  /**
   * 📱 GENERAR RESPUESTA INTELIGENTE DE PRODUCTOS
   */
  async generateIntelligentProductResponse(userId, message, products, intent, customerName, vipStatus) {
    try {
      const productCount = products.length
      
      if (productCount === 1) {
        // Un solo producto - devolver para que el sistema original lo muestre con imagen
        const product = products[0]
        return {
          processed: true,
          source: 'enhanced_single_product_intelligent',
          productFound: product.nombre,
          price: product.precio,
          isVip: product.es_vip,
          customerName,
          isVipClient: vipStatus.isVip,
          message: `¡Perfecto! Tengo el ${product.nombre} disponible. Te muestro los detalles:`,
          user: userId,
          timestamp: new Date().toISOString()
        }
      } else if (productCount <= 4) {
        // Pocos productos - generar respuesta con lista
        let response = `¡Excelente`
        if (customerName) response += ` ${customerName}`
        response += `! Tengo ${productCount} productos disponibles`
        
        if (vipStatus.isVip) {
          response += ' (con ofertas VIP especiales para ti 👑)'
        }
        
        response += ':\n\n'
        
        products.forEach((product, index) => {
          response += `${index + 1}. ${product.nombre}\n`
          response += `   💰 S/ ${product.precio}`
          if (product.es_vip) response += ' (VIP 👑)'
          response += '\n\n'
        })
        
        response += '¿Te interesa alguno en particular? 😊'
        
        return {
          processed: true,
          source: 'enhanced_multiple_products_intelligent',
          productCount,
          customerName,
          isVipClient: vipStatus.isVip,
          message: response,
          user: userId,
          timestamp: new Date().toISOString()
        }
      } else {
        // Muchos productos - respuesta general
        let response = `¡Genial`
        if (customerName) response += ` ${customerName}`
        response += `! Tengo ${productCount} productos que te pueden interesar.`
        
        if (vipStatus.isVip) {
          response += ' Como cliente VIP, tienes acceso a ofertas especiales 👑'
        }
        
        response += '\n\n¿Te interesa algún producto en particular? 😊'
        
        return {
          processed: true,
          source: 'enhanced_many_products_intelligent',
          productCount,
          customerName,
          isVipClient: vipStatus.isVip,
          message: response,
          user: userId,
          timestamp: new Date().toISOString()
        }
      }
      
    } catch (error) {
      console.error('❌ Error generando respuesta inteligente:', error)
      return this.generateFallbackProductResponse(products, customerName, vipStatus)
    }
  }
  
  /**
   * 💬 GENERAR RESPUESTA CONVERSACIONAL
   */
  async generateConversationalResponse(userId, message, customerName, vipStatus) {
    let response = 'Entiendo'
    
    if (customerName) {
      response += ` ${customerName}`
    }
    
    response += '. ¿En qué puedo ayudarte específicamente?'
    
    if (vipStatus.isVip) {
      response += ' Como cliente VIP, tengo acceso a ofertas exclusivas para ti 👑'
    }
    
    response += '\n\nTengo excelentes productos disponibles. 😊'
    
    return {
      processed: true,
      source: 'enhanced_conversational',
      customerName,
      isVipClient: vipStatus.isVip,
      message: response,
      user: userId,
      timestamp: new Date().toISOString()
    }
  }
  
  /**
   * 🆘 GENERAR RESPUESTA FALLBACK
   */
  generateFallbackProductResponse(products, customerName, vipStatus) {
    let response = '¡Hola'
    if (customerName) response += ` ${customerName}`
    response += '! 😊'
    
    if (vipStatus.isVip) {
      response += ' Como cliente VIP, tienes acceso a ofertas exclusivas.'
    }
    
    response += '\n\nTengo excelentes productos para ti. ¿Qué tipo de producto te interesa? 😊'
    
    return {
      processed: true,
      source: 'enhanced_fallback',
      customerName,
      isVipClient: vipStatus.isVip,
      message: response
    }
  }
  
  /**
   * 📋 GENERAR RESPUESTA GENERAL DE PRODUCTOS PERSONALIZADA
   */
  async generatePersonalizedGeneralResponse(userId, message, intent, customerName, vipStatus) {
    let response = '¡Hola'
    
    if (customerName) {
      response += ` ${customerName}`
    }
    
    response += '! 👋'
    
    if (vipStatus.isVip) {
      response += ' 👑 Como cliente VIP, tienes acceso a ofertas exclusivas. '
    }
    
    response += ' Tengo una excelente selección de productos Apple. Principalmente iPhones de diferentes modelos.'
    
    if (vipStatus.isVip) {
      response += '\n\n🌟 ¡Productos VIP disponibles para ti!'  
    }
    
    response += '\n\n¿Te interesa algún modelo específico como iPhone 14, iPhone 15, o iPhone 16? 📱✨'
    
    return {
      processed: true,
      source: 'enhanced_personalized_general',
      customerName,
      isVipClient: vipStatus.isVip,
      message: response
    }
  }
  
  /**
   * 💬 GENERAR RESPUESTA CONVERSACIONAL PERSONALIZADA
   */
  async generateConversationalResponse(userId, message, customerName, vipStatus) {
    let response = 'Entiendo'
    
    if (customerName) {
      response += ` ${customerName}`
    }
    
    response += '. ¿En qué puedo ayudarte específicamente?'
    
    if (vipStatus.isVip) {
      response += ' Como cliente VIP, tengo productos exclusivos para ti. 👑'
    }
    
    response += ' Tengo excelentes productos disponibles. 😊'
    
    return {
      processed: true,
      source: 'enhanced_personalized_conversational',
      customerName,
      isVipClient: vipStatus.isVip,
      message: response,
      user: userId,
      timestamp: new Date().toISOString()
    }
  }
  
  /**
   * 🎆 RESPUESTAS DE FALLBACK PERSONALIZADAS
   */
  generateFallbackSingleProductResponse(product, customerName, vipStatus) {
    let response = '¡Perfecto'
    
    if (customerName) {
      response += ` ${customerName}`
    }
    
    response += `! Tengo el ${product.nombre} disponible. 📱\n\n`
    
    if (vipStatus.isVip && product.es_vip) {
      response += `👑 ¡Producto VIP especial para ti!\n`
    }
    
    response += `💰 Precio: S/ ${product.precio}`
    
    if (product.es_vip) {
      response += ' (Oferta VIP Especial 👑)'
    }
    
    response += '\n\n¿Te interesa conocer más detalles de este modelo?'
    
    return response
  }
  
  generateFallbackMultipleProductsResponse(products, customerName, vipStatus) {
    let response = '¡Excelente'
    
    if (customerName) {
      response += ` ${customerName}`
    }
    
    response += `! Tengo ${products.length} modelos disponibles`
    
    if (vipStatus.isVip) {
      response += ' (con ofertas VIP especiales para ti 👑)'
    }
    
    response += ':\n\n'
    
    products.forEach((product, index) => {
      response += `${index + 1}. ${product.nombre}\n`
      response += `   💰 S/ ${product.precio}`
      
      if (product.es_vip) {
        response += ' (VIP 👑)'
      }
      
      response += '\n\n'
    })
    
    response += '¿Te interesa alguno en particular? 😊'
    
    return response
  }
  
  generateFallbackManyProductsResponse(productCount, customerName, vipStatus) {
    let response = '¡Genial'
    
    if (customerName) {
      response += ` ${customerName}`
    }
    
    response += `! Tengo ${productCount} productos disponibles`
    
    if (vipStatus.isVip) {
      response += ', incluyendo ofertas VIP exclusivas para ti 👑'
    }
    
    response += '. Para darte una mejor recomendación, ¿podrías decirme qué modelo específico te interesa? Por ejemplo: iPhone 14, iPhone 15, o iPhone 16. 📱✨'
    
    return response
  }
  
  generateFallbackProductResponse(products, customerName, vipStatus) {
    return {
      processed: false,
      error: 'Error generando respuesta inteligente',
      message: 'Disculpa, tuve un problema mostrando los productos. ¿Puedes intentar de nuevo?'
    }
  }
  
  /**
   * 📋 GENERAR RESPUESTA GENERAL DE PRODUCTOS (COMPATIBILIDAD)
   */
  async generateGeneralProductResponse(userId, message, intent) {
    const customerName = await this.getCustomerName(userId)
    const vipStatus = await this.checkVipStatus(userId)
    return await this.generatePersonalizedGeneralResponse(userId, message, intent, customerName, vipStatus)
  }

  /**
   * 🆕 NUEVO: MÉTODO PARA PROCESAR CON CONTEXTO MEJORADO (SIN BUCLE)
   */
  async processMessageWithEnhancedContext(userId, message, enhancedContext) {
    try {
      // NO llamar al original.processMessageDirectly para evitar bucle infinito
      // En su lugar, generar una respuesta simple y directa
      
      if (enhancedContext.cleanContext) {
        console.log('🧹 Contexto limpiado para usuario:', userId)
      }
      
      // Generar respuesta basada en el producto encontrado
      if (enhancedContext.product) {
        const product = enhancedContext.product
        const response = {
          processed: true,
          productFound: product.nombre,
          price: product.precio,
          isVip: product.es_vip,
          source: 'enhanced_direct',
          message: `¡He encontrado el ${product.nombre}! 🚀 Precio: S/ ${product.precio}${product.es_vip ? ' (Oferta VIP 👑)' : ''}`
        }
        
        console.log(`✨ Respuesta enhanced generada para: ${product.nombre}`)
        return response
      }
      
      // Si no hay producto específico, respuesta genérica
      return {
        processed: true,
        source: 'enhanced_generic',
        message: '🚀 ¡Hola! ¿En qué puedo ayudarte hoy? Tengo productos increibles para mostrarte.'
      }
      
    } catch (error) {
      console.error('❌ Error en enhanced context processing:', error)
      return {
        processed: false,
        error: error.message,
        message: 'Disculpa, tuve un problema procesando tu mensaje. ¿Puedes intentar de nuevo?'
      }
    }
  }

  /**
   * 🧹 ESTABLECER CONTEXTO DE PRODUCTO LIMPIO
   */
  async setCleanProductContext(userId, productName, relevantProducts) {
    try {
      console.log(`🧙 Estableciendo contexto limpio para: ${productName}`)
      
      // 🔥 LIMPIAR TODA LA MEMORIA OBSOLETA PRIMERO
      
      // 1. Limpiar ProductMemory
      if (this.original.productMemory) {
        console.log(`📦 Limpiando ProductMemory para ${userId}`)
        // ✅ USAR MÉTODO CORRECTO QUE SÍ EXISTE
        if (typeof this.original.productMemory.clearMemory === 'function') {
          await this.original.productMemory.clearMemory(userId)
        } else {
          console.warn('⚠️ clearMemory no existe en productMemory')
        }
      }
      
      // 2. Limpiar SessionMemory
      if (this.original.sessionMemory) {
        console.log(`🧐 Limpiando SessionMemory para ${userId}`)
        // ✅ USAR MÉTODO CORRECTO QUE SÍ EXISTE
        if (typeof this.original.sessionMemory.clearMemory === 'function') {
          await this.original.sessionMemory.clearMemory(userId)
        } else {
          console.warn('⚠️ clearMemory no existe en sessionMemory')
        }
      }
      
      // 3. Buscar producto especificado
      const matchingProduct = relevantProducts.find(p => 
        p.nombre.toLowerCase().includes(productName.toLowerCase()) ||
        productName.toLowerCase().includes(p.nombre.toLowerCase())
      )

      if (matchingProduct) {
        console.log(`🎯 Producto encontrado para contexto: ${matchingProduct.nombre}`)
        
        // 4. Actualizar ProductMemory con producto correcto
        if (this.original.productMemory) {
          await this.original.productMemory.addProductOfInterest(userId, matchingProduct.nombre)
        }
        
        // 5. Actualizar SessionMemory con producto correcto
        if (this.original.sessionMemory) {
          await this.original.sessionMemory.updateMemory(userId, {
            vip_activo: matchingProduct.es_vip,
            productos_mostrados: 0,
            ultimo_producto: matchingProduct.nombre,
            productos_vip: matchingProduct.es_vip ? [matchingProduct] : [],
            productos_inventario: !matchingProduct.es_vip ? [matchingProduct] : []
          })
        }
        
        console.log(`✨ Contexto limpio establecido para: ${matchingProduct.nombre}`)
      } else {
        console.warn(`⚠️ No se encontró producto matching para: ${productName}`)
      }

    } catch (error) {
      console.error('❌ Error estableciendo contexto limpio:', error)
    }
  }

  /**
   * 🔄 ACTUALIZAR MEMORIA DEL SISTEMA ORIGINAL
   */
  async updateOriginalSystemMemory(userId, product) {
    try {
      // Actualizar ProductMemory
      if (this.original.productMemory) {
        await this.original.productMemory.addProductOfInterest(userId, product.nombre)
      }

      // Actualizar SessionMemory
      if (this.original.sessionMemory) {
        const memoryUpdate = {
          productos_mostrados: 1,
          ultimo_producto: product.nombre
        }

        if (product.es_vip) {
          memoryUpdate.vip_activo = true
          memoryUpdate.productos_vip = [product]
        } else {
          memoryUpdate.vip_activo = false
          memoryUpdate.productos_inventario = [product]
        }

        await this.original.sessionMemory.updateMemory(userId, memoryUpdate)
      }

      console.log(`🔄 Memoria actualizada para producto: ${product.nombre}`)

    } catch (error) {
      console.error('❌ Error actualizando memoria:', error)
    }
  }

  /**
   * 📝 CREAR PROMPT ENRIQUECIDO PARA GEMINI
   */
  createEnhancedPromptForGemini(userMessage, product, conversationHistory, validation) {
    let prompt = `CONTEXTO ESPECÍFICO VALIDADO:\n`
    
    prompt += `Producto actual de la conversación: ${product.nombre}\n`
    if (product.descripcion) {
      prompt += `Descripción: ${product.descripcion}\n`
    }
    prompt += `Precio: S/ ${product.precio}\n`
    
    if (product.es_vip) {
      prompt += `PRODUCTO VIP - Información especial:\n`
      if (product.precio_vip) {
        prompt += `Precio VIP: S/ ${product.precio_vip}\n`
      }
      prompt += `Cliente: Usuario VIP\n`
    }

    if (!validation.isValid) {
      prompt += `\nATENCIÓN: Se detectó cambio de producto en la conversación.\n`
      prompt += `Responde ÚNICAMENTE sobre: ${product.nombre}\n`
    }

    prompt += `\nMensaje del usuario: "${userMessage}"\n`
    prompt += `\nInstrucciones:\n`
    prompt += `- Responde SOLO sobre el producto: ${product.nombre}\n`
    prompt += `- NO menciones otros productos a menos que el usuario los solicite explícitamente\n`
    prompt += `- Mantén el contexto claro y específico\n`

    return prompt
  }

  /**
   * 📊 OBTENER ESTADÍSTICAS DEL SISTEMA
   */
  async getSystemStats() {
    try {
      const stats = {
        enhanced_active: this.initialized,
        conversation_states: await this.getConversationStatesCount(),
        rag_indexed_products: await this.getRagIndexedProductsCount(),
        validation_success_rate: await this.getValidationSuccessRate()
      }

      return stats

    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error)
      return { enhanced_active: false, error: error.message }
    }
  }

  /**
   * 🔧 MÉTODOS DE UTILIDAD
   */
  async getConversationStatesCount() {
    const { count } = await this.supabase
      .from('conversation_states')
      .select('*', { count: 'exact' })
    return count || 0
  }

  async getRagIndexedProductsCount() {
    const { count } = await this.supabase
      .from('product_embeddings')
      .select('*', { count: 'exact' })
    return count || 0
  }

  async getValidationSuccessRate() {
    // Implementar lógica para calcular tasa de éxito de validaciones
    return 0.95 // Placeholder
  }

  /**
   * 🧹 MANTENIMIENTO DEL SISTEMA
   */
  async performMaintenance() {
    try {
      console.log('🧹 Realizando mantenimiento del sistema...')
      
      // Limpiar estados expirados
      await this.conversationManager.cleanupExpiredStates()
      
      // Reindexar productos modificados
      await this.ragSystem.reindexAllProducts()
      
      console.log('✅ Mantenimiento completado')

    } catch (error) {
      console.error('❌ Error en mantenimiento:', error)
    }
  }

  /**
   * 🔄 CALCULAR RELEVANCIA SIMPLE
   */
  calculateSimpleRelevance(query, product) {
    const queryLower = query.toLowerCase()
    const productName = product.nombre.toLowerCase()
    
    let relevance = 0
    
    // Coincidencia exacta del nombre
    if (productName.includes(queryLower)) {
      relevance += 0.8
    }
    
    // Coincidencia en descripción
    if (product.descripcion && product.descripcion.toLowerCase().includes(queryLower)) {
      relevance += 0.4
    }
    
    // Boost para productos VIP
    if (product.es_vip) {
      relevance += 0.2
    }
    
    // Palabras clave comunes
    const queryWords = queryLower.split(' ')
    const productWords = productName.split(' ')
    
    queryWords.forEach(qWord => {
      productWords.forEach(pWord => {
        if (qWord.includes(pWord) || pWord.includes(qWord)) {
          relevance += 0.1
        }
      })
    })
    
    return Math.min(relevance, 1.0)
  }

  /**
   * 🧠 GENERAR RESPUESTA CONTEXTUAL DESDE RAZONAMIENTO HUMANO
   */
  generateContextualResponseFromReasoning(reasoning) {
    if (reasoning.suggestedResponse) {
      return reasoning.suggestedResponse
    }
    
    const productName = reasoning.targetProduct?.name || reasoning.targetProduct?.nombre || 'el producto'
    
    switch (reasoning.intention) {
      case 'purchase_intent':
        return `🎉 ¡Excelente elección! El **${productName}** es perfecto para ti. ¿Cuántas unidades te gustaría? 💳😊`
      
      case 'portability_question':
        return `🌍 ¡Por supuesto! El **${productName}** es perfecto para tus viajes. Es compacto, resistente y con excelente duración de batería. 🎒✈️`
      
      case 'camera_question':
        return `📸 ¡Absolutamente! El **${productName}** tiene una cámara increíble para grabar videos de alta calidad. Podrás capturar todos tus momentos especiales. 🎥✨`
      
      case 'functionality_question':
        return `⚡ ¡Claro que sí! El **${productName}** funciona perfectamente y tiene todas las características que necesitas. Es un equipo de alta calidad. 🚀`
      
      default:
        return `El **${productName}** es una excelente opción. ¿Hay algo específico que te gustaría saber sobre él? 😊`
    }
  }

  /**
   * 🔍 EXTRAER TÉRMINOS DE BÚSQUEDA
   */
  extractSearchTerms(query) {
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 2)
      .slice(0, 5) // Limitar a 5 términos
  }
}

export default WhatsAppServiceEnhanced