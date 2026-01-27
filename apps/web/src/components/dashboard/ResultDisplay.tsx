import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Separator } from "@/components/ui/Separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";

interface NoteResult {
  id: string;
  title: string;
  summary: string;
  keyPoints: string[];
  tags: string[];
  sentiment: "positive" | "negative" | "neutral";
  originalUrl: string;
  notionPageId?: string;
}

interface ResultDisplayProps {
  note: NoteResult;
  onReset: () => void;
}

const sentimentConfig = {
  positive: { emoji: "😊", label: "Positivo", variant: "success" as const },
  negative: { emoji: "😟", label: "Negativo", variant: "destructive" as const },
  neutral: { emoji: "😐", label: "Neutral", variant: "secondary" as const },
};

export function ResultDisplay({ note, onReset }: ResultDisplayProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const sentiment = sentimentConfig[note.sentiment];

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <Card variant="glow" className="overflow-hidden animate-fade-in">
      <div className="bg-gradient-to-r from-primary-600/20 via-accent-cyan/10 to-accent-pink/20 p-6 border-b border-dark-800/50">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xl truncate mb-2">{note.title}</CardTitle>
            <a
              href={note.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-dark-400 hover:text-primary-400 transition-colors inline-flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              Ver original
            </a>
          </div>
          <Badge variant={sentiment.variant} className="shrink-0">
            {sentiment.emoji} {sentiment.label}
          </Badge>
        </div>
      </div>

      <CardContent className="p-6 space-y-6">
        <Section
          icon="📋"
          title="Resumen"
          onCopy={() => copyToClipboard(note.summary, "summary")}
          copied={copiedField === "summary"}
        >
          <p className="text-dark-200 leading-relaxed">{note.summary}</p>
        </Section>

        <Separator />

        <Section icon="💡" title="Puntos Clave">
          <ul className="space-y-3">
            {note.keyPoints.map((point, index) => (
              <li
                key={index}
                className="flex items-start gap-3 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <span className="w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center shrink-0 text-xs font-bold">
                  {index + 1}
                </span>
                <span className="text-dark-200">{point}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Separator />

        <Section icon="🏷️" title="Etiquetas">
          <div className="flex flex-wrap gap-2">
            {note.tags.map((tag, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                #{tag}
              </Badge>
            ))}
          </div>
        </Section>

        {note.notionPageId && (
          <>
            <Separator />
            <a
              href={`https://notion.so/${note.notionPageId.replace(/-/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center justify-center gap-2 w-full py-3",
                "bg-dark-800/50 hover:bg-dark-700/50",
                "border border-dark-700 hover:border-dark-600",
                "rounded-xl text-dark-200 transition-all duration-300",
              )}
            >
              <NotionIcon />
              Ver en Notion
            </a>
          </>
        )}
      </CardContent>

      <CardFooter className="p-6 bg-dark-900/50">
        <Button variant="secondary" className="w-full" onClick={onReset}>
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Procesar otro contenido
        </Button>
      </CardFooter>
    </Card>
  );
}

interface SectionProps {
  icon: string;
  title: string;
  onCopy?: () => void;
  copied?: boolean;
  children: React.ReactNode;
}

function Section({ icon, title, onCopy, copied, children }: SectionProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wider flex items-center gap-2">
          <span>{icon}</span> {title}
        </h3>
        {onCopy && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onCopy}
                  className={cn(
                    "p-1.5 rounded-md transition-colors",
                    copied ? "text-accent-emerald" : "text-dark-500 hover:text-dark-300 hover:bg-dark-800/50",
                  )}
                >
                  {copied ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>{copied ? "Copiado!" : "Copiar"}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {children}
    </div>
  );
}

function NotionIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 100 100" fill="currentColor">
      <path d="M6.017 4.313l55.333 -4.087c6.797 -0.583 8.543 -0.19 12.817 2.917l17.663 12.443c2.913 2.14 3.883 2.723 3.883 5.053v68.243c0 4.277 -1.553 6.807 -6.99 7.193L24.467 99.967c-4.08 0.193 -6.023 -0.39 -8.16 -3.113L3.3 79.94c-2.333 -3.113 -3.3 -5.443 -3.3 -8.167V11.113c0 -3.497 1.553 -6.413 6.017 -6.8z" />
    </svg>
  );
}
