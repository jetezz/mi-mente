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
          // Tags mapeado a 'tags'
          tags: {
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

  // ================== FASE 8: Markdown to Notion ==================

  /**
   * Crea una página desde contenido Markdown
   * Convierte Markdown a bloques de Notion
   */
  async createPageFromMarkdown(options: {
    title: string;
    markdown: string;
    categoryNames?: string[];
    tags?: string[];
    sourceUrl?: string;
  }): Promise<string | null> {
    if (!this.client || !this.isConfigured) {
      console.warn('Notion no está configurado');
      return null;
    }

    try {
      const blocks = this.markdownToNotionBlocks(options.markdown);

      // Añadir callout con fuente si existe
      if (options.sourceUrl) {
        blocks.push({
          object: 'block',
          type: 'divider',
          divider: {},
        });
        blocks.push({
          object: 'block',
          type: 'callout',
          callout: {
            icon: { emoji: '🔗' },
            rich_text: [
              { text: { content: 'Fuente: ' } },
              {
                text: {
                  content: options.sourceUrl,
                  link: { url: options.sourceUrl }
                },
              },
            ],
            color: 'blue_background',
          },
        });
      }

      const response = await this.client.pages.create({
        parent: { database_id: this.databaseId },
        icon: { type: 'emoji', emoji: '📝' },
        properties: {
          Name: {
            title: [{ text: { content: options.title } }],
          },
          ...(options.categoryNames && options.categoryNames.length > 0 ? {
            categoria: {
              multi_select: options.categoryNames.map(name => ({ name })),
            },
          } : {}),
          ...(options.tags && options.tags.length > 0 ? {
            tags: {
              multi_select: options.tags.map(tag => ({ name: tag })),
            },
          } : {}),
        } as any, // Cast to any to avoid strict type checks if types are outdated
        children: blocks as any,
      });

      console.log(`✅ Página creada desde Markdown: ${response.id}`);
      return response.id;

    } catch (error) {
      console.error('❌ Error creando página desde Markdown:', error);
      throw error;
    }
  }

  /**
   * Convierte Markdown a bloques de Notion
   * Soporta: headings, bullets, numbered lists, code blocks, paragraphs
   */
  private markdownToNotionBlocks(markdown: string): any[] {
    const blocks: any[] = [];
    const lines = markdown.split('\n');

    let inCodeBlock = false;
    let codeContent = '';
    let codeLanguage = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Skip empty lines (except in code blocks)
      if (!inCodeBlock && trimmedLine === '') {
        continue;
      }

      // Code block start/end
      if (trimmedLine.startsWith('```')) {
        if (!inCodeBlock) {
          // Start code block
          inCodeBlock = true;
          codeLanguage = trimmedLine.slice(3).trim() || 'plain text';
          codeContent = '';
        } else {
          // End code block
          inCodeBlock = false;
          blocks.push({
            object: 'block',
            type: 'code',
            code: {
              rich_text: [{ text: { content: codeContent.trim() } }],
              language: this.mapCodeLanguage(codeLanguage),
            },
          });
          codeContent = '';
          codeLanguage = '';
        }
        continue;
      }

      // Inside code block
      if (inCodeBlock) {
        codeContent += line + '\n';
        continue;
      }

      // Heading 1
      if (trimmedLine.startsWith('# ')) {
        blocks.push({
          object: 'block',
          type: 'heading_1',
          heading_1: {
            rich_text: this.parseRichText(trimmedLine.slice(2)),
          },
        });
        continue;
      }

      // Heading 2
      if (trimmedLine.startsWith('## ')) {
        blocks.push({
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: this.parseRichText(trimmedLine.slice(3)),
          },
        });
        continue;
      }

      // Heading 3
      if (trimmedLine.startsWith('### ')) {
        blocks.push({
          object: 'block',
          type: 'heading_3',
          heading_3: {
            rich_text: this.parseRichText(trimmedLine.slice(4)),
          },
        });
        continue;
      }

      // Horizontal rule
      if (trimmedLine === '---' || trimmedLine === '***' || trimmedLine === '___') {
        blocks.push({
          object: 'block',
          type: 'divider',
          divider: {},
        });
        continue;
      }

      // Bulleted list
      if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        blocks.push({
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: this.parseRichText(trimmedLine.slice(2)),
          },
        });
        continue;
      }

      // Numbered list
      const numberedMatch = trimmedLine.match(/^(\d+)\.\s+(.+)/);
      if (numberedMatch) {
        blocks.push({
          object: 'block',
          type: 'numbered_list_item',
          numbered_list_item: {
            rich_text: this.parseRichText(numberedMatch[2]),
          },
        });
        continue;
      }

      // Blockquote
      if (trimmedLine.startsWith('> ')) {
        blocks.push({
          object: 'block',
          type: 'quote',
          quote: {
            rich_text: this.parseRichText(trimmedLine.slice(2)),
          },
        });
        continue;
      }

      // Default: paragraph
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: this.parseRichText(trimmedLine),
        },
      });
    }

    return blocks;
  }

  /**
   * Parsea texto con formato inline (bold, italic, code)
   */
  private parseRichText(text: string): any[] {
    const segments: any[] = [];
    let remaining = text;

    // Regex patterns for inline formatting
    const patterns = [
      { regex: /\*\*(.+?)\*\*/g, annotation: 'bold' },
      { regex: /__(.+?)__/g, annotation: 'bold' },
      { regex: /\*(.+?)\*/g, annotation: 'italic' },
      { regex: /_(.+?)_/g, annotation: 'italic' },
      { regex: /`(.+?)`/g, annotation: 'code' },
    ];

    // Simple approach: find all matches and replace
    // For now, just return plain text with basic bold/italic/code detection

    // Parse inline code first
    const codeRegex = /`([^`]+)`/g;
    let lastIndex = 0;
    let match;

    while ((match = codeRegex.exec(remaining)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        segments.push(...this.parseFormattedText(remaining.slice(lastIndex, match.index)));
      }
      // Add code
      segments.push({
        text: { content: match[1] },
        annotations: { code: true },
      });
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < remaining.length) {
      segments.push(...this.parseFormattedText(remaining.slice(lastIndex)));
    }

    // If no segments, just return plain text
    if (segments.length === 0) {
      return [{ text: { content: text } }];
    }

    return segments;
  }

  /**
   * Parsea bold e italic
   */
  private parseFormattedText(text: string): any[] {
    if (!text) return [];

    const segments: any[] = [];

    // Match **bold** or __bold__
    const boldRegex = /\*\*([^*]+)\*\*|__([^_]+)__/g;
    let lastIndex = 0;
    let match;

    while ((match = boldRegex.exec(text)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        segments.push(...this.parseItalic(text.slice(lastIndex, match.index)));
      }
      // Add bold text
      const content = match[1] || match[2];
      segments.push({
        text: { content },
        annotations: { bold: true },
      });
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      segments.push(...this.parseItalic(text.slice(lastIndex)));
    }

    if (segments.length === 0) {
      return [{ text: { content: text } }];
    }

    return segments;
  }

  /**
   * Parsea italic
   */
  private parseItalic(text: string): any[] {
    if (!text) return [];

    const segments: any[] = [];

    // Match *italic* or _italic_ (single)
    const italicRegex = /\*([^*]+)\*|_([^_]+)_/g;
    let lastIndex = 0;
    let match;

    while ((match = italicRegex.exec(text)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        const before = text.slice(lastIndex, match.index);
        if (before) segments.push({ text: { content: before } });
      }
      // Add italic text
      const content = match[1] || match[2];
      segments.push({
        text: { content },
        annotations: { italic: true },
      });
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      const remaining = text.slice(lastIndex);
      if (remaining) segments.push({ text: { content: remaining } });
    }

    if (segments.length === 0 && text) {
      return [{ text: { content: text } }];
    }

    return segments;
  }

  /**
   * Mapea lenguaje de código a formato Notion
   */
  private mapCodeLanguage(lang: string): string {
    const langMap: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'py': 'python',
      'rb': 'ruby',
      'sh': 'bash',
      'shell': 'bash',
      'yml': 'yaml',
      'md': 'markdown',
      'json': 'json',
      'html': 'html',
      'css': 'css',
      'sql': 'sql',
      'java': 'java',
      'c': 'c',
      'cpp': 'c++',
      'go': 'go',
      'rust': 'rust',
      'swift': 'swift',
      'kotlin': 'kotlin',
      'php': 'php',
    };

    const normalized = lang.toLowerCase();
    return langMap[normalized] || normalized || 'plain text';
  }
}

// Singleton
export const notionClient = new NotionClient();
