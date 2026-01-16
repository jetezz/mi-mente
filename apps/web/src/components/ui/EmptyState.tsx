/**
 * EmptyState Component
 * Estado vacío reutilizable para listas y contenido
 */

import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  children?: ReactNode;
}

export function EmptyState({ icon = '📭', title, description, action, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <span className="text-5xl mb-4">{icon}</span>
      <h3 className="text-lg font-semibold text-dark-200 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-dark-400 max-w-md mb-4">{description}</p>
      )}
      {action && (
        <button onClick={action.onClick} className="btn-primary">
          {action.label}
        </button>
      )}
      {children}
    </div>
  );
}

// Variante para cards
export function EmptyStateCard({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="card p-8">
      <EmptyState icon={icon} title={title} description={description} action={action} />
    </div>
  );
}
