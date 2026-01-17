/**
 * Notion Indexer Service
 * Pipeline de indexación offline para el motor de búsqueda semántica
 * Fase 6: Notion → Texto → Chunking → Embeddings → Supabase
 */

import { notionReader } from '../infrastructure/notion-reader';
import { embeddingClient } from '../infrastructure/embedding-client';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface ChunkData {
  content: string;
  tokenCount: number;
}

interface IndexedPage {
  id: string;
  notionPageId: string;
  title: string;
  categoryId?: string;
  chunksCount: number;
}

interface IndexingResult {
  success: boolean;
  pagesIndexed: number;
  pagesDeleted: number;
  chunksCreated: number;
  errors: string[];
  duration: number;
}

interface IndexingStats {
  totalPages: number;
  totalChunks: number;
  lastIndexedAt: string | null;
  categoriesIndexed: number;
}

export class NotionIndexer {
  private supabase: SupabaseClient | null = null;
  private readonly CHUNK_SIZE = 500; // tokens aproximados
  private readonly CHUNK_OVERLAP = 50; // tokens de solapamiento
  private readonly BATCH_SIZE = 5; // Páginas a procesar en paralelo

  constructor() {
    this.initializeSupabase();
  }

  private initializeSupabase() {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;
    const anonKey = process.env.SUPABASE_ANON_KEY;

    if (url && serviceKey) {
      // Priorizar service_role key para bypass RLS
      this.supabase = createClient(url, serviceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
      console.log('📦 Notion Indexer inicializado con Supabase (service_role - bypass RLS)');
    } else if (url && anonKey) {
      // Fallback a anon key (no funcionará para escrituras con RLS)
      this.supabase = createClient(url, anonKey);
      console.warn('⚠️ Notion Indexer usando anon key - las escrituras pueden fallar por RLS');
      console.warn('   → Añade SUPABASE_SERVICE_KEY al .env para operaciones de indexación');
    } else {
      console.warn('⚠️ Notion Indexer: Supabase no configurado');
    }
  }

  /**
   * Verifica si el indexador está listo
   */
  isReady(): boolean {
    return this.supabase !== null && notionReader.isReady() && embeddingClient.isReady();
  }

  /**
   * Ejecuta la indexación completa de todas las páginas de Notion
   */
  async indexAll(userId: string): Promise<IndexingResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let pagesIndexed = 0;
    let pagesDeleted = 0;
    let chunksCreated = 0;

    console.log('\n📥 Iniciando indexación completa de Notion...');

    if (!this.isReady()) {
      return {
        success: false,
        pagesIndexed: 0,
        pagesDeleted: 0,
        chunksCreated: 0,
        errors: ['El indexador no está configurado correctamente'],
        duration: 0,
      };
    }

    try {
      // Obtener todas las páginas de Notion
      const pages = await notionReader.getAllPages(100);
      console.log(`   📄 Encontradas ${pages.length} páginas en Notion`);

      // Procesar en lotes
      for (let i = 0; i < pages.length; i += this.BATCH_SIZE) {
        const batch = pages.slice(i, i + this.BATCH_SIZE);
        console.log(`   🔄 Procesando lote ${Math.floor(i / this.BATCH_SIZE) + 1}/${Math.ceil(pages.length / this.BATCH_SIZE)}`);

        const results = await Promise.allSettled(
          batch.map(page => this.indexPage(userId, page))
        );

        for (const result of results) {
          if (result.status === 'fulfilled') {
            if (result.value.deleted) {
              pagesDeleted++;
            } else {
              pagesIndexed++;
              chunksCreated += result.value.chunksCount;
            }
          } else {
            errors.push(result.reason?.message || 'Error desconocido');
          }
        }
      }

      const duration = Date.now() - startTime;
      console.log(`\n✅ ✨ Indexación completada: ${pagesIndexed} páginas indexadas, ${pagesDeleted} eliminadas, ${chunksCreated} chunks en ${duration}ms`);

      return {
        success: errors.length === 0,
        pagesIndexed,
        pagesDeleted,
        chunksCreated,
        errors,
        duration,
      };

    } catch (error) {
      return {
        success: false,
        pagesIndexed,
        pagesDeleted,
        chunksCreated,
        errors: [...errors, String(error)],
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Indexa una página específica
   */
  async indexPage(
    userId: string,
    page: { id: string; title: string; content: string; categories?: string[]; tags?: string[]; lastEdited: string }
  ): Promise<IndexedPage & { deleted?: boolean }> {
    if (!this.supabase) {
      throw new Error('Supabase no configurado');
    }

    console.log(`   📝 Indexando: "${page.title}"`);

    try {
      // 1. Normalizar contenido
      const normalizedContent = this.normalizeContent(page.content);

      if (normalizedContent.length < 50) {
        console.log(`   🗑️ Contenido muy corto, archivando en Notion y limpiando índice: "${page.title}"`);

        // 1. Archivar en Notion (Eliminar de origen)
        await notionReader.archivePage(page.id);

        // 2. Limpiar del índice local si existía previamente
        await this.supabase
          .from('notion_pages')
          .delete()
          .eq('user_id', userId)
          .eq('notion_page_id', page.id);

        return { id: '', notionPageId: page.id, title: page.title, chunksCount: 0, deleted: true };
      }

      // 2. Dividir en chunks
      const chunks = this.splitIntoChunks(normalizedContent);
      console.log(`   📦 Generados ${chunks.length} chunks`);

      // 3. Generar embeddings
      const chunkTexts = chunks.map(c => c.content);
      const embeddingResponse = await embeddingClient.embed(chunkTexts);

      // 4. Resolver y crear categorías
      let categoryId: string | null = null;
      if (page.categories && page.categories.length > 0) {
        // Procesar todas las categorías encontradas
        for (const [index, categoryName] of page.categories.entries()) {
          // 4.1. Buscar si existe
          const { data: categories } = await this.supabase
            .from('categories')
            .select('id')
            .eq('name', categoryName)
            .eq('user_id', userId)
            .limit(1);

          let currentCatId: string;

          if (categories && categories.length > 0) {
            currentCatId = categories[0].id;
          } else {
            // 4.2. Crear categoría si no existe
            console.log(`   📁 Creando nueva categoría: "${categoryName}"`);
            const { data: newCategory, error: catError } = await this.supabase
              .from('categories')
              .insert({
                user_id: userId,
                name: categoryName
              })
              .select('id')
              .single();

            if (catError) {
              console.error(`Error creando categoría "${categoryName}":`, catError);
              continue;
            }
            currentCatId = newCategory.id;
          }

          // Asignar la primera categoría como la principal para la página
          if (index === 0) {
            categoryId = currentCatId;
          }
        }
      }

      // 5. Upsert en notion_pages
      const { data: upsertedPage, error: pageError } = await this.supabase
        .from('notion_pages')
        .upsert({
          user_id: userId,
          notion_page_id: page.id,
          title: page.title,
          category_id: categoryId,
          summary: normalizedContent.slice(0, 500), // Primeros 500 chars como resumen
          last_edited_time: page.lastEdited,
          indexed_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,notion_page_id',
        })
        .select('id')
        .single();

      if (pageError) {
        throw new Error(`Error upserting page: ${pageError.message}`);
      }

      const pageDbId = upsertedPage.id;

      // 5.1. Gestionar Tags (NUEVO)
      if (page.tags && page.tags.length > 0) {
        // Limpiar relaciones antiguas (opcional, pero seguro para sincronización)
        await this.supabase
          .from('page_tags')
          .delete()
          .eq('page_id', pageDbId);

        for (const tagName of page.tags) {
          // A. Buscar Tag existente
          const { data: existingTags } = await this.supabase
            .from('tags')
            .select('id')
            .eq('name', tagName)
            .eq('user_id', userId)
            .limit(1);

          let tagId: string;

          if (existingTags && existingTags.length > 0) {
            tagId = existingTags[0].id;
          } else {
            // B. Crear Tag si no existe
            console.log(`   🏷️ Creando nuevo tag: "${tagName}"`);
            const { data: newTag, error: tagError } = await this.supabase
              .from('tags')
              .insert({
                user_id: userId,
                name: tagName,
                color: '#8B5CF6' // Default color
              })
              .select('id')
              .single();

            if (tagError) {
              console.error(`Error calculando tag "${tagName}":`, tagError);
              continue;
            }
            tagId = newTag.id;
          }

          // C. Crear relación en page_tags
          const { error: relError } = await this.supabase
            .from('page_tags')
            .insert({
              page_id: pageDbId,
              tag_id: tagId
            });

          if (relError) {
            console.error(`Error enlazando tag "${tagName}" a página:`, relError);
          }
        }
      }

      // 6. Eliminar chunks antiguos de esta página
      await this.supabase
        .from('notion_page_chunks')
        .delete()
        .eq('page_id', pageDbId);

      // 7. Insertar nuevos chunks
      const chunkRecords = chunks.map((chunk, index) => ({
        page_id: pageDbId,
        chunk_index: index,
        content: chunk.content,
        embedding: embeddingResponse.embeddings[index],
        token_count: chunk.tokenCount,
      }));

      const { error: chunksError } = await this.supabase
        .from('notion_page_chunks')
        .insert(chunkRecords);

      if (chunksError) {
        throw new Error(`Error inserting chunks: ${chunksError.message}`);
      }

      return {
        id: pageDbId,
        notionPageId: page.id,
        title: page.title,
        categoryId: categoryId || undefined,
        chunksCount: chunks.length,
      };

    } catch (error) {
      console.error(`   ❌ Error indexando "${page.title}":`, error);
      throw error;
    }
  }


  /**
   * Indexa una página por su ID de Notion
   */
  async indexPageById(userId: string, notionPageId: string): Promise<IndexedPage | null> {
    const content = await notionReader.getPageContent(notionPageId);

    if (!content) {
      throw new Error(`No se pudo obtener contenido de la página ${notionPageId}`);
    }

    // Obtener metadata de la página
    const pages = await notionReader.getAllPages(100);
    const page = pages.find(p => p.id === notionPageId);

    if (!page) {
      throw new Error(`Página ${notionPageId} no encontrada`);
    }

    return this.indexPage(userId, page);
  }

  /**
   * Normaliza el contenido para indexación
   * - Elimina espacios excesivos
   * - Limpia caracteres especiales problemáticos
   * - Mantiene estructura legible
   */
  private normalizeContent(content: string): string {
    return content
      // Normalizar saltos de línea
      .replace(/\r\n/g, '\n')
      // Eliminar líneas vacías múltiples
      .replace(/\n{3,}/g, '\n\n')
      // Eliminar espacios al inicio/final de líneas
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      // Eliminar caracteres de control
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .trim();
  }

  /**
   * Divide el texto en chunks con solapamiento
   */
  private splitIntoChunks(text: string): ChunkData[] {
    const chunks: ChunkData[] = [];

    // Aproximación: 1 token ≈ 4 caracteres en español
    const charsPerToken = 4;
    const chunkChars = this.CHUNK_SIZE * charsPerToken;
    const overlapChars = this.CHUNK_OVERLAP * charsPerToken;

    // Dividir por párrafos primero para mantener coherencia
    const paragraphs = text.split(/\n\n+/);
    let currentChunk = '';
    let currentTokens = 0;

    for (const paragraph of paragraphs) {
      const paragraphTokens = Math.ceil(paragraph.length / charsPerToken);

      // Si el párrafo cabe en el chunk actual
      if (currentTokens + paragraphTokens <= this.CHUNK_SIZE) {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        currentTokens += paragraphTokens;
      } else {
        // Guardar chunk actual si tiene contenido
        if (currentChunk.length > 0) {
          chunks.push({
            content: currentChunk,
            tokenCount: currentTokens,
          });
        }

        // Si el párrafo es muy largo, dividirlo
        if (paragraphTokens > this.CHUNK_SIZE) {
          const subChunks = this.splitLongParagraph(paragraph);
          chunks.push(...subChunks);
          currentChunk = '';
          currentTokens = 0;
        } else {
          // Empezar nuevo chunk con solapamiento
          const overlap = currentChunk.slice(-overlapChars);
          currentChunk = overlap + '\n\n' + paragraph;
          currentTokens = Math.ceil(currentChunk.length / charsPerToken);
        }
      }
    }

    // No olvidar el último chunk
    if (currentChunk.length > 0) {
      chunks.push({
        content: currentChunk,
        tokenCount: Math.ceil(currentChunk.length / charsPerToken),
      });
    }

    return chunks;
  }

  /**
   * Divide un párrafo largo en chunks más pequeños
   */
  private splitLongParagraph(paragraph: string): ChunkData[] {
    const chunks: ChunkData[] = [];
    const charsPerToken = 4;
    const chunkChars = this.CHUNK_SIZE * charsPerToken;
    const overlapChars = this.CHUNK_OVERLAP * charsPerToken;

    // Dividir por oraciones
    const sentences = paragraph.split(/(?<=[.!?])\s+/);
    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length <= chunkChars) {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      } else {
        if (currentChunk.length > 0) {
          chunks.push({
            content: currentChunk,
            tokenCount: Math.ceil(currentChunk.length / charsPerToken),
          });
        }
        // Solapamiento
        currentChunk = currentChunk.slice(-overlapChars) + ' ' + sentence;
      }
    }

    if (currentChunk.length > 0) {
      chunks.push({
        content: currentChunk,
        tokenCount: Math.ceil(currentChunk.length / charsPerToken),
      });
    }

    return chunks;
  }

  /**
   * Obtiene estadísticas de indexación
   */
  async getStats(userId: string): Promise<IndexingStats> {
    if (!this.supabase) {
      return {
        totalPages: 0,
        totalChunks: 0,
        lastIndexedAt: null,
        categoriesIndexed: 0,
      };
    }

    try {
      // Usar la función SQL para contadores masivos (más rápido)
      const { data: rpcData } = await this.supabase
        .rpc('get_indexing_stats', { p_user_id: userId });

      const stats = rpcData?.[0] || {};

      // Obtener conteo real de categorías (la RPC solo cuenta las enlazadas)
      const { count: categoryCount } = await this.supabase
        .from('categories')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      return {
        totalPages: stats.total_pages || 0,
        totalChunks: stats.total_chunks || 0,
        lastIndexedAt: stats.last_indexed_at || null,
        categoriesIndexed: categoryCount || 0, // Usar conteo directo
      };

    } catch (error) {
      console.error('Error obteniendo stats:', error);

      // Fallback manual
      const { count: pageCount } = await this.supabase
        .from('notion_pages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      const { count: chunkCount } = await this.supabase
        .from('notion_page_chunks')
        .select('*', { count: 'exact', head: true });

      return {
        totalPages: pageCount || 0,
        totalChunks: chunkCount || 0,
        lastIndexedAt: null,
        categoriesIndexed: 0,
      };
    }
  }

  /**
   * Lista las páginas indexadas
   */
  async getIndexedPages(userId: string, limit: number = 50): Promise<{
    id: string;
    notionPageId: string;
    title: string;
    category: string | null;
    chunksCount: number;
    indexedAt: string;
  }[]> {
    if (!this.supabase) return [];

    const { data: pages, error } = await this.supabase
      .from('notion_pages')
      .select(`
        id,
        notion_page_id,
        title,
        category_id,
        indexed_at,
        categories (name)
      `)
      .eq('user_id', userId)
      .order('indexed_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error listando páginas indexadas:', error);
      return [];
    }

    // Contar chunks por página
    const result = await Promise.all(
      (pages || []).map(async (page: any) => {
        const { count } = await this.supabase!
          .from('notion_page_chunks')
          .select('*', { count: 'exact', head: true })
          .eq('page_id', page.id);

        return {
          id: page.id,
          notionPageId: page.notion_page_id,
          title: page.title,
          category: page.categories?.name || null,
          chunksCount: count || 0,
          indexedAt: page.indexed_at,
        };
      })
    );

    return result;
  }

  /**
   * Elimina una página del índice
   */
  async deletePage(pageId: string): Promise<boolean> {
    if (!this.supabase) return false;

    const { error } = await this.supabase
      .from('notion_pages')
      .delete()
      .eq('id', pageId);

    return !error;
  }

  /**
   * Detecta páginas que han cambiado desde la última indexación
   */
  async detectChanges(userId: string): Promise<{
    new: string[];
    modified: string[];
    deleted: string[];
  }> {
    if (!this.supabase) {
      return { new: [], modified: [], deleted: [] };
    }

    // Obtener páginas actuales de Notion
    const notionPages = await notionReader.getAllPages(100);

    // Obtener páginas indexadas
    const { data: indexedPages } = await this.supabase
      .from('notion_pages')
      .select('notion_page_id, last_edited_time')
      .eq('user_id', userId);

    const indexedMap = new Map(
      (indexedPages || []).map(p => [p.notion_page_id, p.last_edited_time])
    );

    const newPages: string[] = [];
    const modifiedPages: string[] = [];
    const notionPageIds = new Set<string>();

    for (const page of notionPages) {
      notionPageIds.add(page.id);

      if (!indexedMap.has(page.id)) {
        newPages.push(page.id);
      } else {
        const lastIndexed = indexedMap.get(page.id);
        if (lastIndexed && new Date(page.lastEdited) > new Date(lastIndexed)) {
          modifiedPages.push(page.id);
        }
      }
    }

    // Páginas eliminadas de Notion pero aún indexadas
    const deletedPages = [...indexedMap.keys()].filter(id => !notionPageIds.has(id));

    return {
      new: newPages,
      modified: modifiedPages,
      deleted: deletedPages,
    };
  }

  /**
   * Realiza indexación incremental (solo cambios)
   */
  async indexIncremental(userId: string): Promise<IndexingResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let pagesIndexed = 0;
    let pagesDeleted = 0;
    let chunksCreated = 0;

    console.log('\n📥 Iniciando indexación incremental...');

    try {
      const changes = await this.detectChanges(userId);
      console.log(`   📊 Cambios detectados: ${changes.new.length} nuevas, ${changes.modified.length} modificadas, ${changes.deleted.length} eliminadas`);

      const pagesToIndex = [...changes.new, ...changes.modified];

      if (pagesToIndex.length === 0 && changes.deleted.length === 0) {
        console.log('   ✅ No hay cambios pendientes');
        return {
          success: true,
          pagesIndexed: 0,
          pagesDeleted: 0,
          chunksCreated: 0,
          errors: [],
          duration: Date.now() - startTime,
        };
      }

      // Obtener todas las páginas de Notion
      const allPages = await notionReader.getAllPages(100);

      // Indexar nuevas y modificadas
      for (const pageId of pagesToIndex) {
        const page = allPages.find(p => p.id === pageId);
        if (page) {
          try {
            const result = await this.indexPage(userId, page);
            if (result.deleted) {
              pagesDeleted++;
            } else {
              pagesIndexed++;
              chunksCreated += result.chunksCount;
            }
          } catch (error) {
            errors.push(`${pageId}: ${String(error)}`);
          }
        }
      }

      // Eliminar páginas que ya no existen en Notion
      if (this.supabase) {
        for (const deletedId of changes.deleted) {
          await this.supabase
            .from('notion_pages')
            .delete()
            .eq('notion_page_id', deletedId)
            .eq('user_id', userId);
          pagesDeleted++;
        }
      }

      return {
        success: errors.length === 0,
        pagesIndexed,
        pagesDeleted,
        chunksCreated,
        errors,
        duration: Date.now() - startTime,
      };

    } catch (error) {
      return {
        success: false,
        pagesIndexed,
        pagesDeleted,
        chunksCreated,
        errors: [...errors, String(error)],
        duration: Date.now() - startTime,
      };
    }
  }
}

// Singleton
export const notionIndexer = new NotionIndexer();
