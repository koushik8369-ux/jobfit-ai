import React from 'react';
import { Link } from 'react-router-dom';
import { BriefcaseBusiness } from 'lucide-react';
import { APPLICATION_STATUSES, APPLICATION_STATUS_LABELS } from '../../types';
import type { DashboardApplicationOverview } from '../../types';

const statusStyles: Record<string, string> = {
  SAVED: 'bg-slate-500',
  APPLIED: 'bg-sky-500',
  ASSESSMENT: 'bg-amber-500',
  INTERVIEW: 'bg-violet-500',
  OFFER: 'bg-emerald-500',
  REJECTED: 'bg-rose-500',
  WITHDRAWN: 'bg-slate-700',
};

export const ApplicationOverviewCard: React.FC<{ overview: DashboardApplicationOverview }> = ({ overview }) => (
  <section className="glass-card h-full p-5 sm:p-6" aria-labelledby="application-overview-heading">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pipeline</p>
        <h2 id="application-overview-heading" className="mt-1 text-lg font-semibold text-white">Application overview</h2>
      </div>
      <span className="rounded-xl border border-brand-500/20 bg-brand-500/10 p-2.5 text-brand-300">
        <BriefcaseBusiness className="h-5 w-5" />
      </span>
    </div>
    {overview.total === 0 ? (
      <div className="mt-5 rounded-xl border border-dashed border-slate-800 px-4 py-8 text-center">
        <p className="text-sm text-slate-300">No applications tracked yet.</p>
        <Link className="mt-2 inline-flex text-xs font-semibold text-brand-300 hover:text-brand-200" to="/applications">Add your first application</Link>
      </div>
    ) : (
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {APPLICATION_STATUSES.map((status) => (
          <article key={status} className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${statusStyles[status]}`} aria-hidden="true" />
              <span className="text-xs text-slate-400">{APPLICATION_STATUS_LABELS[status]}</span>
            </div>
            <p className="mt-2 text-xl font-bold text-white">{overview.byStatus[status] ?? 0}</p>
          </article>
        ))}
      </div>
    )}
  </section>
);
