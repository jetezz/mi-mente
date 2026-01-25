import { useState, useRef, useEffect } from 'react';
import type { AppSetting } from '../types';
import { CategorySelector } from './CategorySelector';
import { supabase, getUserCategories } from '../lib/supabase';
import { useStreamingChat } from '../hooks/useStreamingChat';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: {
    id: string;
    title: string;
    url?: string;
    notionUrl?: string;
    category?: string;
    similarity?: number;
    excerpts?: string[];
  }[];
  metadata?: {
    tokensUsed?: number;
    provider?: string;
    processingTimeMs?: number;
    searchMethod?: 'semantic' | 'notion_direct';
    chunksRetrieved?: number;
    pagesUsed?: number;
    chunksUsed?: number;
    method?: 'semantic' | 'notion_direct';
  };
}

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
}

// Función para obtener color según similitud
function getSimilarityColor(similarity: number): string {
  if (similarity >= 0.7) return 'text-green-400';
  if (similarity >= 0.5) return 'text-yellow-400';
  return 'text-red-400';
}

// Función para obtener badge de similitud
function getSimilarityBadge(similarity: number): string {
  if (similarity >= 0.7) return 'bg-green-500/20 border-green-500/30';
  if (similarity >= 0.5) return 'bg-yellow-500/20 border-yellow-500/30';
  return 'bg-red-500/20 border-red-500/30';
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [useSemanticSearch, setUseSemanticSearch] = useState(true);
  const [threshold, setThreshold] = useState(() => {
    // Recuperar threshold de localStorage o usar default
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('semanticThreshold');
      return saved ? parseFloat(saved) : 0.5;
    }
    return 0.5;
  });

  // Fetch default settings if no local override
  useEffect(() => {
    const fetchSettings = async () => {
      if (typeof window !== 'undefined' && !localStorage.getItem('semanticThreshold')) {
        try {
          // Use same URL strategy as useStreamingChat
          const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';
          const res = await fetch(`${apiUrl}/settings`);
          const data = await res.json();
          const setting = data.settings?.find((s: AppSetting) => s.key === 'search.default_threshold');
          if (setting) setThreshold(Number(setting.value));
        } catch (e) {
          // Ignore errors, stay with default
        }
      }
    };
    fetchSettings();
  }, []);
  const [showThresholdSlider, setShowThresholdSlider] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Streaming Hook con threshold
  const {
    startStream,
    isStreaming,
    streamedContent,
    sources,
    metadata,
    error: streamError,
    reset: resetStream
  } = useStreamingChat({
    userId: userId || undefined,
    useSemantic: useSemanticSearch,
    threshold
  });

  // Verificar autenticación y cargar categorías
  useEffect(() => {
    const checkAuthAndLoad = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      setUserId(session?.user?.id || null);

      if (session) {
        fetchCategories();
      }
    };

    checkAuthAndLoad();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      setUserId(session?.user?.id || null);
      if (session) {
        fetchCategories();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Guardar threshold en localStorage cuando cambie
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('semanticThreshold', String(threshold));
    }
  }, [threshold]);

  // Efecto para manejar el fin del streaming y guardar el mensaje
  const wasStreamingRef = useRef(false);

  useEffect(() => {
    if (wasStreamingRef.current && !isStreaming) {
      if (streamedContent) {
        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: streamedContent,
          sources: sources,
          metadata: metadata || undefined,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        resetStream();
      } else if (streamError) {
        const errorMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `❌ Error: ${streamError}`,
        };
        setMessages((prev) => [...prev, errorMessage]);
        resetStream();
      }
    }
    wasStreamingRef.current = isStreaming;
  }, [isStreaming, streamedContent, sources, metadata, streamError, resetStream]);

  // Scroll al último mensaje - solo cuando hay mensajes nuevos
  useEffect(() => {
    if (messages.length > 0 || isStreaming) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamedContent, isStreaming]);

  const fetchCategories = async () => {
    try {
      const cats = await getUserCategories();
      setCategories(cats);
    } catch (error) {
      // Silenciar errores de categorías
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    // Iniciar streaming con threshold actual
    const categoryId = selectedCategories.length > 0 ? selectedCategories[0].id : undefined;
    startStream(input, categoryId, threshold);
  };

  const clearChat = () => {
    setMessages([]);
    resetStream();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-h-[800px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-dark-700">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🧠</span>
          <div>
            <h2 className="text-lg font-semibold text-dark-100">Chat con tu Cerebro</h2>
            <p className="text-xs text-dark-500">
              {useSemanticSearch ? '🔮 Búsqueda Semántica' : '📄 Búsqueda Directa en Notion'}
              {useSemanticSearch && <span className="ml-2 text-primary-400">({Math.round(threshold * 100)}% min)</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Toggle Semántico */}
          <button
            onClick={() => setUseSemanticSearch(!useSemanticSearch)}
            className={`p-2 rounded-lg transition-colors ${useSemanticSearch
              ? 'bg-primary-500/20 text-primary-400'
              : 'bg-dark-700 text-dark-400'
              }`}
            title={useSemanticSearch ? 'Usando Búsqueda Semántica' : 'Usando Búsqueda Directa'}
          >
            {useSemanticSearch ? '🔮' : '📄'}
          </button>

          {/* Botón de ajustes de threshold */}
          {useSemanticSearch && (
            <button
              onClick={() => setShowThresholdSlider(!showThresholdSlider)}
              className={`p-2 rounded-lg transition-colors ${showThresholdSlider
                ? 'bg-accent-cyan/20 text-accent-cyan'
                : 'bg-dark-700 text-dark-400'
                }`}
              title="Ajustar umbral de similitud"
            >
              ⚙️
            </button>
          )}

          <CategorySelector
            categories={categories}
            selected={selectedCategories}
            onSelect={setSelectedCategories}
          />
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="p-2 rounded-lg bg-dark-700 hover:bg-dark-600 transition-colors"
              title="Limpiar chat"
            >
              <svg className="w-5 h-5 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Slider de Threshold (condicional) */}
      {showThresholdSlider && useSemanticSearch && (
        <div className="px-4 py-3 bg-dark-800/50 border-b border-dark-700">
          <div className="flex items-center gap-4">
            <span className="text-sm text-dark-400 whitespace-nowrap">Umbral de similitud:</span>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.1"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="flex-1 h-2 bg-dark-600 rounded-lg appearance-none cursor-pointer accent-primary-500"
            />
            <span className={`text-sm font-mono px-2 py-1 rounded ${getSimilarityBadge(threshold)} ${getSimilarityColor(threshold)}`}>
              {Math.round(threshold * 100)}%
            </span>
          </div>
          <p className="text-xs text-dark-500 mt-2">
            💡 Menor umbral = más resultados pero menos precisos. Mayor umbral = menos resultados pero más relevantes.
          </p>
        </div>
      )}

      {/* Área de mensajes */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isStreaming ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold text-dark-200 mb-2">
              ¿Qué quieres recordar?
            </h3>
            <p className="text-dark-500 max-w-md">
              Pregunta sobre el contenido que has guardado.
            </p>

            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {[
                '¿Qué aprendí sobre React?',
                '¿Cuáles son las mejores prácticas de...',
                'Resume lo que vi sobre IA',
              ].map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => setInput(suggestion)}
                  className="px-4 py-2 rounded-full bg-dark-700/50 text-dark-300 text-sm hover:bg-dark-700 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))
        )}

        {/* Mensaje en Streaming */}
        {isStreaming && (
          <ChatMessage
            message={{
              id: 'streaming',
              role: 'assistant',
              content: streamedContent,
              sources: sources,
            }}
            isStreaming={true}
          />
        )}

        {/* Error en streaming si ocurre antes de finalizar limpio */}
        {!isStreaming && streamError && messages.length === 0 && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
            Error: {streamError}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-dark-700">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu pregunta..."
            className="flex-1 px-4 py-3 rounded-xl bg-dark-700 border border-dark-600 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none text-dark-100 placeholder-dark-500 transition-colors"
            disabled={isStreaming}
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isStreaming ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// Componente de mensaje individual con porcentaje de similitud
function ChatMessage({ message, isStreaming = false }: { message: Message; isStreaming?: boolean }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isUser
        ? 'bg-dark-600'
        : 'bg-gradient-to-br from-primary-500 to-accent-pink'
        }`}>
        {isUser ? '👤' : '🧠'}
      </div>

      {/* Contenido */}
      <div className={`flex-1 max-w-[80%] ${isUser ? 'text-right' : ''}`}>
        <div className={`inline-block p-4 rounded-2xl ${isUser
          ? 'bg-primary-500/20 text-dark-100'
          : 'bg-dark-700/50 text-dark-200'
          }`}>
          {/* Renderizar markdown básico */}
          <div
            className="prose prose-invert prose-sm max-w-none"
            dangerouslySetInnerHTML={{
              __html: formatMarkdown(message.content) + (isStreaming ? '<span class="inline-block w-1.5 h-4 bg-primary-400 ml-1 animate-pulse align-middle"></span>' : '')
            }}
          />
        </div>

        {/* Fuentes con porcentaje de similitud */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="text-xs text-dark-500">Fuentes:</span>
            {message.sources.map((source) => (
              <a
                key={source.id}
                href={source.notionUrl || source.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-xs px-2 py-1 rounded-full border transition-colors flex items-center gap-1 ${getSimilarityBadge(source.similarity || 0)}`}
                title={source.excerpts?.[0] || source.title}
              >
                📄 {source.title.slice(0, 20)}{source.title.length > 20 ? '...' : ''}
                {source.similarity !== undefined && (
                  <span className={`ml-1 font-mono ${getSimilarityColor(source.similarity)}`}>
                    {Math.round(source.similarity * 100)}%
                  </span>
                )}
              </a>
            ))}
          </div>
        )}

        {/* Metadata - Solo al final */}
        {!isStreaming && (message.metadata || message.metadata?.tokensUsed) && (
          <div className="mt-1 text-xs text-dark-600 flex items-center gap-2">
            {message.metadata.provider && <span>{message.metadata.provider}</span>}
            {message.metadata.tokensUsed && (
              <><span>•</span><span>{message.metadata.tokensUsed} tokens</span></>
            )}
            {message.metadata.method && (
              <>
                <span>•</span>
                <span className={message.metadata.method === 'semantic' ? 'text-primary-400' : 'text-dark-400'}>
                  {message.metadata.method === 'semantic' ? '🔮 Semántico' : '📄 Directo'}
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Función simple de formateo markdown
function formatMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-dark-600 px-1 rounded">$1</code>')
    .replace(/\n/g, '<br>')
    .replace(/^- (.+)/gm, '• $1')
    .replace(/^(\d+)\. (.+)/gm, '$1. $2');
}
