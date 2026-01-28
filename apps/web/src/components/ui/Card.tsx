import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva("rounded-2xl border transition-all duration-300", {
  variants: {
    variant: {
      default: "bg-dark-900/60 backdrop-blur-xl border-dark-800/50 shadow-xl",
      elevated:
        "bg-dark-900/60 backdrop-blur-xl border-dark-800/50 shadow-xl hover:bg-dark-800/60 hover:border-dark-700/50 hover:shadow-2xl hover:-translate-y-1",
      interactive:
        "bg-dark-900/60 backdrop-blur-xl border-dark-800/50 shadow-xl cursor-pointer hover:bg-dark-800/60 hover:border-dark-700/50 hover:shadow-2xl hover:-translate-y-1 active:translate-y-0 active:scale-[0.99]",
      glass: "bg-white/5 backdrop-blur-xl border-white/10",
      glassDark: "bg-dark-900/40 backdrop-blur-xl border-dark-700/50",
      outline: "bg-transparent border-dark-700 hover:border-dark-600",
      glow: "bg-dark-900/60 backdrop-blur-xl border-dark-800/50 shadow-xl relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-primary-500/10 before:via-transparent before:to-accent-cyan/10 before:opacity-0 before:transition-opacity before:duration-500 hover:before:opacity-100",
    },
    padding: {
      none: "",
      sm: "p-4",
      default: "p-6",
      lg: "p-8",
    },
  },
  defaultVariants: {
    variant: "default",
    padding: "default",
  },
});

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "interactive" | "glass" | "glassDark" | "outline" | "glow";
  padding?: "none" | "sm" | "default" | "lg";
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, variant, padding, ...props }, ref) => (
  <div ref={ref} className={cn(cardVariants({ variant, padding, className }))} {...props} />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 pb-4", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-xl font-semibold leading-none tracking-tight text-dark-50", className)}
      {...props}
    />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => <p ref={ref} className={cn("text-sm text-dark-400", className)} {...props} />,
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("", className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center pt-4 border-t border-dark-800/50", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants };
