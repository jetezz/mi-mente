/**
 * useJobs Hook
 * Hook para gestionar jobs de procesamiento en segundo plano
 */

import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../lib/config';

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
  url: string;
  custom_prompt?: string;
  status: JobStatus;
  progress: number;
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
  draft_categories?: string[];
  created_at: string;
  started_at?: string;
  completed_at?: string;
  saved_at?: string;
  retry_count: number;
}

export interface JobStats {
  total: number;
  pending: number;
  processing: number;
  ready: number;
  saved: number;
  failed: number;
}

interface UseJobsResult {
  jobs: ProcessingJob[];
  stats: JobStats;
  isLoading: boolean;
  error: string | null;
  createJob: (url: string, customPrompt?: string) => Promise<ProcessingJob>;
  deleteJob: (jobId: string) => Promise<void>;
  retryJob: (jobId: string) => Promise<ProcessingJob>;
  refreshJobs: () => Promise<void>;
}

const POLL_INTERVAL = 5000; // 5 segundos

export function useJobs(userId: string | null): UseJobsResult {
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [stats, setStats] = useState<JobStats>({
    total: 0,
    pending: 0,
    processing: 0,
    ready: 0,
    saved: 0,
    failed: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch jobs
  const fetchJobs = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await fetch(`${API_URL}/jobs?userId=${userId}`);
      const data = await response.json();

      if (data.success) {
        setJobs(data.jobs || []);
        setStats(data.stats || stats);
        setError(null);
      } else {
        setError(data.error || 'Error obteniendo jobs');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Initial fetch
  useEffect(() => {
    if (userId) {
      fetchJobs();
    }
  }, [userId, fetchJobs]);

  // Polling: solo si hay jobs activos
  useEffect(() => {
    if (!userId) return;

    const hasActiveJobs = jobs.some(job =>
      ['pending', 'downloading', 'transcribing', 'summarizing'].includes(job.status)
    );

    if (hasActiveJobs) {
      const interval = setInterval(fetchJobs, POLL_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [jobs, userId, fetchJobs]);

  // Crear nuevo job
  const createJob = useCallback(async (url: string, customPrompt?: string): Promise<ProcessingJob> => {
    if (!userId) {
      throw new Error('Usuario no autenticado');
    }

    const response = await fetch(`${API_URL}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, customPrompt, userId })
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Error creando job');
    }

    // Añadir el nuevo job al estado
    setJobs(prev => [data.job, ...prev]);
    setStats(prev => ({
      ...prev,
      total: prev.total + 1,
      pending: prev.pending + 1
    }));

    return data.job;
  }, [userId]);

  // Eliminar job
  const deleteJob = useCallback(async (jobId: string): Promise<void> => {
    if (!userId) {
      throw new Error('Usuario no autenticado');
    }

    const response = await fetch(`${API_URL}/jobs/${jobId}?userId=${userId}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Error eliminando job');
    }

    // Remover del estado
    setJobs(prev => prev.filter(j => j.id !== jobId));

    // Actualizar estadísticas
    fetchJobs();
  }, [userId, fetchJobs]);

  // Reintentar job
  const retryJob = useCallback(async (jobId: string): Promise<ProcessingJob> => {
    if (!userId) {
      throw new Error('Usuario no autenticado');
    }

    const response = await fetch(`${API_URL}/jobs/${jobId}/retry?userId=${userId}`, {
      method: 'POST'
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Error reintentando job');
    }

    // Actualizar en el estado
    setJobs(prev => prev.map(j => j.id === jobId ? data.job : j));

    return data.job;
  }, [userId]);

  return {
    jobs,
    stats,
    isLoading,
    error,
    createJob,
    deleteJob,
    retryJob,
    refreshJobs: fetchJobs
  };
}

// Configuración visual de estados
export const JOB_STATUS_CONFIG: Record<JobStatus, {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}> = {
  pending: {
    label: 'En cola',
    icon: '⏳',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20'
  },
  downloading: {
    label: 'Descargando',
    icon: '📥',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20'
  },
  transcribing: {
    label: 'Transcribiendo',
    icon: '🎧',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20'
  },
  summarizing: {
    label: 'Resumiendo',
    icon: '🤖',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20'
  },
  ready: {
    label: 'Listo',
    icon: '✅',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20'
  },
  saved: {
    label: 'Guardado',
    icon: '💾',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20'
  },
  failed: {
    label: 'Error',
    icon: '❌',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20'
  }
};
