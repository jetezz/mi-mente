import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { MessageBubble } from "./MessageBubble";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { SuggestionChips } from "./ChatInput";

interface Source {
  id: string;
  title: string;
  url?: string;
  notionUrl?: string;
  category?: string;
  similarity?: number;
  excerpts?: string[];
}

interface MessageMetadata {
  tokensUsed?: number;
  provider?: string;
  processingTimeMs?: number;
  searchMethod?: "semantic" | "notion_direct";
  chunksRetrieved?: number;
  pagesUsed?: number;
  chunksUsed?: number;
  method?: "semantic" | "notion_direct";
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  metadata?: MessageMetadata;
}

interface ChatMessagesProps {
  messages: Message[];
  isStreaming?: boolean;
  streamingContent?: string;
  streamingSources?: Source[];
  onSuggestionSelect?: (suggestion: string) => void;
  suggestions?: string[];
  className?: string;
}

export function ChatMessages({
  messages,
  isStreaming = false,
  streamingContent = "",
  streamingSources = [],
  onSuggestionSelect,
  suggestions = [
    "¿Qué aprendí sobre React?",
    "¿Cuáles son las mejores prácticas de...",
    "Resume lo que vi sobre IA",
  ],
  className,
}: ChatMessagesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length > 0 || isStreaming) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamingContent, isStreaming]);

  const isEmpty = messages.length === 0 && !isStreaming;

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex-1 overflow-y-auto",
        isEmpty ? "flex items-center justify-center" : "",
        className
      )}
    >
      {isEmpty ? (
        <EmptyChat
          suggestions={suggestions}
          onSuggestionSelect={onSuggestionSelect}
        />
      ) : (
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-1">
          {messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              className={cn(index === 0 && "animate-fade-in")}
            />
          ))}

          {isStreaming && (
            <>
              {streamingContent ? (
                <MessageBubble
                  message={{
                    id: "streaming",
                    role: "assistant",
                    content: streamingContent,
                    sources: streamingSources,
                  }}
                  isStreaming
                />
              ) : (
                <div className="py-6 animate-fade-in">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-pink flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary-500/20">
                      <span className="text-sm">🧠</span>
                    </div>
                    <div className="flex-1 pt-1">
                      <ThinkingIndicator />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div ref={endRef} className="h-4" />
        </div>
      )}
    </div>
  );
}

interface EmptyChatProps {
  suggestions?: string[];
  onSuggestionSelect?: (suggestion: string) => void;
}

function EmptyChat({ suggestions, onSuggestionSelect }: EmptyChatProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center max-w-lg mx-auto">
      {/* Brain Icon with Gradient Background */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/30 to-accent-pink/30 blur-3xl rounded-full scale-150" />
        <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shadow-2xl shadow-primary-500/30 animate-float">
          <span className="text-4xl">🧠</span>
        </div>
      </div>

      {/* Title */}
      <h2 className="text-2xl font-display font-bold text-dark-50 mb-3">
        ¿Qué quieres recordar?
      </h2>

      {/* Description */}
      <p className="text-dark-400 mb-8 leading-relaxed">
        Pregunta sobre cualquier contenido que hayas guardado en tu segundo
        cerebro. Buscaré en tus notas y te daré la información más relevante.
      </p>

      {/* Feature Pills */}
      <div className="flex flex-wrap gap-2 justify-center mb-8">
        <FeaturePill icon="🔮" text="Búsqueda Semántica" />
        <FeaturePill icon="📚" text="Fuentes Citadas" />
        <FeaturePill icon="⚡" text="Respuestas Instantáneas" />
      </div>

      {/* Suggestions */}
      {onSuggestionSelect && suggestions && suggestions.length > 0 && (
        <div className="w-full">
          <p className="text-xs text-dark-500 uppercase tracking-wider mb-3 font-medium">
            Prueba preguntando
          </p>
          <SuggestionChips suggestions={suggestions} onSelect={onSuggestionSelect} />
        </div>
      )}
    </div>
  );
}

function FeaturePill({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-dark-800/60 border border-dark-700/50 text-xs text-dark-300">
      <span>{icon}</span>
      <span>{text}</span>
    </div>
  );
}
