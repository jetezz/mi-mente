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
      bg: "bg-emerald-500/10 border-emerald-500/30",
      label: "Alta relevancia",
    };
  }
  if (similarity >= 0.5) {
    return {
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/30",
      label: "Relevancia media",
    };
  }
  return {
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/30",
    label: "Baja relevancia",
  };
}

export function SourceCard({ source, compact = false, className }: SourceCardProps) {
  const href = source.notionUrl || source.url || "#";
  const similarityConfig = source.similarity !== undefined ? getSimilarityConfig(source.similarity) : null;

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
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs",
                "border transition-all duration-200",
                "hover:scale-105 hover:shadow-md",
                similarityConfig?.bg || "bg-dark-800 border-dark-700",
                className,
              )}
            >
              <span>📄</span>
              <span className="truncate max-w-32 text-dark-200">{source.title}</span>
              {similarityConfig && (
                <span className={cn("font-mono font-medium", similarityConfig.color)}>
                  {Math.round((source.similarity || 0) * 100)}%
                </span>
              )}
            </a>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="font-medium text-dark-100 mb-1">{source.title}</p>
            {source.excerpts?.[0] && <p className="text-xs text-dark-400 line-clamp-2">{source.excerpts[0]}</p>}
            {source.category && <p className="text-xs text-primary-400 mt-1">📂 {source.category}</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "block p-3 rounded-xl border transition-all duration-200",
        "hover:scale-[1.02] hover:shadow-lg",
        similarityConfig?.bg || "bg-dark-800/50 border-dark-700",
        "group",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">📄</span>
            <h4 className="font-medium text-dark-100 truncate group-hover:text-primary-400 transition-colors">
              {source.title}
            </h4>
          </div>

          {source.excerpts?.[0] && <p className="text-xs text-dark-400 line-clamp-2 mt-1">{source.excerpts[0]}</p>}

          {source.category && (
            <Badge variant="secondary" className="mt-2 text-xs">
              📂 {source.category}
            </Badge>
          )}
        </div>

        {similarityConfig && (
          <div className="flex flex-col items-end gap-1">
            <span className={cn("text-lg font-mono font-bold", similarityConfig.color)}>
              {Math.round((source.similarity || 0) * 100)}%
            </span>
            <span className="text-xs text-dark-500">{similarityConfig.label}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 mt-2 text-xs text-dark-500 group-hover:text-dark-400 transition-colors">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    <div className={cn("mt-3", className)}>
      <span className="text-xs text-dark-500 mb-2 block">📚 Fuentes ({sources.length})</span>
      <div className={cn(compact ? "flex flex-wrap gap-2" : "grid gap-2")}>
        {sources.map(source => (
          <SourceCard key={source.id} source={source} compact={compact} />
        ))}
      </div>
    </div>
  );
}
