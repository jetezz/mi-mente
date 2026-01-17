/**
 * EnhancedDashboard Component - Fase 8
 * Dashboard mejorado con flujo: Input → Edit → Tags → Save → Index
 */

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UrlInput } from './UrlInput';
import { PromptInput } from './PromptInput';
import { ProcessingProgress } from './ProcessingProgress';
import { ContentEditor, type ProcessedContent, type EditedContent } from './ContentEditor';
import { IndexingModal } from './IndexingModal';
import { getUserCategories, createCategory } from '../lib/supabase';
// Interface for Category
interface Category {
  id: string;
  name: string;
  parent_id: string | null;
}

type ProcessingStep =
  | 'idle'
  | 'downloading'
  | 'transcribing'
  | 'summarizing'
  | 'analyzing'
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
  const [streamingSummary, setStreamingSummary] = useState('');

  // Contenido procesado por la IA
  const [processedContent, setProcessedContent] = useState<ProcessedContent | null>(null);

  // Categorías disponibles
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  // Tags generados por IA (invisibles al usuario)
  const [generatedTags, setGeneratedTags] = useState<string[]>([]);

  // Para el modal de indexación
  const [showIndexingModal, setShowIndexingModal] = useState(false);
  const [savedNotionPageId, setSavedNotionPageId] = useState<string | null>(null);
  const [savedPageTitle, setSavedPageTitle] = useState<string>('');

  // User ID desde Supabase Auth
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Cargar userId desde Supabase Auth
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        setIsAuthenticated(true);
        fetchCategories();
      } else {
        setIsAuthenticated(false);
      }
    };

    checkAuth();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        setIsAuthenticated(true);
        fetchCategories();
      } else {
        setUserId(null);
        setIsAuthenticated(false);
        setAvailableCategories([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchCategories = async () => {
    try {
      const cats = await getUserCategories();
      setAvailableCategories(cats);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const handleSubmit = async (url: string) => {
    setError(null);
    setProgress(0);
    setProcessedContent(null);
    setStreamingSummary('');
    setCurrentStep('downloading');

    // Use EventSource for streaming updates
    // const eventSource = new EventSource(`${API_URL}/process/stream-preview?url=${encodeURIComponent(url)}&userId=${userId || ''}&customPrompt=${encodeURIComponent(customPrompt || '')}`);
    // FIX: Using EventSource with custom headers isn't standard, passing everything in query params
    const evtUrl = `${API_URL}/process/stream-preview?url=${encodeURIComponent(url)}&userId=${userId || ''}&customPrompt=${encodeURIComponent(customPrompt || '')}`;
    const eventSource = new EventSource(evtUrl);

    eventSource.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'status') {
          setCurrentStep(data.step as ProcessingStep);
          if (data.progress) setProgress((prev: number) => data.progress);
        } else if (data.type === 'token') {
          setStreamingSummary((prev: string) => prev + data.content);
          // Auto-scroll to bottom of streaming summary if needed?
        } else if (data.type === 'transcription') {
          // Optional: Show title or partial transcription
        } else if (data.type === 'result') {
          setProcessedContent({
            title: data.title || 'Sin Título',
            summary: data.summary,
            keyPoints: data.keyPoints || [],
            sentiment: data.sentiment || 'neutral',
            originalUrl: data.originalUrl,
            transcription: data.transcription
          });
          if (data.generatedTags) {
            setGeneratedTags(data.generatedTags);
          }
          setCurrentStep('preview');
          eventSource.close();
        } else if (data.type === 'done') {
          eventSource.close();
        } else if (data.type === 'error') {
          throw new Error(data.error);
        }
      } catch (err) {
        console.error('Error parsing stream data:', err);
        setError('Error procesando respuesta del servidor');
        eventSource.close();
        setCurrentStep('error');
      }
    };

    eventSource.onerror = (err: Event) => {
      console.error('EventSource failed:', err);
      // Only set error if not already done/closed
      if (currentStep !== 'preview' && currentStep !== 'done') {
        setError('Conexión perdida con el servidor. Verifica el worker.');
        setCurrentStep('error');
      }
      eventSource.close();
    };
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
          markdown: editedContent.markdown,
          tags: generatedTags, // Tags autogenerados por IA
          categoryName: editedContent.category?.name, // Categoría seleccionada
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

  const handleCreateCategory = async (name: string): Promise<Category> => {
    const newCat = await createCategory(name);
    if (!newCat) throw new Error('Error creating category');
    await fetchCategories();
    return newCat;
  };

  // Generar colores bonitos para tags
  const getRandomColor = () => {
    const colors = [
      '#8B5CF6', // Purple
      '#06B6D4', // Cyan
      '#10B981', // Emerald
      '#F59E0B', // Amber
      '#EF4444', // Red
      '#EC4899', // Pink
      '#3B82F6', // Blue
      '#6366F1', // Indigo
    ];
    return colors[Math.floor(Math.random() * colors.length)];
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
    setStreamingSummary('');
  };

  const handleCloseIndexingModal = () => {
    setShowIndexingModal(false);
    // Redirigir al dashboard limpio
    handleReset();
  };

  // Si no está autenticado, mostrar mensaje
  if (!isAuthenticated && typeof window !== 'undefined') {
    return (
      <div className="card p-8 text-center">
        <span className="text-6xl mb-4 block">🔒</span>
        <h3 className="text-xl font-semibold text-dark-200 mb-2">
          Inicia sesión para continuar
        </h3>
        <p className="text-dark-400 mb-4">
          Necesitas estar autenticado para procesar contenido.
        </p>
        <a href="/login" className="btn-primary">
          Iniciar Sesión
        </a>
      </div>
    );
  }

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

      {/* Progress */}
      {['downloading', 'transcribing', 'summarizing', 'analyzing'].includes(currentStep) && (
        <div className="space-y-6">
          <ProcessingProgress currentStep={currentStep as any} progress={progress} />
        </div>
      )}

      {/* Editor de contenido - Durante streaming y Preview */}
      {(['summarizing', 'analyzing', 'preview'].includes(currentStep)) && (
        <ContentEditor
          content={
            currentStep === 'preview' && processedContent
              ? processedContent
              : {
                title: 'Generando resumen...',
                summary: streamingSummary,
                keyPoints: [],
                sentiment: 'neutral',
                originalUrl: '',
              }
          }
          availableCategories={availableCategories} // Updated prop name
          onSave={handleSave}
          onCancel={handleCancelPreview}
          onCreateCategory={handleCreateCategory} // Updated prop name
          isSaving={currentStep === 'saving'}
          isStreaming={currentStep === 'summarizing' || currentStep === 'analyzing'}
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
