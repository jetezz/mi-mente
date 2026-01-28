import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "../ui/Avatar";
import { SourceList } from "./SourceCard";
import { StreamingCursor } from "./ThinkingIndicator";
import { useMemo, useState } from "react";
import { Button } from "../ui/Button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/Tooltip";

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
      '<pre class="bg-dark-900/80 backdrop-blur-sm p-4 rounded-xl overflow-x-auto my-3 border border-dark-700/50"><code class="text-sm font-mono text-dark-200">$2</code></pre>'
    )
    .replace(
      /`(.*?)`/g,
      '<code class="bg-dark-800/80 px-1.5 py-0.5 rounded-md text-primary-300 text-sm font-mono">$1</code>'
    )
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-dark-50">$1</strong>')
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(
      /^### (.*$)/gm,
      '<h3 class="text-base font-semibold text-dark-50 mt-4 mb-2">$1</h3>'
    )
    .replace(
      /^## (.*$)/gm,
      '<h2 class="text-lg font-semibold text-dark-50 mt-5 mb-2">$1</h2>'
    )
    .replace(
      /^# (.*$)/gm,
      '<h1 class="text-xl font-bold text-dark-50 mt-5 mb-3">$1</h1>'
    )
    .replace(
      /^- (.+)/gm,
      '<li class="ml-4 list-disc list-inside text-dark-200 py-0.5">$1</li>'
    )
    .replace(
      /^(\d+)\. (.+)/gm,
      '<li class="ml-4 list-decimal list-inside text-dark-200 py-0.5">$1. $2</li>'
    )
    .replace(/\n\n/g, '</p><p class="mt-3">')
    .replace(/\n/g, "<br>");
}

export function MessageBubble({
  message,
  isStreaming = false,
  className,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const formattedContent = useMemo(() => {
    return formatMarkdown(message.content);
  }, [message.content]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "group py-6 transition-colors duration-200",
        isUser
          ? "bg-transparent"
          : "bg-dark-900/30 hover:bg-dark-900/40 -mx-4 px-4 rounded-xl",
        className
      )}
    >
      <div className="flex gap-4">
        {/* Avatar */}
        <Avatar
          className={cn(
            "w-8 h-8 flex-shrink-0 ring-2 ring-offset-2 ring-offset-dark-950",
            isUser
              ? "bg-dark-700 ring-dark-600"
              : "bg-gradient-to-br from-primary-500 to-accent-pink ring-primary-500/50 shadow-lg shadow-primary-500/20"
          )}
        >
          <AvatarFallback className="text-sm">{isUser ? "👤" : "🧠"}</AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-dark-200">
              {isUser ? "Tú" : "Hybrid Brain"}
            </span>
            {!isUser && !isStreaming && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-dark-500 hover:text-dark-200"
                        onClick={handleCopy}
                      >
                        {copied ? (
                          <svg
                            className="w-3.5 h-3.5 text-emerald-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{copied ? "¡Copiado!" : "Copiar"}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>

          {/* Message Content */}
          <div
            className={cn(
              "prose prose-invert prose-sm max-w-none",
              "prose-p:text-dark-200 prose-p:leading-relaxed",
              "prose-headings:text-dark-50",
              "prose-strong:text-dark-100",
              "prose-code:text-primary-300",
              "prose-pre:bg-dark-900/80",
              isUser && "text-dark-100"
            )}
            dangerouslySetInnerHTML={{ __html: formattedContent }}
          />
          {isStreaming && <StreamingCursor />}

          {/* Sources */}
          {!isUser && message.sources && message.sources.length > 0 && (
            <SourceList sources={message.sources} compact />
          )}

          {/* Metadata */}
          {!isStreaming && !isUser && message.metadata && (
            <MessageMetadataDisplay metadata={message.metadata} />
          )}
        </div>
      </div>
    </div>
  );
}

function MessageMetadataDisplay({ metadata }: { metadata: MessageMetadata }) {
  const items: Array<{ key: string; value: React.ReactNode }> = [];

  if (metadata.provider) {
    items.push({ key: "provider", value: metadata.provider });
  }
  if (metadata.tokensUsed) {
    items.push({ key: "tokens", value: `${metadata.tokensUsed} tokens` });
  }
  if (metadata.processingTimeMs) {
    items.push({
      key: "time",
      value: `${(metadata.processingTimeMs / 1000).toFixed(1)}s`,
    });
  }
  if (metadata.method) {
    items.push({
      key: "method",
      value: (
        <span
          className={cn(
            "inline-flex items-center gap-1",
            metadata.method === "semantic" ? "text-primary-400" : "text-dark-400"
          )}
        >
          {metadata.method === "semantic" ? "🔮" : "📄"}
          <span>{metadata.method === "semantic" ? "Semántico" : "Directo"}</span>
        </span>
      ),
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-dark-500 pt-2 border-t border-dark-800/50">
      {items.map((item, index) => (
        <span key={item.key} className="inline-flex items-center gap-1">
          {index > 0 && <span className="text-dark-700 mr-2">•</span>}
          {item.value}
        </span>
      ))}
    </div>
  );
}
