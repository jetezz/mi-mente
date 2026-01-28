import * as React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  shimmer?: boolean;
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, shimmer = true, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-lg bg-dark-800",
        shimmer && "animate-pulse",
        className
      )}
      {...props}
    />
  )
);
Skeleton.displayName = "Skeleton";

interface SkeletonTextProps extends React.HTMLAttributes<HTMLDivElement> {
  lines?: number;
}

const SkeletonText = React.forwardRef<HTMLDivElement, SkeletonTextProps>(
  ({ className, lines = 3, ...props }, ref) => (
    <div ref={ref} className={cn("space-y-2", className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            i === lines - 1 && lines > 1 ? "w-4/5" : "w-full"
          )}
        />
      ))}
    </div>
  )
);
SkeletonText.displayName = "SkeletonText";

const SkeletonCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl border border-dark-800/50 bg-dark-900/60 p-6 space-y-4",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <SkeletonText lines={3} />
    </div>
  )
);
SkeletonCard.displayName = "SkeletonCard";

export { Skeleton, SkeletonText, SkeletonCard };
