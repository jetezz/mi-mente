import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "../ui/Avatar";
import { SourceList } from "./SourceCard";
import { StreamingCursor } from "./ThinkingIndicator";
import { useMemo } from "react";

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

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  className?: string;
}

function formatMarkdown(text: string): string {
  if (!text) return "";
  return text
    .replace(
      /```(\w*)\n([\s\S]*?)```/g,
      '<pre class="bg-dark-800 p-3 rounded-lg overflow-x-auto my-2"><code class="text-sm">$2</code></pre>',
    )
    .replace(/`(.*?)`/g, '<code class="bg-dark-700 px-1.5 py-0.5 rounded text-primary-300 text-sm">$1</code>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-dark-100">$1</strong>')
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold text-dark-100 mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold text-dark-100 mt-4 mb-2">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-dark-100 mt-4 mb-2">$1</h1>')
    .replace(/^- (.+)/gm, '<li class="ml-4 list-disc list-inside text-dark-200">$1</li>')
    .replace(/^(\d+)\. (.+)/gm, '<li class="ml-4 list-decimal list-inside text-dark-200">$1. $2</li>')
    .replace(/\n\n/g, '</p><p class="mt-2">')
    .replace(/\n/g, "<br>");
}

export function MessageBubble({ message, isStreaming = false, className }: MessageBubbleProps) {
  const isUser = message.role === "user";

  const formattedContent = useMemo(() => {
    return formatMarkdown(message.content);
  }, [message.content]);

  return (
    <div className={cn("flex gap-3 animate-fade-in", isUser ? "flex-row-reverse" : "flex-row", className)}>
      <Avatar
        className={cn(
          "w-9 h-9 flex-shrink-0",
          isUser ? "bg-dark-700" : "bg-gradient-to-br from-primary-500 to-accent-pink",
        )}
      >
        <AvatarFallback className="text-lg">{isUser ? "👤" : "🧠"}</AvatarFallback>
      </Avatar>

      <div className={cn("flex-1 max-w-[85%] space-y-1", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "inline-block px-4 py-3 rounded-2xl",
            isUser ? "bg-primary-600/20 text-dark-100 rounded-tr-md" : "bg-dark-800/80 text-dark-200 rounded-tl-md",
            "shadow-sm",
          )}
        >
          <div
            className="prose prose-invert prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: formattedContent }}
          />
          {isStreaming && <StreamingCursor />}
        </div>

        {!isUser && message.sources && message.sources.length > 0 && <SourceList sources={message.sources} compact />}

        {!isStreaming && !isUser && message.metadata && <MessageMetadataDisplay metadata={message.metadata} />}
      </div>
    </div>
  );
}

function MessageMetadataDisplay({ metadata }: { metadata: MessageMetadata }) {
  const items = [];

  if (metadata.provider) {
    items.push(metadata.provider);
  }
  if (metadata.tokensUsed) {
    items.push(`${metadata.tokensUsed} tokens`);
  }
  if (metadata.processingTimeMs) {
    items.push(`${(metadata.processingTimeMs / 1000).toFixed(1)}s`);
  }
  if (metadata.method) {
    items.push(
      <span key="method" className={metadata.method === "semantic" ? "text-primary-400" : "text-dark-400"}>
        {metadata.method === "semantic" ? "🔮 Semántico" : "📄 Directo"}
      </span>,
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-dark-500 mt-1 ml-1">
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1">
          {index > 0 && <span className="text-dark-600">•</span>}
          {item}
        </span>
      ))}
    </div>
  );
}
