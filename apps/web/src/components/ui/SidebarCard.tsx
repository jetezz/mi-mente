/**
 * SidebarCard Component
 * Card reutilizable para sidebars con icono y título
 */

import type { ReactNode } from 'react';

interface SidebarCardProps {
  icon: string;
  title: string;
  children: ReactNode;
}

export function SidebarCard({ icon, title, children }: SidebarCardProps) {
  return (
    <div className="card p-4">
      <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wider mb-4 flex items-center gap-2">
        <span>{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

// Variantes específicas
interface TipItem {
  text: string;
  color?: string;
}

interface TipsCardProps {
  icon?: string;
  title?: string;
  tips: (string | TipItem)[];
}

export function TipsCard({ icon = '💡', title = 'Tips', tips }: TipsCardProps) {
  const normalizedTips = tips.map(t => typeof t === 'string' ? { text: t } : t);

  return (
    <SidebarCard icon={icon} title={title}>
      <ul className="space-y-3 text-sm text-dark-400">
        {normalizedTips.map((tip, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className={tip.color || 'text-primary-400'}>•</span>
            <span>{tip.text}</span>
          </li>
        ))}
      </ul>
    </SidebarCard>
  );
}

interface Step {
  number: number;
  text: string;
}

interface HowItWorksCardProps {
  icon?: string;
  title?: string;
  steps: (string | Step)[];
}

export function HowItWorksCard({ icon = '🎯', title = 'Cómo funciona', steps }: HowItWorksCardProps) {
  const normalizedSteps = steps.map((s, i) => {
    if (typeof s === 'string') return { number: i + 1, text: s };
    return s;
  });

  return (
    <SidebarCard icon={icon} title={title}>
      <ul className="space-y-3 text-sm text-dark-400">
        {normalizedSteps.map((step) => (
          <li key={step.number} className="flex items-start gap-2">
            <span className="text-primary-400 font-mono">{step.number}.</span>
            <span>{step.text}</span>
          </li>
        ))}
      </ul>
    </SidebarCard>
  );
}
