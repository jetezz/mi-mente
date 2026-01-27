/**
 * UI Components - Barrel Export
 * Shadcn-style component library for Hybrid Brain
 */

// Base Components (Shadcn-style with CVA)
export { Button, buttonVariants } from "./Button";
export type { ButtonProps } from "./Button";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants } from "./Card";
export type { CardProps } from "./Card";

export { Input, inputVariants } from "./Input";
export type { InputProps } from "./Input";

export { Textarea } from "./Textarea";
export type { TextareaProps } from "./Textarea";

export { Badge, badgeVariants } from "./Badge";
export type { BadgeProps } from "./Badge";

export { Spinner, spinnerVariants } from "./Spinner";
export type { SpinnerProps } from "./Spinner";

export { Skeleton, SkeletonText, SkeletonCard } from "./Skeleton";

export { Separator } from "./Separator";

export { Avatar, AvatarImage, AvatarFallback } from "./Avatar";

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "./Tooltip";

export { Switch } from "./Switch";

export { Label, labelVariants } from "./Label";

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
} from "./Select";

export { Progress } from "./Progress";

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "./Dialog";

export { Toaster, toast } from "./Sonner";

// Migrated Components
export { PageHeader } from "./PageHeader";
export { EmptyState, EmptyStateCard } from "./EmptyState";

// Layout Components (still in use)
export { SidebarCard, TipsCard, HowItWorksCard } from "./SidebarCard";
export { QuickActions } from "./QuickActions";
export { Stepper, VerticalStepper } from "./Stepper";
