import React from 'react';
import { CalendarDays, ExternalLink, MapPin, Pencil, Trash2 } from 'lucide-react';
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
} from '../../types';
import type { ApplicationStatus, JobApplication } from '../../types';

interface ApplicationCardProps {
  application: JobApplication;
  isUpdating: boolean;
  onStatusChange: (id: string, status: ApplicationStatus) => void;
  onEdit: (application: JobApplication) => void;
  onDelete: (application: JobApplication) => void;
}

function displayDate(value: string | null) {
  if (!value) return 'Not set';
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  return Number.isNaN(date.getTime())
    ? 'Not set'
    : date.toLocaleDateString(undefined, { timeZone: 'UTC' });
}

function followUpLabel(value: string | null) {
  if (!value) return { text: 'No follow-up set', style: 'text-slate-500' };
  const day = value.slice(0, 10);
  const date = new Date(`${day}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return { text: 'Follow-up date unavailable', style: 'text-slate-500' };
  const today = new Date().toISOString().slice(0, 10);
  const formattedDate = date.toLocaleDateString(undefined, { timeZone: 'UTC' });
  if (day < today) return { text: `Overdue · ${formattedDate}`, style: 'text-rose-300' };
  if (day === today) return { text: 'Follow up today', style: 'text-amber-200' };
  return { text: `Follow up · ${formattedDate}`, style: 'text-slate-300' };
}

const statusStyles: Record<ApplicationStatus, string> = {
  SAVED: 'border-slate-600 bg-slate-800 text-slate-200',
  APPLIED: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
  ASSESSMENT: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  INTERVIEW: 'border-violet-500/30 bg-violet-500/10 text-violet-200',
  OFFER: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  REJECTED: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
  WITHDRAWN: 'border-slate-600 bg-slate-800/60 text-slate-400',
};

export const ApplicationCard: React.FC<ApplicationCardProps> = ({
  application,
  isUpdating,
  onStatusChange,
  onEdit,
  onDelete,
}) => {
  const followUp = followUpLabel(application.followUpDate);

  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg shadow-black/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-semibold text-white" title={application.jobTitle}>{application.jobTitle}</h4>
          <p className="mt-1 truncate text-sm text-brand-200" title={application.companyName}>{application.companyName}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => onEdit(application)} className="button-quiet h-8 w-8 p-0" aria-label={`Edit ${application.jobTitle} at ${application.companyName}`}>
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => onDelete(application)} className="button-quiet h-8 w-8 p-0 text-rose-300 hover:bg-rose-500/10" aria-label={`Delete ${application.jobTitle} at ${application.companyName}`}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {application.location && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
          <MapPin className="h-3.5 w-3.5 shrink-0" /> {application.location}
        </p>
      )}

      <div className="mt-3 space-y-2 text-xs">
        <p className="flex items-center gap-1.5 text-slate-400">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
          Applied: {displayDate(application.applicationDate)}
        </p>
        <p className={`flex items-center gap-1.5 ${followUp.style}`}>
          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
          {followUp.text}
        </p>
      </div>

      {application.applicationUrl && (
        <a
          href={application.applicationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-brand-300 hover:text-brand-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-300"
        >
          Application link <ExternalLink className="h-3 w-3" />
        </a>
      )}

      <label className="mt-4 block text-xs text-slate-400">
        <span className="sr-only">Status for {application.jobTitle} at {application.companyName}</span>
        <select
          value={application.status}
          disabled={isUpdating}
          onChange={(event) => onStatusChange(application.id, event.target.value as ApplicationStatus)}
          className={`w-full rounded-lg border px-2.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/50 disabled:opacity-60 ${statusStyles[application.status]}`}
        >
          {APPLICATION_STATUSES.map((status) => (
            <option key={status} value={status}>{APPLICATION_STATUS_LABELS[status]}</option>
          ))}
        </select>
      </label>
    </article>
  );
};

export default ApplicationCard;
