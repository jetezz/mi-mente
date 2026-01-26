/**
 * EnhancedDashboard Component - Fase 11
 * Dashboard simplificado que encola videos para procesamiento en segundo plano
 */

import { useState, useEffect } from 'react';
import { API_URL } from '../lib/config';
import { supabase } from '../lib/supabase';
import { UrlInput } from './UrlInput';
import { PromptInput } from './PromptInput';



interface JobStats {
  total: number;
  pending: number;
  processing: number;
  ready: number;
  saved: number;
  failed: number;
}

export function EnhancedDashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [stats, setStats] = useState<JobStats | null>(null);

  // Cargar userId desde Supabase Auth
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        setIsAuthenticated(true);
        fetchStats(session.user.id);
      } else {
        setIsAuthenticated(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        setIsAuthenticated(true);
        fetchStats(session.user.id);
      } else {
        setUserId(null);
        setIsAuthenticated(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Obtener estadísticas de jobs
  const fetchStats = async (uid: string) => {
    try {
      const response = await fetch(`${API_URL}/jobs/stats?userId=${uid}`);
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  // Encolar video para procesamiento
  const handleSubmit = async (url: string) => {
    if (!userId) {
      setError('Debes iniciar sesión para procesar videos');
      return;
    }

    setError(null);
    setSuccess(false);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          customPrompt: customPrompt || undefined,
          userId
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error encolando el video');
      }

      // Éxito
      setSuccess(true);
      setCustomPrompt('');

      // Actualizar estadísticas
      fetchStats(userId);

      // Auto-redirect después de 2 segundos
      setTimeout(() => {
        window.location.href = '/jobs';
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  // Si no está autenticado
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
      {/* Estadísticas rápidas */}
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a href="/jobs?filter=pending" className="card p-4 hover:border-purple-500/30 transition-colors">
            <div className="text-2xl font-bold text-gray-400">{stats.pending + stats.processing}</div>
            <div className="text-sm text-gray-500">⏳ En proceso</div>
          </a>
          <a href="/jobs?filter=ready" className="card p-4 hover:border-green-500/30 transition-colors">
            <div className="text-2xl font-bold text-green-400">{stats.ready}</div>
            <div className="text-sm text-gray-500">✅ Listos para revisar</div>
          </a>
          <a href="/jobs?filter=saved" className="card p-4 hover:border-emerald-500/30 transition-colors">
            <div className="text-2xl font-bold text-emerald-400">{stats.saved}</div>
            <div className="text-sm text-gray-500">💾 Guardados</div>
          </a>
          <a href="/jobs?filter=failed" className="card p-4 hover:border-red-500/30 transition-colors">
            <div className="text-2xl font-bold text-red-400">{stats.failed}</div>
            <div className="text-sm text-gray-500">❌ Fallidos</div>
          </a>
        </div>
      )}

      {/* Formulario principal */}
      <div className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-dark-100 flex items-center gap-2">
          <span>📥</span>
          Añadir Video a la Cola
        </h2>

        <UrlInput
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />

        <PromptInput
          value={customPrompt}
          onChange={setCustomPrompt}
          disabled={isLoading}
        />

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
            <p className="font-medium">❌ Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Éxito */}
        {success && (
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400">
            <div className="flex items-center gap-3">
              <span className="text-2xl animate-bounce">🎉</span>
              <div>
                <p className="font-medium">¡Video encolado!</p>
                <p className="text-sm">Redirigiendo a la cola de procesamiento...</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info del nuevo flujo */}
      <div className="card p-6 bg-gradient-to-br from-purple-500/5 to-pink-500/5 border-purple-500/20">
        <h3 className="text-lg font-semibold text-dark-100 mb-4 flex items-center gap-2">
          <span>💡</span>
          ¿Cómo funciona?
        </h3>
        <ol className="space-y-3 text-dark-300">
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-sm font-bold">1</span>
            <div>
              <strong className="text-dark-100">Añade un video</strong>
              <p className="text-sm text-dark-400">Pega la URL de YouTube y opcionalmente añade instrucciones personalizadas</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-sm font-bold">2</span>
            <div>
              <strong className="text-dark-100">Se procesa en segundo plano</strong>
              <p className="text-sm text-dark-400">Puedes seguir añadiendo videos mientras los anteriores se procesan</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-sm font-bold">3</span>
            <div>
              <strong className="text-dark-100">Revisa cuando esté listo</strong>
              <p className="text-sm text-dark-400">Edita el resumen, selecciona categoría y guarda en Notion</p>
            </div>
          </li>
        </ol>

        <div className="mt-4 pt-4 border-t border-dark-700 flex items-center justify-between">
          <span className="text-dark-400 text-sm">Ver cola de procesamiento</span>
          <a href="/jobs" className="btn-secondary text-sm">
            🔄 Ver Cola
          </a>
        </div>
      </div>

      {/* CTA para ir a la cola si hay jobs activos */}
      {stats && (stats.pending + stats.processing + stats.ready) > 0 && (
        <a
          href="/jobs"
          className="card p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 border-purple-500/30 flex items-center justify-between transition-all"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">📋</span>
            <div>
              <p className="font-medium text-dark-100">
                Tienes {stats.pending + stats.processing + stats.ready} video{(stats.pending + stats.processing + stats.ready) !== 1 ? 's' : ''} en la cola
              </p>
              <p className="text-sm text-dark-400">
                {stats.ready > 0 && `${stats.ready} listo${stats.ready !== 1 ? 's' : ''} para revisar`}
                {stats.ready > 0 && (stats.pending + stats.processing) > 0 && ' • '}
                {(stats.pending + stats.processing) > 0 && `${stats.pending + stats.processing} procesándose`}
              </p>
            </div>
          </div>
          <span className="text-purple-400 text-2xl">→</span>
        </a>
      )}
    </div>
  );
}
