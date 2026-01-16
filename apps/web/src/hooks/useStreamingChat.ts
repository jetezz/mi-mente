/**
 * useStreamingChat Hook
 * Hook para manejar chat con streaming SSE
 */

import { useState, useCallback, useRef } from 'react';

interface StreamSource {
  id: string;
  title: string;
  url?: string;
  notionUrl?: string;
  similarity?: number;
  excerpt?: string;
}

interface StreamMetadata {
  tokensUsed?: number;
  provider?: string;
  method?: 'semantic' | 'notion_direct';
  chunksUsed?: number;
}

interface UseStreamingChatOptions {
  apiUrl?: string;
  useSemantic?: boolean;
  userId?: string;
}

export function useStreamingChat(options: UseStreamingChatOptions = {}) {
  const {
    apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000',
    useSemantic = true,
    userId
  } = options;

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const [sources, setSources] = useState<StreamSource[]>([]);
  const [metadata, setMetadata] = useState<StreamMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const startStream = useCallback(async (
    question: string,
    categoryId?: string
  ) => {
    // Cancelar stream anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Reset state
    setIsStreaming(true);
    setStreamedContent('');
    setSources([]);
    setMetadata(null);
    setError(null);

    abortControllerRef.current = new AbortController();

    try {
      // Construir URL según el método
      const params = new URLSearchParams();
      params.append('question', question);
      if (categoryId) params.append('categoryId', categoryId);

      let endpoint: string;
      if (useSemantic && userId) {
        params.append('userId', userId);
        endpoint = `${apiUrl}/ask/semantic/stream?${params}`;
      } else {
        endpoint = `${apiUrl}/ask/stream?${params}`;
      }

      const response = await fetch(endpoint, {
        signal: abortControllerRef.current.signal,
        headers: {
          'Accept': 'text/event-stream',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(line.slice(6));

            switch (data.type) {
              case 'token':
                setStreamedContent(prev => prev + data.content);
                break;

              case 'sources':
                setSources(data.sources || []);
                break;

              case 'done':
                setMetadata({
                  tokensUsed: data.tokensUsed,
                  provider: data.provider,
                  method: data.method,
                  chunksUsed: data.chunksUsed,
                });
                break;

              case 'error':
                setError(data.error);
                break;
            }
          } catch {
            // Ignorar líneas JSON inválidas
          }
        }
      }

    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        // Stream cancelado, no es error
        return;
      }
      setError((err as Error).message);
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [apiUrl, useSemantic, userId]);

  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const reset = useCallback(() => {
    stopStream();
    setStreamedContent('');
    setSources([]);
    setMetadata(null);
    setError(null);
  }, [stopStream]);

  return {
    isStreaming,
    streamedContent,
    sources,
    metadata,
    error,
    startStream,
    stopStream,
    reset,
  };
}
