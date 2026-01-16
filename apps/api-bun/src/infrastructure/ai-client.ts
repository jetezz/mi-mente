/**
 * AI Client Service
 * Implementa estrategia Round-Robin para rotación entre proveedores de IA
 * Soporta: Groq (Llama 3) y Cerebras
 */

interface AIProvider {
  name: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  isAvailable: boolean;
  lastError?: string;
  rateLimitReset?: number;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIResponse {
  content: string;
  tokensUsed: number;
  provider: string;
  model: string;
}

export class AIClient {
  private providers: AIProvider[] = [];
  private currentIndex: number = 0;
  private retryCount: number = 3;

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Groq (Llama 3.3 70B - Muy rápido y gratuito tier)
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      this.providers.push({
        name: 'groq',
        apiKey: groqKey,
        baseUrl: 'https://api.groq.com/openai/v1',
        model: 'llama-3.3-70b-versatile',
        isAvailable: true,
      });
    }

    // Cerebras (Ultra rápido)
    const cerebrasKey = process.env.CEREBRAS_API_KEY;
    if (cerebrasKey) {
      this.providers.push({
        name: 'cerebras',
        apiKey: cerebrasKey,
        baseUrl: 'https://api.cerebras.ai/v1',
        model: 'llama-3.3-70b',
        isAvailable: true,
      });
    }

