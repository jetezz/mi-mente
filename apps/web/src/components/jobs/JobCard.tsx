/**
 * JobCard Component
 * Tarjeta individual para mostrar un job de procesamiento
 */

import React from 'react';
import type { ProcessingJob } from '../../hooks/useJobs';
import { JOB_STATUS_CONFIG } from '../../hooks/useJobs';

interface JobCardProps {
  job: ProcessingJob;
  onView: () => void;
  onDelete: () => void;
  onRetry: () => void;
}

export function JobCard({ job, onView, onDelete, onRetry }: JobCardProps) {
  const statusConfig = JOB_STATUS_CONFIG[job.status];
  const isProcessing = ['pending', 'downloading', 'transcribing', 'summarizing'].includes(job.status);
  const canEdit = job.status === 'ready';
  const canRetry = job.status === 'failed';

  // Formatear duración
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Formatear fecha
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Extraer ID del video de YouTube para thumbnail
  const getThumbnail = () => {
    if (job.video_thumbnail) return job.video_thumbnail;

    // Intentar extraer de URL de YouTube
    const match = job.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    if (match) {
      return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
    }
    return null;
  };

  const thumbnail = getThumbnail();

  return (
    <div className="card group hover:border-purple-500/30 transition-all duration-300">
      <div className="flex gap-4">
        {/* Thumbnail */}
        <div className="relative flex-shrink-0 w-40 h-24 rounded-lg overflow-hidden bg-gray-800">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={job.video_title || 'Video'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl">
              🎬
            </div>
          )}

          {/* Badge de duración */}
          {job.video_duration && (
            <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 text-white text-xs rounded">
              {formatDuration(job.video_duration)}
            </span>
          )}

          {/* Overlay de progreso */}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="text-center">
                <span className="text-2xl animate-pulse">{statusConfig.icon}</span>
                <div className="text-xs text-white mt-1">{job.progress}%</div>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-white truncate">
              {job.video_title || 'Procesando...'}
            </h3>

            {/* Status Badge */}
            <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
              {statusConfig.icon} {statusConfig.label}
            </span>
          </div>

          {/* URL truncada */}
          <p className="text-sm text-gray-400 truncate mt-1">
            {job.url}
          </p>

          {/* Paso actual o error */}
          {job.current_step && (
            <p className={`text-sm mt-2 ${job.status === 'failed' ? 'text-red-400' : 'text-gray-500'}`}>
              {job.status === 'failed' ? `❌ ${job.error_message || job.current_step}` : job.current_step}
            </p>
          )}

          {/* Barra de progreso */}
          {isProcessing && (
            <div className="mt-2">
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                  style={{ width: `${job.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-gray-500">
              {formatDate(job.created_at)}
            </span>

            {/* Acciones */}
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {canEdit && (
                <button
                  onClick={onView}
                  className="px-3 py-1 text-xs font-medium bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
                >
                  ✏️ Editar
                </button>
              )}

              {canRetry && (
                <button
                  onClick={onRetry}
                  className="px-3 py-1 text-xs font-medium bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30 transition-colors"
                >
                  🔄 Reintentar
                </button>
              )}

              {job.status === 'saved' && job.notion_page_id && (
                <a
                  href={`https://notion.so/${job.notion_page_id.replace(/-/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 text-xs font-medium bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors"
                >
                  📄 Ver en Notion
                </a>
              )}

              <button
                onClick={onDelete}
                className="px-3 py-1 text-xs font-medium bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default JobCard;
