import React from 'react';
import { BriefcaseBusiness } from 'lucide-react';
import { ApplicationCard } from './ApplicationCard';
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
} from '../../types';
import type { ApplicationStatus, JobApplication } from '../../types';

interface ApplicationKanbanProps {
  applications: JobApplication[];
  updatingId: string | null;
  onStatusChange: (id: string, status: ApplicationStatus) => void;
  onEdit: (application: JobApplication) => void;
  onDelete: (application: JobApplication) => void;
}

export const ApplicationKanban: React.FC<ApplicationKanbanProps> = ({
  applications,
  updatingId,
  onStatusChange,
  onEdit,
  onDelete,
}) => (
  <div className="overflow-x-auto pb-4" aria-label="Applications Kanban board">
    <div className="grid min-w-max grid-flow-col auto-cols-[minmax(17rem,19rem)] gap-4">
      {APPLICATION_STATUSES.map((status) => {
        const items = applications.filter((application) => application.status === status);
        const headingId = `application-column-${status.toLowerCase()}`;
        return (
          <section key={status} aria-labelledby={headingId} className="min-h-64 rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
            <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-800 px-1 pb-3">
              <h3 id={headingId} className="text-sm font-semibold text-slate-200">{APPLICATION_STATUS_LABELS[status]}</h3>
              <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-xs text-slate-400" aria-label={`${items.length} applications`}>
                {items.length}
              </span>
            </div>
            <div className="space-y-3">
              {items.map((application) => (
                <ApplicationCard
                  key={application.id}
                  application={application}
                  isUpdating={updatingId === application.id}
                  onStatusChange={onStatusChange}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
              {items.length === 0 && (
                <p className="flex min-h-24 items-center justify-center gap-2 rounded-xl border border-dashed border-slate-800 px-3 text-center text-xs text-slate-600">
                  <BriefcaseBusiness className="h-4 w-4" /> No applications here
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  </div>
);

export default ApplicationKanban;
