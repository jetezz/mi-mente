/**
 * Entity: Transcript
 * Representa la transcripción de un contenido multimedia
 */
export interface Transcript {
  id: string;
  url: string;
  platform: 'youtube' | 'instagram';
  title: string;
  channel?: string;
  duration: number;
  language: string;
  text: string;
  segments?: TranscriptSegment[];
  createdAt: Date;
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

/**
 * Entity: Note
 * Representa una nota procesada lista para guardar en Notion
 */
export interface Note {
  id: string;
  transcriptId: string;
  title: string;
  summary: string;
  keyPoints: string[];
  tags: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  originalUrl: string;
  notionPageId?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Entity: ProcessingJob
 * Representa el estado de un trabajo de procesamiento
 */
export interface ProcessingJob {
  id: string;
  url: string;
  status: ProcessingStatus;
  currentStep: ProcessingStep;
  progress: number; // 0-100
  error?: string;
  result?: Note;
  createdAt: Date;
  completedAt?: Date;
}

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type ProcessingStep =
  | 'downloading'
  | 'transcribing'
  | 'summarizing'
  | 'extracting_keypoints'
  | 'generating_tags'
  | 'saving_to_notion'
  | 'completed';

/**
 * Value Object: AI Response
 * Respuesta del servicio de IA
 */
export interface AIProcessingResult {
  summary: string;
  keyPoints: string[];
  tags: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  tokensUsed: number;
  provider: string;
}

/**
 * Value Object: Worker Response
 * Respuesta del Worker de Python
 */
export interface WorkerTranscribeResponse {
  success: boolean;
  text: string;
  segments?: TranscriptSegment[];
  language: string;
  duration: number;
  wordCount: number;
  videoInfo: {
    id: string;
    title: string;
    duration: number;
    channel: string;
  };
  processingTime: number;
}
