/**
 * Semantic Search Service
 * Pipeline de recuperación semántica (Query Time)
 * Fase 6: Pregunta → Embedding → Búsqueda Vectorial → Contexto → IA
 */

import { embeddingClient } from '../infrastructure/embedding-client';
import { aiClient } from '../infrastructure/ai-client';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface SearchResult {
  id: string;
  pageId: string;
  notionPageId: string;
  pageTitle: string;
  chunkIndex: number;
  content: string;
  similarity: number;
}

interface SemanticSearchResponse {
  answer: string;
  sources: {
    id: string;
    title: string;
    notionUrl: string;
    similarity: number;
    excerpts: string[];
  }[];
  metadata: {
    tokensUsed: number;
    provider: string;
    chunksRetrieved: number;
    pagesUsed: number;
    processingTimeMs: number;
    searchMethod: 'semantic';
  };
}

interface SearchOptions {
  categoryIds?: string[];
  maxChunks?: number;
  similarityThreshold?: number;
  includeContext?: boolean;
}

export class SemanticSearch {
  private supabase: SupabaseClient | null = null;
  private readonly DEFAULT_MAX_CHUNKS = 5;
  private readonly DEFAULT_THRESHOLD = 0.5; // Reducido de 0.7 para ser más permisivo
  private readonly MAX_CONTEXT_CHARS = 30000; // ~7500 tokens

  constructor() {
    this.initializeSupabase();
  }

  private initializeSupabase() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

