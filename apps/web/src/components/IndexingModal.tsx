/**
 * IndexingModal Component
 * Modal de confirmación para indexar contenido a Supabase vectors
 * Migrado a Dialog de Radix/Shadcn
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "./ui/Dialog";
import { Button } from "./ui/Button";
import { Progress } from "./ui/Progress";
import { Spinner } from "./ui/Spinner";

interface IndexingModalProps {
  isOpen: boolean;
  notionPageId: string;
  pageTitle: string;
  onIndex: () => Promise<void>;
  onSkip: () => void;
}

export function IndexingModal({ isOpen, notionPageId, pageTitle, onIndex, onSkip }: IndexingModalProps) {
  const [isIndexing, setIsIndexing] = useState(false);
  const [status, setStatus] = useState<"idle" | "indexing" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleIndex = async () => {
    setIsIndexing(true);
    setStatus("indexing");
    setError(null);

    try {
      await onIndex();
      setStatus("success");
      // Cerrar automáticamente después de un momento
      setTimeout(() => {
        onSkip();
      }, 2000);
    } catch (err) {
      setStatus("error");
      setError((err as Error).message);
    } finally {
      setIsIndexing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && status !== "indexing" && onSkip()}>
      <DialogContent showCloseButton={status !== "indexing"}>
        {status === "idle" && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">🔮</span>
                <DialogTitle>Indexar para Búsqueda Semántica</DialogTitle>
              </div>
            </DialogHeader>

            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary-500/20 flex items-center justify-center mx-auto mb-4 animate-fade-in">
                <span className="text-3xl">🧠</span>
              </div>
              <h4 className="text-lg font-semibold text-dark-100 mb-2">¿Indexar "{pageTitle}"?</h4>
              <DialogDescription>
                Añadir este contenido a tu base de conocimiento vectorial te permitirá encontrarlo mediante búsqueda
                semántica en el chat.
              </DialogDescription>
            </div>

            <div className="bg-dark-800/50 rounded-xl p-4 mb-4 border border-dark-700/50">
              <h5 className="text-sm font-medium text-dark-300 mb-2">¿Qué significa indexar?</h5>
              <ul className="text-sm text-dark-400 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary-400">•</span>
                  El contenido se fragmenta en chunks manejables
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-400">•</span>
                  Cada chunk se convierte a un vector semántico
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-400">•</span>
                  Podrás hacer preguntas naturales sobre él
                </li>
              </ul>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={onSkip}>
                No, omitir
              </Button>
              <Button onClick={handleIndex}>
                <span className="mr-2">🔮</span>
                Sí, indexar ahora
              </Button>
            </DialogFooter>
          </>
        )}

        {status === "indexing" && (
          <div className="text-center py-8 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-primary-500/20 flex items-center justify-center mx-auto mb-4">
              <Spinner size="lg" />
            </div>
            <h4 className="text-lg font-semibold text-dark-100 mb-2">Indexando...</h4>
            <p className="text-sm text-dark-400 mb-4">Generando embeddings y guardando en Supabase</p>
            <Progress value={60} className="animate-pulse" />
          </div>
        )}

        {status === "success" && (
          <div className="text-center py-8 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✅</span>
            </div>
            <h4 className="text-lg font-semibold text-green-400 mb-2">¡Indexado correctamente!</h4>
            <p className="text-sm text-dark-400">Ahora puedes buscar este contenido en el chat</p>
          </div>
        )}

        {status === "error" && (
          <div className="text-center py-8 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">❌</span>
            </div>
            <h4 className="text-lg font-semibold text-red-400 mb-2">Error al indexar</h4>
            <p className="text-sm text-dark-400 mb-4">{error || "Ocurrió un error inesperado"}</p>
            <DialogFooter>
              <Button variant="ghost" onClick={onSkip}>
                Cerrar
              </Button>
              <Button onClick={handleIndex}>Reintentar</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
