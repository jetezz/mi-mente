import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[120px] w-full rounded-xl border bg-dark-800/50 backdrop-blur-sm px-4 py-3 text-dark-100 transition-all duration-300 placeholder:text-dark-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-none",
          error
            ? "border-red-500 focus:ring-2 focus:ring-red-500/50"
            : "border-dark-700 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 hover:border-dark-600",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
