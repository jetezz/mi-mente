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
import { jobProcessor } from './application/job-processor';

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

  // ============ 📝 Fase 8: Nuevo Flujo con Preview/Edit/Save ============

  .get('/process/stream-preview', ({ query }) => {
    const { url, customPrompt, userId } = query as {
      url: string;
      customPrompt?: string;
      userId?: string;
    };

    const encoder = new TextEncoder();

    return new Response(new ReadableStream({
      async start(controller) {
        // Helper para enviar eventos SSE de forma segura
        const send = (data: any) => {
          try {
            const message = `data: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(message));
          } catch (e) {
            // Si el controlador está cerrado (cliente desconectado), lanzamos error para detener flujo
            console.warn('⚠️ Stream cerrado por el cliente.');
            throw new Error('STREAM_CLOSED');
          }
        };

        if (!url) {
          send({ type: 'error', error: 'URL es requerida' });
          controller.close();
          return;
        }

        console.log(`\n🌊 [Stream] Procesando: ${url}`);

        try {
          // 1. Downloading / Transcribing
          console.log('   [Step 1] Iniciando descarga/transcripción...');
          send({ type: 'status', step: 'downloading', progress: 10 });

          // Simular un poco de delay para UX
          await new Promise(r => setTimeout(r, 500));
          send({ type: 'status', step: 'transcribing', progress: 30 });

          // Heartbeat simpler: Send comments to keep connection alive
          const keepAlive = setInterval(() => {
            try {
              controller.enqueue(encoder.encode(': keep-alive\n\n'));
            } catch (e) {
              clearInterval(keepAlive);
            }
          }, 10000);

          let transcription;
          try {
            transcription = await workerClient.transcribe(url);
          } finally {
            clearInterval(keepAlive);
          }

          console.log('   [Step 1] Transcripción completada.');
          send({
            type: 'transcription',
            title: transcription.videoInfo?.title || 'Sin título',
            text: transcription.text.slice(0, 1000) // Preview parcial
          });

          // 2. Summarizing (Streaming)
          console.log('   [Step 2] Generando resumen...');
          send({ type: 'status', step: 'summarizing', progress: 60 });

          const stream = aiClient.streamSummarize(transcription.text, customPrompt);
          let fullSummary = '';

          for await (const chunk of stream) {
            if (chunk.type === 'token' && chunk.content) {
              fullSummary += chunk.content;
              send({ type: 'token', content: chunk.content });
            } else if (chunk.type === 'error') {
              console.error('Error streaming summary:', chunk.error);
            }
          }

          // 3. Analysis (KeyPoints + Sentiment)
          console.log('   [Step 3] Analizando puntos clave...');
          send({ type: 'status', step: 'analyzing', progress: 90 });

          const [keyPoints, sentiment, generatedTags] = await Promise.all([
            aiClient.extractKeyPoints(transcription.text),
            aiClient.analyzeSentiment(transcription.text),
            aiClient.generateTags(transcription.text),
          ]);

          // 4. Done
          console.log('   [Step 4] Todo listo.');
          send({
            type: 'result',
            summary: fullSummary,
            keyPoints,
            sentiment,
            originalUrl: url,
            title: transcription.videoInfo?.title,
            transcription: transcription.text,
            generatedTags
          });

          send({ type: 'done' });
          controller.close();

        } catch (error: any) {
          if (error.message === 'STREAM_CLOSED') {
            // Salida normal si el cliente cerró
            return;
          }
          console.error('\n❌ Error en stream:', error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          try {
            // Intentar enviar error si aún es posible
            send({ type: 'error', error: errorMessage });
            controller.close();
          } catch { }
        }
      }
    }), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  })

  .post('/process/save', async ({ body }) => {
    // Guarda el contenido EDITADO por el usuario en Notion
    // Soporta tanto Markdown como el formato legacy (summary + keyPoints)
    const { url, title, summary, keyPoints, markdown, tags, userId, categoryName } = body as {
      url: string;
      title: string;
      summary?: string;
      keyPoints?: string[];
      markdown?: string;  // Nuevo: contenido en Markdown
      tags: string[];
      userId?: string;
      categoryName?: string;
    };

    if (!url || !title) {
      throw new Error('URL y título son requeridos');
    }

    if (!summary && !markdown) {
      throw new Error('Se requiere summary o markdown');
    }

    console.log(`\n💾 [Save] Guardando en Notion: "${title}"`);

    if (!notionClient.isReady()) {
      throw new Error('Notion no está configurado');
    }

    let pageId: string | null;

    // Si hay Markdown, usar el nuevo método
    if (markdown) {
      pageId = await notionClient.createPageFromMarkdown({
        title,
        markdown,
        tags: tags || [],
        categoryNames: categoryName ? [categoryName] : [],
        sourceUrl: url,
      });
    } else {
      // Legacy: construir Markdown desde summary + keyPoints
      const legacyMarkdown = `## 📋 Resumen

${summary}

---

## 💡 Puntos Clave

${keyPoints?.map(p => `- ${p}`).join('\n') || ''}
`;
      pageId = await notionClient.createPageFromMarkdown({
        title,
        markdown: legacyMarkdown,
        tags: tags || [],
        categoryNames: categoryName ? [categoryName] : [],
        sourceUrl: url,
      });
    }

    if (!pageId) {
      throw new Error('Error creando página en Notion');
    }

    console.log(`   ✅ [Save] Página creada: ${pageId}`);

    return {
      success: true,
      notionPageId: pageId,
      title,
    };
  })

  // ============ 🏷️ Tags CRUD (Fase 8) ============

  .get('/tags', async ({ query }) => {
    const userId = query.userId as string;

    if (!userId) {
      throw new Error('userId es requerido');
    }

    const client = supabaseService.getAdminClient();
    if (!client) {
      throw new Error('Supabase no configurado');
    }

    const { data, error } = await client
      .from('tags')
      .select('*')
      .eq('user_id', userId)
      .order('name');

    if (error) {
      throw new Error(`Error obteniendo tags: ${error.message}`);
    }

    return {
      success: true,
      tags: data || [],
    };
  })

  .post('/tags', async ({ body }) => {
    const { userId, name, color } = body as {
      userId: string;
      name: string;
      color?: string;
    };

    if (!userId || !name) {
      throw new Error('userId y name son requeridos');
    }

    const client = supabaseService.getAdminClient();
    if (!client) {
      throw new Error('Supabase no configurado');
    }

    const { data, error } = await client
      .from('tags')
      .insert({
        user_id: userId,
        name: name.trim().toLowerCase(),
        color: color || '#8B5CF6',
      })
      .select()
      .single();

    if (error) {
      // Si es error de duplicado, devolver el existente
      if (error.code === '23505') {
        const { data: existing } = await client
          .from('tags')
          .select('*')
          .eq('user_id', userId)
          .eq('name', name.trim().toLowerCase())
          .single();

        return {
          success: true,
          tag: existing,
          existed: true,
        };
      }
      throw new Error(`Error creando tag: ${error.message}`);
    }

    return {
      success: true,
      tag: data,
      existed: false,
    };
  })

  .delete('/tags/:tagId', async ({ params, query }) => {
    const { tagId } = params;
    const userId = query.userId as string;

    if (!userId) {
      throw new Error('userId es requerido');
    }

    const client = supabaseService.getAdminClient();
    if (!client) {
      throw new Error('Supabase no configurado');
    }

    const { error } = await client
      .from('tags')
      .delete()
      .eq('id', tagId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Error eliminando tag: ${error.message}`);
    }

    return {
      success: true,
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

  .get('/worker/health', async () => {
    try {
      const status = await workerClient.healthCheck();
      return {
        success: true,
        worker: status,
        message: 'Worker conectado correctamente'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Worker no disponible',
        message: 'No se pudo conectar con el worker de Python'
      };
    }
  })

  .post('/worker/transcribe', async ({ body }) => {
    const { url, language } = body as { url: string; language?: string };

    if (!url) {
      throw new Error('URL es requerida');
    }

    console.log(`\n🎯 [Worker Transcribe] Solicitando transcripción: ${url}`);

    const result = await workerClient.transcribe(url, {
      language: language || undefined,
      includeTimestamps: true,
    });

    return {
      success: result.success,
      method: result.method,
      language: result.language,
      duration: result.duration,
      wordCount: result.wordCount,
      processingTime: result.processingTime,
      videoInfo: result.videoInfo,
      text: result.text,
      segmentsCount: result.segments?.length || 0,
      // Solo incluir primeros 5 segmentos para preview
      segmentsPreview: result.segments?.slice(0, 5) || [],
    };
  })

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

  // ============ ⚙️ Settings (Global Config) ============

  .get('/settings', async () => {
    const { settingsService } = await import('./application/settings-service');
    const settings = await settingsService.getSettingsList();
    return {
      success: true,
      settings
    };
  })

  .put('/settings/:key', async ({ params, body }) => {
    const { key } = params;
    const { value } = body as { value: any };

    const { settingsService } = await import('./application/settings-service');
    const updated = await settingsService.update(key, value);

    if (!updated) {
      throw new Error(`No se pudo actualizar la configuración: ${key}`);
    }

    return {
      success: true,
      key,
      value
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

  // ============ 🔄 Streaming SSE Endpoints (Fase 7) ============

  .get('/ask/stream', async function* ({ query }) {
    const question = query.question as string;
    const categoryId = query.categoryId as string | undefined;
    const categoryName = query.categoryName as string | undefined;

    if (!question || question.trim().length === 0) {
      yield `data: ${JSON.stringify({ type: 'error', error: 'La pregunta es requerida' })}\n\n`;
      return;
    }

    console.log(`\n🔄 [Stream] Chat: "${question.slice(0, 50)}..."`);

    // Emitir inicio
    yield `data: ${JSON.stringify({ type: 'start', timestamp: Date.now() })}\n\n`;

    try {
      // Obtener contexto de Notion
      const result = await askBrainUseCase.getContext({
        question,
        categoryId,
        categoryName,
        maxSources: 5,
      });

      // Emitir fuentes
      yield `data: ${JSON.stringify({
        type: 'sources',
        sources: result.sources
      })}\n\n`;

      // Construir mensajes para la IA
      const messages = [
        { role: 'system' as const, content: result.systemPrompt },
        { role: 'user' as const, content: question }
      ];

      // Stream de respuesta
      for await (const chunk of aiClient.streamChat(messages)) {
        if (chunk.type === 'token' && chunk.content) {
          yield `data: ${JSON.stringify({ type: 'token', content: chunk.content })}\n\n`;
        } else if (chunk.type === 'done') {
          yield `data: ${JSON.stringify({
            type: 'done',
            tokensUsed: chunk.tokensUsed,
            provider: chunk.provider
          })}\n\n`;
        } else if (chunk.type === 'error') {
          yield `data: ${JSON.stringify({ type: 'error', error: chunk.error })}\n\n`;
        }
      }

    } catch (error) {
      yield `data: ${JSON.stringify({ type: 'error', error: String(error) })}\n\n`;
    }
  })

  .get('/ask/semantic/stream', async function* ({ query }) {
    const userId = query.userId as string;
    const question = query.question as string;
    const categoryId = query.categoryId as string | undefined;
    const maxChunks = parseInt(query.maxChunks as string) || 5;
    const threshold = parseFloat(query.threshold as string) || 0.5;

    if (!userId) {
      yield `data: ${JSON.stringify({ type: 'error', error: 'userId es requerido' })}\n\n`;
      return;
    }

    if (!question || question.trim().length === 0) {
      yield `data: ${JSON.stringify({ type: 'error', error: 'La pregunta es requerida' })}\n\n`;
      return;
    }

    console.log(`\n🔄 [Stream Semantic] "${question.slice(0, 50)}..." (threshold: ${threshold})`);

    // Emitir inicio
    yield `data: ${JSON.stringify({ type: 'start', timestamp: Date.now() })}\n\n`;

    try {
      if (!semanticSearch.isReady()) {
        yield `data: ${JSON.stringify({ type: 'error', error: 'Búsqueda semántica no configurada' })}\n\n`;
        return;
      }

      // Resolver categorías
      let categoryIds: string[] | undefined;
      if (categoryId) {
        categoryIds = await supabaseService.getCategoryWithDescendants(categoryId);
        console.log(`   📁 Categorías expandidas: ${JSON.stringify(categoryIds)}`);
      }

      // Buscar chunks relevantes
      // Buscar chunks relevantes con threshold dinámico
      const chunks = await semanticSearch.searchChunksOnly(userId, question, {
        categoryIds,
        maxChunks,
        similarityThreshold: threshold,
      });

      // Si no hay chunks, notificar y terminar
      if (chunks.length === 0) {
        yield `data: ${JSON.stringify({ type: 'sources', sources: [] })}\n\n`;
        yield `data: ${JSON.stringify({ type: 'token', content: '⚠️ **No se encontró contenido relevante.**\n\nPosibles causas:\n1. No has indexado tu contenido aún\n2. El umbral de similitud es muy alto (prueba bajarlo)\n3. El contenido indexado no está relacionado con tu pregunta\n\n**Solución:** Ve a **Indexación** para sincronizar o ajusta el umbral con ⚙️' })}\n\n`;
        yield `data: ${JSON.stringify({ type: 'done', method: 'semantic', tokensUsed: 0, provider: 'none', chunksUsed: 0 })}\n\n`;
        return;
      }

      // Emitir fuentes (chunks encontrados) - generar URL de Notion
      yield `data: ${JSON.stringify({
        type: 'sources',
        sources: chunks.map(c => ({
          id: c.pageId,
          title: c.pageTitle,
          notionUrl: `https://notion.so/${c.notionPageId.replace(/-/g, '')}`,
          similarity: c.similarity,
          excerpt: c.content.slice(0, 200)
        }))
      })}\n\n`;

      // Construir contexto
      const context = chunks
        .map(chunk => `## ${chunk.pageTitle}\n${chunk.content}`)
        .join('\n\n---\n\n');

      const systemPrompt = `Eres un asistente de conocimiento personal. Responde basándote ÚNICAMENTE en el siguiente contexto de documentos indexados:

${context}

Instrucciones:
- Responde en español
- Si la información no está en el contexto, di "No tengo información sobre eso en mis documentos indexados"
- Cita las fuentes cuando sea relevante
- Sé conciso pero completo`;

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: question }
      ];

      // Stream de respuesta
      for await (const chunk of aiClient.streamChat(messages)) {
        if (chunk.type === 'token' && chunk.content) {
          yield `data: ${JSON.stringify({ type: 'token', content: chunk.content })}\n\n`;
        } else if (chunk.type === 'done') {
          yield `data: ${JSON.stringify({
            type: 'done',
            method: 'semantic',
            tokensUsed: chunk.tokensUsed,
            provider: chunk.provider,
            chunksUsed: chunks.length
          })}\n\n`;
        } else if (chunk.type === 'error') {
          yield `data: ${JSON.stringify({ type: 'error', error: chunk.error })}\n\n`;
        }
      }

    } catch (error) {
      yield `data: ${JSON.stringify({ type: 'error', error: String(error) })}\n\n`;
    }
  })

  // ============ 🔄 Fase 11: Jobs Queue (Cola de Procesamiento) ============

  // Crear nuevo job (encolar video para procesamiento)
  .post('/jobs', async ({ body }) => {
    const { url, customPrompt, userId } = body as {
      url: string;
      customPrompt?: string;
      userId: string;
    };

    if (!url) {
      throw new Error('URL es requerida');
    }
    if (!userId) {
      throw new Error('userId es requerido');
    }

    // Validar que sea una URL de YouTube
    const platform = workerClient.detectPlatform(url);
    if (!platform) {
      throw new Error('URL no soportada. Solo YouTube e Instagram.');
    }

    const job = await jobProcessor.createJob({
      url,
      custom_prompt: customPrompt,
      user_id: userId
    });

    return {
      success: true,
      job,
      message: 'Video encolado para procesamiento'
    };
  })

  // Listar jobs del usuario
  .get('/jobs', async ({ query }) => {
    const userId = query.userId as string;
    const limit = parseInt(query.limit as string) || 50;

    if (!userId) {
      throw new Error('userId es requerido');
    }

    const jobs = await jobProcessor.getJobsByUser(userId, limit);
    const stats = await jobProcessor.getJobStats(userId);

    return {
      success: true,
      jobs,
      stats,
      count: jobs.length
    };
  })

  // Obtener estadísticas de jobs
  .get('/jobs/stats', async ({ query }) => {
    const userId = query.userId as string;

    if (!userId) {
      throw new Error('userId es requerido');
    }

    const stats = await jobProcessor.getJobStats(userId);

    return {
      success: true,
      stats,
      processorRunning: jobProcessor.isProcessorRunning()
    };
  })

  // Obtener job específico
  .get('/jobs/:id', async ({ params, query }) => {
    const { id } = params;
    const userId = query.userId as string;

    const job = await jobProcessor.getJobById(id);

    if (!job) {
      throw new Error('Job no encontrado');
    }

    // Verificar que el job pertenece al usuario
    if (userId && job.user_id !== userId) {
      throw new Error('No tienes acceso a este job');
    }

    return {
      success: true,
      job
    };
  })

  // Eliminar job
  .delete('/jobs/:id', async ({ params, query }) => {
    const { id } = params;
    const userId = query.userId as string;

    // Verificar propiedad antes de eliminar
    const job = await jobProcessor.getJobById(id);
    if (!job) {
      throw new Error('Job no encontrado');
    }
    if (userId && job.user_id !== userId) {
      throw new Error('No tienes acceso a este job');
    }

    await jobProcessor.deleteJob(id);

    return {
      success: true,
      message: 'Job eliminado'
    };
  })

  // Detener todos los jobs atascados (Emergency Reset)
  .post('/jobs/stop-all', async ({ query }) => {
    const userId = query.userId as string;

    if (!userId) {
      throw new Error('userId es requerido');
    }

    // Necesitamos lógica en jobProcessor para esto
    const count = await jobProcessor.resetStuckJobs(userId);

    return {
      success: true,
      count,
      message: `${count} jobs detenidos y marcados como fallidos.`
    };
  })

  // Reintentar job fallido
  .post('/jobs/:id/retry', async ({ params, query }) => {
    const { id } = params;
    const userId = query.userId as string;

    const job = await jobProcessor.getJobById(id);
    if (!job) {
      throw new Error('Job no encontrado');
    }
    if (userId && job.user_id !== userId) {
      throw new Error('No tienes acceso a este job');
    }
    if (job.status !== 'failed') {
      throw new Error('Solo se pueden reintentar jobs fallidos');
    }

    const updatedJob = await jobProcessor.retryJob(id);

    return {
      success: true,
      job: updatedJob,
      message: 'Job reencolado para procesamiento'
    };
  })

  // Guardar borrador del job (sin enviar a Notion)
  .patch('/jobs/:id/draft', async ({ params, body }) => {
    const { id } = params;
    const { title, markdown, categoryNames, userId } = body as {
      title?: string;
      markdown?: string;
      categoryNames?: string[];
      userId?: string;
    };

    const job = await jobProcessor.getJobById(id);
    if (!job) {
      throw new Error('Job no encontrado');
    }
    if (userId && job.user_id !== userId) {
      throw new Error('No tienes acceso a este job');
    }
    if (job.status !== 'ready') {
      throw new Error('Solo se pueden editar jobs listos');
    }

    // Actualizar el borrador
    const updatedJob = await jobProcessor.updateJobDraft(id, {
      video_title: title,
      summary_markdown: markdown,
      draft_categories: categoryNames
    });

    return {
      success: true,
      job: updatedJob,
      message: 'Borrador guardado correctamente'
    };
  })

  // Guardar job en Notion
  .post('/jobs/:id/save', async ({ params, body }) => {
    const { id } = params;
    const { title, markdown, tags, categoryNames, userId } = body as {
      title: string;
      markdown: string;
      tags: string[];
      categoryNames?: string[];
      userId?: string;
    };

    if (!title || !markdown) {
      throw new Error('title y markdown son requeridos');
    }

    const job = await jobProcessor.getJobById(id);
    if (!job) {
      throw new Error('Job no encontrado');
    }
    if (userId && job.user_id !== userId) {
      throw new Error('No tienes acceso a este job');
    }
    if (job.status !== 'ready') {
      throw new Error('El job no está listo para guardar');
    }

    if (!notionClient.isReady()) {
      throw new Error('Notion no está configurado');
    }

    const result = await jobProcessor.saveJobToNotion(id, {
      title,
      markdown,
      tags: tags || [],
      categoryNames
    }, notionClient);

    return {
      success: true,
      notionPageId: result.notionPageId,
      message: 'Contenido guardado en Notion'
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

// Iniciar el procesador de jobs en segundo plano
jobProcessor.start();

console.log(`
🧠 ═══════════════════════════════════════════════════
   Hybrid Brain API
   Running at: http://${app.server?.hostname}:${app.server?.port}
   Worker URL: ${WORKER_URL}
   Job Processor: ${jobProcessor.isProcessorRunning() ? '✅ Running' : '⚠️ Not Started'}
═══════════════════════════════════════════════════ 🧠
`);

export type App = typeof app;

