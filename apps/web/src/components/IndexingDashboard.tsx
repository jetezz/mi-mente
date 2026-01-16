/**
 * IndexingDashboard Component
 * Panel de control para gestionar la indexación vectorial (Fase 6)
 * Muestra estadísticas, permite sincronización manual, y lista páginas indexadas
 */

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';

interface IndexingStats {
  totalPages: number;
  totalChunks: number;
  lastIndexedAt: string | null;
  categoriesIndexed: number;
}

interface PendingChanges {
  new: number;
  modified: number;
  deleted: number;
}

interface IndexedPage {
  id: string;
  notionPageId: string;
  title: string;
  category: string | null;
  chunksCount: number;
  indexedAt: string;
}

interface IndexingResult {
  success: boolean;
  pagesIndexed: number;
  chunksCreated: number;
  errors: string[];
  duration: number;
}

export function IndexingDashboard() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [stats, setStats] = useState<IndexingStats | null>(null);
  const [pendingChanges, setPendingChanges] = useState<PendingChanges | null>(null);
  const [pages, setPages] = useState<IndexedPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexingResult, setIndexingResult] = useState<IndexingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Obtener sesión actual de Supabase
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        setIsAuthenticated(true);
        loadData(session.user.id);
      } else {
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    };

    checkAuth();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        setIsAuthenticated(true);
        loadData(session.user.id);
      } else {
        setUserId(null);
        setIsAuthenticated(false);
        setStats(null);
        setPages([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadData = async (uid?: string) => {
    const currentUserId = uid || userId;
    setIsLoading(true);
    setError(null);

    try {
      // Cargar estado y estadísticas
      const statusRes = await fetch(`${API_URL}/index/status?userId=${currentUserId}`);
      const statusData = await statusRes.json();

      if (statusData.success) {
        setStats(statusData.stats);
        setPendingChanges(statusData.pendingChanges);
        setIsReady(statusData.isReady);
      }

      // Cargar páginas indexadas
      const pagesRes = await fetch(`${API_URL}/index/pages?userId=${currentUserId}`);
      const pagesData = await pagesRes.json();

      if (pagesData.success) {
        setPages(pagesData.pages || []);
      }

    } catch (err) {
      setError('Error conectando con el servidor');
      console.error('Error loading indexing data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerIndexing = async (mode: 'full' | 'incremental') => {
    setIsIndexing(true);
    setIndexingResult(null);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/index/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, mode }),
      });

      const data = await res.json();

      if (data.success && data.result) {
        setIndexingResult(data.result);
        // Recargar datos
        await loadData();
      } else {
        setError(data.error || 'Error durante la indexación');
      }

    } catch (err) {
      setError('Error conectando con el servidor');
      console.error('Error triggering indexing:', err);
    } finally {
      setIsIndexing(false);
    }
  };

  const deletePage = async (pageId: string) => {
    if (!confirm('¿Eliminar esta página del índice?')) return;

    try {
      const res = await fetch(`${API_URL}/index/page/${pageId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        setPages(pages.filter(p => p.id !== pageId));
      } else {
        setError(data.message || 'Error eliminando página');
      }

    } catch (err) {
      setError('Error conectando con el servidor');
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Nunca';
    return new Date(dateStr).toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
        <span className="ml-3 text-dark-400">Cargando...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <span className="text-6xl mb-4">🔒</span>
        <h3 className="text-xl font-semibold text-dark-200 mb-2">
          Inicia sesión para continuar
        </h3>
        <p className="text-dark-400 mb-4">
          Necesitas estar autenticado para gestionar la indexación.
        </p>
        <a href="/login" className="btn-primary">
          Iniciar Sesión
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {!isReady && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-medium text-amber-400">Sistema de indexación no configurado</p>
              <p className="text-sm text-dark-400">
                Añade <code className="bg-dark-700 px-1 rounded">COHERE_API_KEY</code> a tu archivo .env
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Páginas Indexadas"
          value={stats?.totalPages || 0}
          icon="📄"
        />
        <StatCard
          label="Chunks Vectoriales"
          value={stats?.totalChunks || 0}
          icon="🔢"
        />
        <StatCard
          label="Categorías"
          value={stats?.categoriesIndexed || 0}
          icon="📁"
        />
        <StatCard
          label="Última Sync"
          value={formatDate(stats?.lastIndexedAt || null)}
          icon="🕐"
          isDate
        />
      </div>

      {/* Pending Changes */}
      {pendingChanges && (pendingChanges.new > 0 || pendingChanges.modified > 0 || pendingChanges.deleted > 0) && (
        <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-primary-400">Cambios pendientes detectados</p>
              <p className="text-sm text-dark-400">
                {pendingChanges.new} nuevas, {pendingChanges.modified} modificadas, {pendingChanges.deleted} eliminadas
              </p>
            </div>
            <button
              onClick={() => triggerIndexing('incremental')}
              disabled={isIndexing || !isReady}
              className="btn-secondary text-sm"
            >
              Sincronizar cambios
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={() => triggerIndexing('full')}
          disabled={isIndexing || !isReady}
          className="btn-primary flex items-center gap-2"
        >
          {isIndexing ? (
            <>
              <span className="animate-spin">⟳</span>
              Indexando...
            </>
          ) : (
            <>
              <span>🔄</span>
              Re-indexar Todo
            </>
          )}
        </button>

        <button
          onClick={() => triggerIndexing('incremental')}
          disabled={isIndexing || !isReady}
          className="btn-secondary flex items-center gap-2"
        >
          <span>⚡</span>
          Indexación Incremental
        </button>

        <button
          onClick={() => loadData()}
          disabled={isLoading}
          className="btn-ghost flex items-center gap-2"
        >
          <span>↻</span>
          Refrescar
        </button>
      </div>

      {/* Indexing Result */}
      {indexingResult && (
        <div className={`rounded-lg p-4 ${indexingResult.success ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">{indexingResult.success ? '✅' : '❌'}</span>
            <div>
              <p className={`font-medium ${indexingResult.success ? 'text-green-400' : 'text-red-400'}`}>
                {indexingResult.success ? 'Indexación completada' : 'Indexación con errores'}
              </p>
              <p className="text-sm text-dark-400">
                {indexingResult.pagesIndexed} páginas, {indexingResult.chunksCreated} chunks en {(indexingResult.duration / 1000).toFixed(1)}s
              </p>
              {indexingResult.errors.length > 0 && (
                <ul className="mt-2 text-sm text-red-400">
                  {indexingResult.errors.map((err, i) => (
                    <li key={i}>• {err}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Indexed Pages Table */}
      <div className="card">
        <div className="p-4 border-b border-dark-700">
          <h3 className="font-medium text-dark-200">Páginas Indexadas ({pages.length})</h3>
        </div>

        {pages.length === 0 ? (
          <div className="p-8 text-center text-dark-400">
            <p className="text-4xl mb-4">📭</p>
            <p>No hay páginas indexadas aún</p>
            <p className="text-sm mt-2">Haz clic en "Re-indexar Todo" para empezar</p>
          </div>
        ) : (
          <div className="divide-y divide-dark-700">
            {pages.map((page) => (
              <div key={page.id} className="p-4 flex items-center justify-between hover:bg-dark-800/50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-dark-200 truncate">{page.title}</p>
                    {page.category && (
                      <span className="px-2 py-0.5 text-xs bg-primary-500/20 text-primary-400 rounded-full">
                        {page.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-dark-400">
                    <span>{page.chunksCount} chunks</span>
                    <span>•</span>
                    <span>{formatDate(page.indexedAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`https://notion.so/${page.notionPageId.replace(/-/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-dark-400 hover:text-primary-400 transition-colors"
                    title="Abrir en Notion"
                  >
                    🔗
                  </a>
                  <button
                    onClick={() => deletePage(page.id)}
                    className="p-2 text-dark-400 hover:text-red-400 transition-colors"
                    title="Eliminar del índice"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ label, value, icon, isDate = false }: { label: string; value: number | string; icon: string; isDate?: boolean }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-xs text-dark-400 uppercase tracking-wider">{label}</p>
          <p className={`font-bold ${isDate ? 'text-sm' : 'text-xl'} text-dark-200`}>{value}</p>
        </div>
      </div>
    </div>
  );
}
