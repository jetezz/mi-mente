/**
 * PageHeader Component
 * Header reutilizable para todas las páginas de la app
 */

interface BadgeConfig {
  text: string;
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning';
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string | BadgeConfig;
  icon?: string;
}

export function PageHeader({ title, subtitle, badge, icon }: PageHeaderProps) {
  const getBadgeContent = () => {
    if (!badge) return null;
    if (typeof badge === 'string') return { text: badge, variant: 'primary' };
    return { text: badge.text, variant: badge.variant || 'primary' };
  };

  const badgeConfig = getBadgeContent();

  const getBadgeStyles = (variant: string) => {
    switch (variant) {
      case 'secondary': return 'bg-dark-300 text-dark-800';
      case 'accent': return 'bg-accent-cyan/20 text-accent-cyan';
      case 'success': return 'bg-green-500/20 text-green-400';
      case 'warning': return 'bg-yellow-500/20 text-yellow-400';
      case 'primary':
      default: return 'bg-primary-500/20 text-primary-400';
    }
  };

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-2">
        {icon && <span className="text-3xl">{icon}</span>}
        <h1 className="text-3xl font-display font-bold text-dark-100">
          {title}
        </h1>
        {badgeConfig && (
          <span className={`px-2 py-1 text-xs rounded-full ${getBadgeStyles(badgeConfig.variant!)}`}>
            {badgeConfig.text}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="text-dark-400">{subtitle}</p>
      )}
    </div>
  );
}
