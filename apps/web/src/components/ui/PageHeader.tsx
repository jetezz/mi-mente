import { cn } from "@/lib/utils";
import { Badge, badgeVariants } from "./Badge";
import type { ReactNode } from "react";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface BadgeConfig {
  text: string;
  variant?: "default" | "secondary" | "outline" | "success" | "warning" | "destructive";
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string | BadgeConfig;
  icon?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, badge, icon, breadcrumbs, actions, className }: PageHeaderProps) {
  const getBadgeConfig = (): BadgeConfig | null => {
    if (!badge) return null;
    if (typeof badge === "string") return { text: badge, variant: "default" };
    return badge;
  };

  const badgeConfig = getBadgeConfig();

  return (
    <div className={cn("mb-8 animate-fade-in", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-2 text-sm text-dark-500 mb-4" aria-label="Breadcrumb">
          <a href="/" className="hover:text-dark-300 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </a>
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center gap-2">
              <svg className="w-4 h-4 text-dark-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {crumb.href ? (
                <a href={crumb.href} className="hover:text-dark-300 transition-colors">
                  {crumb.label}
                </a>
              ) : (
                <span className="text-dark-300">{crumb.label}</span>
              )}
            </div>
          ))}
        </nav>
      )}

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            {icon && (
              <span className="text-3xl animate-float" style={{ animationDelay: "0.1s" }}>
                {icon}
              </span>
            )}
            <h1 className="text-3xl font-display font-bold text-dark-100">{title}</h1>
            {badgeConfig && <Badge variant={badgeConfig.variant}>{badgeConfig.text}</Badge>}
          </div>
          {subtitle && <p className="text-dark-400 max-w-2xl">{subtitle}</p>}
        </div>

        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
