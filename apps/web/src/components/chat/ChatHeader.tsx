import { cn } from "@/lib/utils";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/Tooltip";
import { Switch } from "../ui/Switch";
import { Label } from "../ui/Label";
import { Slider } from "./ThresholdSlider";
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
  title = "Chat con tu Cerebro",
  subtitle,
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
    <div className={cn("border-b border-dark-700", className)}>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🧠</span>
          <div>
            <h2 className="text-lg font-semibold text-dark-100">{title}</h2>
            <p className="text-xs text-dark-500 flex items-center gap-2">
              {useSemanticSearch ? (
                <>
                  <span className="inline-flex items-center gap-1">🔮 Búsqueda Semántica</span>
                  <Badge variant="secondary" className="text-xs">
                    {Math.round(threshold * 100)}% min
                  </Badge>
                </>
              ) : (
                <span>📄 Búsqueda Directa en Notion</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={useSemanticSearch ? "default" : "outline"}
                  size="icon"
                  onClick={onToggleSemantic}
                  className="h-9 w-9"
                >
                  {useSemanticSearch ? "🔮" : "📄"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {useSemanticSearch ? "Usando Búsqueda Semántica" : "Usando Búsqueda Directa"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

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
                    ⚙️
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Ajustar umbral de similitud</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {categorySelector}

          {hasMessages && onClearChat && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClearChat}
                    className="h-9 w-9 text-dark-400 hover:text-red-400"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Limpiar chat</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {showThresholdSlider && useSemanticSearch && <ThresholdSlider value={threshold} onChange={onThresholdChange} />}
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

  const getBg = (val: number) => {
    if (val >= 0.7) return "bg-emerald-500/20 border-emerald-500/30";
    if (val >= 0.5) return "bg-amber-500/20 border-amber-500/30";
    return "bg-red-500/20 border-red-500/30";
  };

  return (
    <div className="px-4 py-3 bg-dark-800/50 border-t border-dark-700 animate-slide-in-bottom">
      <div className="flex items-center gap-4">
        <Label className="text-sm text-dark-400 whitespace-nowrap">Umbral de similitud:</Label>
        <input
          type="range"
          min="0.1"
          max="0.9"
          step="0.1"
          value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          className="flex-1 h-2 bg-dark-600 rounded-lg appearance-none cursor-pointer accent-primary-500"
        />
        <span className={cn("text-sm font-mono px-2 py-1 rounded border", getBg(value), getColor(value))}>
          {Math.round(value * 100)}%
        </span>
      </div>
      <p className="text-xs text-dark-500 mt-2">
        💡 Menor umbral = más resultados pero menos precisos. Mayor umbral = menos resultados pero más relevantes.
      </p>
    </div>
  );
}
