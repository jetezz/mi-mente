import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-dark-950",
  {
    variants: {
      variant: {
        default: "bg-primary-500/20 text-primary-300 border-primary-500/30",
        secondary: "bg-dark-700/50 text-dark-300 border-dark-600/50",
        success: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        warning: "bg-amber-500/20 text-amber-300 border-amber-500/30",
        destructive: "bg-red-500/20 text-red-300 border-red-500/30",
        outline: "bg-transparent border-dark-600 text-dark-300",
        cyan: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
        pink: "bg-pink-500/20 text-pink-300 border-pink-500/30",
      },
      size: {
        default: "px-2.5 py-0.5",
        sm: "px-2 py-0.5 text-[10px]",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "destructive" | "outline" | "cyan" | "pink";
  size?: "default" | "sm" | "lg";
  dot?: boolean;
  pulse?: boolean;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, dot, pulse, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(badgeVariants({ variant, size, className }))}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full mr-1.5",
            variant === "success" && "bg-emerald-400",
            variant === "warning" && "bg-amber-400",
            variant === "destructive" && "bg-red-400",
            variant === "default" && "bg-primary-400",
            variant === "secondary" && "bg-dark-400",
            variant === "cyan" && "bg-cyan-400",
            variant === "pink" && "bg-pink-400",
            pulse && "animate-pulse"
          )}
        />
      )}
      {children}
    </div>
  )
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
