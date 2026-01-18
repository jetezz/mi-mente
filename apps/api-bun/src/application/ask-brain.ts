/**
 * Ask Brain Use Case
 * Caso de uso principal para el sistema RAG
 * 
 * Flujo:
 * 1. Recibe pregunta + categoryId (opcional)
 * 2. Resuelve categorías hijas (Supabase)
 * 3. Recupera páginas relevantes de Notion
 * 4. Construye contexto y ejecuta prompt
 * 5. Retorna respuesta con fuentes
 */

import { aiClient } from '../infrastructure/ai-client';
import { notionReader } from '../infrastructure/notion-reader';
import { supabaseService } from '../infrastructure/supabase-client';
import { settingsService } from './settings-service';

interface AskRequest {
  question: string;
  categoryId?: string;        // ID de categoría específica
  categoryName?: string;      // O nombre directo para usar sin Supabase
  maxSources?: number;        // Máximo de páginas a consultar (default: 5)
}

interface Source {
  id: string;
  title: string;
  url: string;
  category?: string;
}

interface AskResponse {
  answer: string;
  sources: Source[];
  metadata: {
    tokensUsed: number;
    provider: string;
    contextLength: number;
    processingTimeMs: number;
  };
}

export class AskBrainUseCase {
  private readonly MAX_CONTEXT_CHARS = 30000; // ~7500 tokens aprox


  /**
   * Ejecuta la consulta RAG
   */
  async execute(request: AskRequest): Promise<AskResponse> {
    const startTime = Date.now();
    const maxSources = request.maxSources || await settingsService.get('search.max_sources', 5);

    console.log(`\n🧠 Ask Brain: "${request.question.slice(0, 50)}..."`);

    // ============ PASO 1: Resolver categorías ============
    let categoryNames: string[] = [];

    if (request.categoryName) {
      // Usar nombre directo
      categoryNames = [request.categoryName];
    } else if (request.categoryId) {
      // Obtener categoría y descendientes desde Supabase
      const categoryIds = await supabaseService.getCategoryWithDescendants(request.categoryId);

      // Obtener nombres de las categorías para filtrar en Notion
      const allCategories = await supabaseService.getAllCategories();
      categoryNames = allCategories
        .filter(c => categoryIds.includes(c.id))
        .map(c => c.name);

      console.log(`   📁 Categorías incluidas: ${categoryNames.join(', ')}`);
    }

    // ============ PASO 2: Recuperar páginas de Notion ============
    let pages;

    if (categoryNames.length > 0) {
      pages = await notionReader.getPagesByCategories(categoryNames, maxSources);
    } else {
      // Sin categoría: buscar en todas las páginas
      pages = await notionReader.getAllPages(maxSources);
    }

    if (pages.length === 0) {
      return {
        answer: 'No encontré información relevante en tu base de conocimiento. Asegúrate de haber procesado contenido en esta categoría.',
        sources: [],
        metadata: {
          tokensUsed: 0,
          provider: 'none',
          contextLength: 0,
          processingTimeMs: Date.now() - startTime,
        },
      };
    }

    console.log(`   📄 Páginas encontradas: ${pages.length}`);

    // ============ PASO 3: Construir contexto ============
    const context = this.buildContext(pages);
    const sources: Source[] = pages.map(p => ({
      id: p.id,
      title: p.title,
      url: p.url,
      category: p.categories?.[0],
    }));

    console.log(`   📝 Contexto: ${context.length} caracteres`);

    // ============ PASO 4: Generar respuesta con IA ============
    const systemPrompt = await this.buildSystemPrompt(categoryNames);
    const userPrompt = this.buildUserPrompt(request.question, context);

    const aiResponse = await aiClient.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    const processingTimeMs = Date.now() - startTime;
    console.log(`   ✅ Respuesta generada en ${processingTimeMs} ms`);

    return {
      answer: aiResponse.content,
      sources,
      metadata: {
        tokensUsed: aiResponse.tokensUsed,
        provider: aiResponse.provider,
        contextLength: context.length,
        processingTimeMs,
      },
    };
  }

