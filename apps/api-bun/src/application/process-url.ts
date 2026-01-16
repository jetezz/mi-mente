/**
 * Use Case: Process URL
 * Flujo completo: URL -> Transcripción -> IA Processing -> Notion
 */
import type { Note, ProcessingJob, AIProcessingResult } from '../domain/entities';
import { workerClient } from '../infrastructure/worker-client';
import { aiClient } from '../infrastructure/ai-client';
import { notionClient } from '../infrastructure/notion-client';

export interface ProcessUrlInput {
  url: string;
  language?: string;
  saveToNotion?: boolean;
  onProgress?: (job: ProcessingJob) => void;
}

export interface ProcessUrlOutput {
  success: boolean;
  note?: Note;
  error?: string;
  processingTime: number;
}

export class ProcessUrlUseCase {
  /**
   * Ejecuta el flujo completo de procesamiento
   */
  async execute(input: ProcessUrlInput): Promise<ProcessUrlOutput> {
    const startTime = Date.now();
    const jobId = crypto.randomUUID();

    // Estado inicial del job
    const job: ProcessingJob = {
      id: jobId,
      url: input.url,
      status: 'processing',
      currentStep: 'downloading',
      progress: 0,
      createdAt: new Date(),
    };

    const updateProgress = (step: ProcessingJob['currentStep'], progress: number) => {
      job.currentStep = step;
      job.progress = progress;
      input.onProgress?.(job);
    };

    try {
      // === Paso 1: Verificar plataforma ===
      const platform = workerClient.detectPlatform(input.url);
      if (!platform) {
        throw new Error('URL no soportada. Solo YouTube e Instagram.');
      }

      if (platform === 'instagram') {
        throw new Error('Instagram aún no está soportado.');
      }

      // === Paso 2: Transcribir ===
      updateProgress('transcribing', 10);
      console.log('🎙️ Paso 1/5: Transcribiendo...');

      const transcription = await workerClient.transcribe(input.url, {
        language: input.language,
        includeTimestamps: true,
      });

      if (!transcription.success || !transcription.text) {
        throw new Error('Error en la transcripción');
      }

      updateProgress('summarizing', 30);
      console.log('📝 Paso 2/5: Generando resumen...');

      // === Paso 3: Procesar con IA ===
      const aiResult = await this.processWithAI(transcription.text);

      updateProgress('completed', 90);

      // === Paso 4: Crear nota ===
      const note: Note = {
        id: crypto.randomUUID(),
        transcriptId: transcription.videoInfo.id,
        title: transcription.videoInfo.title,
        summary: aiResult.summary,
        keyPoints: aiResult.keyPoints,
        tags: aiResult.tags,
        sentiment: aiResult.sentiment,
        originalUrl: input.url,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // === Paso 5: Guardar en Notion (opcional) ===
      if (input.saveToNotion !== false && notionClient.isReady()) {
        updateProgress('saving_to_notion', 95);
        console.log('💾 Paso 5/5: Guardando en Notion...');

        try {
          const notionPageId = await notionClient.createNote(note);
          if (notionPageId) {
            note.notionPageId = notionPageId;
          }
        } catch (notionError) {
          console.error('⚠️ Error guardando en Notion (continuando):', notionError);
          // No lanzar error, la nota ya está procesada
        }
      }

      // === Completado ===
      updateProgress('completed', 100);

      const processingTime = (Date.now() - startTime) / 1000;
      console.log(`✅ Procesamiento completado en ${processingTime.toFixed(2)}s`);

      job.status = 'completed';
      job.result = note;
      job.completedAt = new Date();
      input.onProgress?.(job);

      return {
        success: true,
        note,
        processingTime,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

      console.error('❌ Error en procesamiento:', errorMessage);

      job.status = 'failed';
      job.error = errorMessage;
      input.onProgress?.(job);

      return {
        success: false,
        error: errorMessage,
        processingTime: (Date.now() - startTime) / 1000,
      };
    }
  }

  /**
   * Procesa el texto con IA para extraer información
   */
  private async processWithAI(text: string): Promise<AIProcessingResult> {
    console.log('🤖 Procesando con IA...');

    // Ejecutar todas las tareas de IA en paralelo para mayor velocidad
    const [summary, keyPoints, tags, sentiment] = await Promise.all([
      aiClient.summarize(text),
      aiClient.extractKeyPoints(text),
      aiClient.generateTags(text),
      aiClient.analyzeSentiment(text),
    ]);

    return {
      summary,
      keyPoints,
      tags,
      sentiment,
      tokensUsed: 0, // TODO: Agregar tracking
      provider: 'mixed', // Puede variar por Round-Robin
    };
  }

  /**
   * Obtiene preview de un video antes de procesar
   */
  async getPreview(url: string) {
    const platform = workerClient.detectPlatform(url);

    if (!platform) {
      throw new Error('URL no soportada');
    }

    if (platform === 'youtube') {
      return await workerClient.getVideoInfo(url);
    }

    throw new Error('Preview no disponible para esta plataforma');
  }
}

// Singleton
export const processUrlUseCase = new ProcessUrlUseCase();
