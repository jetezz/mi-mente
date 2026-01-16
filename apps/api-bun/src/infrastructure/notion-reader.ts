/**
 * Notion Reader Service
 * Servicio especializado para LEER contenido de Notion (crucial para RAG)
 * Separado del notion-client para mantener responsabilidades claras
 */
import { Client } from '@notionhq/client';
import type {
  BlockObjectResponse,
  RichTextItemResponse,
  PageObjectResponse,
  PartialPageObjectResponse
} from '@notionhq/client/build/src/api-endpoints';

interface NotionPageContent {
  id: string;
  title: string;
  url: string;
  categories: string[];
  content: string; // Markdown plano para el LLM
  lastEdited: string;
}

export class NotionReader {
  private client: Client | null = null;
  private databaseId: string = '';
  private isConfigured: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    const apiKey = process.env.NOTION_API_KEY;
    const databaseId = process.env.NOTION_DATABASE_ID;

    if (apiKey && databaseId) {
      this.client = new Client({ auth: apiKey.trim() });
      this.databaseId = databaseId.trim();
      this.isConfigured = true;
      console.log('📖 Notion Reader inicializado');
    } else {
      console.warn('⚠️ Notion Reader NO configurado - verificar NOTION_API_KEY y NOTION_DATABASE_ID');
    }
  }

  isReady(): boolean {
    return this.isConfigured && this.client !== null;
  }

  /**
   * Health check para verificar conexión con Notion
   */
  /**
   * Health check para verificar conexión con Notion
   */
  async healthCheck(): Promise<{ status: string; database?: string; pageCount?: number; error?: string }> {
    if (!this.client || !this.isConfigured) {
      return {
        status: 'not_configured',
        error: 'Faltan NOTION_API_KEY o NOTION_DATABASE_ID'
      };
    }

    try {
      // Intentar obtener la base de datos
      const database = await this.client.databases.retrieve({
        database_id: this.databaseId,
      });

      const dbTitle = (database as any).title?.[0]?.plain_text || 'Sin título';

      return {
        status: 'connected',
        database: dbTitle
      };
    } catch (error: any) {
      console.error('❌ Error en Notion health check:', error?.message || error);
      return {
        status: 'error',
        error: error?.message || 'Error de conexión con Notion'
      };
    }
  }

  /**
   * Busca páginas por categoría(s)
   * @param categoryIds - Array de IDs de categoría (de Supabase, mapeados a Notion via notion_sync_id)
   * @param categoryNames - Array de nombres de categoría para filtrar en Notion
   * @param limit - Máximo de páginas a retornar
   */
  async getPagesByCategories(categoryNames: string[], limit: number = 20): Promise<NotionPageContent[]> {
    if (!this.client || !this.isConfigured) {
      console.warn('Notion Reader no configurado');
      return [];
    }

    try {
      // Construir filtro OR para múltiples categorías
      const categoryFilters = categoryNames.map(name => ({
        property: 'categoria', // Nombre real en tu DB
        multi_select: { contains: name } // Tipo real en tu DB
      }));

      const databaseId = this.formatUuid(this.databaseId);
      console.log(`   🔍 Querying Notion DB (Fetch): ${databaseId} (Property: categoria)`);

      const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.client ? (this.client as any).auth || process.env.NOTION_API_KEY : process.env.NOTION_API_KEY}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          page_size: limit,
          filter: categoryFilters.length > 1
            ? { or: categoryFilters }
            : categoryFilters[0],
          sorts: [{ property: 'Name', direction: 'descending' }]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Notion API Error ${response.status}: ${errorText}`);
      }

      const data = await response.json() as { results: (PageObjectResponse | PartialPageObjectResponse)[] };
      const results = data.results;

      // Obtener contenido de cada página
      const pages: NotionPageContent[] = [];

      for (const page of results) {
        if ('properties' in page) {
          const content = await this.getPageContent(page.id);
          const title = this.extractTitle(page as PageObjectResponse);
          const categories = this.extractCategories(page as PageObjectResponse);

          pages.push({
            id: page.id,
            title,
            url: (page as PageObjectResponse).url,
            categories,
            content,
            lastEdited: page.last_edited_time,
          });
        }
      }

      return pages;
    } catch (error) {
      console.error('Error buscando páginas por categoría:', error);
      return [];
    }
  }

  /**
   * Obtiene todas las páginas (sin filtro de categoría)
   */
  async getAllPages(limit: number = 50): Promise<NotionPageContent[]> {
    if (!this.client || !this.isConfigured) {
      console.warn('⚠️ NotionReader no configurado, retornando vacío');
      return [];
    }

    try {
      console.log(`   📚 Consultando Notion DB: ${this.databaseId}`);

      const databaseId = this.formatUuid(this.databaseId);
      console.log(`   🔍 Querying Notion DB (Fetch): ${databaseId}`);

      const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NOTION_API_KEY?.trim()}`,
          'Notion-Version': '2022-06-28', // Versión estable reciente
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          page_size: limit,
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`   ❌ Notion API Error: ${response.status}`, errorText);
        return [];
      }

      const data = await response.json() as { results: (PageObjectResponse | PartialPageObjectResponse)[] };
      console.log(`   📄 Encontradas ${data.results.length} páginas en Notion`);

      const pages: NotionPageContent[] = [];

      for (const page of data.results) {
        if ('properties' in page) {
          try {
            const content = await this.getPageContent(page.id);
            const title = this.extractTitle(page as PageObjectResponse);
            const categories = this.extractCategories(page as PageObjectResponse);

            pages.push({
              id: page.id,
              title,
              url: (page as PageObjectResponse).url,
              categories,
              content,
              lastEdited: page.last_edited_time,
            });
          } catch (pageError) {
            console.error(`   ⚠️ Error leyendo página ${page.id}:`, pageError);
          }
        }
      }

      return pages;
    } catch (error) {
      console.error('❌ Error obteniendo páginas de Notion:', error);
      return [];
    }
  }

  /**
   * Lee el contenido completo de una página (todos los bloques)
   */
  async getPageContent(pageId: string): Promise<string> {
    if (!this.client) return '';

    try {
      const blocks = await this.client.blocks.children.list({
        block_id: pageId,
        page_size: 100, // Máximo de bloques
      });

      // Convertir bloques a Markdown plano
      return this.blocksToMarkdown(blocks.results as BlockObjectResponse[]);
    } catch (error) {
      console.error(`Error leyendo contenido de página ${pageId}:`, error);
      return '';
    }
  }

  /**
   * Convierte bloques de Notion a Markdown plano
   * Esto es crucial para que el LLM pueda procesar el contenido
   */
  private blocksToMarkdown(blocks: BlockObjectResponse[]): string {
    const lines: string[] = [];

    for (const block of blocks) {
      const text = this.extractBlockText(block);
      if (text) {
        lines.push(text);
      }
    }

    return lines.join('\n\n');
  }

  /**
   * Extrae texto de un bloque específico
   */
  private extractBlockText(block: BlockObjectResponse): string {
    const blockType = block.type;

    switch (blockType) {
      case 'paragraph':
        return this.richTextToPlain(block.paragraph.rich_text);

      case 'heading_1':
        return `# ${this.richTextToPlain(block.heading_1.rich_text)}`;

      case 'heading_2':
        return `## ${this.richTextToPlain(block.heading_2.rich_text)}`;

      case 'heading_3':
        return `### ${this.richTextToPlain(block.heading_3.rich_text)}`;

      case 'bulleted_list_item':
        return `• ${this.richTextToPlain(block.bulleted_list_item.rich_text)}`;

      case 'numbered_list_item':
        return `- ${this.richTextToPlain(block.numbered_list_item.rich_text)}`;

      case 'to_do':
        const checked = block.to_do.checked ? '✓' : '○';
        return `${checked} ${this.richTextToPlain(block.to_do.rich_text)}`;

      case 'toggle':
        return `► ${this.richTextToPlain(block.toggle.rich_text)}`;

      case 'quote':
        return `> ${this.richTextToPlain(block.quote.rich_text)}`;

      case 'callout':
        const emoji = block.callout.icon?.type === 'emoji'
          ? block.callout.icon.emoji + ' '
          : '';
        return `${emoji}${this.richTextToPlain(block.callout.rich_text)}`;

      case 'code':
        return `\`\`\`${block.code.language || ''}\n${this.richTextToPlain(block.code.rich_text)}\n\`\`\``;

      case 'divider':
        return '---';

      case 'bookmark':
        return `🔗 ${block.bookmark.url}`;

      case 'link_preview':
        return `🔗 ${block.link_preview.url}`;

      default:
        return '';
    }
  }

  /**
   * Convierte rich_text de Notion a texto plano
   */
  private richTextToPlain(richText: RichTextItemResponse[]): string {
    return richText.map(rt => rt.plain_text).join('');
  }

  /**
   * Extrae el título de una página
   */
  private extractTitle(page: PageObjectResponse): string {
    const titleProp = page.properties.Title || page.properties.title || page.properties.Name;

    if (titleProp && titleProp.type === 'title') {
      return titleProp.title.map(t => t.plain_text).join('');
    }

    return 'Sin título';
  }

  /**
   * Extrae las categorías de una página
   */
  private extractCategories(page: PageObjectResponse): string[] {
    // Buscar propiedad 'categoria' (minusculas, como en tu DB)
    const categoryProp = page.properties.categoria || page.properties.Category;

    if (categoryProp) {
      // Soporte para Multi-Select (Tu caso real)
      if (categoryProp.type === 'multi_select') {
        return categoryProp.multi_select.map(opt => opt.name);
      }
      // Soporte Legacy para Select
      if (categoryProp.type === 'select' && categoryProp.select) {
        return [categoryProp.select.name];
      }
    }

    return [];
  }

  /**
   * Busca páginas por texto (usando la búsqueda nativa de Notion)
   */
  async searchPages(query: string, limit: number = 10): Promise<NotionPageContent[]> {
    if (!this.client) return [];

    try {
      const response = await this.client.search({
        query,
        filter: { property: 'object', value: 'page' },
        page_size: limit,
        sort: { direction: 'descending', timestamp: 'last_edited_time' }
      });

      const pages: NotionPageContent[] = [];

      for (const result of response.results) {
        if ('properties' in result) {
          const page = result as PageObjectResponse;
          const content = await this.getPageContent(page.id);
          const title = this.extractTitle(page);

          pages.push({
            id: page.id,
            title,
            url: page.url,
            categories: [], // Search results might not fetch full properties initially
            content,
            lastEdited: page.last_edited_time,
          });
        }
      }

      return pages;
    } catch (error) {
      console.error('Error buscando páginas:', error);
      return [];
    }
  }
  /**
 * Asegura que el ID tenga formato UUID con guiones
 */
  private formatUuid(id: string): string {
    if (id.includes('-') || id.length !== 32) return id;

    return [
      id.substring(0, 8),
      id.substring(8, 12),
      id.substring(12, 16),
      id.substring(16, 20),
      id.substring(20)
    ].join('-');
  }

  /**
   * Archiva (elimina) una página de Notion
   */
  async archivePage(pageId: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      await this.client.pages.update({
        page_id: pageId,
        archived: true,
      });
      return true;
    } catch (error) {
      console.error(`Error archivando página ${pageId}:`, error);
      return false;
    }
  }
}


// Singleton
export const notionReader = new NotionReader();
