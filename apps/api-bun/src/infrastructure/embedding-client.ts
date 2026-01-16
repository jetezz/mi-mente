/**
 * Embedding Client Service
 * Genera embeddings usando Cohere (gratuito) con fallback a otros proveedores
 * Parte de la Fase 6: Motor de Búsqueda Semántica
 */

interface EmbeddingProvider {
  name: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  dimension: number;
  isAvailable: boolean;
  lastError?: string;
  rateLimitReset?: number;
}

interface EmbeddingResponse {
  embeddings: number[][];
  tokensUsed: number;
  provider: string;
  model: string;
}

export class EmbeddingClient {
  private providers: EmbeddingProvider[] = [];
  private currentIndex: number = 0;
  private retryCount: number = 3;

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Cohere (Gratuito - 1000 llamadas/mes en trial, luego rate limited)
    const cohereKey = process.env.COHERE_API_KEY;
    if (cohereKey) {
      this.providers.push({
        name: 'cohere',
        apiKey: cohereKey,
        baseUrl: 'https://api.cohere.ai/v2',
        model: 'embed-multilingual-v3.0', // Soporta español perfectamente
        dimension: 1024, // Nota: v3 usa 1024, pero podemos truncar a 1536 O usar un modelo diferente
        isAvailable: true,
      });
    }

