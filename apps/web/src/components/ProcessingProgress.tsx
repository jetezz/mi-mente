import { ProcessingCard } from "./dashboard/ProcessingCard";

type ProcessingStep =
  | "idle"
  | "downloading"
  | "transcribing"
  | "summarizing"
  | "analyzing"
  | "preview"
  | "saving"
  | "indexing"
  | "done"
  | "error";

interface ProcessingProgressProps {
  currentStep: ProcessingStep;
  progress: number;
  error?: string;
  onRetry?: () => void;
}

export function ProcessingProgress(props: ProcessingProgressProps) {
  return <ProcessingCard {...props} />;
}
