import { useState, useEffect } from "react";
import { API_URL } from "../lib/config";
import { supabase } from "../lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import { Spinner } from "./ui/Spinner";
import { EmptyState } from "./ui/EmptyState";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/Tooltip";
import { cn } from "@/lib/utils";

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
  pagesDeleted: number;
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
      const {
        data: { session },
      } = await supabase.auth.getSession();
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
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
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
      setError("Error conectando con el servidor");
      console.error("Error loading indexing data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerIndexing = async (mode: "full" | "incremental") => {
    setIsIndexing(true);
    setIndexingResult(null);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/index/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, mode }),
      });

      const data = await res.json();

      if (data.success && data.result) {
        setIndexingResult(data.result);
        // Recargar datos
        await loadData();
      } else {
        setError(data.error || "Error durante la indexación");
      }
    } catch (err) {
      setError("Error conectando con el servidor");
      console.error("Error triggering indexing:", err);
    } finally {
      setIsIndexing(false);
    }
  };

  const deletePage = async (pageId: string) => {
    if (!confirm("¿Eliminar esta página del índice?")) return;

    try {
      const res = await fetch(`${API_URL}/index/page/${pageId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.success) {
        setPages(pages.filter(p => p.id !== pageId));
      } else {
        setError(data.message || "Error eliminando página");
      }
    } catch (err) {
      setError("Error conectando con el servidor");
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Nunca";
    return new Date(dateStr).toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner size="lg" />
        <span className="ml-3 text-dark-400">Cargando...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <EmptyState
        icon="🔒"
        title="Inicia sesión para continuar"
        description="Necesitas estar autenticado para gestionar la indexación."
        action={
          <Button asChild>
            <a href="/login">Iniciar Sesión</a>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {!isReady && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-medium text-amber-400">Sistema de indexación no configurado</p>
                <p className="text-sm text-dark-400">
                  Añade <code className="bg-dark-700 px-1.5 py-0.5 rounded text-xs">COHERE_API_KEY</code> a tu archivo
                  .env
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Páginas Indexadas" value={stats?.totalPages || 0} icon="📄" />
        <StatCard label="Chunks Vectoriales" value={stats?.totalChunks || 0} icon="🔢" />
        <StatCard label="Categorías" value={stats?.categoriesIndexed || 0} icon="📁" />
        <StatCard label="Última Sync" value={formatDate(stats?.lastIndexedAt || null)} icon="🕐" isDate />
      </div>

      {pendingChanges && (pendingChanges.new > 0 || pendingChanges.modified > 0 || pendingChanges.deleted > 0) && (
        <Card className="border-primary-500/30 bg-primary-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-primary-400">Cambios pendientes detectados</p>
                <p className="text-sm text-dark-400">
                  <Badge variant="success" size="sm" className="mr-1">
                    {pendingChanges.new}
                  </Badge>{" "}
                  nuevas,{" "}
                  <Badge variant="warning" size="sm" className="mr-1">
                    {pendingChanges.modified}
                  </Badge>{" "}
                  modificadas,{" "}
                  <Badge variant="destructive" size="sm">
                    {pendingChanges.deleted}
                  </Badge>{" "}
                  eliminadas
                </p>
              </div>
              <Button onClick={() => triggerIndexing("incremental")} disabled={isIndexing || !isReady} size="sm">
                Sincronizar cambios
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4 flex-wrap">
        <Button onClick={() => triggerIndexing("full")} disabled={isIndexing || !isReady}>
          {isIndexing ? (
            <>
              <Spinner size="sm" className="mr-2" />
              Indexando...
            </>
          ) : (
            <>
              <span className="mr-2">🔄</span>
              Re-indexar Todo
            </>
          )}
        </Button>

        <Button onClick={() => triggerIndexing("incremental")} disabled={isIndexing || !isReady} variant="secondary">
          <span className="mr-2">⚡</span>
          Indexación Incremental
        </Button>

        <Button onClick={() => loadData()} disabled={isLoading} variant="ghost">
          <span className="mr-2">↻</span>
          Refrescar
        </Button>
      </div>

      {indexingResult && (
        <Card
          className={indexingResult.success ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{indexingResult.success ? "✅" : "❌"}</span>
              <div>
                <p className={cn("font-medium", indexingResult.success ? "text-green-400" : "text-red-400")}>
                  {indexingResult.success ? "Indexación completada" : "Indexación con errores"}
                </p>
                <p className="text-sm text-dark-400">
                  {indexingResult.pagesIndexed} páginas indexadas, {indexingResult.pagesDeleted} eliminadas,{" "}
                  {indexingResult.chunksCreated} chunks en {(indexingResult.duration / 1000).toFixed(1)}s
                </p>
                {indexingResult.errors.length > 0 && (
                  <ul className="mt-2 text-sm text-red-400 space-y-1">
                    {indexingResult.errors.map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-4">
            <p className="text-red-400">❌ {error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Páginas Indexadas
            <Badge variant="secondary">{pages.length}</Badge>
          </CardTitle>
        </CardHeader>

        {pages.length === 0 ? (
          <CardContent>
            <EmptyState
              size="sm"
              icon="📭"
              title="No hay páginas indexadas"
              description='Haz clic en "Re-indexar Todo" para empezar'
            />
          </CardContent>
        ) : (
          <div className="divide-y divide-dark-700/50">
            {pages.map((page, index) => (
              <div
                key={page.id}
                className="p-4 flex items-center justify-between hover:bg-dark-800/30 transition-colors animate-fade-in"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-dark-200 truncate">{page.title}</p>
                    {page.category && (
                      <Badge variant="secondary" size="sm">
                        {page.category}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-dark-500">
                    <span>{page.chunksCount} chunks</span>
                    <span>•</span>
                    <span>{formatDate(page.indexedAt)}</span>
                  </div>
                </div>
                <TooltipProvider>
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" asChild>
                          <a
                            href={`https://notion.so/${page.notionPageId.replace(/-/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            🔗
                          </a>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Abrir en Notion</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deletePage(page.id)}
                          className="hover:text-red-400"
                        >
                          🗑️
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Eliminar del índice</TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  isDate = false,
}: {
  label: string;
  value: number | string;
  icon: string;
  isDate?: boolean;
}) {
  return (
    <Card variant="elevated" padding="sm" className="animate-fade-in">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <p className="text-xs text-dark-400 uppercase tracking-wider">{label}</p>
            <p className={cn("font-bold text-dark-100", isDate ? "text-sm" : "text-xl")}>{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
