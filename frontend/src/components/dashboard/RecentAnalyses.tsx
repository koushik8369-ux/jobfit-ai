import React from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, History } from 'lucide-react';
import type { DashboardRecentAnalysis } from '../../types';

export const RecentAnalyses: React.FC<{ analyses: DashboardRecentAnalysis[] }> = ({ analyses }) => (
  <section className="glass-card h-full p-5 sm:p-6" aria-labelledby="recent-analyses-heading">
    <div className="flex items-center justify-between gap-3">
      <h2 id="recent-analyses-heading" className="text-lg font-semibold text-white">Recent Job Intelligence</h2>
      <History className="h-4 w-4 text-brand-400" aria-hidden="true" />
    </div>
    {analyses.length === 0 ? (
      <div className="mt-5 rounded-xl border border-dashed border-slate-800 px-4 py-8 text-center">
        <Briefcase className="mx-auto h-6 w-6 text-slate-600" aria-hidden="true" />
        <p className="mt-3 text-sm text-slate-300">No job analyses yet.</p>
        <Link className="mt-2 inline-flex text-xs font-semibold text-brand-300 hover:text-brand-200" to="/job-intelligence">
          Analyze your first job
        </Link>
      </div>
    ) : (
      <div className="mt-5 space-y-3">
        {analyses.map((analysis) => (
          <Link
            key={analysis.id}
            to="/job-intelligence"
            className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/30 p-4 transition-colors hover:border-brand-500/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-300"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-500/20 bg-brand-500/10 text-brand-300">
              <Briefcase className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{analysis.jobTitle}</p>
              <p className="mt-0.5 text-xs text-slate-400">{analysis.companyName || 'Hiring Company'}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-lg font-bold text-brand-300">{analysis.overallMatchScore}%</p>
              {analysis.createdAt && (
                <p className="text-[10px] text-slate-500">
                  {new Date(analysis.createdAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    )}
  </section>
);
