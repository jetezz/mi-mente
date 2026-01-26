import { useState } from 'react';
import { API_URL } from '../lib/config';
import { UrlInput } from './UrlInput';
import { ProcessingProgress } from './ProcessingProgress';
import { ResultCard } from './ResultCard';

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

interface NoteResult {
  id: string;
  title: string;
  summary: string;
  keyPoints: string[];
  tags: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  originalUrl: string;
  notionPageId?: string;
}

export function Dashboard() {
  const [currentStep, setCurrentStep] = useState<ProcessingStep>('idle');
  const [error, setError] = useState<string | undefined>();
  const [result, setResult] = useState<NoteResult | null>(null);



  const handleSubmit = async (url: string) => {
    setError(undefined);
    setResult(null);
    setCurrentStep('downloading');

    try {
      // Simular progreso mientras esperamos la respuesta
      const progressSteps: ProcessingStep[] = [
        'downloading',
        'transcribing',
        'summarizing',
        'extracting_keypoints',
        'generating_tags',
        'saving_to_notion',
      ];

      let stepIndex = 0;
      const progressInterval = setInterval(() => {
        if (stepIndex < progressSteps.length - 1) {
          stepIndex++;
          setCurrentStep(progressSteps[stepIndex]);
        }
      }, 8000); // Approx timing for each step

      // Llamar a la API
      const response = await fetch(`${API_URL}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, saveToNotion: true }),
      });

      clearInterval(progressInterval);

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error procesando el video');
      }

      // Éxito
      setResult({
        id: data.note.id,
        title: data.note.title,
        summary: data.note.summary,
        keyPoints: data.note.keyPoints,
        tags: data.note.tags,
        sentiment: data.note.sentiment,
        originalUrl: data.note.originalUrl,
        notionPageId: data.note.notionPageId,
      });
      setCurrentStep('completed');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setCurrentStep('error');
    }
  };

  const handleReset = () => {
    setCurrentStep('idle');
    setError(undefined);
    setResult(null);
  };

  const isProcessing = currentStep !== 'idle' && currentStep !== 'completed' && currentStep !== 'error';

  return (
    <div className="space-y-8">
      {/* Input Section */}
      {currentStep === 'idle' && (
        <div className="card p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-dark-100 mb-2">
              ¿Qué quieres recordar hoy?
            </h2>
            <p className="text-dark-400">
              Pega un link de YouTube o Instagram y deja que la IA haga el resto.
            </p>
          </div>

          <UrlInput
            onSubmit={handleSubmit}
            isLoading={isProcessing}
            disabled={isProcessing}
          />

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-dark-800/30">
              <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center text-xl">
                🎙️
              </div>
              <div>
                <h4 className="font-medium text-dark-200">Transcripción IA</h4>
                <p className="text-xs text-dark-500">Whisper de OpenAI</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-dark-800/30">
              <div className="w-10 h-10 rounded-lg bg-accent-cyan/20 flex items-center justify-center text-xl">
                🧠
              </div>
              <div>
                <h4 className="font-medium text-dark-200">Resumen Inteligente</h4>
                <p className="text-xs text-dark-500">Llama 3.3 70B</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-dark-800/30">
              <div className="w-10 h-10 rounded-lg bg-accent-pink/20 flex items-center justify-center text-xl">
                📝
              </div>
              <div>
                <h4 className="font-medium text-dark-200">Guardado en Notion</h4>
                <p className="text-xs text-dark-500">Formato rico automático</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Processing Section */}
      {(isProcessing || currentStep === 'error') && (
        <ProcessingProgress currentStep={currentStep} error={error} />
      )}

      {/* Error retry button */}
      {currentStep === 'error' && (
        <div className="flex justify-center">
          <button onClick={handleReset} className="btn-secondary">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Intentar de nuevo
          </button>
        </div>
      )}

      {/* Result Section */}
      {currentStep === 'completed' && result && (
        <ResultCard note={result} onReset={handleReset} />
      )}
    </div>
  );
}
