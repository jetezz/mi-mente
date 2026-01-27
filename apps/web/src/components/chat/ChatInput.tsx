import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/Button";
import { Textarea } from "../ui/Textarea";

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
    <div className={cn("flex items-end gap-3 p-4 border-t border-dark-700 bg-dark-900/50", className)}>
      <div className="flex-1 relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading || disabled}
          rows={1}
          className={cn(
            "min-h-[48px] max-h-[200px] resize-none py-3 pr-12",
            "bg-dark-800 border-dark-700",
            "focus:border-primary-500 focus:ring-primary-500/20",
          )}
        />
        <div className="absolute right-3 bottom-2.5 text-xs text-dark-500">
          <kbd className="px-1.5 py-0.5 rounded bg-dark-700 text-dark-400">↵</kbd>
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!value.trim() || isLoading || disabled}
        size="icon"
        className="h-12 w-12 rounded-xl flex-shrink-0"
      >
        {isLoading ? (
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        )}
      </Button>
    </div>
  );
}

interface SuggestionChipsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  className?: string;
}

export function SuggestionChips({ suggestions, onSelect, className }: SuggestionChipsProps) {
  return (
    <div className={cn("flex flex-wrap gap-2 justify-center", className)}>
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => onSelect(suggestion)}
          className={cn(
            "px-4 py-2 rounded-full text-sm",
            "bg-dark-800/50 border border-dark-700 text-dark-300",
            "hover:bg-dark-700 hover:text-dark-100 hover:border-dark-600",
            "transition-all duration-200",
            "animate-fade-in",
          )}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
