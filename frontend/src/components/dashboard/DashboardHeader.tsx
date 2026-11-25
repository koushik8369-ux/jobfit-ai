import React from 'react';
import { LayoutDashboard, Target, UserCircle2 } from 'lucide-react';
import type { DashboardResponse } from '../../types';

interface DashboardHeaderProps {
  dashboard: DashboardResponse;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ dashboard }) => {
  const completion = dashboard.careerOverview.profileCompletionPercentage;
  const plan = dashboard.careerOverview.plan;
  const summary = plan
    ? `${plan.progress.completionPercent}% career-plan progress`
    : `${completion}% profile completion`;

  return (
    <header className="flex flex-col justify-between gap-4 border-b border-slate-800 pb-5 sm:flex-row sm:items-end">
      <div>
        <h1 className="flex items-center gap-3 text-2xl font-bold text-white sm:text-3xl">
          <LayoutDashboard className="h-7 w-7 text-brand-400" />
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Welcome back, {dashboard.fullName}. {summary}.
        </p>
      </div>
      <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-brand-500/20 bg-brand-500/10 px-3 py-1.5 text-xs font-medium text-brand-300">
        {completion === 100
          ? <UserCircle2 className="h-3.5 w-3.5" />
          : <Target className="h-3.5 w-3.5" />}
        <span>{completion}% profile complete</span>
      </div>
    </header>
  );
};
