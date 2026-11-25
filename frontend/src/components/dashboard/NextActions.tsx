import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, CircleAlert, TriangleAlert } from 'lucide-react';
import type { DashboardNextAction } from '../../types';

const priorityStyles: Record<DashboardNextAction['priority'], string> = {
  HIGH: 'border-rose-500/25 bg-rose-500/10 text-rose-200',
  MEDIUM: 'border-amber-500/25 bg-amber-500/10 text-amber-200',
  LOW: 'border-brand-500/25 bg-brand-500/10 text-brand-200',
};

const priorityIcons: Record<DashboardNextAction['priority'], React.ComponentType<{ className?: string }>> = {
  HIGH: CircleAlert,
  MEDIUM: TriangleAlert,
  LOW: CheckCircle2,
};

export const NextActions: React.FC<{ actions: DashboardNextAction[] }> = ({ actions }) => (
  <section className="glass-card h-full p-5 sm:p-6" aria-labelledby="next-actions-heading">
    <h2 id="next-actions-heading" className="text-lg font-semibold text-white">Next actions</h2>
    {actions.length === 0 ? (
      <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-sm text-emerald-200">
        You are up to date. Keep tracking applications and reviewing new opportunities.
      </div>
    ) : (
      <ol className="mt-5 space-y-3">
        {actions.map((action) => {
          const Icon = priorityIcons[action.priority];
          return (
            <li key={action.id} className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 rounded-lg border p-2 ${priorityStyles[action.priority]}`} aria-hidden="true">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">{action.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{action.description}</p>
                  <Link
                    to={action.path}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-300 hover:text-brand-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-300"
                  >
                    {action.actionLabel} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    )}
  </section>
);
