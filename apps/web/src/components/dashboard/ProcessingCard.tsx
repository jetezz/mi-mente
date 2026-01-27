import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";

type ProcessingStep =
  | "idle"
  | "downloading"
  | "transcribing"
  | "summarizing"
  | "analyzing"
  | "preview"
  | "saving"
  | "indexing"
  | "done"
  | "error";

interface ProcessingCardProps {
  currentStep: ProcessingStep;
  progress: number;
  error?: string;
  onRetry?: () => void;
}

const STEPS_CONFIG = {
  downloading: {
    label: "Descargando",
    icon: "📥",
    description: "Obteniendo audio del origen...",
    color: "text-accent-cyan",
  },
  transcribing: {
    label: "Transcribiendo",
    icon: "🎙️",
    description: "Convirtiendo audio a texto con Whisper...",
    color: "text-primary-400",
  },
  summarizing: {
    label: "Generando Resumen",
    icon: "🧠",
    description: "La IA está escribiendo el resumen...",
    color: "text-accent-pink",
  },
  analyzing: {
    label: "Analizando",
    icon: "✨",
    description: "Extrayendo puntos clave y sentimiento...",
    color: "text-accent-amber",
  },
  saving: {
    label: "Guardando",
    icon: "💾",
    description: "Guardando página en Notion...",
    color: "text-accent-emerald",
  },
  indexing: {
    label: "Indexando",
    icon: "🔍",
    description: "Generando vectores para búsqueda semántica...",
    color: "text-primary-300",
  },
};

const allSteps: ProcessingStep[] = ["downloading", "transcribing", "summarizing", "analyzing", "saving", "indexing"];

export function ProcessingCard({ currentStep, progress, error, onRetry }: ProcessingCardProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(progress);
    }, 100);
    return () => clearTimeout(timer);
  }, [progress]);

  if (currentStep === "idle" || currentStep === "preview" || currentStep === "done") return null;

  const activeStepConfig = STEPS_CONFIG[currentStep as keyof typeof STEPS_CONFIG] || STEPS_CONFIG.downloading;
  const currentStepIndex = allSteps.indexOf(currentStep);

  return (
    <Card variant="glow" className={cn("overflow-hidden", error && "border-red-500/30")}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">{error ? "❌" : activeStepConfig.icon}</span>
            {error ? "Error en el procesamiento" : activeStepConfig.label}
          </CardTitle>
          {!error && (
            <Badge variant="outline" className="font-mono">
              {Math.round(animatedProgress)}%
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Progress value={animatedProgress} className={error ? "bg-red-500/20" : undefined} />

        <div className="flex gap-1">
          {allSteps.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            const stepConfig = STEPS_CONFIG[step];

            return (
              <div
                key={step}
                className={cn(
                  "flex-1 h-1.5 rounded-full transition-all duration-500",
                  isCompleted && "bg-primary-500",
                  isCurrent && "bg-primary-500/50 animate-pulse",
                  !isCompleted && !isCurrent && "bg-dark-700",
                )}
                title={stepConfig.label}
              />
            );
          })}
        </div>

        {!error && (
          <div className="flex items-center gap-3 p-4 bg-dark-800/50 rounded-xl border border-dark-700/50">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", "bg-primary-500/10")}>
              <Spinner size="sm" />
            </div>
            <div className="flex-1">
              <p className={cn("font-medium", activeStepConfig.color)}>{activeStepConfig.label}</p>
              <p className="text-dark-400 text-sm">{activeStepConfig.description}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <p className="text-red-300 font-medium">Ha ocurrido un error</p>
              <p className="text-red-400/80 text-sm mt-1">{error}</p>
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-3 py-1.5 text-sm rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors"
              >
                Reintentar
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
