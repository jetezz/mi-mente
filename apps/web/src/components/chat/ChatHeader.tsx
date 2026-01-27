import { cn } from "@/lib/utils";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/Tooltip";
import { Label } from "../ui/Label";
import type { ReactNode } from "react";

interface ChatHeaderProps {
  title?: string;
  subtitle?: string;
  useSemanticSearch: boolean;
  onToggleSemantic: () => void;
  threshold: number;
  onThresholdChange: (value: number) => void;
  showThresholdSlider: boolean;
  onToggleThresholdSlider: () => void;
  onClearChat?: () => void;
  hasMessages: boolean;
  categorySelector?: ReactNode;
  className?: string;
}

export function ChatHeader({
  title = "Hybrid Brain Chat",
  useSemanticSearch,
  onToggleSemantic,
  threshold,
  onThresholdChange,
  showThresholdSlider,
  onToggleThresholdSlider,
  onClearChat,
  hasMessages,
  categorySelector,
  className,
}: ChatHeaderProps) {
  return (
    <div className={cn("border-b border-dark-800/50 bg-dark-950/80 backdrop-blur-xl", className)}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: Title and Status */}
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shadow-lg shadow-primary-500/20">
              <span className="text-xl">🧠</span>
            </div>

            {/* Title & Status */}
            <div>
              <h1 className="text-base font-semibold text-dark-50">{title}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                {useSemanticSearch ? (
                  <>
                    <span className="flex items-center gap-1 text-xs text-primary-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
                      Búsqueda Semántica
                    </span>
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
                      {Math.round(threshold * 100)}%
                    </Badge>
                  </>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-dark-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-dark-500" />
                    Búsqueda Directa
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1">
            {/* Search Mode Toggle */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={useSemanticSearch ? "default" : "ghost"}
                    size="icon"
                    onClick={onToggleSemantic}
                    className={cn(
                      "h-9 w-9",
                      useSemanticSearch
                        ? "bg-primary-600/20 text-primary-400 hover:bg-primary-600/30"
                        : ""
                    )}
                  >
                    {useSemanticSearch ? "🔮" : "📄"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="font-medium">
                    {useSemanticSearch ? "Búsqueda Semántica" : "Búsqueda Directa"}
                  </p>
                  <p className="text-xs text-dark-400">
                    {useSemanticSearch
                      ? "Encuentra contenido por significado"
                      : "Busca texto exacto en Notion"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Threshold Settings */}
            {useSemanticSearch && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={showThresholdSlider ? "secondary" : "ghost"}
                      size="icon"
                      onClick={onToggleThresholdSlider}
                      className="h-9 w-9"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                        />
                      </svg>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Ajustar umbral de similitud</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Category Selector */}
            {categorySelector}

            {/* Divider */}
            {hasMessages && onClearChat && (
              <div className="w-px h-5 bg-dark-700 mx-1" />
            )}

            {/* Clear Chat */}
            {hasMessages && onClearChat && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onClearChat}
                      className="h-9 w-9 text-dark-400 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Nueva conversación</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        {/* Threshold Slider Panel */}
        {showThresholdSlider && useSemanticSearch && (
          <ThresholdSlider value={threshold} onChange={onThresholdChange} />
        )}
      </div>
    </div>
  );
}

interface ThresholdSliderProps {
  value: number;
  onChange: (value: number) => void;
}

function ThresholdSlider({ value, onChange }: ThresholdSliderProps) {
  const getColor = (val: number) => {
    if (val >= 0.7) return "text-emerald-400";
    if (val >= 0.5) return "text-amber-400";
    return "text-red-400";
  };

  const getTrackColor = (val: number) => {
    if (val >= 0.7) return "bg-emerald-500";
    if (val >= 0.5) return "bg-amber-500";
    return "bg-red-500";
  };

  const percentage = ((value - 0.1) / 0.8) * 100;

  return (
    <div className="px-4 py-4 border-t border-dark-800/50 animate-slide-in-bottom">
      <div className="flex items-center gap-4">
        <Label className="text-sm text-dark-400 whitespace-nowrap min-w-[120px]">
          Umbral de similitud
        </Label>

        {/* Custom Slider Track */}
        <div className="relative flex-1 h-2">
          <div className="absolute inset-0 bg-dark-700 rounded-full" />
          <div
            className={cn("absolute inset-y-0 left-0 rounded-full transition-all", getTrackColor(value))}
            style={{ width: `${percentage}%` }}
          />
          <input
            type="range"
            min="0.1"
            max="0.9"
            step="0.05"
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          {/* Thumb indicator */}
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg pointer-events-none transition-all",
              "ring-2 ring-offset-2 ring-offset-dark-950",
              value >= 0.7
                ? "ring-emerald-500"
                : value >= 0.5
                  ? "ring-amber-500"
                  : "ring-red-500"
            )}
            style={{ left: `calc(${percentage}% - 8px)` }}
          />
        </div>

        {/* Value Display */}
        <div
          className={cn(
            "min-w-[60px] text-center text-sm font-mono font-semibold px-2 py-1 rounded-lg",
            "bg-dark-800 border border-dark-700",
            getColor(value)
          )}
        >
          {Math.round(value * 100)}%
        </div>
      </div>

      {/* Description */}
      <div className="flex items-center gap-2 mt-3 text-xs text-dark-500">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>
          Un umbral bajo devuelve más resultados pero menos precisos. Un umbral alto devuelve menos
          resultados pero más relevantes.
        </span>
      </div>
    </div>
  );
}
