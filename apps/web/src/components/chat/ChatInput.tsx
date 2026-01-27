import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/Button";

interface ChatInputProps {
  onSubmit: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function ChatInput({
  onSubmit,
  isLoading = false,
  placeholder = "Escribe tu pregunta...",
  disabled = false,
  className,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleSubmit = () => {
    if (!value.trim() || isLoading || disabled) return;
    onSubmit(value.trim());
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={cn("border-t border-dark-800/50 bg-dark-950/80 backdrop-blur-xl", className)}>
      <div className="max-w-4xl mx-auto p-4">
        <div className="relative flex items-end gap-3 bg-dark-900/60 rounded-2xl border border-dark-700/50 p-2 shadow-xl shadow-dark-950/50 focus-within:border-primary-500/50 focus-within:ring-2 focus-within:ring-primary-500/10 transition-all duration-200">
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading || disabled}
            rows={1}
            className={cn(
              "flex-1 min-h-[44px] max-h-[200px] resize-none py-3 px-4",
              "bg-transparent border-0 text-dark-100 placeholder:text-dark-500",
              "focus:outline-none focus:ring-0",
              "text-sm leading-relaxed",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          />

          {/* Actions */}
          <div className="flex items-center gap-2 pb-1.5">
            {/* Keyboard Hint */}
            <div className="hidden sm:flex items-center gap-1 text-xs text-dark-600 mr-1">
              <kbd className="px-1.5 py-0.5 rounded bg-dark-800 text-dark-500 font-mono text-[10px]">
                Enter
              </kbd>
              <span>enviar</span>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={!value.trim() || isLoading || disabled}
              size="icon"
              className={cn(
                "h-10 w-10 rounded-xl flex-shrink-0",
                "bg-primary-600 hover:bg-primary-500",
                "shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30",
                "disabled:bg-dark-700 disabled:shadow-none disabled:opacity-50",
                "transition-all duration-200"
              )}
            >
              {isLoading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 10l7-7m0 0l7 7m-7-7v18"
                  />
                </svg>
              )}
            </Button>
          </div>
        </div>

        {/* Helper Text */}
        <p className="text-center text-xs text-dark-600 mt-3">
          Hybrid Brain puede cometer errores. Verifica la información importante.
        </p>
      </div>
    </div>
  );
}

interface SuggestionChipsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  className?: string;
}

export function SuggestionChips({
  suggestions,
  onSelect,
  className,
}: SuggestionChipsProps) {
  return (
    <div className={cn("flex flex-wrap gap-2 justify-center", className)}>
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => onSelect(suggestion)}
          className={cn(
            "group relative px-4 py-2.5 rounded-xl text-sm font-medium",
            "bg-dark-800/40 border border-dark-700/50 text-dark-300",
            "hover:bg-dark-800/70 hover:text-dark-100 hover:border-dark-600",
            "hover:shadow-lg hover:shadow-dark-950/50",
            "transition-all duration-200",
            "animate-fade-in"
          )}
          style={{ animationDelay: `${index * 75}ms` }}
        >
          <span className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-primary-400 opacity-60 group-hover:opacity-100 transition-opacity"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            {suggestion}
          </span>
        </button>
      ))}
    </div>
  );
}
