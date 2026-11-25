import React from 'react';
import { Link } from 'react-router-dom';
import { Award, BriefcaseBusiness, CalendarCheck, Target } from 'lucide-react';
import type { DashboardResponse } from '../../types';

interface CareerSummaryCardsProps {
  dashboard: DashboardResponse;
}

export const CareerSummaryCards: React.FC<CareerSummaryCardsProps> = ({ dashboard }) => {
  const { careerOverview, applicationOverview } = dashboard;
  const completion = careerOverview.profileCompletionPercentage;
  const plan = careerOverview.plan;

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Career overview">
      <article className="glass-card space-y-3 p-5">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-semibold uppercase tracking-wider">Profile progress</span>
          <Target className="h-4 w-4 text-brand-400" />
        </div>
        <div className="text-2xl font-bold text-white">{completion}%</div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-label="Profile completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion}>
          <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-cyan-400" style={{ width: `${completion}%` }} />
        </div>
        <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
          <span>{careerOverview.skillCount} skills saved</span>
          {completion < 100 && <Link className="font-semibold text-brand-300 hover:text-brand-200" to="/profile">Complete profile</Link>}
        </div>
      </article>

      <article className="glass-card space-y-3 p-5">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-semibold uppercase tracking-wider">Career plan</span>
          <CalendarCheck className="h-4 w-4 text-emerald-400" />
        </div>
        {plan ? (
          <>
            <div className="text-2xl font-bold text-white">{plan.progress.completionPercent}%</div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-label="Career plan completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={plan.progress.completionPercent}>
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${plan.progress.completionPercent}%` }} />
            </div>
            <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
              <span>{plan.progress.completedItems}/{plan.progress.totalItems} actions complete</span>
              <Link className="font-semibold text-brand-300 hover:text-brand-200" to="/career-plan">View plan</Link>
            </div>
          </>
        ) : (
          <>
            <p className="text-lg font-semibold text-white">No active plan</p>
            <p className="text-xs leading-5 text-slate-500">Generate a practical roadmap from your saved career context.</p>
            <Link className="inline-flex text-xs font-semibold text-brand-300 hover:text-brand-200" to="/career-plan">Create career plan</Link>
          </>
        )}
      </article>

      <article className="glass-card space-y-3 p-5 sm:col-span-2 lg:col-span-1">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-semibold uppercase tracking-wider">Active applications</span>
          <BriefcaseBusiness className="h-4 w-4 text-violet-400" />
        </div>
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-2xl font-bold text-white">{applicationOverview.activeTotal}</div>
            <p className="text-xs text-slate-500">{applicationOverview.total} total tracked</p>
          </div>
          <Award className="h-8 w-8 text-slate-700" aria-hidden="true" />
        </div>
        <Link className="inline-flex text-xs font-semibold text-brand-300 hover:text-brand-200" to="/applications">
          Manage applications
        </Link>
      </article>
    </section>
  );
};
