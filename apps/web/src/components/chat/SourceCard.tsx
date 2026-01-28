import { cn } from "@/lib/utils";
import { Badge } from "../ui/Badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/Tooltip";

interface Source {
  id: string;
  title: string;
  url?: string;
  notionUrl?: string;
  category?: string;
  similarity?: number;
  excerpts?: string[];
}

interface SourceCardProps {
  source: Source;
  compact?: boolean;
  className?: string;
}

function getSimilarityConfig(similarity: number) {
  if (similarity >= 0.7) {
    return {
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
      glow: "shadow-emerald-500/20",
      label: "Alta",
      description: "Muy relevante",
    };
  }
  if (similarity >= 0.5) {
    return {
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
      glow: "shadow-amber-500/20",
      label: "Media",
      description: "Relevante",
    };
  }
  return {
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
    glow: "shadow-red-500/20",
    label: "Baja",
    description: "Poco relevante",
  };
}

export function SourceCard({ source, compact = false, className }: SourceCardProps) {
  const href = source.notionUrl || source.url || "#";
  const similarityConfig =
    source.similarity !== undefined ? getSimilarityConfig(source.similarity) : null;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs",
                "border transition-all duration-200",
                "hover:scale-[1.02] hover:-translate-y-0.5",
                similarityConfig
                  ? cn(similarityConfig.bg, "hover:shadow-lg", similarityConfig.glow)
                  : "bg-dark-800/50 border-dark-700/50 hover:bg-dark-700/50",
                className
              )}
            >
              {/* Document Icon */}
              <div className="w-5 h-5 rounded bg-dark-700/50 flex items-center justify-center">
                <svg
                  className="w-3 h-3 text-dark-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>

              {/* Title */}
              <span className="truncate max-w-[150px] text-dark-200 font-medium">
                {source.title}
              </span>

              {/* Similarity Badge */}
              {similarityConfig && (
                <span
                  className={cn(
                    "font-mono font-semibold text-[10px] px-1.5 py-0.5 rounded",
                    similarityConfig.bg,
                    similarityConfig.color
                  )}
                >
                  {Math.round((source.similarity || 0) * 100)}%
                </span>
              )}
            </a>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs p-3">
            <div className="space-y-2">
              <p className="font-medium text-dark-100">{source.title}</p>
              {source.excerpts?.[0] && (
                <p className="text-xs text-dark-400 line-clamp-3 leading-relaxed">
                  {source.excerpts[0]}
                </p>
              )}
              <div className="flex items-center gap-2 pt-1">
                {source.category && (
                  <Badge variant="secondary" className="text-[10px]">
                    📂 {source.category}
                  </Badge>
                )}
                {similarityConfig && (
                  <span className={cn("text-[10px]", similarityConfig.color)}>
                    {similarityConfig.description}
                  </span>
                )}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Full Card View
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group block p-4 rounded-xl border transition-all duration-200",
        "hover:scale-[1.01] hover:-translate-y-0.5",
        similarityConfig
          ? cn(similarityConfig.bg, "hover:shadow-xl", similarityConfig.glow)
          : "bg-dark-800/30 border-dark-700/50 hover:bg-dark-800/50",
        className
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="w-10 h-10 rounded-lg bg-dark-700/50 flex items-center justify-center flex-shrink-0">
          <svg
            className="w-5 h-5 text-dark-400 group-hover:text-primary-400 transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-dark-100 truncate group-hover:text-primary-400 transition-colors">
            {source.title}
          </h4>

          {source.excerpts?.[0] && (
            <p className="text-xs text-dark-400 line-clamp-2 mt-1 leading-relaxed">
              {source.excerpts[0]}
            </p>
          )}

          <div className="flex items-center gap-2 mt-2">
            {source.category && (
              <Badge variant="secondary" className="text-[10px]">
                📂 {source.category}
              </Badge>
            )}
          </div>
        </div>

        {/* Similarity Score */}
        {similarityConfig && (
          <div className="flex flex-col items-end gap-1">
            <span className={cn("text-xl font-mono font-bold", similarityConfig.color)}>
              {Math.round((source.similarity || 0) * 100)}%
            </span>
            <span className="text-[10px] text-dark-500">{similarityConfig.label}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-dark-700/30 text-xs text-dark-500 group-hover:text-dark-400 transition-colors">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
        <span>Abrir en Notion</span>
      </div>
    </a>
  );
}

interface SourceListProps {
  sources: Source[];
  compact?: boolean;
  className?: string;
}

export function SourceList({ sources, compact = true, className }: SourceListProps) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className={cn("mt-4", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-1.5 text-xs text-dark-500">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          <span className="font-medium">Fuentes</span>
        </div>
        <Badge variant="outline" className="text-[10px] py-0 h-4">
          {sources.length}
        </Badge>
      </div>

      {/* Sources Grid */}
      <div className={cn(compact ? "flex flex-wrap gap-2" : "grid gap-3")}>
        {sources.map((source) => (
          <SourceCard key={source.id} source={source} compact={compact} />
        ))}
      </div>
    </div>
  );
}
