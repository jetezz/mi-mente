import { ResultDisplay } from "./dashboard/ResultDisplay";

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

interface ResultCardProps {
  note: NoteResult;
  onReset: () => void;
}

export function ResultCard(props: ResultCardProps) {
  return <ResultDisplay {...props} />;
}
