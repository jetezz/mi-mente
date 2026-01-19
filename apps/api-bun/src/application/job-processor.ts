/**
 * Job Processor Service
 * Procesa jobs de video en segundo plano
 */

import { supabaseService } from '../infrastructure/supabase-client';
import { workerClient } from '../infrastructure/worker-client';
import { aiClient } from '../infrastructure/ai-client';
import type { ProcessingJob, CreateJobInput, UpdateJobInput, SaveJobToNotionInput } from '../domain/processing-job';

const POLL_INTERVAL = 5000; // 5 segundos
const MAX_RETRIES = 3;
const WORKER_ID = `worker-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// Helper para obtener el cliente admin
function getSupabase() {
  const client = supabaseService.getAdminClient();
  if (!client) {
    throw new Error('Supabase Admin no está configurado');
  }
  return client;
}

class JobProcessor {
  private isRunning = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  /**
   * Inicia el procesador en segundo plano
   */
  start(): void {
    if (this.isRunning) {
      console.log('⚠️ [JobProcessor] Ya está ejecutándose');
      return;
    }

    if (!supabaseService.isAdminReady()) {
      console.warn('⚠️ [JobProcessor] Supabase Admin no configurado, no se iniciará el procesador');
      return;
    }

    this.isRunning = true;
    console.log(`🚀 [JobProcessor] Iniciado (Worker ID: ${WORKER_ID})`);

    // Ejecutar inmediatamente y luego cada POLL_INTERVAL
    this.tick();
    this.intervalId = setInterval(() => this.tick(), POLL_INTERVAL);
  }

  /**
   * Detiene el procesador
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🛑 [JobProcessor] Detenido');
  }

  /**
   * Un ciclo de procesamiento
   */
  private async tick(): Promise<void> {
    if (!this.isRunning) return;

    try {
      const job = await this.getNextPendingJob();
      if (job) {
        console.log(`📋 [JobProcessor] Procesando job: ${job.id}`);
        await this.processJob(job);
      }
    } catch (error) {
      console.error('❌ [JobProcessor] Error en tick:', error);
    }
  }

  /**
   * Obtiene el siguiente job pendiente (usa función SQL atómica)
   */
  private async getNextPendingJob(): Promise<ProcessingJob | null> {
    try {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .rpc('get_next_pending_job', { p_worker_id: WORKER_ID });

      if (error) {
        console.error('❌ [JobProcessor] Error obteniendo job:', error);
        return null;
      }

      if (!data || data.length === 0) {
        return null;
      }

      // Obtener el job completo
      const { data: fullJob, error: fetchError } = await supabase
        .from('processing_jobs')
        .select('*')
        .eq('id', data[0].id)
        .single();

      if (fetchError) {
        console.error('❌ [JobProcessor] Error obteniendo job completo:', fetchError);
        return null;
      }

      return fullJob as ProcessingJob;
    } catch (error) {
      console.error('❌ [JobProcessor] Error en getNextPendingJob:', error);
      return null;
    }
  }

  /**
   * Procesa un job completo
   */
  private async processJob(job: ProcessingJob): Promise<void> {
    const supabase = getSupabase();

    try {
      // Paso 1: Descargar y transcribir
      await this.updateJob(job.id, {
        status: 'downloading',
        progress: 10,
        current_step: 'Descargando audio del video...'
      });

      // Obtener info del video primero
      try {
        const videoInfo = await workerClient.getVideoInfo(job.url);
        if (videoInfo) {
          await this.updateJob(job.id, {
            video_title: videoInfo.title,
            video_thumbnail: videoInfo.thumbnail || undefined,
            video_duration: videoInfo.duration,
            progress: 20
          });
        }
      } catch (infoError) {
        console.warn('⚠️ [JobProcessor] No se pudo obtener info del video:', infoError);
      }

      // Transcribir
      await this.updateJob(job.id, {
        status: 'transcribing',
        progress: 30,
        current_step: 'Transcribiendo audio con Whisper...'
      });

      const transcription = await workerClient.transcribe(job.url);

      await this.updateJob(job.id, {
        transcription: transcription.text,
        progress: 50,
        current_step: 'Transcripción completada'
      });

      // Paso 2: Generar resumen
      await this.updateJob(job.id, {
        status: 'summarizing',
        progress: 60,
        current_step: 'Generando resumen con IA...'
      });

      // Generar resumen (con streaming interno)
      let summary = '';
      const summaryStream = aiClient.streamSummarize(transcription.text, job.custom_prompt);
      for await (const token of summaryStream) {
        if (token.type === 'token' && token.content) {
          summary += token.content;
        }
      }

      await this.updateJob(job.id, {
        summary_markdown: summary,
        progress: 75,
        current_step: 'Resumen generado'
      });

      // Paso 3: Generar puntos clave
      await this.updateJob(job.id, {
        progress: 80,
        current_step: 'Extrayendo puntos clave...'
      });

      const keyPoints = await aiClient.extractKeyPoints(transcription.text);

      await this.updateJob(job.id, {
        key_points: keyPoints,
        progress: 90,
        current_step: 'Generando etiquetas...'
      });

      // Paso 4: Generar tags
      const tags = await aiClient.generateTags(transcription.text);

      // Paso 5: Marcar como listo (actualizar directamente para incluir completed_at)
      await supabase
        .from('processing_jobs')
        .update({
          ai_tags: tags,
          status: 'ready',
          progress: 100,
          current_step: 'Procesamiento completado',
          completed_at: new Date().toISOString()
        })
        .eq('id', job.id);

      console.log(`✅ [JobProcessor] Job completado: ${job.id}`);

    } catch (error) {
      console.error(`❌ [JobProcessor] Error procesando job ${job.id}:`, error);

      const newRetryCount = (job.retry_count || 0) + 1;
      const shouldRetry = newRetryCount < MAX_RETRIES;

      // Actualizar job con error
      await supabase
        .from('processing_jobs')
        .update({
          status: shouldRetry ? 'pending' : 'failed',
          error_message: String(error),
          progress: 0,
          current_step: shouldRetry
            ? `Reintentando (${newRetryCount}/${MAX_RETRIES})...`
            : 'Procesamiento fallido',
          retry_count: newRetryCount
        })
        .eq('id', job.id);
    }
  }

  /**
   * Actualiza un job en la base de datos
   */
  private async updateJob(jobId: string, updates: UpdateJobInput): Promise<void> {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('processing_jobs')
        .update(updates)
        .eq('id', jobId);

      if (error) {
        console.error(`❌ [JobProcessor] Error actualizando job ${jobId}:`, error);
      }
    } catch (error) {
      console.error(`❌ [JobProcessor] Error en updateJob:`, error);
    }
  }

  // ============ Métodos públicos para la API ============

  /**
   * Crea un nuevo job en la cola
   */
  async createJob(input: CreateJobInput): Promise<ProcessingJob> {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('processing_jobs')
      .insert({
        user_id: input.user_id,
        url: input.url,
        custom_prompt: input.custom_prompt,
        status: 'pending',
        progress: 0,
        current_step: 'En cola, esperando procesamiento...'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Error creando job: ${error.message}`);
    }

    console.log(`📝 [JobProcessor] Nuevo job creado: ${data.id}`);
    return data as ProcessingJob;
  }

  /**
   * Obtiene todos los jobs de un usuario
   */
  async getJobsByUser(userId: string, limit = 50): Promise<ProcessingJob[]> {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('processing_jobs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Error obteniendo jobs: ${error.message}`);
    }

    return (data || []) as ProcessingJob[];
  }

  /**
   * Obtiene un job por ID
   */
  async getJobById(jobId: string): Promise<ProcessingJob | null> {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('processing_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No encontrado
      throw new Error(`Error obteniendo job: ${error.message}`);
    }

    return data as ProcessingJob;
  }

  /**
   * Elimina un job
   */
  async deleteJob(jobId: string): Promise<void> {
    const supabase = getSupabase();

    const { error } = await supabase
      .from('processing_jobs')
      .delete()
      .eq('id', jobId);

    if (error) {
      throw new Error(`Error eliminando job: ${error.message}`);
    }

    console.log(`🗑️ [JobProcessor] Job eliminado: ${jobId}`);
  }

  /**
   * Reintenta un job fallido
   */
  async retryJob(jobId: string): Promise<ProcessingJob> {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('processing_jobs')
      .update({
        status: 'pending',
        progress: 0,
        current_step: 'En cola para reintentar...',
        error_message: null,
        started_at: null,
        completed_at: null
      })
      .eq('id', jobId)
      .select()
      .single();

    if (error) {
      throw new Error(`Error reintentando job: ${error.message}`);
    }

    console.log(`🔄 [JobProcessor] Job reencolado: ${jobId}`);
    return data as ProcessingJob;
  }

  /**
   * Actualiza el borrador de un job (sin guardar en Notion)
   */
  async updateJobDraft(jobId: string, updates: {
    video_title?: string;
    summary_markdown?: string;
    draft_categories?: string[];
  }): Promise<ProcessingJob> {
    const supabase = getSupabase();

    // Preparar los campos a actualizar (solo los que vienen definidos)
    const updateData: Record<string, any> = {};

    if (updates.video_title !== undefined) {
      updateData.video_title = updates.video_title;
    }
    if (updates.summary_markdown !== undefined) {
      updateData.summary_markdown = updates.summary_markdown;
    }
    if (updates.draft_categories !== undefined) {
      // Guardamos las categorías en un campo JSON temporal
      updateData.draft_categories = updates.draft_categories;
    }

    const { data, error } = await supabase
      .from('processing_jobs')
      .update(updateData)
      .eq('id', jobId)
      .select()
      .single();

    if (error) {
      throw new Error(`Error guardando borrador: ${error.message}`);
    }

    console.log(`📝 [JobProcessor] Borrador guardado: ${jobId}`);
    return data as ProcessingJob;
  }

  /**
   * Guarda un job en Notion y lo marca como saved
   */
  async saveJobToNotion(
    jobId: string,
    input: SaveJobToNotionInput,
    notionClientInstance: any
  ): Promise<{ notionPageId: string }> {
    const job = await this.getJobById(jobId);
    if (!job) {
      throw new Error('Job no encontrado');
    }

    if (job.status !== 'ready') {
      throw new Error('El job no está listo para guardar');
    }

    // Crear página en Notion
    const notionPageId = await notionClientInstance.createPageFromMarkdown({
      title: input.title,
      markdown: input.markdown,
      tags: input.tags,
      categoryNames: input.categoryNames,
      sourceUrl: job.url
    });

    // Marcar job como guardado
    const supabase = getSupabase();
    await supabase
      .from('processing_jobs')
      .update({
        status: 'saved',
        notion_page_id: notionPageId,
        saved_at: new Date().toISOString()
      })
      .eq('id', jobId);

    console.log(`💾 [JobProcessor] Job guardado en Notion: ${jobId} -> ${notionPageId}`);

    return { notionPageId };
  }

  /**
   * Obtiene estadísticas de jobs de un usuario
   */
  async getJobStats(userId: string): Promise<{
    total: number;
    pending: number;
    processing: number;
    ready: number;
    saved: number;
    failed: number;
  }> {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .rpc('get_job_stats', { p_user_id: userId });

    if (error) {
      throw new Error(`Error obteniendo estadísticas: ${error.message}`);
    }

    const stats = data?.[0] || {};
    return {
      total: Number(stats.total_jobs) || 0,
      pending: Number(stats.pending_count) || 0,
      processing: Number(stats.processing_count) || 0,
      ready: Number(stats.ready_count) || 0,
      saved: Number(stats.saved_count) || 0,
      failed: Number(stats.failed_count) || 0
    };
  }

  /**
   * Verifica si el procesador está funcionando
   */
  isProcessorRunning(): boolean {
    return this.isRunning;
  }
}

// Singleton
export const jobProcessor = new JobProcessor();
