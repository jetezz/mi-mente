import React from "react";
import type { ProcessingJob } from "../../hooks/useJobs";
import { JOB_STATUS_CONFIG } from "../../hooks/useJobs";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Progress } from "../ui/Progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/Tooltip";
import { cn } from "@/lib/utils";

interface JobCardProps {
  job: ProcessingJob;
  onView: () => void;
  onDelete: () => void;
  onRetry: () => void;
}

export function JobCard({ job, onView, onDelete, onRetry }: JobCardProps) {
  const statusConfig = JOB_STATUS_CONFIG[job.status];
  const isProcessing = ["pending", "downloading", "transcribing", "summarizing"].includes(job.status);
  const canEdit = job.status === "ready";
  const canRetry = job.status === "failed";

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getThumbnail = () => {
    if (job.video_thumbnail) return job.video_thumbnail;
    const match = job.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    if (match) {
      return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
    }
    return null;
  };

  const thumbnail = getThumbnail();

  const statusVariant = {
    pending: "warning",
    downloading: "warning",
    transcribing: "warning",
    summarizing: "warning",
    ready: "info",
    saved: "success",
    failed: "destructive",
  }[job.status] as "warning" | "info" | "success" | "destructive";

  return (
    <Card variant="elevated" padding="sm" className="group animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-4 p-3">
        {/* Thumbnail */}
        <div className="relative flex-shrink-0 w-full sm:w-44 h-28 sm:h-24 rounded-xl overflow-hidden bg-dark-800">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={job.video_title || "Video"}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl bg-gradient-to-br from-dark-700 to-dark-800">
              🎬
            </div>
          )}

          {job.video_duration && (
            <Badge variant="secondary" size="sm" className="absolute bottom-2 right-2 bg-black/80 border-0">
              {formatDuration(job.video_duration)}
            </Badge>
          )}

          {isProcessing && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
              <div className="text-center">
                <span className="text-2xl animate-bounce">{statusConfig.icon}</span>
                <div className="text-xs text-white mt-1 font-mono">{job.progress}%</div>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          {/* Header */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
              <h3 className="font-semibold text-dark-100 line-clamp-2 sm:truncate group-hover:text-primary-400 transition-colors">
                {job.video_title || "Procesando..."}
              </h3>

              <Badge variant={statusVariant} size="sm" className="shrink-0 w-fit">
                {statusConfig.icon} {statusConfig.label}
              </Badge>
            </div>

            <p className="text-sm text-dark-500 truncate mt-1">{job.url}</p>

            {job.current_step && (
              <p className={cn("text-sm mt-2 line-clamp-1", job.status === "failed" ? "text-red-400" : "text-dark-400")}>
                {job.status === "failed" ? `❌ ${job.error_message || job.current_step}` : job.current_step}
              </p>
            )}

            {isProcessing && (
              <div className="mt-3">
                <Progress value={job.progress} className="h-1.5" />
              </div>
            )}
          </div>

          {/* Footer: date + actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-3 pt-3 border-t border-dark-800/50">
            <span className="text-xs text-dark-500">{formatDate(job.created_at)}</span>

            <div className="flex gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
              <TooltipProvider>
                {canEdit && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" onClick={onView}>
                        ✏️ Editar
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Editar antes de guardar</TooltipContent>
                  </Tooltip>
                )}

                {canRetry && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="outline" onClick={onRetry}>
                        🔄 Reintentar
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Reintentar procesamiento</TooltipContent>
                  </Tooltip>
                )}

                {job.status === "saved" && job.notion_page_id && (
                  <Button size="sm" variant="secondary" asChild>
                    <a
                      href={`https://notion.so/${job.notion_page_id.replace(/-/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span>📄 Notion</span>
                    </a>
                  </Button>
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="ghost" onClick={onDelete}>
                      🗑️
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Eliminar</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default JobCard;
