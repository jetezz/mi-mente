import { useState, useEffect } from "react";
import { API_URL } from "../lib/config";
import type { AppSetting } from "../types";
import { CategorySelector } from "./CategorySelector";
import { supabase, getUserCategories } from "../lib/supabase";
import { useStreamingChat } from "../hooks/useStreamingChat";
import { ChatMessages } from "./chat/ChatMessages";
import { ChatInput } from "./chat/ChatInput";
import { ChatHeader } from "./chat/ChatHeader";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
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
    searchMethod?: "semantic" | "notion_direct";
    chunksRetrieved?: number;
    pagesUsed?: number;
    chunksUsed?: number;
    method?: "semantic" | "notion_direct";
  };
}

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [useSemanticSearch, setUseSemanticSearch] = useState(true);
  const [threshold, setThreshold] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("semanticThreshold");
      return saved ? parseFloat(saved) : 0.5;
    }
    return 0.5;
  });
  const [showThresholdSlider, setShowThresholdSlider] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      if (typeof window !== "undefined" && !localStorage.getItem("semanticThreshold")) {
        try {
          const apiUrl = API_URL;
          const res = await fetch(`${apiUrl}/settings`);
          const data = await res.json();
          const setting = data.settings?.find(
            (s: AppSetting) => s.key === "search.default_threshold"
          );
          if (setting) setThreshold(Number(setting.value));
        } catch (e) {
          // Ignore errors
        }
      }
    };
    fetchSettings();
  }, []);

  const {
    startStream,
    isStreaming,
    streamedContent,
    sources,
    metadata,
    error: streamError,
    reset: resetStream,
  } = useStreamingChat({
    userId: userId || undefined,
    useSemantic: useSemanticSearch,
    threshold,
  });

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      setUserId(session?.user?.id || null);

      if (session) {
        fetchCategories();
      }
    };

    checkAuthAndLoad();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      setUserId(session?.user?.id || null);
      if (session) {
        fetchCategories();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("semanticThreshold", String(threshold));
    }
  }, [threshold]);

  useEffect(() => {
    if (!isStreaming && streamedContent) {
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: streamedContent,
        sources: sources,
        metadata: metadata || undefined,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      resetStream();
    } else if (!isStreaming && streamError) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `❌ Error: ${streamError}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
      resetStream();
    }
  }, [isStreaming, streamedContent, sources, metadata, streamError, resetStream]);

  const fetchCategories = async () => {
    try {
      const cats = await getUserCategories();
      setCategories(cats);
    } catch (error) {
      // Silently handle
    }
  };

  const handleSubmit = (input: string) => {
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);

    const categoryId = selectedCategories.length > 0 ? selectedCategories[0].id : undefined;
    startStream(input, categoryId, threshold);
  };

  const clearChat = () => {
    setMessages([]);
    resetStream();
  };

  return (
    <div
      className={cn(
        "flex flex-col h-[calc(100vh-120px)] min-h-[500px]",
        "bg-dark-950/50 backdrop-blur-xl",
        "rounded-2xl border border-dark-800/50",
        "shadow-2xl shadow-dark-950/50",
        "overflow-hidden"
      )}
    >
      {/* Header */}
      <ChatHeader
        useSemanticSearch={useSemanticSearch}
        onToggleSemantic={() => setUseSemanticSearch(!useSemanticSearch)}
        threshold={threshold}
        onThresholdChange={setThreshold}
        showThresholdSlider={showThresholdSlider}
        onToggleThresholdSlider={() => setShowThresholdSlider(!showThresholdSlider)}
        onClearChat={clearChat}
        hasMessages={messages.length > 0}
        categorySelector={
          <CategorySelector
            categories={categories}
            selected={selectedCategories}
            onSelect={setSelectedCategories}
          />
        }
      />

      {/* Messages */}
      <ChatMessages
        messages={messages}
        isStreaming={isStreaming}
        streamingContent={streamedContent}
        streamingSources={sources}
        onSuggestionSelect={handleSubmit}
        className="flex-1"
      />

      {/* Error Display */}
      {streamError && !isStreaming && messages.length === 0 && (
        <div className="mx-4 mb-4">
          <div
            className={cn(
              "p-4 rounded-xl",
              "bg-red-500/10 border border-red-500/20",
              "text-sm text-red-400"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-medium">Error de conexión</p>
                <p className="text-xs text-red-400/70 mt-1">{streamError}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <ChatInput
        onSubmit={handleSubmit}
        isLoading={isStreaming}
        disabled={!isAuthenticated}
        placeholder={
          isAuthenticated
            ? "Pregunta sobre tus notas..."
            : "Inicia sesión para chatear"
        }
      />
    </div>
  );
}