  /**
   * Obtiene solo el contexto y prompts (usado para streaming)
   * No ejecuta la IA, solo prepara los datos
   */
  async getContext(request: AskRequest): Promise<{
    sources: Source[];
    systemPrompt: string;
    userPrompt: string;
    contextLength: number;
  }> {
    const maxSources = request.maxSources || await settingsService.get('search.max_sources', 5);

    // Resolver categorías
    let categoryNames: string[] = [];

    if (request.categoryName) {
      categoryNames = [request.categoryName];
    } else if (request.categoryId) {
      const categoryIds = await supabaseService.getCategoryWithDescendants(request.categoryId);
      const allCategories = await supabaseService.getAllCategories();
      categoryNames = allCategories
        .filter(c => categoryIds.includes(c.id))
        .map(c => c.name);
    }

    // Recuperar páginas
    let pages;
    if (categoryNames.length > 0) {
      pages = await notionReader.getPagesByCategories(categoryNames, maxSources);
    } else {
      pages = await notionReader.getAllPages(maxSources);
    }

    const context = this.buildContext(pages);
    const sources: Source[] = pages.map(p => ({
      id: p.id,
      title: p.title,
      url: p.url,
      category: p.categories?.[0],
    }));

    return {
      sources,
      systemPrompt: await this.buildSystemPrompt(categoryNames),
      userPrompt: this.buildUserPrompt(request.question, context),
      contextLength: context.length,
    };
  }

  /**
   * Construye el contexto concatenando el contenido de las páginas
   */
  private buildContext(pages: { title: string; content: string; category?: string }[]): string {
    let context = '';

    for (const page of pages) {
      const pageSection = `
  === ${page.title} ${page.category ? `[${page.category}]` : ''} ===
    ${page.content}
`;

      // Verificar límite de contexto
      if ((context + pageSection).length > this.MAX_CONTEXT_CHARS) {
        console.log(`   ⚠️ Contexto truncado(límite: ${this.MAX_CONTEXT_CHARS} chars)`);
        break;
      }

      context += pageSection;
    }

    return context.trim();
  }

  /**
   * System prompt optimizado para RAG
   */
  private async buildSystemPrompt(categoryNames: string[]): Promise<string> {
    const categoryContext = categoryNames.length > 0
      ? `El usuario está preguntando específicamente sobre: ${categoryNames.join(', ')}.`
      : 'El usuario está preguntando sobre cualquier tema de su base de conocimiento.';

    const defaultPrompt = `Eres un asistente experto que responde preguntas basándose EXCLUSIVAMENTE en el contexto proporcionado.

  ${categoryContext}

REGLAS IMPORTANTES:
1. SOLO usa información del contexto proporcionado
2. Si la información no está en el contexto, di "No tengo información sobre eso en tu base de conocimiento"
3. Cita los títulos de las fuentes cuando sea relevante: "Según [Título de la página]..."
4. Responde en español
5. Sé conciso pero completo
6. Si hay información contradictoria, menciona ambas perspectivas
7. Formatea la respuesta con Markdown cuando sea útil(listas, negritas, etc.)`;

    return await settingsService.get('ai.prompt.rag', defaultPrompt);
  }

  /**
   * User prompt con el contexto y la pregunta
   */
  private buildUserPrompt(question: string, context: string): string {
    return `CONTEXTO DE TU BASE DE CONOCIMIENTO:
---
  ${context}
---

  PREGUNTA: ${question}

Responde basándote ÚNICAMENTE en el contexto anterior.`;
  }

  /**
   * Método para chat continuo (mantiene historial)
   */
  async continueChat(
    question: string,
    history: { role: 'user' | 'assistant'; content: string }[],
    categoryId?: string
  ): Promise<AskResponse> {
    const startTime = Date.now();

    // Obtener contexto si es la primera pregunta o si cambia la categoría
    let categoryNames: string[] = [];
    if (categoryId) {
      const categoryIds = await supabaseService.getCategoryWithDescendants(categoryId);
      const allCategories = await supabaseService.getAllCategories();
      categoryNames = allCategories
        .filter(c => categoryIds.includes(c.id))
        .map(c => c.name);
    }

    // Obtener páginas relevantes
    const pages = categoryNames.length > 0
      ? await notionReader.getPagesByCategories(categoryNames, 3)
      : await notionReader.getAllPages(3);

    const context = this.buildContext(pages);
    const sources: Source[] = pages.map(p => ({
      id: p.id,
      title: p.title,
      url: p.url,
      category: p.categories?.[0],
    }));

    // Construir mensajes con historial
    const messages = [
      { role: 'system' as const, content: await this.buildSystemPrompt(categoryNames) },
      { role: 'user' as const, content: `CONTEXTO: \n${context} \n-- -\nRecuerda responder SOLO con base en este contexto.` },
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user' as const, content: question },
    ];

    const aiResponse = await aiClient.chat(messages);

    return {
      answer: aiResponse.content,
      sources,
      metadata: {
        tokensUsed: aiResponse.tokensUsed,
        provider: aiResponse.provider,
        contextLength: context.length,
        processingTimeMs: Date.now() - startTime,
      },
    };
  }
}

// Singleton
export const askBrainUseCase = new AskBrainUseCase();
