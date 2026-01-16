/**
 * Hybrid Brain API - Orquestador
 * Backend principal que conecta Worker, IA y Notion
 */
import { Elysia, t } from 'elysia';
import { cors } from '@elysiajs/cors';
import { workerClient } from './infrastructure/worker-client';
import { aiClient } from './infrastructure/ai-client';
import { embeddingClient } from './infrastructure/embedding-client';
import { notionClient } from './infrastructure/notion-client';
import { notionReader } from './infrastructure/notion-reader';
import { supabaseService } from './infrastructure/supabase-client';
import { processUrlUseCase } from './application/process-url';
import { askBrainUseCase } from './application/ask-brain';
import { notionIndexer } from './application/notion-indexer';
import { semanticSearch } from './application/semantic-search';

const WORKER_URL = process.env.WORKER_URL || 'http://localhost:8000';

const app = new Elysia()
  // CORS para permitir requests del frontend
  .use(cors())

  // ============ Health & Status ============

  .get('/', () => '🧠 Hybrid Brain API en linea')

  .get('/health', async () => {
    try {
      // Check Worker
      const workerHealth = await workerClient.healthCheck();

      // Check Notion (Writer + Reader)
      const notionWriterHealth = await notionClient.healthCheck();
      const notionReaderHealth = await notionReader.healthCheck();

      // Check Supabase
      const supabaseHealth = await supabaseService.healthCheck();

      // AI Providers
      const aiProviders = aiClient.getProviderStats();

      // Embedding Providers
      const embeddingProviders = embeddingClient.getProviderStats();

      // Indexer status
      const indexerReady = notionIndexer.isReady();
      const semanticReady = semanticSearch.isReady();

      return {
        status: 'ok',
        services: {
          worker: workerHealth,
          notion: {
            writer: notionWriterHealth,
            reader: notionReaderHealth,
          },
          supabase: supabaseHealth,
          ai: {
            providers: aiProviders,
            available: aiProviders.filter(p => p.isAvailable).length,
          },
          embeddings: {
            providers: embeddingProviders,
            available: embeddingProviders.filter(p => p.isAvailable).length,
          },
          phase6: {
            indexer: indexerReady ? 'ready' : 'not_configured',
            semanticSearch: semanticReady ? 'ready' : 'not_configured',
          }
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'partial',
        error: String(error),
        timestamp: new Date().toISOString(),
      };
    }
  })

  // ============ DEBUG: Verificar Notion ============
  .get('/check-notion', async () => {
    try {
      const allPages = await notionReader.getAllPages(5); // Traer 5 páginas
      return {
        status: 'ok',
        count: allPages.length,
        pages: allPages.map(p => ({
          id: p.id,
          title: p.title,
          category: p.category || 'Sin categoría',
          contentLength: p.content.length
        }))
      };
    } catch (error) {
      return { status: 'error', message: String(error) };
    }
  })

  // ============ SETUP: Poblar Notion ============
  .post('/setup-notion', async () => {
    try {
      console.log('🌱 Iniciando población de Notion...');

      const examples = [
        {
          title: 'Introducción a React Hooks',
          summary: 'Guía básica sobre useState y useEffect para gestionar estado y efectos secundarios en componentes funcionales.',
          tags: ['React', 'Frontend', 'JavaScript'],
          sentiment: 'neutral',
          originalUrl: 'https://react.dev/reference/react',
          keyPoints: ['useState permite estado local', 'useEffect maneja ciclo de vida', 'Hooks solo en nivel superior'],
          category: 'Programación' // Categoría clave para el RAG
        },
        {
          title: 'Historia de la Inteligencia Artificial',
          summary: 'Resumen de los hitos más importantes de la IA, desde el Test de Turing hasta los LLMs modernos.',
          tags: ['IA', 'Historia', 'Tecnología'],
          sentiment: 'positive',
          originalUrl: 'https://en.wikipedia.org/wiki/History_of_artificial_intelligence',
          keyPoints: ['1950: Test de Turing', '2012: AlexNet y Deep Learning', '2022: ChatGPT y Generative AI'],
          category: 'Inteligencia Artificial'
        },
        {
          title: 'Receta de Pizza Casera',
          summary: 'Pasos para hacer una masa de pizza perfecta con fermentación lenta.',
          tags: ['Cocina', 'Recetas', 'Ocio'],
          sentiment: 'positive',
          originalUrl: 'https://ejemplo.com/pizza',
          keyPoints: ['Usar harina de fuerza', 'Fermentar 24h en nevera', 'Horno a máxima temperatura'],
          category: 'Ocio'
        }
      ];

      const results = [];

      for (const ex of examples) {
        // Usamos el notionClient existente para crear notas
        // Nota: notionClient.createNote no acepta 'category' explícitamente en la interfaz Note actual,
        // pero vamos a extenderlo o confiar en que 'Tags' sirva por ahora, 
        // AUNQUE para el RAG es mejor tener una propiedad 'Category' explícita.
        // Como createNote está hardcoded para ciertas propiedades, 
        // voy a usar el cliente raw aquí para asegurar la estructura IDEAL.

        // @ts-ignore - Acceso directo al cliente privado para setup
        const client = notionClient.client;
        // @ts-ignore
        const dbId = notionClient.databaseId;

        if (!client || !dbId) throw new Error('Notion no configurado en servidor');

        const response = await client.pages.create({
          parent: { database_id: dbId },
          icon: { type: 'emoji', emoji: '📚' },
          properties: {
            Title: { title: [{ text: { content: ex.title } }] },
            Category: { select: { name: ex.category } }, // CRUCIAL para el filtro
            Tags: { multi_select: ex.tags.map(t => ({ name: t })) },
            URL: { url: ex.originalUrl },
            Sentiment: { select: { name: ex.sentiment } },
            Date: { date: { start: new Date().toISOString() } }
          },
          children: [
            {
              object: 'block',
              type: 'heading_2',
              heading_2: { rich_text: [{ text: { content: 'Resumen' } }] }
            },
            {
              object: 'block',
              type: 'paragraph',
              paragraph: { rich_text: [{ text: { content: ex.summary } }] }
            },
            {
              object: 'block',
              type: 'heading_3',
              heading_3: { rich_text: [{ text: { content: 'Puntos Clave' } }] }
            },
            ...ex.keyPoints.map(point => ({
              object: 'block',
              type: 'bulleted_list_item',
              bulleted_list_item: { rich_text: [{ text: { content: point } }] }
            }))
          ]
        });

        results.push({ title: ex.title, id: response.id });
      }

      return {
        status: 'ok',
        message: 'Base de datos poblada con éxito',
        created: results,
        note: 'Se han creado propiedades: Category, Tags, URL, Sentiment, Date. Verifica en Notion.'
      };

    } catch (error) {
      console.error('Error poblando Notion:', error);
      return { status: 'error', message: String(error) };
    }
  })

  .post('/video/info', async ({ body }) => {
    const { url } = body as { url: string };

    if (!url) {
      throw new Error('URL es requerida');
    }

    const platform = workerClient.detectPlatform(url);
    if (!platform) {
      throw new Error('URL no soportada. Solo YouTube e Instagram.');
    }

    const info = await workerClient.getVideoInfo(url);
    return {
      success: true,
      platform,
      info,
    };
  })

  // ============ Procesamiento Principal ============

  .post('/process', async ({ body }) => {
    const { url, language, saveToNotion } = body as {
      url: string;
      language?: string;
      saveToNotion?: boolean;
    };

    if (!url) {
      throw new Error('URL es requerida');
    }

    console.log(`\n📥 Nueva solicitud de procesamiento: ${url}\n`);

    const result = await processUrlUseCase.execute({
      url,
      language,
      saveToNotion: saveToNotion !== false,
    });

    return result;
  })

  // ============ Preview (Solo para previsualizar sin procesar) ============

  .post('/preview', async ({ body }) => {
    const { url } = body as { url: string };

    if (!url) {
      throw new Error('URL es requerida');
    }

    const preview = await processUrlUseCase.getPreview(url);
    return {
      success: true,
      preview,
    };
  })

  // ============ Notion ============

  .get('/notes', async ({ query }) => {
    const limit = parseInt(query.limit as string) || 10;

    if (!notionClient.isReady()) {
      return {
        success: false,
        error: 'Notion no está configurado',
        notes: [],
      };
    }

    const notes = await notionClient.listNotes(limit);
    return {
      success: true,
      count: notes.length,
      notes,
    };
  })

  // ============ AI Testing ============

  .post('/ai/test', async ({ body }) => {
    const { text } = body as { text: string };

    if (!text) {
      throw new Error('Texto es requerido');
    }

    console.log('🧪 Probando IA...');

    const [summary, keyPoints, tags, sentiment] = await Promise.all([
      aiClient.summarize(text),
      aiClient.extractKeyPoints(text),
      aiClient.generateTags(text),
      aiClient.analyzeSentiment(text),
    ]);

    return {
      success: true,
      result: {
        summary,
        keyPoints,
        tags,
        sentiment,
      },
      providers: aiClient.getProviderStats(),
    };
  })

  // ============ Worker Control ============

  .post('/worker/preload', async () => {
    const result = await workerClient.preloadModel();
    return result;
  })

  // ============ 🧠 RAG - Chat con tu Cerebro (Fase 5) ============

  .post('/ask', async ({ body }) => {
    const { question, categoryId, categoryName, maxSources } = body as {
      question: string;
      categoryId?: string;
      categoryName?: string;
      maxSources?: number;
    };

    if (!question || question.trim().length === 0) {
      throw new Error('La pregunta es requerida');
    }

    console.log(`\n🎯 Nueva pregunta: "${question.slice(0, 100)}..."`);

    const result = await askBrainUseCase.execute({
      question,
      categoryId,
      categoryName,
      maxSources,
    });

    return {
      success: true,
      ...result,
    };
  })

  .post('/ask/continue', async ({ body }) => {
    const { question, history, categoryId } = body as {
      question: string;
      history: { role: 'user' | 'assistant'; content: string }[];
      categoryId?: string;
    };

    if (!question) {
      throw new Error('La pregunta es requerida');
    }

    const result = await askBrainUseCase.continueChat(
      question,
      history || [],
      categoryId
    );

    return {
      success: true,
      ...result,
    };
  })

  // ============ Categorías (Supabase) ============

  .get('/categories', async () => {
    if (!supabaseService.isReady()) {
      return {
        success: false,
        error: 'Supabase no está configurado',
        categories: [],
      };
    }

    const categories = await supabaseService.getAllCategories();
    return {
      success: true,
      count: categories.length,
      categories,
    };
  })

  .get('/categories/tree', async () => {
    if (!supabaseService.isReady()) {
      return {
        success: false,
        error: 'Supabase no está configurado',
        tree: [],
      };
    }

    const tree = await supabaseService.getCategoryTree();
    return {
      success: true,
      tree,
    };
  })

  .post('/categories', async ({ body }) => {
    const { name, parentId } = body as { name: string; parentId?: string };

    if (!name) {
      throw new Error('El nombre de la categoría es requerido');
    }

    const category = await supabaseService.createCategory(name, parentId);

    if (!category) {
      throw new Error('Error al crear la categoría');
    }

    return {
      success: true,
      category,
    };
  })

  .put('/categories/:id', async ({ params, body }) => {
    const { id } = params;
    const { name, parentId } = body as { name?: string; parentId?: string | null };

    const category = await supabaseService.updateCategory(id, {
      name,
      parent_id: parentId
    });

    if (!category) {
      throw new Error('Error al actualizar la categoría');
    }

    return {
      success: true,
      category,
    };
  })

  .delete('/categories/:id', async ({ params }) => {
    const { id } = params;

    const deleted = await supabaseService.deleteCategory(id);

    return {
      success: deleted,
      message: deleted ? 'Categoría eliminada' : 'Error al eliminar',
    };
  })

  // ============ 🔮 Fase 6: Indexación y Búsqueda Semántica ============

  .post('/index/trigger', async ({ body }) => {
    const { userId, mode } = body as { userId: string; mode?: 'full' | 'incremental' };

    if (!userId) {
      throw new Error('userId es requerido');
    }

    if (!notionIndexer.isReady()) {
      return {
        success: false,
        error: 'Indexador no configurado. Verifica COHERE_API_KEY y SUPABASE_URL',
      };
    }

    console.log(`\n📥 Iniciando indexación ${mode || 'full'} para usuario ${userId}`);

    const result = mode === 'incremental'
      ? await notionIndexer.indexIncremental(userId)
      : await notionIndexer.indexAll(userId);

    return {
      success: result.success,
      result,
    };
  })

  .post('/index/page/:notionPageId', async ({ params, body }) => {
    const { notionPageId } = params;
    const { userId } = body as { userId: string };

    if (!userId) {
      throw new Error('userId es requerido');
    }

    console.log(`\n📝 Indexando página específica: ${notionPageId}`);

    const result = await notionIndexer.indexPageById(userId, notionPageId);

    return {
      success: !!result,
      page: result,
    };
  })

  .get('/index/status', async ({ query }) => {
    const userId = query.userId as string;

    if (!userId) {
      throw new Error('userId es requerido');
    }

    const stats = await notionIndexer.getStats(userId);
    const changes = await notionIndexer.detectChanges(userId);

    return {
      success: true,
      stats,
      pendingChanges: {
        new: changes.new.length,
        modified: changes.modified.length,
        deleted: changes.deleted.length,
      },
      isReady: notionIndexer.isReady(),
    };
  })

  .get('/index/pages', async ({ query }) => {
    const userId = query.userId as string;
    const limit = parseInt(query.limit as string) || 50;

    if (!userId) {
      throw new Error('userId es requerido');
    }

    const pages = await notionIndexer.getIndexedPages(userId, limit);

    return {
      success: true,
      count: pages.length,
      pages,
    };
  })

  .delete('/index/page/:id', async ({ params }) => {
    const { id } = params;

    const deleted = await notionIndexer.deletePage(id);

    return {
      success: deleted,
      message: deleted ? 'Página eliminada del índice' : 'Error al eliminar',
    };
  })

  // ============ 🔍 Búsqueda Semántica (Fase 6) ============

  .post('/search', async ({ body }) => {
    const { userId, question, categoryId, maxChunks, similarityThreshold } = body as {
      userId: string;
      question: string;
      categoryId?: string;
      maxChunks?: number;
      similarityThreshold?: number;
    };

    if (!userId) {
      throw new Error('userId es requerido');
    }

    if (!question || question.trim().length === 0) {
      throw new Error('La pregunta es requerida');
    }

    if (!semanticSearch.isReady()) {
      return {
        success: false,
        error: 'Búsqueda semántica no configurada. Verifica COHERE_API_KEY.',
      };
    }

    // Resolver descendientes si hay categoryId
    let categoryIds: string[] | undefined;
    if (categoryId) {
      categoryIds = await supabaseService.getCategoryWithDescendants(categoryId);
    }

    const result = await semanticSearch.search(userId, question, {
      categoryIds,
      maxChunks,
      similarityThreshold,
    });

    return {
      success: true,
      ...result,
    };
  })

  .post('/ask/semantic', async ({ body }) => {
    // Endpoint alternativo que usa búsqueda semántica en lugar de Notion directo
    const { userId, question, categoryId, maxChunks } = body as {
      userId: string;
      question: string;
      categoryId?: string;
      maxChunks?: number;
    };

    if (!userId) {
      throw new Error('userId es requerido');
    }

    if (!question || question.trim().length === 0) {
      throw new Error('La pregunta es requerida');
    }

    console.log(`\n🎯 Búsqueda semántica: "${question.slice(0, 50)}..."`);

    // Verificar si la búsqueda semántica está disponible
    if (semanticSearch.isReady()) {
      let categoryIds: string[] | undefined;
      if (categoryId) {
        categoryIds = await supabaseService.getCategoryWithDescendants(categoryId);
      }

      const result = await semanticSearch.search(userId, question, {
        categoryIds,
        maxChunks: maxChunks || 5,
      });

      return {
        success: true,
        method: 'semantic',
        ...result,
      };
    }

    // Fallback al método tradicional (Notion directo)
    console.log('   ⚠️ Semántico no disponible, usando Notion directo');

    const allCategories = await supabaseService.getAllCategories();
    const categoryName = categoryId
      ? allCategories.find(c => c.id === categoryId)?.name
      : undefined;

    const result = await askBrainUseCase.execute({
      question,
      categoryId,
      categoryName,
      maxSources: maxChunks || 5,
    });

    return {
      success: true,
      method: 'notion_direct',
      answer: result.answer,
      sources: result.sources.map(s => ({
        id: s.id,
        title: s.title,
        notionUrl: s.url,
        similarity: 1, // No tenemos similitud en el método directo
        excerpts: [],
      })),
      metadata: {
        ...result.metadata,
        searchMethod: 'notion_direct' as const,
        chunksRetrieved: 0,
        pagesUsed: result.sources.length,
      },
    };
  })

  .get('/search/debug', async ({ query }) => {
    const userId = query.userId as string;
    const q = query.q as string;
    const limit = parseInt(query.limit as string) || 5;

    if (!userId || !q) {
      throw new Error('userId y q son requeridos');
    }

    // Solo buscar chunks sin generar respuesta IA
    const chunks = await semanticSearch.searchChunksOnly(userId, q, {
      maxChunks: limit,
    });

    return {
      success: true,
      query: q,
      chunks: chunks.map(c => ({
        pageTitle: c.pageTitle,
        similarity: Math.round(c.similarity * 100) / 100,
        content: c.content.slice(0, 300) + (c.content.length > 300 ? '...' : ''),
      })),
    };
  })

  .get('/embeddings/test', async ({ query }) => {
    const text = query.text as string || 'Esto es una prueba de embeddings';

    if (!embeddingClient.isReady()) {
      return {
        success: false,
        error: 'Embeddings no configurados. Añade COHERE_API_KEY al .env',
      };
    }

    const embedding = await embeddingClient.embedSingle(text);

    return {
      success: true,
      text,
      embeddingDimension: embedding.length,
      embeddingSample: embedding.slice(0, 10),
      providers: embeddingClient.getProviderStats(),
    };
  })

  // ============ Error Handler ============

  .onError(({ code, error }) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error [${code}]:`, errorMessage);

    return {
      success: false,
      error: errorMessage,
      code,
    };
  })

  .listen(3000);

console.log(`
🧠 ═══════════════════════════════════════════════════
   Hybrid Brain API
   Running at: http://${app.server?.hostname}:${app.server?.port}
   Worker URL: ${WORKER_URL}
═══════════════════════════════════════════════════ 🧠
`);

export type App = typeof app;
