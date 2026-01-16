import { useEffect, useState } from 'react';

type ProcessingStep =
  | 'idle'
  | 'downloading'
  | 'transcribing'
  | 'summarizing' // Agrupa resumen, keypoints, sentiment
  | 'analyzing'
  | 'preview'     // Listo para editar
  | 'saving'
  | 'indexing'
  | 'done'
  | 'error';

interface ProcessingProgressProps {
  currentStep: ProcessingStep;
  progress: number; // Porcentaje real pasado desde el padre
  error?: string;
}

const STEPS_CONFIG = {
  downloading: { label: 'Descargando', icon: '📥', description: 'Obteniendo audio del origen...' },
  transcribing: { label: 'Transcribiendo', icon: '🎙️', description: 'Convirtiendo audio a texto con Whisper...' },
  summarizing: { label: 'Generando Resumen', icon: '🧠', description: 'La IA está escribiendo el resumen...' },
  analyzing: { label: 'Analizando', icon: '✨', description: 'Extrayendo puntos clave y sentimiento...' },
  saving: { label: 'Guardando', icon: '💾', description: 'Guardando página en Notion...' },
  indexing: { label: 'Indexando', icon: '🔍', description: 'Generando vectores para búsqueda semántica...' },
};

export function ProcessingProgress({ currentStep, progress, error }: ProcessingProgressProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    setAnimatedProgress(progress);
  }, [progress]);

  if (currentStep === 'idle' || currentStep === 'preview' || currentStep === 'done') return null;

  const activeStepConfig = STEPS_CONFIG[currentStep as keyof typeof STEPS_CONFIG] || STEPS_CONFIG.downloading;

  return (
    <div className="card p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-dark-100 flex items-center gap-2">
          {activeStepConfig.icon} {error ? 'Error en el procesamiento' : activeStepConfig.label}
        </h3>
        {!error && (
          <span className="text-sm font-mono text-primary-400">{Math.round(animatedProgress)}%</span>
        )}
      </div>

      {/* Progress bar */}
      <div className="progress h-2 bg-dark-700 rounded-full overflow-hidden">
        <div
          className={`progress-bar h-full transition-all duration-300 ${error ? 'bg-red-500' : 'bg-primary-500'}`}
          style={{ width: `${animatedProgress}%` }}
        />
      </div>

      {/* Description */}
      {!error && (
        <div className="flex items-center gap-3 p-4 bg-dark-800/50 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center animate-pulse">
            <svg className="w-4 h-4 text-primary-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <span className="text-dark-300 text-sm">{activeStepConfig.description}</span>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <span className="text-xl">❌</span>
          <div>
            <p className="text-red-300 font-medium">Ha ocurrido un error</p>
            <p className="text-red-400/80 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