    // OpenAI como fallback (si está configurado)
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      this.providers.push({
        name: 'openai',
        apiKey: openaiKey,
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
        isAvailable: true,
      });
    }

    if (this.providers.length === 0) {
      console.warn('⚠️ No hay proveedores de IA configurados. Añade GROQ_API_KEY o CEREBRAS_API_KEY al .env');
    } else {
      console.log(`🤖 AI Providers inicializados: ${this.providers.map(p => p.name).join(', ')}`);
    }
  }

  /**
   * Obtiene el siguiente proveedor disponible (Round-Robin)
   */
  private getNextProvider(): AIProvider | null {
    const startIndex = this.currentIndex;

    do {
      const provider = this.providers[this.currentIndex];
      this.currentIndex = (this.currentIndex + 1) % this.providers.length;

      // Verificar si el rate limit ya pasó
      if (provider.rateLimitReset && Date.now() < provider.rateLimitReset) {
        continue;
      }

      if (provider.isAvailable) {
        return provider;
      }
    } while (this.currentIndex !== startIndex);

    // Si llegamos aquí, resetear todos los proveedores
    this.providers.forEach(p => {
      p.isAvailable = true;
      p.rateLimitReset = undefined;
    });

    return this.providers[0] || null;
  }

  /**
   * Marca un proveedor como no disponible temporalmente
   */
  private markProviderUnavailable(provider: AIProvider, error: string, rateLimitMs?: number) {
    provider.lastError = error;

    if (rateLimitMs) {
      provider.rateLimitReset = Date.now() + rateLimitMs;
      console.log(`⏳ ${provider.name} rate limited, retry in ${rateLimitMs / 1000}s`);
    } else {
      provider.isAvailable = false;
      console.log(`❌ ${provider.name} marcado como no disponible: ${error}`);
    }
  }

  /**
   * Realiza una petición de chat a la IA
   */
  async chat(messages: ChatMessage[]): Promise<AIResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.retryCount; attempt++) {
      const provider = this.getNextProvider();

      if (!provider) {
        throw new Error('No hay proveedores de IA disponibles');
      }

      try {
        console.log(`🔄 Intentando con ${provider.name} (modelo: ${provider.model})`);

        const response = await fetch(`${provider.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${provider.apiKey}`,
          },
          body: JSON.stringify({
            model: provider.model,
            messages,
            temperature: 0.7,
            max_tokens: 2000,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          // Rate limit específico
          if (response.status === 429) {
            const retryAfter = parseInt(response.headers.get('retry-after') || '60') * 1000;
            this.markProviderUnavailable(provider, 'Rate limit', retryAfter);
            continue;
          }

          throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        const tokensUsed = data.usage?.total_tokens || 0;

        console.log(`✅ Respuesta de ${provider.name}: ${tokensUsed} tokens`);

        return {
          content,
          tokensUsed,
          provider: provider.name,
          model: provider.model,
        };

      } catch (error) {
        lastError = error as Error;
        console.error(`❌ Error con ${provider.name}:`, error);
        this.markProviderUnavailable(provider, lastError.message);
      }
    }

    throw lastError || new Error('Todos los proveedores de IA fallaron');
  }

  /**
   * Genera un resumen del texto
   */
  async summarize(text: string): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `Eres un experto en crear resúmenes concisos y útiles. 
Tu tarea es resumir el siguiente contenido manteniendo los puntos más importantes.
El resumen debe ser:
- En español
- Entre 150-300 palabras
- Capturar la esencia del contenido
- Usar un tono profesional pero accesible`
      },
      {
        role: 'user',
        content: `Resume el siguiente contenido:\n\n${text.slice(0, 10000)}` // Limitar a 10k chars
      }
    ];

    const response = await this.chat(messages);
    return response.content;
  }

  /**
   * Extrae puntos clave del texto
   */
  async extractKeyPoints(text: string): Promise<string[]> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `Eres un experto en análisis de contenido.
Tu tarea es extraer los puntos clave más importantes del texto.
Responde SOLO con un JSON array de strings, máximo 7 puntos.
Ejemplo: ["Punto 1", "Punto 2", "Punto 3"]`
      },
      {
        role: 'user',
        content: `Extrae los puntos clave:\n\n${text.slice(0, 10000)}`
      }
    ];

    const response = await this.chat(messages);

    try {
      // Intentar parsear el JSON
      const parsed = JSON.parse(response.content);
      if (Array.isArray(parsed)) {
        return parsed.slice(0, 7);
      }
    } catch {
      // Si no es JSON válido, dividir por líneas
      return response.content
        .split('\n')
        .filter(line => line.trim().length > 0)
        .slice(0, 7);
    }

    return [];
  }

  /**
   * Genera etiquetas/tags para el contenido
   */
  async generateTags(text: string): Promise<string[]> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `Eres un experto en categorización de contenido.
Genera etiquetas relevantes para clasificar el contenido.
Responde SOLO con un JSON array de strings, máximo 5 tags.
Los tags deben ser palabras simples en español, sin #.
Ejemplo: ["tecnología", "programación", "IA"]`
      },
      {
        role: 'user',
        content: `Genera tags para:\n\n${text.slice(0, 5000)}`
      }
    ];

    const response = await this.chat(messages);

    try {
      const parsed = JSON.parse(response.content);
      if (Array.isArray(parsed)) {
        return parsed.slice(0, 5).map(tag => tag.toLowerCase().trim());
      }
    } catch {
      return response.content
        .split(/[,\n]/)
        .map(t => t.replace(/[#"'\[\]]/g, '').trim().toLowerCase())
        .filter(t => t.length > 0)
        .slice(0, 5);
    }

    return [];
  }

  /**
   * Analiza el sentimiento del texto
   */
  async analyzeSentiment(text: string): Promise<'positive' | 'negative' | 'neutral'> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `Analiza el sentimiento general del texto.
Responde SOLO con una de estas palabras: positive, negative, neutral`
      },
      {
        role: 'user',
        content: text.slice(0, 3000)
      }
    ];

    const response = await this.chat(messages);
    const sentiment = response.content.toLowerCase().trim();

    if (sentiment.includes('positive')) return 'positive';
    if (sentiment.includes('negative')) return 'negative';
    return 'neutral';
  }

  /**
   * Obtiene estadísticas de los proveedores
   */
  getProviderStats() {
    return this.providers.map(p => ({
      name: p.name,
      model: p.model,
      isAvailable: p.isAvailable,
      lastError: p.lastError,
    }));
  }
}

// Singleton
export const aiClient = new AIClient();
