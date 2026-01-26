/**
 * JobsList Component
 * Lista de jobs de procesamiento con filtros, búsqueda y estadísticas
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useJobs, JOB_STATUS_CONFIG, type JobStatus, type ProcessingJob } from '../../hooks/useJobs';
import { JobCard } from './JobCard';
import { supabase } from '../../lib/supabase';

interface JobsListProps {
  onJobSelect?: (jobId: string) => void;
}

export function JobsList({ onJobSelect }: JobsListProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [filter, setFilter] = useState<JobStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Obtener userId de forma robusta usando el cliente de Supabase
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
      }
      setIsAuthChecking(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
      } else {
        setUserId(null);
      }
      setIsAuthChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const { jobs, stats, isLoading, error, deleteJob, retryJob, stopAllJobs, refreshJobs } = useJobs(userId);

  // Filtrar y ordenar jobs
  const filteredAndSortedJobs = useMemo(() => {
    let result = [...jobs];

    // Filtrar por estado
    if (filter !== 'all') {
      result = result.filter(j => j.status === filter);
    }

    // Filtrar por búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(j =>
        j.video_title?.toLowerCase().includes(query) ||
        j.url.toLowerCase().includes(query)
      );
    }

    // Ordenar: "ready" primero, luego por fecha (más reciente arriba)
    result.sort((a, b) => {
      // Prioridad 1: "ready" siempre primero
      if (a.status === 'ready' && b.status !== 'ready') return -1;
      if (a.status !== 'ready' && b.status === 'ready') return 1;

      // Prioridad 2: Por fecha, más reciente primero
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return result;
  }, [jobs, filter, searchQuery]);

  // Handlers
  const handleView = (jobId: string) => {
    if (onJobSelect) {
      onJobSelect(jobId);
    } else {
      window.location.href = `/jobs/${jobId}`;
    }
  };

  const handleDelete = async (jobId: string) => {
    if (confirmDelete !== jobId) {
      setConfirmDelete(jobId);
      setTimeout(() => setConfirmDelete(null), 3000);
      return;
    }

    try {
      await deleteJob(jobId);
      setConfirmDelete(null);
    } catch (err) {
      console.error('Error eliminando job:', err);
    }
  };

  const handleRetry = async (jobId: string) => {
    try {
      await retryJob(jobId);
    } catch (err) {
      console.error('Error reintentando job:', err);
    }
  };

  const clearFilters = () => {
    setFilter('all');
    setSearchQuery('');
  };

  // Estado de carga inicial (autenticación)
  if (isAuthChecking) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Si no está autenticado, mostrar mensaje
  if (!userId) {
    return (
      <div className="card text-center py-12 bg-dark-900/50 backdrop-blur-sm border-dark-800">
        <span className="text-5xl mb-6 block">🔐</span>
        <h3 className="text-xl font-bold text-white mb-2">Acceso Restringido</h3>
        <p className="text-gray-400 mb-8 max-w-sm mx-auto">
          Inicia sesión con tu cuenta para gestionar tus tareas de procesamiento de video.
        </p>
        <a href="/login" className="btn-primary px-8 py-3 rounded-xl shadow-lg shadow-purple-500/20 transition-all hover:shadow-purple-500/40">
          Iniciar sesión ahora
        </a>
      </div>
    );
  }

  if (isLoading && jobs.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="card animate-pulse bg-dark-900/50 border-dark-800">
            <div className="flex gap-4 p-4">
              <div className="w-40 h-24 bg-dark-800 rounded-lg" />
              <div className="flex-1 space-y-4 py-2">
                <div className="h-5 bg-dark-800 rounded w-3/4" />
                <div className="h-4 bg-dark-800 rounded w-1/2" />
                <div className="flex gap-2">
                  <div className="h-8 bg-dark-800 rounded w-20" />
                  <div className="h-8 bg-dark-800 rounded w-20" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="card border-red-500/30 bg-red-500/5 text-center py-12">
        <span className="text-5xl mb-6 block">⚠️</span>
        <h3 className="text-xl font-bold text-white mb-2">Error de conexión</h3>
        <p className="text-red-400/80 mb-8 max-w-sm mx-auto">{error}</p>
        <button
          onClick={refreshJobs}
          className="btn-secondary px-8 py-3 rounded-xl border-red-500/30 hover:bg-red-500/10 transition-colors"
        >
          🔄 Intentar de nuevo
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Barra de búsqueda y filtros */}
      <div className="card p-4 bg-dark-900/40 border-dark-800">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-500 text-lg pointer-events-none">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por título o URL..."
              className="w-full pl-12 pr-10 py-3 bg-dark-800/50 border border-dark-700 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-dark-700 text-dark-400 hover:bg-dark-600 hover:text-white transition-colors text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtros rápidos */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'all'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                : 'bg-dark-800/50 text-dark-400 border border-dark-700 hover:border-dark-600'
                }`}
            >
              Todos ({stats.total})
            </button>
            <button
              onClick={() => setFilter('ready')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${filter === 'ready'
                ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                : 'bg-dark-800/50 text-dark-400 border border-dark-700 hover:border-dark-600'
                }`}
            >
              <span>✅</span> Listos ({stats.ready})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${filter === 'pending'
                ? 'bg-gray-500/20 text-gray-400 border border-gray-500/40'
                : 'bg-dark-800/50 text-dark-400 border border-dark-700 hover:border-dark-600'
                }`}
            >
              <span>⏳</span> En proceso ({stats.pending + stats.processing})
            </button>
            <button
              onClick={() => setFilter('saved')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${filter === 'saved'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-dark-800/50 text-dark-400 border border-dark-700 hover:border-dark-600'
                }`}
            >
              <span>💾</span> Guardados ({stats.saved})
            </button>
            <button
              onClick={() => setFilter('failed')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${filter === 'failed'
                ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                : 'bg-dark-800/50 text-dark-400 border border-dark-700 hover:border-dark-600'
                }`}
            >
              <span>❌</span> Fallidos ({stats.failed})
            </button>
            {jobs.some(j => ['pending', 'downloading', 'transcribing', 'summarizing'].includes(j.status)) && (
              <button
                onClick={async () => {
                  if (confirm('¿Estás seguro de querer cancelar TODOS los procesos en curso y marcarlos como fallidos?')) {
                    try {
                      // @ts-ignore
                      await stopAllJobs();
                    } catch (e) {
                      alert('Error deteniendo jobs');
                    }
                  }
                }}
                className="ml-auto px-4 py-2 rounded-xl text-sm font-bold bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all flex items-center gap-2"
                title="Detener todos los procesos atascados"
              >
                <span>🛑</span> Stop All
              </button>
            )}
          </div>
        </div>

        {/* Indicador de filtros activos */}
        {(filter !== 'all' || searchQuery) && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-dark-800">
            <div className="text-sm text-dark-400">
              <span className="text-white font-bold">{filteredAndSortedJobs.length}</span> resultado{filteredAndSortedJobs.length !== 1 ? 's' : ''} encontrado{filteredAndSortedJobs.length !== 1 ? 's' : ''}
              {filter !== 'all' && (
                <span> en <span className="text-purple-400">{JOB_STATUS_CONFIG[filter]?.label}</span></span>
              )}
              {searchQuery && (
                <span> para "<span className="text-purple-400">{searchQuery}</span>"</span>
              )}
            </div>
            <button
              onClick={clearFilters}
              className="text-sm text-dark-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <span>✕</span> Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Lista de jobs */}
      {filteredAndSortedJobs.length === 0 ? (
        <div className="card text-center py-20 bg-dark-900/30 border-dark-800 border-dashed border-2">
          <span className="text-6xl mb-6 block grayscale opacity-50">📭</span>
          <h3 className="text-xl font-bold text-white mb-2">
            No se encontraron resultados
          </h3>
          <p className="text-gray-500 mb-8 max-w-xs mx-auto">
            {filter === 'all' && !searchQuery
              ? 'Todavía no has procesado ningún video. ¡Empieza ahora!'
              : searchQuery
                ? `No hay videos que coincidan con "${searchQuery}".`
                : `Actualmente no tienes videos en estado "${filter !== 'all' ? JOB_STATUS_CONFIG[filter]?.label.toLowerCase() : ''}".`}
          </p>
          {filter === 'all' && !searchQuery ? (
            <a href="/dashboard" className="btn-primary px-10 py-3 rounded-xl shadow-lg shadow-purple-500/20 inline-flex items-center gap-2">
              <span>➕ Añadir primer video</span>
            </a>
          ) : (
            <button onClick={clearFilters} className="btn-secondary px-8 py-3 rounded-xl">
              Mostrar todos
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredAndSortedJobs.map(job => (
            <JobCard
              key={job.id}
              job={job}
              onView={() => handleView(job.id)}
              onDelete={() => handleDelete(job.id)}
              onRetry={() => handleRetry(job.id)}
            />
          ))}
        </div>
      )}

      {/* Modal de confirmación de eliminación (simple toast) */}
      {confirmDelete && (
        <div className="fixed bottom-6 right-6 bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl animate-fade-in border border-red-500/50 flex items-center gap-4 z-50">
          <span className="font-bold">¿Confirmar eliminación?</span>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDelete(null)}
              className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => handleDelete(confirmDelete)}
              className="bg-white text-red-600 px-3 py-1 rounded-lg text-sm font-bold shadow-sm"
            >
              Eliminar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default JobsList;