    if (url && key) {
      this.supabase = createClient(url, key);
      console.log('🔍 Semantic Search inicializado');
    }
  }

  /**
   * Verifica si el servicio está disponible
   */
  isReady(): boolean {
    return this.supabase !== null && embeddingClient.isReady();
  }

  /**
   * Realiza búsqueda semántica y genera respuesta con IA
   */
  async search(
    userId: string,
    question: string,
    options: SearchOptions = {}
  ): Promise<SemanticSearchResponse> {
    const startTime = Date.now();

    if (!this.isReady()) {
      throw new Error('Semantic Search no está configurado');
    }

    console.log(`\n🔍 Búsqueda semántica: "${question.slice(0, 50)}..."`);

    // 1. Generar embedding de la pregunta
    console.log('   🔢 Generando embedding de la pregunta...');
    const questionEmbedding = await embeddingClient.embedQuery(question);

    // 2. Buscar chunks similares
    console.log('   🔎 Buscando chunks similares...');
    const chunks = await this.searchSimilarChunks(
      userId,
      questionEmbedding,
      options
    );

    if (chunks.length === 0) {
      console.log('   ⚠️ [SemanticSearch] Sin resultados - El contenido probablemente no está indexado');
      return {
        answer: '⚠️ **No se encontró contenido indexado.**\n\nPosibles causas:\n1. No has indexado tu contenido aún\n2. El contenido indexado no está relacionado con tu pregunta\n\n**Solución:** Ve a la página de **Indexación** y sincroniza tu contenido de Notion para poder usar la búsqueda semántica.',
        sources: [],
        metadata: {
          tokensUsed: 0,
          provider: 'none',
          chunksRetrieved: 0,
          pagesUsed: 0,
          processingTimeMs: Date.now() - startTime,
          searchMethod: 'semantic',
        },
      };
    }

    console.log(`   📦 Encontrados ${chunks.length} chunks relevantes`);

    // 3. Agrupar por página y construir contexto
    const { context, sources } = this.buildContextAndSources(chunks);
    console.log(`   📝 Contexto: ${context.length} caracteres de ${sources.length} páginas`);

    // 4. Generar respuesta con IA
    console.log('   🤖 Generando respuesta con IA...');
    const aiResponse = await this.generateAnswer(question, context, options.categoryIds);

    const processingTimeMs = Date.now() - startTime;
    console.log(`   ✅ Respuesta generada en ${processingTimeMs}ms`);

    return {
      answer: aiResponse.content,
      sources,
      metadata: {
        tokensUsed: aiResponse.tokensUsed,
        provider: aiResponse.provider,
        chunksRetrieved: chunks.length,
        pagesUsed: sources.length,
        processingTimeMs,
        searchMethod: 'semantic',
      },
    };
  }

  /**
   * Busca chunks similares en Supabase usando la función match_chunks
   */
  private async searchSimilarChunks(
    userId: string,
    embedding: number[],
    options: SearchOptions
  ): Promise<SearchResult[]> {
    if (!this.supabase) return [];

    const maxChunks = options.maxChunks || this.DEFAULT_MAX_CHUNKS;
    const threshold = options.similarityThreshold || this.DEFAULT_THRESHOLD;

    try {
      // Usar la función SQL match_chunks
      const { data, error } = await this.supabase.rpc('match_chunks', {
        query_embedding: embedding,
        match_threshold: threshold,
        match_count: maxChunks,
        filter_user_id: userId,
        filter_category_ids: options.categoryIds || null,
      });

      if (error) {
        // Fallback: Query directo sin RPC
        return this.searchChunksDirect(userId, embedding, maxChunks, threshold, options.categoryIds);
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        pageId: row.page_id,
        notionPageId: row.notion_page_id,
        pageTitle: row.page_title,
        chunkIndex: row.chunk_index,
        content: row.content,
        similarity: row.similarity,
      }));

    } catch (error) {
      console.error('Error en búsqueda semántica:', error);
      return [];
    }
  }

  /**
   * Búsqueda directa sin usar la función RPC (fallback)
   */
  private async searchChunksDirect(
    userId: string,
    embedding: number[],
    maxChunks: number,
    threshold: number,
    categoryIds?: string[]
  ): Promise<SearchResult[]> {
    if (!this.supabase) return [];

    // Query base para obtener chunks con sus páginas
    let query = this.supabase
      .from('notion_page_chunks')
      .select(`
        id,
        page_id,
        chunk_index,
        content,
        notion_pages!inner (
          id,
          notion_page_id,
          title,
          user_id,
          category_id
        )
      `)
      .limit(maxChunks * 3); // Traer más y filtrar después

    // Filtrar por usuario
    query = query.eq('notion_pages.user_id', userId);

    // Filtrar por categorías si se especifican
    if (categoryIds && categoryIds.length > 0) {
      query = query.in('notion_pages.category_id', categoryIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error en búsqueda directa:', error);
      return [];
    }

    // Calcular similitud manualmente (Cosine similarity)
    const results = (data || [])
      .map((row: any) => {
        const similarity = this.cosineSimilarity(embedding, row.embedding || []);
        return {
          id: row.id,
          pageId: row.page_id,
          notionPageId: row.notion_pages.notion_page_id,
          pageTitle: row.notion_pages.title,
          chunkIndex: row.chunk_index,
          content: row.content,
          similarity,
        };
      })
      .filter(r => r.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxChunks);

    return results;
  }

  /**
   * Calcula la similitud coseno entre dos vectores
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Construye el contexto y agrupa las fuentes
   */
  private buildContextAndSources(chunks: SearchResult[]): {
    context: string;
    sources: SemanticSearchResponse['sources'];
  } {
    // Agrupar chunks por página
    const pageMap = new Map<string, {
      title: string;
      notionPageId: string;
      chunks: SearchResult[];
      maxSimilarity: number;
    }>();

    for (const chunk of chunks) {
      const existing = pageMap.get(chunk.pageId);
      if (existing) {
        existing.chunks.push(chunk);
        existing.maxSimilarity = Math.max(existing.maxSimilarity, chunk.similarity);
      } else {
        pageMap.set(chunk.pageId, {
          title: chunk.pageTitle,
          notionPageId: chunk.notionPageId,
          chunks: [chunk],
          maxSimilarity: chunk.similarity,
        });
      }
    }

    // Construir contexto
    let context = '';
    const sources: SemanticSearchResponse['sources'] = [];

    for (const [pageId, pageData] of pageMap) {
      // Ordenar chunks por índice para mantener coherencia
      pageData.chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);

      const pageContent = pageData.chunks.map(c => c.content).join('\n\n');
      const pageSection = `\n=== ${pageData.title} ===\n${pageContent}\n`;

      // Verificar límite de contexto
      if ((context + pageSection).length > this.MAX_CONTEXT_CHARS) {
        console.log(`   ⚠️ Contexto truncado (límite: ${this.MAX_CONTEXT_CHARS} chars)`);
        break;
      }

      context += pageSection;

      // Generar URL de Notion
      const notionUrl = `https://notion.so/${pageData.notionPageId.replace(/-/g, '')}`;

      sources.push({
        id: pageId,
        title: pageData.title,
        notionUrl,
        similarity: Math.round(pageData.maxSimilarity * 100) / 100,
        excerpts: pageData.chunks.slice(0, 2).map(c =>
          c.content.slice(0, 150) + (c.content.length > 150 ? '...' : '')
        ),
      });
    }

    // Ordenar fuentes por similitud
    sources.sort((a, b) => b.similarity - a.similarity);

    return { context: context.trim(), sources };
  }

  /**
   * Genera respuesta usando el LLM
   */
  private async generateAnswer(
    question: string,
    context: string,
    categoryIds?: string[]
  ) {
    const categoryNote = categoryIds && categoryIds.length > 0
      ? 'El usuario ha filtrado por categorías específicas.'
      : 'El usuario está buscando en toda su base de conocimiento.';

    const systemPrompt = `Eres un asistente experto que responde preguntas basándose EXCLUSIVAMENTE en el contexto proporcionado.

${categoryNote}

REGLAS IMPORTANTES:
1. SOLO usa información del contexto proporcionado
2. Si la información no está en el contexto, di "No tengo información sobre eso en tu base de conocimiento indexada"
3. Cita los títulos de las fuentes cuando sea relevante: "Según [Título]..."
4. Responde en español
5. Sé conciso pero completo
6. Si hay información de múltiples fuentes, sintetízala de forma coherente
7. Usa Markdown para formatear (listas, negritas, encabezados cuando sea útil)`;

    const userPrompt = `CONTEXTO RECUPERADO SEMÁNTICAMENTE:
---
${context}
---

PREGUNTA: ${question}

Responde basándote ÚNICAMENTE en el contexto anterior.`;

    return await aiClient.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);
  }

  /**
   * Búsqueda solo de chunks (sin generar respuesta IA)
   * Útil para debug o para mostrar resultados de búsqueda
   */
  async searchChunksOnly(
    userId: string,
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    if (!this.isReady()) return [];

    const embedding = await embeddingClient.embedQuery(query);
    return this.searchSimilarChunks(userId, embedding, options);
  }

  /**
   * Obtiene categorías descendientes para filtrar
   */
  async getCategoryDescendants(categoryId: string, userId: string): Promise<string[]> {
    if (!this.supabase) return [categoryId];

    try {
      const { data } = await this.supabase.rpc('get_category_descendants', {
        category_id: categoryId,
      });

      return (data || []).map((row: any) => row.id);
    } catch {
      return [categoryId];
    }
  }
}

// Singleton
export const semanticSearch = new SemanticSearch();
