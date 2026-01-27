/**
 * EnhancedDashboard Component - Fase 11
 * Dashboard simplificado que encola videos para procesamiento en segundo plano
 */

import { useState, useEffect } from 'react';
import { API_URL } from '../lib/config';
import { supabase } from '../lib/supabase';
import { UrlInput } from './UrlInput';
import { PromptInput } from './PromptInput';
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";

interface JobStats {
  total: number;
  pending: number;
  processing: number;
  ready: number;
  saved: number;
  failed: number;
}

export function EnhancedDashboard() {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [stats, setStats] = useState<JobStats | null>(null);

  // Mark as mounted on client
  useEffect(() => {
    setMounted(true);
  }, []);

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
      setAuthChecked(true);
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
      if (!response.ok) {
        console.warn('Stats API returned non-OK status:', response.status);
        return;
      }
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.warn('Error fetching stats (non-critical):', err);
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

  // Si no está autenticado (solo mostrar después de verificar auth)
  if (mounted && authChecked && !isAuthenticated) {
    return (
      <Card className="p-8 text-center max-w-md mx-auto mt-10">
        <span className="text-6xl mb-4 block">🔒</span>
        <h3 className="text-xl font-semibold text-dark-200 mb-2">
          Inicia sesión para continuar
        </h3>
        <p className="text-dark-400 mb-6">
          Necesitas estar autenticado para procesar contenido.
        </p>
        <Button asChild className="w-full">
          <a href="/login">
            Iniciar Sesión
          </a>
        </Button>
      </Card>
    );
  }

  // Loading state while checking auth (consistent on server/client)
  if (!mounted || !authChecked) {
    return (
      <div className="space-y-6">
        <Card className="p-6 space-y-4 animate-pulse">
          <div className="h-6 bg-dark-800 rounded w-1/3"></div>
          <div className="h-12 bg-dark-800 rounded"></div>
          <div className="h-24 bg-dark-800 rounded"></div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas rápidas */}
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a href="/jobs?filter=pending" className="group block">
            <Card className="p-4 hover:border-purple-500/30 transition-colors cursor-pointer h-full">
              <div className="text-2xl font-bold text-gray-400 group-hover:text-purple-400 transition-colors">{stats.pending + stats.processing}</div>
              <div className="text-sm text-gray-500">⏳ En proceso</div>
            </Card>
          </a>
          <a href="/jobs?filter=ready" className="group block">
            <Card className="p-4 hover:border-green-500/30 transition-colors cursor-pointer h-full">
              <div className="text-2xl font-bold text-green-400">{stats.ready}</div>
              <div className="text-sm text-gray-500">✅ Listos para revisar</div>
            </Card>
          </a>
          <a href="/jobs?filter=saved" className="group block">
            <Card className="p-4 hover:border-emerald-500/30 transition-colors cursor-pointer h-full">
              <div className="text-2xl font-bold text-emerald-400">{stats.saved}</div>
              <div className="text-sm text-gray-500">💾 Guardados</div>
            </Card>
          </a>
          <a href="/jobs?filter=failed" className="group block">
            <Card className="p-4 hover:border-red-500/30 transition-colors cursor-pointer h-full">
              <div className="text-2xl font-bold text-red-400">{stats.failed}</div>
              <div className="text-sm text-gray-500">❌ Fallidos</div>
            </Card>
          </a>
        </div>
      )}

      {/* Formulario principal */}
      <Card className="p-6 space-y-6">
        <h2 className="text-lg font-bold text-dark-100 flex items-center gap-2">
          <span className="text-xl">📥</span>
          Añadir Video a la Cola
        </h2>

        <div className="space-y-4">
          <UrlInput
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />

          <PromptInput
            value={customPrompt}
            onChange={setCustomPrompt}
            disabled={isLoading}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 animate-fade-in">
            <p className="font-bold flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Error
            </p>
            <p className="text-sm mt-1 ml-7">{error}</p>
          </div>
        )}

        {/* Éxito */}
        {success && (
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 animate-fade-in">
            <div className="flex items-center gap-3">
              <span className="text-2xl animate-bounce">🎉</span>
              <div>
                <p className="font-bold">¡Video encolado!</p>
                <p className="text-sm opacity-90">Redirigiendo a la cola de procesamiento...</p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Info del nuevo flujo */}
      <Card className="p-6 bg-gradient-to-br from-purple-500/5 to-pink-500/5 border-purple-500/20">
        <h3 className="text-lg font-bold text-dark-100 mb-6 flex items-center gap-2">
          <span>💡</span>
          ¿Cómo funciona?
        </h3>
        <ol className="space-y-4 text-dark-300">
          <li className="flex items-start gap-4 p-3 rounded-lg hover:bg-dark-800/30 transition-colors">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-sm font-bold shadow-glow">1</span>
            <div>
              <strong className="text-dark-100 block mb-1">Añade un video</strong>
              <p className="text-sm text-dark-400 leading-relaxed">Pega la URL de YouTube y opcionalmente añade instrucciones personalizadas.</p>
            </div>
          </li>
          <li className="flex items-start gap-4 p-3 rounded-lg hover:bg-dark-800/30 transition-colors">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-sm font-bold shadow-glow">2</span>
            <div>
              <strong className="text-dark-100 block mb-1">Se procesa en segundo plano</strong>
              <p className="text-sm text-dark-400 leading-relaxed">Puedes seguir añadiendo videos mientras los anteriores se procesan.</p>
            </div>
          </li>
          <li className="flex items-start gap-4 p-3 rounded-lg hover:bg-dark-800/30 transition-colors">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-sm font-bold shadow-glow">3</span>
            <div>
              <strong className="text-dark-100 block mb-1">Revisa cuando esté listo</strong>
              <p className="text-sm text-dark-400 leading-relaxed">Edita el resumen, selecciona categoría y guarda en Notion.</p>
            </div>
          </li>
        </ol>

        <div className="mt-6 pt-4 border-t border-dark-700/50 flex items-center justify-between">
          <span className="text-dark-400 text-sm">Gestiona tus procesos</span>
          <Button variant="secondary" size="sm" asChild>
            <a href="/jobs">
              <span>🔄 Ver Cola</span>
            </a>
          </Button>
        </div>
      </Card>

      {/* CTA para ir a la cola si hay jobs activos */}
      {stats && (stats.pending + stats.processing + stats.ready) > 0 && (
        <a href="/jobs" className="group block">
          <Card className="p-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 border-purple-500/30 transition-all cursor-pointer">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl group-hover:scale-110 transition-transform">📋</span>
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
              <span className="text-purple-400 text-2xl group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </Card>
        </a>
      )}
    </div>
  );
}
