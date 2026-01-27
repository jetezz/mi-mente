import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";
import { Card, CardContent } from "./Card";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "ghost";
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  children?: ReactNode;
  className?: string;
  size?: "sm" | "default" | "lg";
}

export function EmptyState({
  icon = "📭",
  title,
  description,
  action,
  secondaryAction,
  children,
  className,
  size = "default",
}: EmptyStateProps) {
  const sizeStyles = {
    sm: {
      container: "py-8 px-4",
      icon: "text-4xl mb-3",
      title: "text-base font-medium",
      description: "text-xs max-w-xs",
    },
    default: {
      container: "py-12 px-4",
      icon: "text-5xl mb-4",
      title: "text-lg font-semibold",
      description: "text-sm max-w-md",
    },
    lg: {
      container: "py-16 px-6",
      icon: "text-6xl mb-6",
      title: "text-xl font-bold",
      description: "text-base max-w-lg",
    },
  };

  const styles = sizeStyles[size];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center animate-fade-in",
        styles.container,
        className,
      )}
      role="status"
      aria-label={title}
    >
      <span className={cn(styles.icon, "animate-float")} aria-hidden="true">
        {icon}
      </span>
      <h3 className={cn(styles.title, "text-dark-200 mb-2")}>{title}</h3>
      {description && <p className={cn(styles.description, "text-dark-400 mb-6")}>{description}</p>}
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {action && (
            <Button onClick={action.onClick} variant={action.variant || "default"}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button onClick={secondaryAction.onClick} variant="ghost">
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

export function EmptyStateCard({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  size,
}: EmptyStateProps) {
  return (
    <Card className={cn("animate-fade-in", className)}>
      <CardContent className="p-0">
        <EmptyState
          icon={icon}
          title={title}
          description={description}
          action={action}
          secondaryAction={secondaryAction}
          size={size}
        />
      </CardContent>
    </Card>
  );
}
