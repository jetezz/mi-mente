import { useState, useRef, useEffect } from 'react';
import { CategorySelector } from './CategorySelector';
import { supabase, getUserCategories } from '../lib/supabase';

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
    tokensUsed: number;
    provider: string;
    processingTimeMs: number;
    searchMethod?: 'semantic' | 'notion_direct';
    chunksRetrieved?: number;
    pagesUsed?: number;
  };
}

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [useSemanticSearch, setUseSemanticSearch] = useState(true); // Default: usar búsqueda semántica
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';

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

    // Escuchar cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      setUserId(session?.user?.id || null);
      if (session) {
        fetchCategories();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchCategories = async () => {
    try {
      const cats = await getUserCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Verificar que el usuario esté autenticado para búsqueda semántica
      if (useSemanticSearch && !userId) {
        throw new Error('Debes iniciar sesión para usar la búsqueda semántica');
      }

      // Elegir endpoint según el método de búsqueda
      const endpoint = useSemanticSearch ? '/ask/semantic' : '/ask';
      const body = useSemanticSearch
        ? {
          userId,
          question: input,
          categoryId: selectedCategory?.id,
          maxChunks: 5,
        }
        : {
          question: input,
          categoryId: selectedCategory?.id,
          maxSources: 5,
        };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al procesar la pregunta');
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
        metadata: data.metadata,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-h-[800px]">
      {/* Header con selector de categoría */}
      <div className="flex items-center justify-between p-4 border-b border-dark-700">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🧠</span>
          <div>
            <h2 className="text-lg font-semibold text-dark-100">Chat con tu Cerebro</h2>
            <p className="text-xs text-dark-500">
              {useSemanticSearch ? '🔮 Búsqueda Semántica (Fase 6)' : '📄 Búsqueda Directa en Notion'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Toggle de búsqueda semántica */}
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
          <CategorySelector
            categories={categories}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
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

      {/* Área de mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold text-dark-200 mb-2">
              ¿Qué quieres recordar?
            </h3>
            <p className="text-dark-500 max-w-md">
              Pregunta sobre el contenido que has guardado. Selecciona una categoría
              para obtener respuestas más relevantes o deja vacío para buscar en todo.
            </p>

            {/* Sugerencias */}
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

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-pink flex items-center justify-center">
              🧠
            </div>
            <div className="flex-1 p-4 rounded-2xl bg-dark-700/50">
              <div className="flex items-center gap-2">
                <div className="animate-pulse flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-dark-400 text-sm">Pensando...</span>
              </div>
            </div>
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
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
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
        {selectedCategory && (
          <p className="mt-2 text-xs text-dark-500">
            🔍 Buscando en: <span className="text-primary-400">{selectedCategory.name}</span> y subcategorías
          </p>
        )}
      </form>
    </div>
  );
}

// Componente de mensaje individual
function ChatMessage({ message }: { message: Message }) {
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
              __html: formatMarkdown(message.content)
            }}
          />
        </div>

        {/* Fuentes */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="text-xs text-dark-500">Fuentes:</span>
            {message.sources.map((source) => (
              <a
                key={source.id}
                href={source.notionUrl || source.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-2 py-1 rounded-full bg-dark-700 text-primary-400 hover:bg-dark-600 transition-colors flex items-center gap-1"
                title={source.excerpts?.[0] || source.title}
              >
                📄 {source.title.slice(0, 25)}{source.title.length > 25 ? '...' : ''}
                {source.similarity !== undefined && (
                  <span className="text-dark-500 ml-1">
                    ({Math.round(source.similarity * 100)}%)
                  </span>
                )}
              </a>
            ))}
          </div>
        )}

        {/* Metadata */}
        {message.metadata && (
          <div className="mt-1 text-xs text-dark-600 flex items-center gap-2">
            <span>{message.metadata.provider}</span>
            <span>•</span>
            <span>{message.metadata.tokensUsed} tokens</span>
            <span>•</span>
            <span>{message.metadata.processingTimeMs}ms</span>
            {message.metadata.searchMethod && (
              <>
                <span>•</span>
                <span className={message.metadata.searchMethod === 'semantic' ? 'text-primary-400' : 'text-dark-400'}>
                  {message.metadata.searchMethod === 'semantic' ? '🔮 Semántico' : '📄 Directo'}
                </span>
              </>
            )}
            {message.metadata.chunksRetrieved !== undefined && (
              <>
                <span>•</span>
                <span>{message.metadata.chunksRetrieved} chunks</span>
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
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-dark-600 px-1 rounded">$1</code>')
    .replace(/\n/g, '<br>')
    .replace(/^- (.+)/gm, '• $1')
    .replace(/^(\d+)\. (.+)/gm, '$1. $2');
}
