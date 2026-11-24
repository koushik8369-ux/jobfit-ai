import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  AlertCircle,
  BriefcaseBusiness,
  LayoutGrid,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Table2,
} from 'lucide-react';
import { ApplicationForm } from '../components/applications/ApplicationForm';
import { ApplicationKanban } from '../components/applications/ApplicationKanban';
import { ApplicationStats } from '../components/applications/ApplicationStats';
import { ApplicationTable } from '../components/applications/ApplicationTable';
import {
  createApplication,
  deleteApplication,
  getApplicationStats,
  getApplications,
  updateApplication,
} from '../services/applicationService';
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
} from '../types';
import type {
  ApplicationStatus,
  CreateJobApplicationRequest,
  JobApplication,
  JobApplicationListQuery,
  JobApplicationStats,
} from '../types';

type ViewMode = 'KANBAN' | 'TABLE';
const PAGE_SIZE = 50;

function requestError(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) return fallback;
  if (!error.response) return 'Could not reach the application service. Check the backend connection and try again.';
  if (error.response.status === 401) return 'Your session expired. Please sign in again.';
  const responseData = error.response.data as {
    message?: string;
    errors?: Record<string, string>;
  } | undefined;
  if (error.response.status === 400) {
    const firstFieldError = responseData?.errors
      ? Object.values(responseData.errors)[0]
      : null;
    return firstFieldError || responseData?.message || 'Check the application details and try again.';
  }
  if (error.response.status === 404) return responseData?.message || 'This application was not found.';
  if (error.response.status === 409) return responseData?.message || 'This Job Intelligence analysis is already saved.';
  if (error.response.status >= 500) return 'The application service is temporarily unavailable. Please try again.';
  return responseData?.message || fallback;
}

