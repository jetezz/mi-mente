import { cn } from "@/lib/utils";

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  className?: string;
  style?: React.CSSProperties;
  gradient?: "primary" | "cyan" | "pink" | "amber";
}

const gradientMap = {
  primary: "bg-primary-500/20",
  cyan: "bg-accent-cyan/20",
  pink: "bg-accent-pink/20",
  amber: "bg-accent-amber/20",
};

export function FeatureCard({ icon, title, description, className, style, gradient = "primary" }: FeatureCardProps) {
  return (
    <div
      className={cn(
        "group flex items-center gap-3 p-4 rounded-xl",
        "bg-dark-800/30 border border-dark-700/50",
        "hover:bg-dark-800/50 hover:border-dark-600/50",
        "transition-all duration-300",
        className,
      )}
      style={style}
    >
      <div
        className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center text-xl",
          "transition-transform duration-300 group-hover:scale-110",
          gradientMap[gradient],
        )}
      >
        {icon}
      </div>
      <div>
        <h4 className="font-medium text-dark-200 group-hover:text-dark-100 transition-colors">{title}</h4>
        <p className="text-xs text-dark-500">{description}</p>
      </div>
    </div>
  );
}
