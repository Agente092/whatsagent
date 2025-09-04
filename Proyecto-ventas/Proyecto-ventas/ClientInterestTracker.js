import { supabase } from '../config/supabase.js';

/**
 * 🎯 SISTEMA DE RASTREO DE PRODUCTOS DE INTERÉS
 * 
 * Esta clase maneja el rastreo inteligente de productos que el cliente menciona,
 * usando los campos interested_products y selected_products de session_memory.
 * 
 * OBJETIVO: Eliminar confusión entre contextos VIP/Inventario y mantener coherencia
 */
class ClientInterestTracker {
  constructor() {
    this.logger = console;
  }

  /**
   * 🔍 Agregar producto de interés basado en mención del cliente
   * @param {string} clientId - ID del cliente
   * @param {string} productName - Nombre del producto mencionado
   * @param {Object} productDetails - Detalles del producto (id, price, etc.)
   * @param {string} context - Contexto de la mención ('search', 'question', 'interest')
   */
  async addInterestedProduct(clientId, productName, productDetails = {}, context = 'mention') {
    try {
      this.logger.log(`🎯 [INTEREST TRACKER] Agregando producto de interés para ${clientId}: ${productName}`);
      
      // 1. Obtener memoria de sesión actual
      const currentMemory = await this.getSessionMemory(clientId);
      if (!currentMemory) {
        this.logger.warn(`⚠️ No se encontró memoria de sesión para ${clientId}`);
        return false;
      }

      // 2. Preparar objeto de producto de interés
      const interestedProduct = {
        name: productName,
        context: context,
        timestamp: Date.now(),
        mentioned_count: 1,
        ...productDetails
      };

      // 3. Actualizar array de productos de interés
      let interestedProducts = currentMemory.interested_products || [];
      
      // Verificar si ya existe
      const existingIndex = interestedProducts.findIndex(p => 
        p.name.toLowerCase().includes(productName.toLowerCase()) ||
        productName.toLowerCase().includes(p.name.toLowerCase())
      );

      if (existingIndex >= 0) {
        // Actualizar producto existente
        interestedProducts[existingIndex] = {
          ...interestedProducts[existingIndex],
          mentioned_count: (interestedProducts[existingIndex].mentioned_count || 0) + 1,
          last_mention: Date.now(),
          context: context
        };
        this.logger.log(`🔄 Producto actualizado: ${productName} (${interestedProducts[existingIndex].mentioned_count} menciones)`);
      } else {
        // Agregar nuevo producto
        interestedProducts.push(interestedProduct);
        this.logger.log(`➕ Nuevo producto de interés: ${productName}`);
      }

      // 4. Limitar a máximo 5 productos de interés (los más recientes)
      if (interestedProducts.length > 5) {
        interestedProducts = interestedProducts
          .sort((a, b) => (b.last_mention || b.timestamp) - (a.last_mention || a.timestamp))
          .slice(0, 5);
      }

      // 5. Actualizar en Supabase
      const { error } = await supabase
        .from('session_memory')
        .update({
          interested_products: interestedProducts,
          updated_at: new Date().toISOString()
        })
        .eq('client_id', clientId);

      if (error) {
        this.logger.error(`❌ Error actualizando interested_products:`, error);
        return false;
      }

      this.logger.log(`✅ Producto de interés guardado exitosamente`);
      return true;

    } catch (error) {
      this.logger.error(`❌ Error en addInterestedProduct:`, error);
      return false;
    }
  }

  /**
   * 🎯 Obtener productos de interés del cliente (con prioridad)
   * @param {string} clientId - ID del cliente
   * @returns {Array} Productos ordenados por relevancia
   */
  async getInterestedProducts(clientId) {
    try {
      const memory = await this.getSessionMemory(clientId);
      if (!memory || !memory.interested_products) {
        return [];
      }

      // Ordenar por relevancia: más menciones + más reciente
      const products = memory.interested_products
        .sort((a, b) => {
          const scoreA = (a.mentioned_count || 1) * 100 + (a.last_mention || a.timestamp);
          const scoreB = (b.mentioned_count || 1) * 100 + (b.last_mention || b.timestamp);
          return scoreB - scoreA;
        });

      this.logger.log(`🎯 [INTEREST TRACKER] Productos de interés para ${clientId}: ${products.length}`);
      return products;

    } catch (error) {
      this.logger.error(`❌ Error obteniendo productos de interés:`, error);
      return [];
    }
  }

  /**
   * 🎯 Verificar si un producto específico está en la lista de interés
   * @param {string} clientId - ID del cliente
   * @param {string} productName - Nombre del producto a verificar
   * @returns {Object|null} Producto de interés o null si no existe
   */
  async isProductOfInterest(clientId, productName) {
    try {
      const interestedProducts = await this.getInterestedProducts(clientId);
      
      const found = interestedProducts.find(p => 
        p.name.toLowerCase().includes(productName.toLowerCase()) ||
        productName.toLowerCase().includes(p.name.toLowerCase())
      );

      if (found) {
        this.logger.log(`✅ [INTEREST TRACKER] Producto de interés confirmado: ${productName}`);
        return found;
      }

      return null;

    } catch (error) {
      this.logger.error(`❌ Error verificando producto de interés:`, error);
      return null;
    }
  }

