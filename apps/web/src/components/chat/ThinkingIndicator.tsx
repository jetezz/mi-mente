import { cn } from "@/lib/utils";

interface ThinkingIndicatorProps {
  className?: string;
  text?: string;
}

export function ThinkingIndicator({
  className,
  text = "Pensando...",
}: ThinkingIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Animated Dots */}
      <div className="flex items-center gap-1">
        <span
          className="w-2 h-2 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full animate-bounce shadow-lg shadow-primary-500/30"
          style={{ animationDelay: "0ms", animationDuration: "600ms" }}
        />
        <span
          className="w-2 h-2 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full animate-bounce shadow-lg shadow-primary-500/30"
          style={{ animationDelay: "150ms", animationDuration: "600ms" }}
        />
        <span
          className="w-2 h-2 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full animate-bounce shadow-lg shadow-primary-500/30"
          style={{ animationDelay: "300ms", animationDuration: "600ms" }}
        />
      </div>

      {/* Text with subtle animation */}
      <span className="text-sm text-dark-400 animate-pulse">{text}</span>
    </div>
  );
}

export function StreamingCursor() {
  return (
    <span
      className={cn(
        "inline-block w-0.5 h-5 ml-0.5 align-middle rounded-full",
        "bg-gradient-to-b from-primary-400 to-primary-600",
        "animate-pulse shadow-lg shadow-primary-500/50"
      )}
    />
  );
}

interface LoadingDotsProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingDots({ className, size = "md" }: LoadingDotsProps) {
  const sizeClasses = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-2.5 h-2.5",
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {[0, 150, 300].map((delay, i) => (
        <span
          key={i}
          className={cn(
            sizeClasses[size],
            "bg-current rounded-full animate-bounce"
          )}
          style={{ animationDelay: `${delay}ms`, animationDuration: "600ms" }}
        />
      ))}
    </div>
  );
}

interface TypingIndicatorProps {
  className?: string;
  name?: string;
}

export function TypingIndicator({
  className,
  name = "Hybrid Brain",
}: TypingIndicatorProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-3 rounded-2xl",
        "bg-dark-800/50 border border-dark-700/50",
        "max-w-fit animate-fade-in",
        className
      )}
    >
      <div className="flex items-center gap-1">
        <span
          className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"
          style={{ animationDelay: "300ms" }}
        />
      </div>
      <span className="text-xs text-dark-500">{name} está escribiendo</span>
    </div>
  );
}
