/**
 * QuickActions Component
 * Navegación rápida reutilizable para sidebars
 */

import { SidebarCard } from './SidebarCard';

interface QuickAction {
  icon: string;
  label: string;
  href: string;
  external?: boolean;
}

interface QuickActionsProps {
  icon?: string;
  title?: string;
  actions: QuickAction[];
}

export function QuickActions({ icon = '⚡', title = 'Acciones rápidas', actions }: QuickActionsProps) {
  return (
    <SidebarCard icon={icon} title={title}>
      <div className="flex flex-col gap-2">
        {actions.map((action, i) => (
          action.external ? (
            <button
              key={i}
              onClick={() => window.open(action.href, '_blank')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-dark-700/50 hover:bg-dark-700 transition-colors text-dark-300 text-sm text-left"
            >
              <span>{action.icon}</span>
              {action.label}
            </button>
          ) : (
            <a
              key={i}
              href={action.href}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-dark-700/50 hover:bg-dark-700 transition-colors text-dark-300 text-sm"
            >
              <span>{action.icon}</span>
              {action.label}
            </a>
          )
        ))}
      </div>
    </SidebarCard>
  );
}
