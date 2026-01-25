/**
 * Worker Client Service
 * Maneja la comunicación con el Worker de Python
 */
import type { WorkerTranscribeResponse } from '../domain/entities';

interface WorkerVideoInfo {
  id: string;
  title: string;
  duration: number;
  channel: string;
  upload_date?: string;
  thumbnail?: string;
}

interface WorkerHealthResponse {
  status: string;
  service: string;
  whisper_loaded: boolean;
  whisper_model: string;
}

export class WorkerClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.WORKER_URL || 'http://localhost:8000';
    console.log(`🔧 Worker Client inicializado: ${this.baseUrl}`);
  }

  /**
   * Verifica el estado del Worker
   */
  async healthCheck(): Promise<WorkerHealthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);

      if (!response.ok) {
        throw new Error(`Worker health check failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error en Worker health check:', error);
      throw error;
    }
  }

  /**
   * Obtiene información de un video sin descargarlo
   */
  async getVideoInfo(url: string): Promise<WorkerVideoInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/video/info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || `Error obteniendo info: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error obteniendo video info:', error);
      throw error;
    }
  }

  /**
   * Transcribe un video/audio de YouTube
   */
  async transcribe(
    url: string,
    options?: {
      language?: string;
      includeTimestamps?: boolean;
    }
  ): Promise<WorkerTranscribeResponse> {
    console.log(`📥 Iniciando transcripción: ${url}`);

    try {
      // Configurar un timeout largo (1 hora) para videos largos
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3600000); // 1 hora

      const response = await fetch(`${this.baseUrl}/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          platform: 'youtube',
          language: options?.language || null,
          include_timestamps: options?.includeTimestamps ?? true,
        }),
        signal: controller.signal, // Añadimos la señal de abortar
      }).finally(() => clearTimeout(timeoutId)); // Limpiamos el timeout al terminar

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || `Error en transcripción: ${response.status}`);
      }

      const data = await response.json();

      console.log(`✅ Transcripción completada: ${data.word_count} palabras en ${data.processing_time}s`);

      // Mapear a la interfaz esperada
      return {
        success: data.success,
        text: data.text,
        segments: data.segments,
        language: data.language,
        duration: data.duration,
        wordCount: data.word_count,
        videoInfo: {
          id: data.video_info.id,
          title: data.video_info.title,
          duration: data.video_info.duration,
          channel: data.video_info.channel,
        },
        processingTime: data.processing_time,
      };

    } catch (error) {
      console.error('Error en transcripción:', error);
      throw error;
    }
  }

  /**
   * Pre-carga el modelo de Whisper en el Worker
   */
  async preloadModel(modelName?: string): Promise<{ status: string; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/model/load`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_name: modelName }),
      });

      if (!response.ok) {
        throw new Error(`Error cargando modelo: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error pre-cargando modelo:', error);
      throw error;
    }
  }

  /**
   * Verifica si una URL es soportada
   */
  isYoutubeUrl(url: string): boolean {
    const patterns = [
      'youtube.com/watch',
      'youtu.be/',
      'youtube.com/shorts/',
      'youtube.com/live/'
    ];
    return patterns.some(p => url.includes(p));
  }

  isInstagramUrl(url: string): boolean {
    return url.includes('instagram.com');
  }

  detectPlatform(url: string): 'youtube' | 'instagram' | null {
    if (this.isYoutubeUrl(url)) return 'youtube';
    if (this.isInstagramUrl(url)) return 'instagram';
    return null;
  }
}

// Singleton
export const workerClient = new WorkerClient();
