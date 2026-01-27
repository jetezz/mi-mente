import React, { useState, useEffect, useMemo } from "react";
import { useJobs, JOB_STATUS_CONFIG, type JobStatus, type ProcessingJob } from "../../hooks/useJobs";
import { JobCard } from "./JobCard";
import { supabase } from "../../lib/supabase";
import { Card, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Badge } from "../ui/Badge";
import { Skeleton } from "../ui/Skeleton";
import { EmptyState } from "../ui/EmptyState";
import { Spinner } from "../ui/Spinner";
import { cn } from "@/lib/utils";

interface JobsListProps {
  onJobSelect?: (jobId: string) => void;
}

export function JobsList({ onJobSelect }: JobsListProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [filter, setFilter] = useState<JobStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
      }
      setIsAuthChecking(false);
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
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

  const filteredAndSortedJobs = useMemo(() => {
    let result = [...jobs];

    if (filter !== "all") {
      result = result.filter(j => j.status === filter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(j => j.video_title?.toLowerCase().includes(query) || j.url.toLowerCase().includes(query));
    }

    result.sort((a, b) => {
      if (a.status === "ready" && b.status !== "ready") return -1;
      if (a.status !== "ready" && b.status === "ready") return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return result;
  }, [jobs, filter, searchQuery]);

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
      console.error("Error eliminando job:", err);
    }
  };

  const handleRetry = async (jobId: string) => {
    try {
      await retryJob(jobId);
    } catch (err) {
      console.error("Error reintentando job:", err);
    }
  };

  const clearFilters = () => {
    setFilter("all");
    setSearchQuery("");
  };

  if (isAuthChecking) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!userId) {
    return (
      <EmptyState
        icon="🔐"
        title="Acceso Restringido"
        description="Inicia sesión con tu cuenta para gestionar tus tareas de procesamiento de video."
        action={
          <Button asChild>
            <a href="/login">Iniciar sesión ahora</a>
          </Button>
        }
      />
    );
  }

  if (isLoading && jobs.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <div className="flex gap-4 p-4">
              <Skeleton className="w-40 h-24 rounded-lg" />
              <div className="flex-1 space-y-4 py-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon="⚠️"
        title="Error de conexión"
        description={error}
        action={
          <Button variant="secondary" onClick={refreshJobs}>
            🔄 Intentar de nuevo
          </Button>
        }
      />
    );
  }

  const hasActiveJobs = jobs.some(j => ["pending", "downloading", "transcribing", "summarizing"].includes(j.status));

  return (
    <div className="space-y-6">
      <Card variant="glassDark" padding="sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar por título o URL..."
                leftIcon={<span className="text-dark-500">🔍</span>}
                rightIcon={
                  searchQuery ? (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="w-5 h-5 flex items-center justify-center rounded-full bg-dark-700 text-dark-400 hover:bg-dark-600 hover:text-white transition-colors text-xs"
                    >
                      ✕
                    </button>
                  ) : undefined
                }
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <FilterButton active={filter === "all"} onClick={() => setFilter("all")} count={stats.total}>
                Todos
              </FilterButton>
              <FilterButton
                active={filter === "ready"}
                onClick={() => setFilter("ready")}
                icon="✅"
                count={stats.ready}
                variant="success"
              >
                Listos
              </FilterButton>
              <FilterButton
                active={filter === "pending"}
                onClick={() => setFilter("pending")}
                icon="⏳"
                count={stats.pending + stats.processing}
                variant="warning"
              >
                En proceso
              </FilterButton>
              <FilterButton
                active={filter === "saved"}
                onClick={() => setFilter("saved")}
                icon="💾"
                count={stats.saved}
                variant="info"
              >
                Guardados
              </FilterButton>
              <FilterButton
                active={filter === "failed"}
                onClick={() => setFilter("failed")}
                icon="❌"
                count={stats.failed}
                variant="destructive"
              >
                Fallidos
              </FilterButton>

              {hasActiveJobs && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="ml-auto"
                  onClick={async () => {
                    if (confirm("¿Estás seguro de querer cancelar TODOS los procesos en curso?")) {
                      try {
                        await stopAllJobs();
                      } catch (e) {
                        alert("Error deteniendo jobs");
                      }
                    }
                  }}
                >
                  🛑 Stop All
                </Button>
              )}
            </div>
          </div>

          {(filter !== "all" || searchQuery) && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-dark-700/50">
              <p className="text-sm text-dark-400">
                <span className="text-dark-100 font-medium">{filteredAndSortedJobs.length}</span> resultado
                {filteredAndSortedJobs.length !== 1 ? "s" : ""}
                {filter !== "all" && (
                  <>
                    {" "}
                    en{" "}
                    <Badge variant="secondary" size="sm">
                      {JOB_STATUS_CONFIG[filter]?.label}
                    </Badge>
                  </>
                )}
                {searchQuery && (
                  <>
                    {" "}
                    para "<span className="text-primary-400">{searchQuery}</span>"
                  </>
                )}
              </p>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                ✕ Limpiar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {filteredAndSortedJobs.length === 0 ? (
        <EmptyState
          icon="📭"
          title="No se encontraron resultados"
          description={
            filter === "all" && !searchQuery
              ? "Todavía no has procesado ningún video. ¡Empieza ahora!"
              : searchQuery
                ? `No hay videos que coincidan con "${searchQuery}".`
                : `No tienes videos en estado "${filter !== "all" ? JOB_STATUS_CONFIG[filter]?.label.toLowerCase() : ""}".`
          }
          action={
            filter === "all" && !searchQuery ? (
              <Button asChild>
                <a href="/dashboard">➕ Añadir primer video</a>
              </Button>
            ) : (
              <Button variant="secondary" onClick={clearFilters}>
                Mostrar todos
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4">
          {filteredAndSortedJobs.map((job, index) => (
            <div key={job.id} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
              <JobCard
                job={job}
                onView={() => handleView(job.id)}
                onDelete={() => handleDelete(job.id)}
                onRetry={() => handleRetry(job.id)}
              />
            </div>
          ))}
        </div>
      )}

      {confirmDelete && (
        <div className="fixed bottom-6 right-6 bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl animate-fade-in border border-red-500/50 flex items-center gap-4 z-50">
          <span className="font-bold">¿Confirmar eliminación?</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="bg-white/20 hover:bg-white/30 text-white"
              onClick={() => setConfirmDelete(null)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-white text-red-600 hover:bg-white/90"
              onClick={() => handleDelete(confirmDelete)}
            >
              Eliminar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface FilterButtonProps {
  active: boolean;
  onClick: () => void;
  icon?: string;
  count: number;
  variant?: "default" | "success" | "warning" | "info" | "destructive";
  children: React.ReactNode;
}

function FilterButton({ active, onClick, icon, count, variant = "default", children }: FilterButtonProps) {
  const variantClasses = {
    default: active ? "bg-primary-500/20 text-primary-400 border-primary-500/40" : "",
    success: active ? "bg-green-500/20 text-green-400 border-green-500/40" : "",
    warning: active ? "bg-amber-500/20 text-amber-400 border-amber-500/40" : "",
    info: active ? "bg-accent-cyan/20 text-accent-cyan border-accent-cyan/40" : "",
    destructive: active ? "bg-red-500/20 text-red-400 border-red-500/40" : "",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5",
        "border",
        active ? variantClasses[variant] : "bg-dark-800/50 text-dark-400 border-dark-700 hover:border-dark-600",
      )}
    >
      {icon && <span>{icon}</span>}
      {children}
      <Badge variant="secondary" size="sm" className="ml-1">
        {count}
      </Badge>
    </button>
  );
}

export default JobsList;
