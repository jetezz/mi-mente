import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { MessageBubble } from "./MessageBubble";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { SuggestionChips } from "./ChatInput";
import { EmptyState } from "../ui/EmptyState";

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
  suggestions = ["¿Qué aprendí sobre React?", "¿Cuáles son las mejores prácticas de...", "Resume lo que vi sobre IA"],
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
        "flex-1 overflow-y-auto p-4",
        isEmpty ? "flex items-center justify-center" : "space-y-6",
        className,
      )}
    >
      {isEmpty ? (
        <div className="text-center max-w-md">
          <EmptyState
            icon="🎯"
            title="¿Qué quieres recordar?"
            description="Pregunta sobre el contenido que has guardado en tu segundo cerebro."
            size="lg"
          >
            {onSuggestionSelect && suggestions.length > 0 && (
              <div className="mt-6">
                <SuggestionChips suggestions={suggestions} onSelect={onSuggestionSelect} />
              </div>
            )}
          </EmptyState>
        </div>
      ) : (
        <>
          {messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              className={cn(index === 0 && "animate-slide-in-bottom")}
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
                <div className="flex gap-3 animate-fade-in">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-pink flex items-center justify-center flex-shrink-0">
                    🧠
                  </div>
                  <div className="bg-dark-800/80 rounded-2xl rounded-tl-md px-4 py-3">
                    <ThinkingIndicator />
                  </div>
                </div>
              )}
            </>
          )}

          <div ref={endRef} />
        </>
      )}
    </div>
  );
}