    // OpenAI como fallback (de pago, pero más robusto)
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      this.providers.push({
        name: 'openai',
        apiKey: openaiKey,
        baseUrl: 'https://api.openai.com/v1',
        model: 'text-embedding-ada-002',
        dimension: 1536,
        isAvailable: true,
      });
    }

    if (this.providers.length === 0) {
      console.warn('⚠️ No hay proveedores de embeddings configurados. Añade COHERE_API_KEY al .env');
    } else {
      console.log(`🔢 Embedding Providers inicializados: ${this.providers.map(p => `${p.name} (${p.model})`).join(', ')}`);
    }
  }

  /**
   * Obtiene el siguiente proveedor disponible (Round-Robin)
   */
  private getNextProvider(): EmbeddingProvider | null {
    const startIndex = this.currentIndex;

    do {
      const provider = this.providers[this.currentIndex];
      this.currentIndex = (this.currentIndex + 1) % this.providers.length;

      if (provider.rateLimitReset && Date.now() < provider.rateLimitReset) {
        continue;
      }

      if (provider.isAvailable) {
        return provider;
      }
    } while (this.currentIndex !== startIndex);

    // Resetear todos si ninguno está disponible
    this.providers.forEach(p => {
      p.isAvailable = true;
      p.rateLimitReset = undefined;
    });

    return this.providers[0] || null;
  }

  /**
   * Marca un proveedor como no disponible
   */
  private markProviderUnavailable(provider: EmbeddingProvider, error: string, rateLimitMs?: number) {
    provider.lastError = error;

    if (rateLimitMs) {
      provider.rateLimitReset = Date.now() + rateLimitMs;
      console.log(`⏳ ${provider.name} embeddings rate limited, retry in ${rateLimitMs / 1000}s`);
    } else {
      provider.isAvailable = false;
      console.log(`❌ ${provider.name} embeddings no disponible: ${error}`);
    }
  }

  /**
   * Genera embeddings para un array de textos
   */
  async embed(texts: string[]): Promise<EmbeddingResponse> {
    if (texts.length === 0) {
      return { embeddings: [], tokensUsed: 0, provider: 'none', model: 'none' };
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.retryCount; attempt++) {
      const provider = this.getNextProvider();

      if (!provider) {
        throw new Error('No hay proveedores de embeddings disponibles');
      }

      try {
        console.log(`🔄 Generando embeddings con ${provider.name} (${texts.length} textos)`);

        if (provider.name === 'cohere') {
          return await this.embedWithCohere(provider, texts);
        } else if (provider.name === 'openai') {
          return await this.embedWithOpenAI(provider, texts);
        }

        throw new Error(`Proveedor desconocido: ${provider.name}`);

      } catch (error) {
        lastError = error as Error;
        console.error(`❌ Error con ${provider.name}:`, error);
        this.markProviderUnavailable(provider, lastError.message);
      }
    }

    throw lastError || new Error('Todos los proveedores de embeddings fallaron');
  }

  /**
   * Genera embedding para un solo texto (convenience method)
   */
  async embedSingle(text: string): Promise<number[]> {
    const response = await this.embed([text]);
    return response.embeddings[0] || [];
  }

  /**
   * Genera embeddings usando Cohere API v2
   */
  private async embedWithCohere(provider: EmbeddingProvider, texts: string[]): Promise<EmbeddingResponse> {
    const response = await fetch(`${provider.baseUrl}/embed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        texts,
        model: provider.model,
        input_type: 'search_document', // Optimizado para búsqueda
        embedding_types: ['float'],
        truncate: 'END', // Truncar si el texto es muy largo
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('retry-after') || '60') * 1000;
        throw new Error(`Rate limit: retry in ${retryAfter / 1000}s`);
      }

      throw new Error(`Cohere HTTP ${response.status}: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();

    // Cohere v2 devuelve embeddings en data.embeddings.float
    const embeddings = data.embeddings?.float || data.embeddings || [];

    // Normalizar dimensiones a 1536 (rellenar con 0 si es necesario para compatibilidad)
    const normalizedEmbeddings = embeddings.map((emb: number[]) =>
      this.normalizeDimension(emb, 1536)
    );

    console.log(`✅ Cohere: ${texts.length} embeddings generados (dim: ${embeddings[0]?.length || 0} → 1536)`);

    return {
      embeddings: normalizedEmbeddings,
      tokensUsed: data.meta?.billed_units?.input_tokens || 0,
      provider: provider.name,
      model: provider.model,
    };
  }

  /**
   * Genera embeddings usando OpenAI API
   */
  private async embedWithOpenAI(provider: EmbeddingProvider, texts: string[]): Promise<EmbeddingResponse> {
    const response = await fetch(`${provider.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        input: texts,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('retry-after') || '60') * 1000;
        throw new Error(`Rate limit: retry in ${retryAfter / 1000}s`);
      }

      throw new Error(`OpenAI HTTP ${response.status}: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const embeddings = data.data.map((item: { embedding: number[] }) => item.embedding);

    console.log(`✅ OpenAI: ${texts.length} embeddings generados (dim: 1536)`);

    return {
      embeddings,
      tokensUsed: data.usage?.total_tokens || 0,
      provider: provider.name,
      model: provider.model,
    };
  }

  /**
   * Normaliza la dimensión del embedding a un tamaño específico
   * Si es más pequeño, rellena con 0
   * Si es más grande, trunca
   */
  private normalizeDimension(embedding: number[], targetDim: number): number[] {
    if (embedding.length === targetDim) {
      return embedding;
    }

    if (embedding.length < targetDim) {
      // Rellenar con 0
      return [...embedding, ...new Array(targetDim - embedding.length).fill(0)];
    }

    // Truncar
    return embedding.slice(0, targetDim);
  }

  /**
   * Genera embedding para query de búsqueda (usando input_type diferente en Cohere)
   */
  async embedQuery(text: string): Promise<number[]> {
    const provider = this.getNextProvider();

    if (!provider) {
      throw new Error('No hay proveedores de embeddings disponibles');
    }

    if (provider.name === 'cohere') {
      // Para queries usamos input_type diferente
      const response = await fetch(`${provider.baseUrl}/embed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.apiKey}`,
        },
        body: JSON.stringify({
          texts: [text],
          model: provider.model,
          input_type: 'search_query', // Optimizado para búsqueda de queries
          embedding_types: ['float'],
          truncate: 'END',
        }),
      });

      if (!response.ok) {
        throw new Error(`Cohere HTTP ${response.status}`);
      }

      const data = await response.json();
      const embedding = data.embeddings?.float?.[0] || data.embeddings?.[0] || [];
      return this.normalizeDimension(embedding, 1536);
    }

    // Fallback a método estándar
    return this.embedSingle(text);
  }

  /**
   * Verifica si el servicio de embeddings está disponible
   */
  isReady(): boolean {
    return this.providers.some(p => p.isAvailable);
  }

  /**
   * Obtiene estadísticas de los proveedores
   */
  getProviderStats() {
    return this.providers.map(p => ({
      name: p.name,
      model: p.model,
      dimension: p.dimension,
      isAvailable: p.isAvailable,
      lastError: p.lastError,
    }));
  }
}

// Singleton
export const embeddingClient = new EmbeddingClient();
