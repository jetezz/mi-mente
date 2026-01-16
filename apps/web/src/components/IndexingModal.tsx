/**
 * IndexingModal Component
 * Modal de confirmación para indexar contenido a Supabase vectors
 */

import { useState } from 'react';
import { Modal, ModalFooter } from './ui/Modal';

interface IndexingModalProps {
  isOpen: boolean;
  notionPageId: string;
  pageTitle: string;
  onIndex: () => Promise<void>;
  onSkip: () => void;
}

export function IndexingModal({
  isOpen,
  notionPageId,
  pageTitle,
  onIndex,
  onSkip,
}: IndexingModalProps) {
  const [isIndexing, setIsIndexing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'indexing' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleIndex = async () => {
    setIsIndexing(true);
    setStatus('indexing');
    setError(null);

    try {
      await onIndex();
      setStatus('success');
      // Cerrar automáticamente después de un momento
      setTimeout(() => {
        onSkip();
      }, 2000);
    } catch (err) {
      setStatus('error');
      setError((err as Error).message);
    } finally {
      setIsIndexing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onSkip}
      title="Indexar para Búsqueda Semántica"
      icon="🔮"
      size="md"
      showCloseButton={status !== 'indexing'}
    >
      {status === 'idle' && (
        <>
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🧠</span>
            </div>
            <h4 className="text-lg font-semibold text-dark-100 mb-2">
              ¿Indexar "{pageTitle}"?
            </h4>
            <p className="text-sm text-dark-400">
              Añadir este contenido a tu base de conocimiento vectorial
              te permitirá encontrarlo mediante búsqueda semántica en el chat.
            </p>
          </div>

          <div className="bg-dark-800/50 rounded-xl p-4 mb-4">
            <h5 className="text-sm font-medium text-dark-300 mb-2">
              ¿Qué significa indexar?
            </h5>
            <ul className="text-sm text-dark-400 space-y-1">
              <li>• El contenido se fragmenta en chunks manejables</li>
              <li>• Cada chunk se convierte a un vector semántico</li>
              <li>• Podrás hacer preguntas naturales sobre él</li>
            </ul>
          </div>

          <ModalFooter>
            <button
              onClick={onSkip}
              className="px-4 py-2 text-dark-400 hover:text-dark-200 transition-colors"
            >
              No, omitir
            </button>
            <button
              onClick={handleIndex}
              className="btn-primary"
            >
              🔮 Sí, indexar ahora
            </button>
          </ModalFooter>
        </>
      )}

      {status === 'indexing' && (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-primary-500/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-3xl">⏳</span>
          </div>
          <h4 className="text-lg font-semibold text-dark-100 mb-2">
            Indexando...
          </h4>
          <p className="text-sm text-dark-400">
            Generando embeddings y guardando en Supabase
          </p>
          <div className="mt-4 w-full bg-dark-700 rounded-full h-2">
            <div className="bg-primary-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      )}

      {status === 'success' && (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✅</span>
          </div>
          <h4 className="text-lg font-semibold text-green-400 mb-2">
            ¡Indexado correctamente!
          </h4>
          <p className="text-sm text-dark-400">
            Ahora puedes buscar este contenido en el chat
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">❌</span>
          </div>
          <h4 className="text-lg font-semibold text-red-400 mb-2">
            Error al indexar
          </h4>
          <p className="text-sm text-dark-400 mb-4">
            {error || 'Ocurrió un error inesperado'}
          </p>
          <ModalFooter>
            <button
              onClick={onSkip}
              className="px-4 py-2 text-dark-400 hover:text-dark-200"
            >
              Cerrar
            </button>
            <button
              onClick={handleIndex}
              className="btn-primary"
            >
              Reintentar
            </button>
          </ModalFooter>
        </div>
      )}
    </Modal>
  );
}
