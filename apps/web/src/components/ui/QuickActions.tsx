/**
 * QuickActions Component
 * Navegación rápida reutilizable para sidebars
 */

import { SidebarCard } from './SidebarCard';
import { Button } from "./Button";


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
            <Button
              key={i}
              variant="secondary"
              size="sm"
              onClick={() => window.open(action.href, '_blank')}
              className="justify-start h-auto py-2 px-3 bg-dark-700/50 hover:bg-dark-700 text-dark-300 font-normal"
            >
              <span className="mr-2">{action.icon}</span>
              {action.label}
            </Button>
          ) : (
            <Button
              key={i}
              variant="secondary"
              size="sm"
              className="justify-start h-auto py-2 px-3 bg-dark-700/50 hover:bg-dark-700 text-dark-300 font-normal"
              asChild
            >
              <a href={action.href}>
                <span className="flex items-center">
                  <span className="mr-2">{action.icon}</span>
                  {action.label}
                </span>
              </a>
            </Button>
          )
        ))}
      </div>
    </SidebarCard>
  );
}
