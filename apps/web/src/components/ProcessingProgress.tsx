import { useEffect, useState } from 'react';

type ProcessingStep =
  | 'idle'
  | 'downloading'
  | 'transcribing'
  | 'summarizing'
  | 'extracting_keypoints'
  | 'generating_tags'
  | 'saving_to_notion'
  | 'completed'
  | 'error';

interface ProcessingProgressProps {
  currentStep: ProcessingStep;
  error?: string;
}

const steps = [
  { id: 'downloading', label: 'Descargando', icon: '📥', description: 'Extrayendo audio del video...' },
  { id: 'transcribing', label: 'Transcribiendo', icon: '🎙️', description: 'Convirtiendo audio a texto con Whisper...' },
  { id: 'summarizing', label: 'Resumiendo', icon: '📝', description: 'Generando resumen con IA...' },
  { id: 'extracting_keypoints', label: 'Analizando', icon: '💡', description: 'Extrayendo puntos clave...' },
  { id: 'generating_tags', label: 'Etiquetando', icon: '🏷️', description: 'Generando etiquetas...' },
  { id: 'saving_to_notion', label: 'Guardando', icon: '💾', description: 'Guardando en Notion...' },
  { id: 'completed', label: 'Completado', icon: '✅', description: '¡Listo!' },
];

export function ProcessingProgress({ currentStep, error }: ProcessingProgressProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const progress = currentStep === 'completed'
    ? 100
    : currentStep === 'error'
      ? animatedProgress
      : ((currentStepIndex + 1) / steps.length) * 100;

  useEffect(() => {
    // Animate progress bar
    const timer = setTimeout(() => {
      setAnimatedProgress(progress);
    }, 100);
    return () => clearTimeout(timer);
  }, [progress]);

  if (currentStep === 'idle') return null;

  const activeStep = steps.find(s => s.id === currentStep) || steps[0];

  return (
    <div className="card p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-dark-100">
          {error ? '❌ Error en el procesamiento' : activeStep.label}
        </h3>
        {!error && currentStep !== 'completed' && (
          <span className="text-sm text-dark-400">{Math.round(animatedProgress)}%</span>
        )}
      </div>

      {/* Progress bar */}
      <div className="progress">
        <div
          className={`progress-bar ${error ? 'bg-red-500' : ''}`}
          style={{ width: `${animatedProgress}%` }}
        />
      </div>

      {/* Steps visualization */}
      <div className="flex justify-between">
        {steps.slice(0, -1).map((step, index) => {
          const isCompleted = currentStepIndex > index || currentStep === 'completed';
          const isActive = step.id === currentStep;

          return (
            <div key={step.id} className="flex flex-col items-center">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center
                transition-all duration-300 text-lg
                ${isCompleted ? 'bg-primary-500/20 ring-2 ring-primary-500' :
                  isActive ? 'bg-primary-500 ring-2 ring-primary-400 ring-offset-2 ring-offset-dark-900 animate-pulse' :
                    'bg-dark-800'}
              `}>
                {step.icon}
              </div>
              <span className={`
                mt-2 text-xs font-medium
                ${isActive ? 'text-primary-400' : isCompleted ? 'text-dark-300' : 'text-dark-600'}
              `}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Current step description */}
      {!error && currentStep !== 'completed' && (
        <div className="flex items-center gap-3 p-4 bg-dark-800/50 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center animate-pulse">
            <svg className="w-4 h-4 text-primary-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <span className="text-dark-300">{activeStep.description}</span>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-red-300 font-medium">Ha ocurrido un error</p>
            <p className="text-red-400/80 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Success message */}
      {currentStep === 'completed' && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="text-emerald-300">¡Procesamiento completado con éxito!</span>
        </div>
      )}
    </div>
  );
}
