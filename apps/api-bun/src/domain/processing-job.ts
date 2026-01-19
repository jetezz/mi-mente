/**
 * Processing Job Types
 * Tipos para el sistema de cola de procesamiento en segundo plano
 */

export type JobStatus =
  | 'pending'
  | 'downloading'
  | 'transcribing'
  | 'summarizing'
  | 'ready'
  | 'saved'
  | 'failed';

export interface ProcessingJob {
  id: string;
  user_id: string;

  // Input
  url: string;
  custom_prompt?: string;

  // Status
  status: JobStatus;
  progress: number;
  current_step?: string;
  error_message?: string;

  // Video metadata
  video_title?: string;
  video_thumbnail?: string;
  video_duration?: number;

  // Processing output
  transcription?: string;
  summary_markdown?: string;
  key_points?: string[];
  ai_tags?: string[];

  // Notion
  notion_page_id?: string;
  category_id?: string;
  draft_categories?: string[]; // Categorías seleccionadas en borrador

  // Timestamps
  created_at: string;
  started_at?: string;
  completed_at?: string;
  saved_at?: string;

  // Metadata
  retry_count: number;
  worker_id?: string;
}

export interface CreateJobInput {
  url: string;
  custom_prompt?: string;
  user_id: string;
}

export interface UpdateJobInput {
  status?: JobStatus;
  progress?: number;
  current_step?: string;
  error_message?: string;
  video_title?: string;
  video_thumbnail?: string;
  video_duration?: number;
  transcription?: string;
  summary_markdown?: string;
  key_points?: string[];
  ai_tags?: string[];
  notion_page_id?: string;
  category_id?: string;
}

export interface SaveJobToNotionInput {
  markdown: string;
  title: string;
  tags: string[];
  categoryNames?: string[];
}

export interface JobStats {
  total_jobs: number;
  pending_count: number;
  processing_count: number;
  ready_count: number;
  saved_count: number;
  failed_count: number;
}

export const JOB_STATUS_CONFIG: Record<JobStatus, {
  label: string;
  icon: string;
  color: string;
  progressRange: [number, number];
}> = {
  pending: {
    label: 'En cola',
    icon: '⏳',
    color: 'text-gray-400',
    progressRange: [0, 0]
  },
  downloading: {
    label: 'Descargando',
    icon: '📥',
    color: 'text-blue-400',
    progressRange: [5, 30]
  },
  transcribing: {
    label: 'Transcribiendo',
    icon: '🎧',
    color: 'text-purple-400',
    progressRange: [30, 60]
  },
  summarizing: {
    label: 'Resumiendo',
    icon: '🤖',
    color: 'text-orange-400',
    progressRange: [60, 95]
  },
  ready: {
    label: 'Listo',
    icon: '✅',
    color: 'text-green-400',
    progressRange: [100, 100]
  },
  saved: {
    label: 'Guardado',
    icon: '💾',
    color: 'text-emerald-400',
    progressRange: [100, 100]
  },
  failed: {
    label: 'Error',
    icon: '❌',
    color: 'text-red-400',
    progressRange: [0, 100]
  }
};
