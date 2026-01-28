import { useState } from "react";
import { API_URL } from "../lib/config";
import { InputSection, ProcessingCard, ResultDisplay } from "./dashboard";
import { Button } from "./ui/Button";

type ProcessingStep =
  | "idle"
  | "downloading"
  | "transcribing"
  | "summarizing"
  | "analyzing"
  | "saving"
  | "indexing"
  | "done"
  | "error";

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

export function Dashboard() {
  const [currentStep, setCurrentStep] = useState<ProcessingStep>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | undefined>();
  const [result, setResult] = useState<NoteResult | null>(null);

  const handleSubmit = async (url: string) => {
    setError(undefined);
    setResult(null);
    setCurrentStep("downloading");
    setProgress(0);

    try {
      const progressSteps: ProcessingStep[] = [
        "downloading",
        "transcribing",
        "summarizing",
        "analyzing",
        "saving",
        "indexing",
      ];

      let stepIndex = 0;
      const progressInterval = setInterval(() => {
        if (stepIndex < progressSteps.length - 1) {
          stepIndex++;
          setCurrentStep(progressSteps[stepIndex]);
          setProgress(Math.min((stepIndex / progressSteps.length) * 100, 95));
        }
      }, 8000);

      const response = await fetch(`${API_URL}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, saveToNotion: true }),
      });

      clearInterval(progressInterval);

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Error procesando el video");
      }

      setResult({
        id: data.note.id,
        title: data.note.title,
        summary: data.note.summary,
        keyPoints: data.note.keyPoints,
        tags: data.note.tags,
        sentiment: data.note.sentiment,
        originalUrl: data.note.originalUrl,
        notionPageId: data.note.notionPageId,
      });
      setProgress(100);
      setCurrentStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setCurrentStep("error");
    }
  };

  const handleReset = () => {
    setCurrentStep("idle");
    setProgress(0);
    setError(undefined);
    setResult(null);
  };

  const isProcessing = currentStep !== "idle" && currentStep !== "done" && currentStep !== "error";

  return (
    <div className="space-y-8">
      {currentStep === "idle" && <InputSection onSubmit={handleSubmit} isLoading={isProcessing} />}

      {(isProcessing || currentStep === "error") && (
        <ProcessingCard currentStep={currentStep} progress={progress} error={error} onRetry={handleReset} />
      )}

      {currentStep === "error" && (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={handleReset}>
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Intentar de nuevo
          </Button>
        </div>
      )}

      {currentStep === "done" && result && <ResultDisplay note={result} onReset={handleReset} />}
    </div>
  );
}
