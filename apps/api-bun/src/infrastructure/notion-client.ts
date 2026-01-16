/**
 * Notion Client Service
 * Maneja la conexión y operaciones con Notion API
 */
import { Client } from '@notionhq/client';
import type { Note } from '../domain/entities';

export class NotionClient {
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
      this.client = new Client({ auth: apiKey });
      this.databaseId = databaseId;
      this.isConfigured = true;
      console.log('📝 Notion Client inicializado');
    } else {
      console.warn('⚠️ Notion no configurado. Añade NOTION_API_KEY y NOTION_DATABASE_ID al .env');
    }
  }

  /**
   * Verifica si Notion está configurado
   */
  isReady(): boolean {
    return this.isConfigured && this.client !== null;
  }

  /**
   * Crea una nueva página en la base de datos de Notion
   */
  async createNote(note: Note): Promise<string | null> {
    if (!this.client || !this.isConfigured) {
      console.warn('Notion no está configurado, nota no guardada');
      return null;
    }

    try {
      const response = await this.client.pages.create({
        parent: { database_id: this.databaseId },
        icon: {
          type: 'emoji',
          emoji: '🧠',
        },
        properties: {
          // Título (Cambiado de 'Title' a 'Name' que es el estándar/default)
          Name: {
            title: [
              {
                text: { content: note.title },
              },
            ],
          },
          // Tags mapeado a 'categoria' (como en notion-reader.ts)
          categoria: {
            multi_select: note.tags.map(tag => ({ name: tag })),
          },
          // Las propiedades Sentiment, URL y Date se han eliminado porque la API retorna que no existen.
          // Esta información ya se está incluyendo en el cuerpo de la página en buildPageContent().
        },
        // Contenido de la página
        children: this.buildPageContent(note),
      });

      const pageId = response.id;
      console.log(`✅ Página creada en Notion: ${pageId}`);
      return pageId;

    } catch (error) {
      console.error('❌ Error creando página en Notion:', error);
      throw error;
    }
  }

  /**
   * Construye el contenido de la página con formato rico
   */
  private buildPageContent(note: Note): any[] {
    const blocks: any[] = [];

    // Resumen con header
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ text: { content: '📋 Resumen' } }],
      },
    });

    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ text: { content: note.summary } }],
      },
    });

    // Divider
    blocks.push({
      object: 'block',
      type: 'divider',
      divider: {},
    });

    // Puntos Clave
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ text: { content: '💡 Puntos Clave' } }],
      },
    });

    // Lista de puntos clave
    for (const point of note.keyPoints) {
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{ text: { content: point } }],
        },
      });
    }

    // Divider
    blocks.push({
      object: 'block',
      type: 'divider',
      divider: {},
    });

    // Metadata
    blocks.push({
      object: 'block',
      type: 'heading_3',
      heading_3: {
        rich_text: [{ text: { content: '📊 Metadata' } }],
      },
    });

    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          { text: { content: 'Sentimiento: ' }, annotations: { bold: true } },
          { text: { content: this.getSentimentEmoji(note.sentiment) + ' ' + note.sentiment } },
        ],
      },
    });

    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          { text: { content: 'Procesado: ' }, annotations: { bold: true } },
          { text: { content: new Date().toLocaleString('es-ES') } },
        ],
      },
    });

    // Callout con link al contenido original
    blocks.push({
      object: 'block',
      type: 'callout',
      callout: {
        icon: { emoji: '🔗' },
        rich_text: [
          { text: { content: 'Fuente: ' } },
          {
            text: {
              content: note.originalUrl,
              link: { url: note.originalUrl }
            },
          },
        ],
        color: 'blue_background',
      },
    });

    return blocks;
  }

  /**
   * Obtiene emoji según el sentimiento
   */
  private getSentimentEmoji(sentiment: 'positive' | 'negative' | 'neutral'): string {
    switch (sentiment) {
      case 'positive': return '😊';
      case 'negative': return '😟';
      default: return '😐';
    }
  }

  /**
   * Obtiene una página por ID
   */
  async getPage(pageId: string): Promise<any | null> {
    if (!this.client) return null;

    try {
      return await this.client.pages.retrieve({ page_id: pageId });
    } catch (error) {
      console.error('Error obteniendo página:', error);
      return null;
    }
  }

  /**
   * Lista las últimas notas de la base de datos
   */
  async listNotes(limit: number = 10): Promise<any[]> {
    if (!this.client || !this.isConfigured) {
      return [];
    }

    try {
      const response = await this.client.databases.query({
        database_id: this.databaseId,
        page_size: limit,
        sorts: [
          {
            timestamp: 'last_edited_time',
            direction: 'descending',
          },
        ],
      });

      return response.results;
    } catch (error) {
      console.error('Error listando notas:', error);
      return [];
    }
  }

  /**
   * Verifica la conexión con Notion
   */
  async healthCheck(): Promise<{ status: string; database?: string }> {
    if (!this.client || !this.isConfigured) {
      return { status: 'not_configured' };
    }

    try {
      const database = await this.client.databases.retrieve({
        database_id: this.databaseId,
      });

      return {
        status: 'connected',
        database: (database as any).title?.[0]?.plain_text || 'Unknown',
      };
    } catch (error) {
      return { status: 'error' };
    }
  }
}

// Singleton
export const notionClient = new NotionClient();
