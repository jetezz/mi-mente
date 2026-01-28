/**
 * JobEditor Component - Fase 11 Updated
 * Editor para revisar, editar y guardar un job procesado
 */

import React, { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../../lib/config';
import type { ProcessingJob } from '../../hooks/useJobs';
import { JOB_STATUS_CONFIG } from '../../hooks/useJobs';
import { supabase, getUserCategories } from '../../lib/supabase';
import { CategorySelector } from '../CategorySelector';
import { Button } from '../ui';
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import "@blocknote/mantine/style.css";



interface JobEditorProps {
  jobId: string;
}

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
}

export function JobEditor({ jobId }: JobEditorProps) {
  const [job, setJob] = useState<ProcessingJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Estados editables
  const [title, setTitle] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);

  // Estados de UI
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const [showIndexModal, setShowIndexModal] = useState(false);
  const [notionPageId, setNotionPageId] = useState<string | null>(null);
  const [isIndexing, setIsIndexing] = useState(false);

  // Categorías disponibles
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);

  // BlockNote Editor
  const editor = useCreateBlockNote();
  const [initialLoaded, setInitialLoaded] = useState(false);

  // 1. Manejo de Autenticación Roustas
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
      } else {
        setUserId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Cargar datos del Job (solo cuando tenemos el userId)
  const fetchJob = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/jobs/${jobId}?userId=${userId}`);
      const data = await response.json();

      if (data.success && data.job) {
        setJob(data.job);
        setTitle(data.job.video_title || 'Sin título');

        // Cargar markdown en el editor
        if (!initialLoaded && data.job.summary_markdown) {
          const blocks = await editor.tryParseMarkdownToBlocks(data.job.summary_markdown);
          editor.replaceBlocks(editor.document, blocks);
          setInitialLoaded(true);
        }
      } else {
        setError(data.error || 'Job no encontrado');
      }
    } catch (err) {
      setError('Error cargando job');
    } finally {
      setIsLoading(false);
    }
  }, [jobId, userId, editor, initialLoaded]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  // 3. Cargar categorías usando el helper de Supabase
  useEffect(() => {
    const fetchCategories = async () => {
      if (!userId) return;
      try {
        const cats = await getUserCategories();
        setAvailableCategories(cats);
      } catch (err) {
        console.error('Error cargando categorías:', err);
      }
    };

    fetchCategories();
  }, [userId]);

  // Cargar categorías del borrador cuando se cargan las categorías disponibles Y el job
  useEffect(() => {
    // Solo ejecutar si tenemos el job, las categorías disponibles, y aún no hemos seleccionado nada
    if (!job || availableCategories.length === 0) return;

    // Si el job tiene categorías guardadas en el borrador, restaurarlas
    if (job.draft_categories && job.draft_categories.length > 0 && selectedCategories.length === 0) {
      const matchedCats = availableCategories.filter(c =>
        job.draft_categories!.includes(c.name)
      );
      if (matchedCats.length > 0) {
        setSelectedCategories(matchedCats);
        console.log('📁 Categorías del borrador restauradas:', matchedCats.map(c => c.name));
      }
    }
  }, [job, availableCategories]); // Se ejecuta cuando cambia el job o las categorías disponibles

  // Guardar borrador (sin enviar a Notion)
  const handleSaveDraft = async () => {
    if (!job || !userId) return;

    setIsSavingDraft(true);
    setSaveError(null);
    setDraftSaved(false);

    try {
      const markdown = await editor.blocksToMarkdownLossy(editor.document);
      const categoryNames = selectedCategories.map(c => c.name);

      const response = await fetch(`${API_URL}/jobs/${jobId}/draft`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          markdown,
          categoryNames,
          userId
        })
      });

      const data = await response.json();

      if (data.success) {
        setDraftSaved(true);
        // Actualizar el job local con los nuevos datos
        setJob(data.job);
        // Quitar mensaje después de 3 segundos
        setTimeout(() => setDraftSaved(false), 3000);
      } else {
        setSaveError(data.error || 'Error guardando borrador');
      }
    } catch (err) {
      setSaveError('Error de conexión');
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Guardar en Notion
  const handleSave = async () => {
    if (!job || !userId) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      // Exportar contenido a markdown
      const markdown = await editor.blocksToMarkdownLossy(editor.document);

      const categoryNames = selectedCategories.map(c => c.name);

      const response = await fetch(`${API_URL}/jobs/${jobId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          markdown,
          tags: job.ai_tags || [], // Mantener tags internos
          categoryNames,
          userId
        })
      });

      const data = await response.json();

      if (data.success) {
        setNotionPageId(data.notionPageId);
        setShowIndexModal(true);
      } else {
        setSaveError(data.error || 'Error guardando en Notion');
      }
    } catch (err) {
      setSaveError('Error de conexión');
    } finally {
      setIsSaving(false);
    }
  };

  // Indexar
  const handleIndex = async () => {
    if (!notionPageId || !userId) return;

    setIsIndexing(true);

    try {
      const response = await fetch(`${API_URL}/index/page/${notionPageId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      const data = await response.json();

      if (data.success) {
        setShowIndexModal(false);
        window.location.href = '/jobs';
      } else {
        console.error('Error indexando:', data.error);
      }
    } catch (err) {
      console.error('Error indexando:', err);
    } finally {
      setIsIndexing(false);
    }
  };

  // 4. Estados de error/no autenticado
  if (!userId && !isLoading) {
    return (
      <div className="card text-center py-12 bg-dark-900/50 border-dark-800">
        <span className="text-5xl mb-6 block">🔐</span>
        <h3 className="text-xl font-bold text-white mb-2">Acceso Restringido</h3>
        <p className="text-gray-400 mb-8 max-w-sm mx-auto">Debes iniciar sesión para editar este contenido.</p>
        <Button asChild size="lg">
          <a href="/login"><span>Iniciar sesión</span></a>
        </Button>
      </div>
    );
  }

  // Loading
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-dark-800 rounded-2xl" />
        <div className="h-[500px] bg-dark-800 rounded-2xl" />
      </div>
    );
  }

  // Error
  if (error || !job) {
    return (
      <div className="card border-red-500/30 bg-red-500/5 text-center py-12">
        <span className="text-5xl mb-6 block">⚠️</span>
        <h3 className="text-xl font-bold text-white mb-2">Error de carga</h3>
        <p className="text-red-400 mb-8">{error || 'Job no encontrado'}</p>
        <Button variant="secondary" size="lg" asChild>
          <a href="/jobs"><span>← Volver a la cola</span></a>
        </Button>
      </div>
    );
  }

  // No está listo
  if (job.status !== 'ready') {
    const config = JOB_STATUS_CONFIG[job.status];
    return (
      <div className="card text-center py-16 bg-dark-900/50 border-dark-800">
        <div className={`w-24 h-24 rounded-full ${config.bgColor.replace('/20', '/10')} flex items-center justify-center mx-auto mb-6 border border-${config.color.replace('text-', '')}/20`}>
          <span className="text-5xl">{config.icon}</span>
        </div>
        <h3 className={`text-2xl font-black ${config.color} mb-2`}>
          {config.label}
        </h3>
        <p className="text-gray-400 mb-8 max-w-sm mx-auto px-4">
          {job.status === 'saved'
            ? 'Este contenido ya ha sido procesado y guardado en Notion correctamente.'
            : job.status === 'failed'
              ? `Hubo un error procesando el video: ${job.error_message}`
              : 'Estamos trabajando en ello. El video estará listo en unos momentos.'}
        </p>

        <div className="flex gap-4 justify-center">
          {job.status === 'saved' && job.notion_page_id && (
            <Button size="lg" asChild>
              <a
                href={`https://notion.so/${job.notion_page_id.replace(/-/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>📄 Ver en Notion</span>
              </a>
            </Button>
          )}
          <Button variant="secondary" size="lg" asChild>
            <a href="/jobs"><span>← Volver a la Lista</span></a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header compacto con thumbnail y título */}
      <div className="card p-6 bg-dark-900/40 border-dark-800">
        <div className="flex flex-col md:flex-row items-start gap-6">
          {/* Thumbnail compacto */}
          {job.video_thumbnail ? (
            <div className="relative group shrink-0">
              <img
                src={job.video_thumbnail}
                alt={title}
                className="w-32 h-20 object-cover rounded-xl shadow-lg border border-white/5"
              />
            </div>
          ) : (
            <div className="w-32 h-20 bg-dark-800 rounded-xl flex items-center justify-center text-3xl border border-white/5 shrink-0">
              🎬
            </div>
          )}

          {/* Título editable */}
          <div className="flex-1 w-full">
            <label className="text-[10px] uppercase tracking-widest font-black text-purple-400 mb-2 block">
              Título del Contenido
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-2xl md:text-3xl font-black bg-transparent border-b-2 border-dark-700 focus:border-purple-500 outline-none pb-3 text-white transition-all placeholder:text-dark-600"
              placeholder="Escribe un título impactante..."
            />
            <div className="flex items-center gap-2 mt-3 text-xs font-medium text-dark-500 bg-dark-800/50 w-fit px-3 py-1.5 rounded-full border border-dark-700">
              <span className="text-purple-400">🔗</span>
              <span className="truncate max-w-xs md:max-w-lg">{job.url}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Categorías en línea - entre título y editor */}
      <div className="card p-5 border-dark-800 bg-dark-900/30">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <label className="text-xs font-black uppercase tracking-widest text-purple-400 whitespace-nowrap flex items-center gap-2">
            📁 Categorías
          </label>
          <div className="flex-1">
            <CategorySelector
              categories={availableCategories}
              selected={selectedCategories}
              onSelect={setSelectedCategories}
              multiple={true}
            />
          </div>
          <p className="text-[10px] text-dark-500 leading-relaxed md:max-w-xs shrink-0">
            Selecciona una o varias categorías. Se crearán en Notion si no existen.
          </p>
        </div>
      </div>

      {/* Editor de contenido - Ancho completo */}
      <div className="card p-0 overflow-hidden bg-transparent border-dark-800">
        <div className="bg-dark-900 px-6 py-3 border-b border-dark-800 flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-widest text-dark-400">
            Resumen del Contenido
          </span>
          <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
            <div className="w-2 h-2 rounded-full bg-yellow-500/50"></div>
            <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
          </div>
        </div>
        <div className="p-4">
          <BlockNoteView
            editor={editor}
            theme="dark"
            className="min-h-[500px] md:min-h-[600px]"
          />
        </div>
      </div>

      {/* Botones de acción flotantes/footer */}
      <footer className="sticky bottom-6 flex flex-col md:flex-row items-center justify-between gap-4 bg-dark-900/80 backdrop-blur-xl border border-dark-700 p-4 rounded-2xl shadow-2xl z-40">
        <div className="flex items-center gap-4">
          <a href="/jobs" className="flex items-center gap-2 text-sm font-bold text-dark-400 hover:text-white transition-colors px-4 group">
            <span className="group-hover:-translate-x-1 transition-transform">←</span>
            Volver a la cola
          </a>

          {saveError && (
            <div className="bg-red-500/10 border border-red-500/20 px-4 py-1.5 rounded-lg">
              <p className="text-red-400 text-xs font-bold">❌ {saveError}</p>
            </div>
          )}

          {draftSaved && (
            <div className="bg-green-500/10 border border-green-500/20 px-4 py-1.5 rounded-lg animate-fade-in">
              <p className="text-green-400 text-xs font-bold">✅ Borrador guardado</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          {/* Botón Guardar Borrador */}
          <button
            onClick={handleSaveDraft}
            disabled={isSavingDraft || isSaving || !title}
            className="flex-1 md:flex-none px-6 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 bg-dark-800 border border-dark-600 text-dark-200 hover:bg-dark-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSavingDraft ? (
              <>
                <div className="w-4 h-4 border-2 border-dark-400/30 border-t-dark-400 rounded-full animate-spin"></div>
                Guardando...
              </>
            ) : (
              <>
                <span>📝</span>
                Guardar borrador
              </>
            )}
          </button>

          {/* Botón Guardar en Notion */}
          <Button
            onClick={handleSave}
            disabled={isSaving || isSavingDraft || !title}
            loading={isSaving}
            size="lg"
            className="flex-1 md:flex-none font-black uppercase tracking-widest text-xs"
          >
            💾 Guardar en Notion
          </Button>
        </div>
      </footer>

      {/* Modal de indexación */}
      {showIndexModal && (
        <div className="fixed inset-0 bg-dark-950/95 flex items-center justify-center z-[100] p-4 backdrop-blur-md animate-fade-in">
          <div className="card max-w-md w-full text-center p-10 border-primary-500/30 bg-dark-900 shadow-2xl shadow-primary-500/10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-500 to-transparent"></div>

            <div className="w-24 h-24 rounded-full bg-primary-500/10 border border-primary-500/30 flex items-center justify-center mx-auto mb-8 animate-bounce-subtle">
              <span className="text-6xl">🚀</span>
            </div>

            <h3 className="text-3xl font-black text-white mb-4 tracking-tight">
              ¡Misión Cumplida!
            </h3>

            <p className="text-dark-400 mb-10 leading-relaxed">
              El contenido "<span className="text-dark-100 font-bold">{title}</span>" ya vive en tu Notion. ¿Quieres darle <strong>superpoderes semánticos</strong> para poder chatear con él?
            </p>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => {
                  setShowIndexModal(false);
                  window.location.href = '/jobs';
                }}
                className="px-6 py-4 rounded-2xl bg-dark-800 text-dark-300 font-bold hover:bg-dark-700 transition-all border border-dark-700"
                disabled={isIndexing}
              >
                No ahora
              </button>
              <button
                onClick={handleIndex}
                className="px-6 py-4 rounded-2xl bg-primary-600 text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-primary-500/25 hover:bg-primary-500 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                disabled={isIndexing}
              >
                {isIndexing ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>🔍</span>
                    Indexar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default JobEditor;
