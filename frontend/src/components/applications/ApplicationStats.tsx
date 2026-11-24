import React from 'react';
import { AlertCircle, BriefcaseBusiness, CalendarClock, CalendarDays, Loader2 } from 'lucide-react';
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
} from '../../types';
import type { ApplicationStatus, JobApplicationStats as Stats } from '../../types';

interface ApplicationStatsProps {
  stats: Stats | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

const statusAccents: Record<ApplicationStatus, string> = {
  SAVED: 'text-slate-200',
  APPLIED: 'text-sky-200',
  ASSESSMENT: 'text-amber-200',
  INTERVIEW: 'text-violet-200',
  OFFER: 'text-emerald-200',
  REJECTED: 'text-rose-200',
  WITHDRAWN: 'text-slate-400',
};

export const ApplicationStats: React.FC<ApplicationStatsProps> = ({
  stats,
  isLoading,
  error,
  onRetry,
}) => (
  <section className="space-y-3" aria-labelledby="application-stats-heading">
    <div className="flex items-center justify-between">
      <h2 id="application-stats-heading" className="text-sm font-semibold uppercase tracking-wider text-slate-400">Application overview</h2>
      {isLoading && <Loader2 className="h-4 w-4 animate-spin text-brand-300" aria-label="Loading application statistics" />}
    </div>

    {error && (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
        <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" />{error}</span>
        <button type="button" onClick={onRetry} className="text-xs font-semibold text-rose-100 underline underline-offset-2">Retry</button>
      </div>
    )}

    {!error && stats && (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="glass-card flex items-center gap-3 p-4">
          <span className="rounded-xl border border-brand-500/25 bg-brand-500/10 p-2.5 text-brand-300"><BriefcaseBusiness className="h-5 w-5" /></span>
          <div><p className="text-xs text-slate-400">Total applications</p><p className="mt-1 text-2xl font-bold text-white">{stats.total}</p></div>
        </article>
        <article className="glass-card flex items-center gap-3 p-4">
          <span className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-2.5 text-rose-200"><CalendarClock className="h-5 w-5" /></span>
          <div><p className="text-xs text-slate-400">Overdue follow-ups</p><p className="mt-1 text-2xl font-bold text-white">{stats.overdueFollowUps}</p></div>
        </article>
        <article className="glass-card flex items-center gap-3 p-4">
          <span className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-2.5 text-amber-200"><CalendarDays className="h-5 w-5" /></span>
          <div><p className="text-xs text-slate-400">Due within 7 days</p><p className="mt-1 text-2xl font-bold text-white">{stats.followUpsDueWithinSevenDays}</p></div>
        </article>
        <article className="glass-card p-4 sm:col-span-2 lg:col-span-1">
          <p className="mb-2 text-xs text-slate-400">By status</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {APPLICATION_STATUSES.map((status) => (
              <span key={status} className={`text-xs ${statusAccents[status]}`}>
                {APPLICATION_STATUS_LABELS[status]} <strong>{stats.byStatus[status] ?? 0}</strong>
              </span>
            ))}
          </div>
        </article>
      </div>
    )}
  </section>
);

export default ApplicationStats;