export const JobApplicationsPage: React.FC = () => {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [stats, setStats] = useState<JobApplicationStats | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'ALL'>('ALL');
  const [view, setView] = useState<ViewMode>('KANBAN');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingApplication, setEditingApplication] = useState<JobApplication | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const requestSequence = useRef(0);

  const listQuery = useCallback((cursor?: string): JobApplicationListQuery => ({
    ...(statusFilter === 'ALL' ? {} : { status: statusFilter }),
    ...(search.trim() ? { q: search.trim() } : {}),
    limit: PAGE_SIZE,
    ...(cursor ? { cursor } : {}),
  }), [search, statusFilter]);

  const loadApplications = useCallback(async () => {
    const sequence = ++requestSequence.current;
    setIsLoading(true);
    setListError(null);
    try {
      const result = await getApplications(listQuery());
      if (sequence !== requestSequence.current) return;
      setApplications(result.items);
      setNextCursor(result.nextCursor);
    } catch (error: unknown) {
      if (sequence === requestSequence.current) {
        setListError(requestError(error, 'Unable to load applications.'));
      }
    } finally {
      if (sequence === requestSequence.current) setIsLoading(false);
    }
  }, [listQuery]);

  const loadStats = useCallback(async () => {
    setIsStatsLoading(true);
    setStatsError(null);
    try {
      setStats(await getApplicationStats());
    } catch (error: unknown) {
      setStatsError(requestError(error, 'Unable to load application statistics.'));
    } finally {
      setIsStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => { void loadApplications(); }, 250);
    return () => {
      window.clearTimeout(timeout);
      requestSequence.current += 1;
    };
  }, [loadApplications]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const refreshData = async () => {
    await Promise.all([loadApplications(), loadStats()]);
  };

  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) return;
    const sequence = requestSequence.current;
    setIsLoadingMore(true);
    setListError(null);
    try {
      const result = await getApplications(listQuery(nextCursor));
      if (sequence !== requestSequence.current) return;
      setApplications((current) => {
        const existingIds = new Set(current.map((application) => application.id));
        return [...current, ...result.items.filter((application) => !existingIds.has(application.id))];
      });
      setNextCursor(result.nextCursor);
    } catch (error: unknown) {
      if (sequence === requestSequence.current) {
        setListError(requestError(error, 'Unable to load more applications.'));
      }
    } finally {
      if (sequence === requestSequence.current) setIsLoadingMore(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingApplication(null);
    setFormError(null);
    setActionError(null);
    setIsFormOpen(true);
  };

  const handleEdit = (application: JobApplication) => {
    setEditingApplication(application);
    setFormError(null);
    setActionError(null);
    setIsFormOpen(true);
  };

  const handleCancelForm = () => {
    setIsFormOpen(false);
    setEditingApplication(null);
    setFormError(null);
  };

  const handleSave = async (request: CreateJobApplicationRequest) => {
    setIsSaving(true);
    setFormError(null);
    setActionError(null);
    try {
      if (editingApplication) {
        await updateApplication(editingApplication.id, request);
        setNotice('Application updated.');
      } else {
        const result = await createApplication(request);
        setNotice(result.alreadyExists
          ? 'This Job Intelligence analysis is already in your applications.'
          : 'Application added.');
      }
      setIsFormOpen(false);
      setEditingApplication(null);
      await refreshData();
    } catch (error: unknown) {
      setFormError(requestError(error, 'Unable to save this application.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: ApplicationStatus) => {
    setUpdatingId(id);
    setActionError(null);
    setNotice(null);
    try {
      await updateApplication(id, { status });
      await refreshData();
    } catch (error: unknown) {
      setActionError(requestError(error, 'Unable to update application status.'));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (application: JobApplication) => {
    const confirmed = window.confirm(
      `Delete your ${application.jobTitle} application at ${application.companyName}? This cannot be undone.`,
    );
    if (!confirmed) return;

    setActionError(null);
    setNotice(null);
    try {
      await deleteApplication(application.id);
      setNotice('Application deleted.');
      await refreshData();
    } catch (error: unknown) {
      setActionError(requestError(error, 'Unable to delete this application.'));
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-slate-800 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-white sm:text-3xl">
            <BriefcaseBusiness className="h-7 w-7 text-brand-400" /> Job Applications
          </h1>
          <p className="mt-1 text-sm text-slate-400">Keep your opportunities, progress, and follow-ups organized.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void refreshData()} disabled={isLoading || isStatsLoading} className="button-secondary justify-center disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${isLoading || isStatsLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button type="button" onClick={handleOpenCreate} className="button-primary justify-center">
            <Plus className="h-4 w-4" /> Add application
          </button>
        </div>
      </header>

      <ApplicationStats
        stats={stats}
        isLoading={isStatsLoading}
        error={statsError}
        onRetry={() => void loadStats()}
      />

      {notice && (
        <div role="status" className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {notice}
        </div>
      )}
      {actionError && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {actionError}
        </div>
      )}

      {isFormOpen && (
        <ApplicationForm
          application={editingApplication}
          isSaving={isSaving}
          error={formError}
          onSubmit={handleSave}
          onCancel={handleCancelForm}
        />
      )}

      <section className="space-y-4" aria-label="Application list">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search company or job title</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                maxLength={100}
                placeholder="Search company or job title"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-brand-500/60 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </label>
            <label className="sm:w-52">
              <span className="sr-only">Filter applications by status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as ApplicationStatus | 'ALL')}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 focus:border-brand-500/60 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                <option value="ALL">All statuses</option>
                {APPLICATION_STATUSES.map((status) => (
                  <option key={status} value={status}>{APPLICATION_STATUS_LABELS[status]}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex items-center gap-1 self-end rounded-xl border border-slate-800 bg-slate-950 p-1 sm:self-auto" aria-label="Application view">
            <button type="button" aria-pressed={view === 'KANBAN'} onClick={() => setView('KANBAN')} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${view === 'KANBAN' ? 'bg-brand-500/15 text-brand-200' : 'text-slate-400 hover:text-white'}`}>
              <LayoutGrid className="h-4 w-4" /> Board
            </button>
            <button type="button" aria-pressed={view === 'TABLE'} onClick={() => setView('TABLE')} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${view === 'TABLE' ? 'bg-brand-500/15 text-brand-200' : 'text-slate-400 hover:text-white'}`}>
              <Table2 className="h-4 w-4" /> Table
            </button>
          </div>
        </div>

        {listError && (
          <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-7 text-center">
            <AlertCircle className="h-7 w-7 text-rose-300" />
            <p className="text-sm text-rose-200">{listError}</p>
            <button type="button" onClick={() => void loadApplications()} className="button-secondary">Try again</button>
          </div>
        )}

        {isLoading && applications.length === 0 && !listError && (
          <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
            <p className="text-sm">Loading your applications...</p>
          </div>
        )}

        {!isLoading && !listError && applications.length === 0 && (
          <div className="glass-card flex flex-col items-center gap-3 p-8 text-center sm:p-12">
            <span className="rounded-2xl border border-brand-500/20 bg-brand-500/10 p-3 text-brand-300"><BriefcaseBusiness className="h-7 w-7" /></span>
            <h2 className="text-lg font-semibold text-white">
              {search || statusFilter !== 'ALL' ? 'No matching applications' : 'Your tracker is ready'}
            </h2>
            <p className="max-w-md text-sm leading-6 text-slate-400">
              {search || statusFilter !== 'ALL'
                ? 'Try another search or clear the status filter.'
                : 'Add a job opportunity to track its status, notes, and follow-up date.'}
            </p>
            {search || statusFilter !== 'ALL' ? (
              <button type="button" onClick={() => { setSearch(''); setStatusFilter('ALL'); }} className="button-secondary">
                Clear filters
              </button>
            ) : (
              <button type="button" onClick={handleOpenCreate} className="button-primary">
                <Plus className="h-4 w-4" /> Add your first application
              </button>
            )}
          </div>
        )}

        {applications.length > 0 && !listError && (
          <>
            <div className={isLoading ? 'opacity-60' : ''} aria-busy={isLoading}>
              {view === 'KANBAN' ? (
                <ApplicationKanban
                  applications={applications}
                  updatingId={updatingId}
                  onStatusChange={(id, status) => void handleStatusChange(id, status)}
                  onEdit={handleEdit}
                  onDelete={(application) => void handleDelete(application)}
                />
              ) : (
                <ApplicationTable
                  applications={applications}
                  updatingId={updatingId}
                  onStatusChange={(id, status) => void handleStatusChange(id, status)}
                  onEdit={handleEdit}
                  onDelete={(application) => void handleDelete(application)}
                />
              )}
            </div>
            {nextCursor && (
              <div className="flex justify-center">
                <button type="button" onClick={() => void handleLoadMore()} disabled={isLoadingMore} className="button-secondary justify-center disabled:opacity-50">
                  {isLoadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {isLoadingMore ? 'Loading more...' : 'Load more applications'}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};

export default JobApplicationsPage;
