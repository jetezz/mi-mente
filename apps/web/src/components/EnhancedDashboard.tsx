/**
 * EnhancedDashboard Component - Fase 8
 * Dashboard mejorado con flujo: Input → Preview → Edit → Save → Index
 */

import { useState, useEffect } from 'react';
import { UrlInput } from './UrlInput';
import { PromptInput } from './PromptInput';
import { ProcessingProgress } from './ProcessingProgress';
import { ContentEditor, type ProcessedContent, type EditedContent } from './ContentEditor';
import { IndexingModal } from './IndexingModal';
import { type Tag } from './TagSelector';

type ProcessingStep =
  | 'idle'
  | 'downloading'
  | 'transcribing'
  | 'summarizing'
  | 'preview'
  | 'saving'
  | 'indexing'
  | 'done'
  | 'error';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';

export function EnhancedDashboard() {
  const [currentStep, setCurrentStep] = useState<ProcessingStep>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');

  // Contenido procesado por la IA
  const [processedContent, setProcessedContent] = useState<ProcessedContent | null>(null);

  // Tags disponibles
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);

  // Para el modal de indexación
  const [showIndexingModal, setShowIndexingModal] = useState(false);
  const [savedNotionPageId, setSavedNotionPageId] = useState<string | null>(null);
  const [savedPageTitle, setSavedPageTitle] = useState<string>('');

  // User ID para tags (desde localStorage)
  const [userId, setUserId] = useState<string | null>(null);

  // Cargar userId y tags al montar
  useEffect(() => {
    // Solo en cliente
    if (typeof window !== 'undefined') {
      const storedUserId = localStorage.getItem('userId');
      setUserId(storedUserId);

      if (storedUserId) {
        fetchTags(storedUserId);
      }
    }
  }, []);

  const fetchTags = async (uid: string) => {
    try {
      const response = await fetch(`${API_URL}/tags?userId=${uid}`);
      if (response.ok) {
        const data = await response.json();
        setAvailableTags(data.tags || []);
      }
    } catch (err) {
      console.error('Error fetching tags:', err);
    }
  };

  const handleSubmit = async (url: string) => {
    setError(null);
    setProgress(0);
    setProcessedContent(null);

    // Simular progreso mientras se procesa
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 1000);

    try {
      // Paso 1: Downloading
      setCurrentStep('downloading');

      // Paso 2: Transcribing
      setTimeout(() => setCurrentStep('transcribing'), 2000);

      // Paso 3: Summarizing (con prompt personalizado)
      setTimeout(() => setCurrentStep('summarizing'), 5000);

      // Llamar al endpoint de PREVIEW (no guarda en Notion todavía)
      const response = await fetch(`${API_URL}/process/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          customPrompt: customPrompt || undefined,
        }),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error procesando el contenido');
      }

      const data = await response.json();

      // Guardar contenido procesado y mostrar preview
      setProcessedContent({
        title: data.title,
        summary: data.summary,
        keyPoints: data.keyPoints || [],
        sentiment: data.sentiment || 'neutral',
        originalUrl: url,
        transcription: data.transcription,
      });

      setProgress(100);
      setCurrentStep('preview');

    } catch (err) {
      clearInterval(progressInterval);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setCurrentStep('error');
    }
  };

  const handleSave = async (editedContent: EditedContent) => {
    setCurrentStep('saving');

    try {
      const response = await fetch(`${API_URL}/process/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: editedContent.originalUrl,
          title: editedContent.title,
          summary: editedContent.summary,
          keyPoints: editedContent.keyPoints,
          tags: editedContent.tags.map(t => t.name),
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error('Error guardando en Notion');
      }

      const data = await response.json();

      // Guardar ID de la página para indexación
      setSavedNotionPageId(data.notionPageId);
      setSavedPageTitle(editedContent.title);

      // Mostrar modal de indexación
      setShowIndexingModal(true);
      setCurrentStep('done');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando');
      setCurrentStep('error');
    }
  };

  const handleIndex = async () => {
    if (!savedNotionPageId || !userId) {
      throw new Error('No hay página para indexar');
    }

    const response = await fetch(`${API_URL}/index/page/${savedNotionPageId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Error indexando');
    }
  };

  const handleCreateTag = async (name: string): Promise<Tag> => {
    if (!userId) {
      throw new Error('Usuario no autenticado');
    }

    const response = await fetch(`${API_URL}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        name,
        color: `#${Math.floor(Math.random() * 16777215).toString(16)}`, // Color aleatorio
      }),
    });

    if (!response.ok) {
      throw new Error('Error creando tag');
    }

    const data = await response.json();
    const newTag = data.tag;

    // Añadir a la lista disponible
    setAvailableTags(prev => [...prev, newTag]);

    return newTag;
  };

  const handleReset = () => {
    setCurrentStep('idle');
    setProgress(0);
    setError(null);
    setProcessedContent(null);
    setShowIndexingModal(false);
    setSavedNotionPageId(null);
    setSavedPageTitle('');
    setCustomPrompt('');
  };

  const handleCancelPreview = () => {
    setCurrentStep('idle');
    setProcessedContent(null);
  };

  const handleCloseIndexingModal = () => {
    setShowIndexingModal(false);
    // Redirigir al dashboard limpio
    handleReset();
  };

  return (
    <div className="space-y-6">
      {/* Input de URL - Solo visible en idle/error */}
      {(currentStep === 'idle' || currentStep === 'error') && (
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-dark-100 flex items-center gap-2">
            <span>📥</span>
            Procesar Contenido
          </h2>

          <UrlInput onSubmit={handleSubmit} isLoading={false} />

          <PromptInput
            value={customPrompt}
            onChange={setCustomPrompt}
            disabled={false}
          />

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
              <p className="font-medium">❌ Error</p>
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>
      )}

      {/* Progress - Durante procesamiento */}
      {['downloading', 'transcribing', 'summarizing'].includes(currentStep) && (
        <ProcessingProgress currentStep={currentStep as any} progress={progress} />
      )}

      {/* Editor de contenido - Antes de guardar */}
      {currentStep === 'preview' && processedContent && (
        <ContentEditor
          content={processedContent}
          availableTags={availableTags}
          onSave={handleSave}
          onCancel={handleCancelPreview}
          onCreateTag={handleCreateTag}
          isSaving={currentStep === 'saving'}
        />
      )}

      {/* Estado de guardando */}
      {currentStep === 'saving' && (
        <div className="card p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-primary-500/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-3xl">💾</span>
          </div>
          <h3 className="text-lg font-semibold text-dark-100 mb-2">
            Guardando en Notion...
          </h3>
          <p className="text-dark-400 text-sm">
            Creando página con el contenido editado
          </p>
        </div>
      )}

      {/* Éxito + botón de nuevo */}
      {currentStep === 'done' && !showIndexingModal && (
        <div className="card p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✅</span>
          </div>
          <h3 className="text-lg font-semibold text-green-400 mb-2">
            ¡Guardado correctamente!
          </h3>
          <button onClick={handleReset} className="btn-primary mt-4">
            Procesar otro contenido
          </button>
        </div>
      )}

      {/* Modal de indexación */}
      <IndexingModal
        isOpen={showIndexingModal}
        notionPageId={savedNotionPageId || ''}
        pageTitle={savedPageTitle}
        onIndex={handleIndex}
        onSkip={handleCloseIndexingModal}
      />
    </div>
  );
}
