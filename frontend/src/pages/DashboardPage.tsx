import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { getAuthErrorMessage } from '../services/authService';
import { getDashboard } from '../services/api';
import type { DashboardResponse } from '../types';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { CareerSummaryCards } from '../components/dashboard/CareerSummaryCards';
import { ApplicationOverviewCard } from '../components/dashboard/ApplicationOverviewCard';
import { FollowUpCenter } from '../components/dashboard/FollowUpCenter';
import { RecentAnalyses } from '../components/dashboard/RecentAnalyses';
import { NextActions } from '../components/dashboard/NextActions';

export const DashboardPage: React.FC = () => {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestInFlight = useRef(false);
  const isMounted = useRef(false);

  const loadDashboard = useCallback(async () => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const response = await getDashboard();
      if (isMounted.current) setDashboard(response);
    } catch (err: unknown) {
      if (isMounted.current) {
        setError(getAuthErrorMessage(err, 'Unable to load your dashboard. Please try again.'));
      }
    } finally {
      requestInFlight.current = false;
      if (isMounted.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    void loadDashboard();
    return () => { isMounted.current = false; };
  }, [loadDashboard]);

  if (isLoading) {
    return <LoadingState label="Loading your dashboard..." />;
  }

  if (error || !dashboard) {
    return (
      <ErrorState
        message={error ?? 'Dashboard data is unavailable.'}
        onRetry={() => { void loadDashboard(); }}
      />
    );
  }

  return (
    <div className="space-y-8">
      <DashboardHeader dashboard={dashboard} />
      <CareerSummaryCards dashboard={dashboard} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <ApplicationOverviewCard overview={dashboard.applicationOverview} />
        </div>
        <div className="lg:col-span-5">
          <FollowUpCenter followUps={dashboard.followUps} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <NextActions actions={dashboard.nextActions} />
        </div>
        <div className="lg:col-span-7">
          <RecentAnalyses analyses={dashboard.recentAnalyses} />
        </div>
      </div>
    </div>
  );
};

const LoadingState: React.FC<{ label: string }> = ({ label }) => (
  <div className="min-h-[45vh] flex flex-col items-center justify-center gap-3 text-slate-400">
    <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
    <p className="text-sm">{label}</p>
  </div>
);

const ErrorState: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <div className="glass-card p-8 max-w-xl mx-auto text-center space-y-4" role="alert">
    <AlertCircle className="w-8 h-8 mx-auto text-rose-400" />
    <h2 className="text-lg font-semibold text-white">Unable to load dashboard</h2>
    <p className="text-sm text-slate-400">{message}</p>
    <button
      type="button"
      onClick={onRetry}
      className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-300"
      aria-label="Retry loading dashboard"
    >
      Retry
    </button>
  </div>
);

export default DashboardPage;
