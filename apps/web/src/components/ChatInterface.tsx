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
          const setting = data.settings?.find((s: AppSetting) => s.key === "search.default_threshold");
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
      setMessages(prev => [...prev, assistantMessage]);
      resetStream();
    } else if (!isStreaming && streamError) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `❌ Error: ${streamError}`,
      };
      setMessages(prev => [...prev, errorMessage]);
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

    setMessages(prev => [...prev, userMessage]);

    const categoryId = selectedCategories.length > 0 ? selectedCategories[0].id : undefined;
    startStream(input, categoryId, threshold);
  };

  const clearChat = () => {
    setMessages([]);
    resetStream();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-h-[800px] bg-dark-900/30 rounded-xl border border-dark-800 overflow-hidden">
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
          <CategorySelector categories={categories} selected={selectedCategories} onSelect={setSelectedCategories} />
        }
      />

      <ChatMessages
        messages={messages}
        isStreaming={isStreaming}
        streamingContent={streamedContent}
        streamingSources={sources}
        onSuggestionSelect={handleSubmit}
      />

      {streamError && !isStreaming && messages.length === 0 && (
        <div className="mx-4 mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          Error: {streamError}
        </div>
      )}

      <ChatInput
        onSubmit={handleSubmit}
        isLoading={isStreaming}
        disabled={!isAuthenticated}
        placeholder={isAuthenticated ? "Escribe tu pregunta..." : "Inicia sesión para chatear"}
      />
    </div>
  );
}
