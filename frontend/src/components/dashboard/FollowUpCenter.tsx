import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, CalendarDays, ExternalLink } from 'lucide-react';
import type { DashboardFollowUp, DashboardFollowUps } from '../../types';

function formatFollowUpDate(value: string) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleDateString(undefined, { timeZone: 'UTC' });
}

const FollowUpList: React.FC<{
  title: string;
  items: DashboardFollowUp[];
  emptyLabel: string;
  overdue?: boolean;
}> = ({ title, items, emptyLabel, overdue = false }) => (
  <section aria-label={title}>
    <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
      {overdue ? <CalendarClock className="h-3.5 w-3.5 text-rose-300" /> : <CalendarDays className="h-3.5 w-3.5 text-amber-300" />}
      {title}
    </h3>
    {items.length === 0 ? (
      <p className="rounded-xl border border-dashed border-slate-800 px-3 py-4 text-xs text-slate-500">{emptyLabel}</p>
    ) : (
      <div className="space-y-2">
        {items.map((item) => (
          <Link
            key={item.id}
            to="/applications"
            className="block rounded-xl border border-slate-800 bg-slate-950/30 p-3 transition-colors hover:border-brand-500/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-300"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{item.jobTitle}</p>
                <p className="mt-0.5 truncate text-xs text-slate-400">{item.companyName}</p>
              </div>
              {item.applicationUrl && (
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
              )}
            </div>
            <p className={`mt-2 text-xs ${overdue ? 'text-rose-300' : 'text-amber-200'}`}>
              {overdue ? 'Overdue · ' : 'Due · '}{formatFollowUpDate(item.followUpDate)}
            </p>
          </Link>
        ))}
      </div>
    )}
  </section>
);

export const FollowUpCenter: React.FC<{ followUps: DashboardFollowUps }> = ({ followUps }) => (
  <section className="glass-card h-full p-5 sm:p-6" aria-labelledby="follow-up-heading">
    <h2 id="follow-up-heading" className="text-lg font-semibold text-white">Follow-up center</h2>
    <p className="mt-1 text-xs text-slate-500">Active applications with a scheduled follow-up.</p>
    <div className="mt-5 space-y-5">
      <FollowUpList
        title={`Overdue (${followUps.overdueCount})`}
        items={followUps.overdue}
        emptyLabel="No overdue follow-ups."
        overdue
      />
      <FollowUpList
        title={`Upcoming (${followUps.upcomingCount})`}
        items={followUps.upcoming}
        emptyLabel="No follow-ups due in the next seven days."
      />
    </div>
  </section>
);
