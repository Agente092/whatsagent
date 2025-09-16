const AdaptivePersonalitySystem = require('../../../server/services/adaptivePersonalitySystem');
const MessageFormatter = require('../../../server/services/messageFormatter');
const ConversationMemory = require('../../../server/services/conversationMemory');

describe('UX Improvements Tests', () => {
  let personalitySystem;
  let messageFormatter;
  let conversationMemory;

  beforeEach(() => {
    conversationMemory = new ConversationMemory();
    personalitySystem = new AdaptivePersonalitySystem(conversationMemory);
    messageFormatter = new MessageFormatter();
  });

  describe('Saludo Dinámico', () => {
    test('debería generar un saludo completo para conversaciones iniciales', () => {
      const greeting = personalitySystem.generateDynamicGreeting(
        'professional', 
        'Juan', 
        'Empresa Test', 
        'initial'
      );
      
      // Verificar que contiene elementos de saludo completo
      expect(greeting).toMatch(/¡Buen[oa]s (días|tardes|noches)!/);
      expect(greeting).toMatch(/asesor.*empresarial/);
      expect(greeting).toMatch(/Empresa Test/);
      expect(greeting).toMatch(/Juan/);
    });

    test('no debería saludar repetidamente en conversaciones en progreso', () => {
      const greeting = personalitySystem.generateDynamicGreeting(
        'professional', 
        'Juan', 
        'Empresa Test', 
        'planning'
      );
      
      // Verificar que no contiene saludo repetitivo
      expect(greeting).not.toMatch(/¡Buen[oa]s (días|tardes|noches)!.*¡Buen[oa]s (días|tardes|noches)!/);
      expect(greeting).toMatch(/^Soy /);
    });
  });

  describe('Formateador de Mensajes', () => {
    test('no debería agregar preguntas redundantes a mensajes que ya contienen preguntas', () => {
      const message = "¿Cuáles son las ventajas de una estructura holding?";
      const formatted = messageFormatter.addMessageFooter(message, 1, false);
      
      // Verificar que no se agrega una pregunta adicional
      const questionCount = (formatted.match(/\?/g) || []).length;
      expect(questionCount).toBe(1); // Solo la pregunta original
    });

    test('debería agregar pregunta de seguimiento a mensajes sin preguntas', () => {
      const message = "Las estructuras holding ofrecen múltiples ventajas.";
      const formatted = messageFormatter.addMessageFooter(message, 1, false);
      
      // Verificar que se agrega una pregunta de seguimiento
      expect(formatted).toMatch(/¿Hay algo más en lo que pueda ayudarle\?/);
    });
  });

  describe('Contexto de Conversación', () => {
    test('debería incluir información de etapa de conversación', () => {
      // Simular una conversación
      conversationMemory.addMessage(
        '5551234567', 
        '¿Qué es una estructura holding?', 
        'Una estructura holding es...', 
        'business_query'
      );
      
      const context = conversationMemory.getConversationContext('5551234567');
      
      // Verificar que incluye información de etapa
      expect(context).toHaveProperty('stage');
      expect(context).toHaveProperty('lastIntent');
    });
  });
});