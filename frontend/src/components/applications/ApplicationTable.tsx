import React from 'react';
import { ExternalLink, Pencil, Trash2 } from 'lucide-react';
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
} from '../../types';
import type { ApplicationStatus, JobApplication } from '../../types';

interface ApplicationTableProps {
  applications: JobApplication[];
  updatingId: string | null;
  onStatusChange: (id: string, status: ApplicationStatus) => void;
  onEdit: (application: JobApplication) => void;
  onDelete: (application: JobApplication) => void;
}

function formatDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString(undefined, { timeZone: 'UTC' });
}

export const ApplicationTable: React.FC<ApplicationTableProps> = ({
  applications,
  updatingId,
  onStatusChange,
  onEdit,
  onDelete,
}) => (
  <div className="overflow-x-auto rounded-2xl border border-slate-800">
    <table className="w-full min-w-[760px] divide-y divide-slate-800 text-left text-sm">
      <thead className="bg-slate-900/90 text-xs uppercase tracking-wide text-slate-400">
        <tr>
          <th scope="col" className="px-4 py-3">Company</th>
          <th scope="col" className="px-4 py-3">Job title</th>
          <th scope="col" className="px-4 py-3">Status</th>
          <th scope="col" className="px-4 py-3">Application date</th>
          <th scope="col" className="px-4 py-3">Follow-up date</th>
          <th scope="col" className="px-4 py-3 text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-800 bg-slate-950/40">
        {applications.map((application) => (
          <tr key={application.id} className="text-slate-300 hover:bg-slate-900/60">
            <td className="max-w-48 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium text-white" title={application.companyName}>{application.companyName}</span>
                {application.applicationUrl && (
                  <a href={application.applicationUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open application link for ${application.companyName}`} className="shrink-0 text-slate-500 hover:text-brand-300">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </td>
            <td className="max-w-56 truncate px-4 py-3" title={application.jobTitle}>{application.jobTitle}</td>
            <td className="px-4 py-3">
              <label>
                <span className="sr-only">Status for {application.jobTitle} at {application.companyName}</span>
                <select
                  value={application.status}
                  disabled={updatingId === application.id}
                  onChange={(event) => onStatusChange(application.id, event.target.value as ApplicationStatus)}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50 disabled:opacity-60"
                >
                  {APPLICATION_STATUSES.map((status) => (
                    <option key={status} value={status}>{APPLICATION_STATUS_LABELS[status]}</option>
                  ))}
                </select>
              </label>
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-400">{formatDate(application.applicationDate)}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-400">{formatDate(application.followUpDate)}</td>
            <td className="px-4 py-3">
              <div className="flex justify-end gap-1">
                <button type="button" onClick={() => onEdit(application)} className="button-quiet h-8 w-8 p-0" aria-label={`Edit ${application.jobTitle} at ${application.companyName}`}>
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => onDelete(application)} className="button-quiet h-8 w-8 p-0 text-rose-300 hover:bg-rose-500/10" aria-label={`Delete ${application.jobTitle} at ${application.companyName}`}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default ApplicationTable;