  /**
   * 🎯 Mover producto de interested_products a selected_products
   * @param {string} clientId - ID del cliente
   * @param {string} productName - Nombre del producto seleccionado
   * @param {Object} selectionDetails - Detalles de la selección (cantidad, precio, etc.)
   */
  async selectProduct(clientId, productName, selectionDetails = {}) {
    try {
      this.logger.log(`🎯 [INTEREST TRACKER] Seleccionando producto: ${productName}`);
      
      const memory = await this.getSessionMemory(clientId);
      if (!memory) return false;

      let interestedProducts = memory.interested_products || [];
      let selectedProducts = memory.selected_products || [];

      // Encontrar producto en interested_products
      const productIndex = interestedProducts.findIndex(p => 
        p.name.toLowerCase().includes(productName.toLowerCase()) ||
        productName.toLowerCase().includes(p.name.toLowerCase())
      );

      if (productIndex >= 0) {
        // Mover a selected_products
        const selectedProduct = {
          ...interestedProducts[productIndex],
          selected_at: Date.now(),
          ...selectionDetails
        };

        selectedProducts.push(selectedProduct);
        
        // Mantener solo en selected (no duplicar en interested)
        // interestedProducts.splice(productIndex, 1);

        // Actualizar en Supabase
        const { error } = await supabase
          .from('session_memory')
          .update({
            interested_products: interestedProducts,
            selected_products: selectedProducts,
            updated_at: new Date().toISOString()
          })
          .eq('client_id', clientId);

        if (error) {
          this.logger.error(`❌ Error actualizando selected_products:`, error);
          return false;
        }

        this.logger.log(`✅ Producto seleccionado exitosamente: ${productName}`);
        return true;
      }

      return false;

    } catch (error) {
      this.logger.error(`❌ Error en selectProduct:`, error);
      return false;
    }
  }

  /**
   * 🎯 Obtener contexto de productos para respuesta coherente
   * @param {string} clientId - ID del cliente
   * @returns {Object} Contexto con productos de interés y seleccionados
   */
  async getProductContext(clientId) {
    try {
      const memory = await this.getSessionMemory(clientId);
      if (!memory) {
        return {
          interestedProducts: [],
          selectedProducts: [],
          hasActiveInterest: false,
          lastMentioned: null
        };
      }

      const interestedProducts = memory.interested_products || [];
      const selectedProducts = memory.selected_products || [];

      const context = {
        interestedProducts,
        selectedProducts,
        hasActiveInterest: interestedProducts.length > 0,
        lastMentioned: interestedProducts.length > 0 ? interestedProducts[0] : null,
        totalInterested: interestedProducts.length,
        totalSelected: selectedProducts.length
      };

      this.logger.log(`🎯 [CONTEXT] Cliente ${clientId}: ${context.totalInterested} interesados, ${context.totalSelected} seleccionados`);
      return context;

    } catch (error) {
      this.logger.error(`❌ Error obteniendo contexto de productos:`, error);
      return { interestedProducts: [], selectedProducts: [], hasActiveInterest: false };
    }
  }

  /**
   * 🛠️ Método auxiliar para obtener memoria de sesión
   */
  async getSessionMemory(clientId) {
    try {
      const { data, error } = await supabase
        .from('session_memory')
        .select('*')
        .eq('client_id', clientId)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (error) {
        this.logger.error(`❌ Error obteniendo memoria de sesión:`, error);
        return null;
      }

      return data && data.length > 0 ? data[0] : null;

    } catch (error) {
      this.logger.error(`❌ Error en getSessionMemory:`, error);
      return null;
    }
  }

  /**
   * 🧹 Limpiar productos de interés antiguos (opcional)
   * @param {string} clientId - ID del cliente
   * @param {number} maxAge - Edad máxima en milisegundos (default: 24 horas)
   */
  async cleanOldInterests(clientId, maxAge = 24 * 60 * 60 * 1000) {
    try {
      const memory = await this.getSessionMemory(clientId);
      if (!memory || !memory.interested_products) return;

      const now = Date.now();
      const validProducts = memory.interested_products.filter(p => {
        const age = now - (p.last_mention || p.timestamp);
        return age < maxAge;
      });

      if (validProducts.length !== memory.interested_products.length) {
        const { error } = await supabase
          .from('session_memory')
          .update({
            interested_products: validProducts,
            updated_at: new Date().toISOString()
          })
          .eq('client_id', clientId);

        if (!error) {
          this.logger.log(`🧹 Limpiados ${memory.interested_products.length - validProducts.length} productos de interés antiguos`);
        }
      }

    } catch (error) {
      this.logger.error(`❌ Error en cleanOldInterests:`, error);
    }
  }
}

export default ClientInterestTracker;