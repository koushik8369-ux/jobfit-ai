import React, { useEffect, useState } from 'react';
import { AlertCircle, Loader2, Save, X } from 'lucide-react';
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
} from '../../types';
import type {
  ApplicationStatus,
  CreateJobApplicationRequest,
  JobApplication,
} from '../../types';

interface ApplicationFormProps {
  application: JobApplication | null;
  isSaving: boolean;
  error: string | null;
  onSubmit: (request: CreateJobApplicationRequest) => Promise<void>;
  onCancel: () => void;
}

interface FormValues {
  companyName: string;
  jobTitle: string;
  location: string;
  jobDescription: string;
  applicationUrl: string;
  salaryRange: string;
  applicationDate: string;
  status: ApplicationStatus;
  followUpDate: string;
  notes: string;
}

const emptyValues: FormValues = {
  companyName: '',
  jobTitle: '',
  location: '',
  jobDescription: '',
  applicationUrl: '',
  salaryRange: '',
  applicationDate: '',
  status: 'SAVED',
  followUpDate: '',
  notes: '',
};

const inputClass = 'w-full rounded-xl border border-slate-700/80 bg-slate-900 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-brand-500/60 focus:outline-none focus:ring-2 focus:ring-brand-500/30';
const labelClass = 'block text-sm font-medium text-slate-300';

function dateInputValue(value: string | null | undefined) {
  return value ? value.slice(0, 10) : '';
}

function valuesFromApplication(application: JobApplication | null): FormValues {
  if (!application) return emptyValues;
  return {
    companyName: application.companyName,
    jobTitle: application.jobTitle,
    location: application.location ?? '',
    jobDescription: application.jobDescription ?? '',
    applicationUrl: application.applicationUrl ?? '',
    salaryRange: application.salaryRange ?? '',
    applicationDate: dateInputValue(application.applicationDate),
    status: application.status,
    followUpDate: dateInputValue(application.followUpDate),
    notes: application.notes ?? '',
  };
}

function validate(values: FormValues) {
  const errors: Record<string, string> = {};
  if (!values.companyName.trim()) errors.companyName = 'Enter a company name.';
  else if (values.companyName.trim().length > 120) {
    errors.companyName = 'Company name must be 120 characters or fewer.';
  }
  if (!values.jobTitle.trim()) errors.jobTitle = 'Enter a job title.';
  else if (values.jobTitle.trim().length > 160) {
    errors.jobTitle = 'Job title must be 160 characters or fewer.';
  }
  if (values.location.length > 120) errors.location = 'Location must be 120 characters or fewer.';
  if (values.jobDescription.length > 20000) {
    errors.jobDescription = 'Job description must be 20,000 characters or fewer.';
  }
  if (values.salaryRange.length > 100) {
    errors.salaryRange = 'Salary range must be 100 characters or fewer.';
  }
  if (values.notes.length > 5000) errors.notes = 'Notes must be 5,000 characters or fewer.';
  if (values.applicationUrl.trim()) {
    try {
      const parsed = new URL(values.applicationUrl.trim());
      if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) {
        errors.applicationUrl = 'Use a valid HTTP or HTTPS URL.';
      }
    } catch {
      errors.applicationUrl = 'Use a valid HTTP or HTTPS URL.';
    }
    if (values.applicationUrl.trim().length > 2048) {
      errors.applicationUrl = 'Application URL must be 2,048 characters or fewer.';
    }
  }
  return errors;
}

export const ApplicationForm: React.FC<ApplicationFormProps> = ({
  application,
  isSaving,
  error,
  onSubmit,
  onCancel,
}) => {
  const [values, setValues] = useState<FormValues>(() => valuesFromApplication(application));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setValues(valuesFromApplication(application));
    setFieldErrors({});
  }, [application]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: '' }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const errors = validate(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    await onSubmit({
      companyName: values.companyName.trim(),
      jobTitle: values.jobTitle.trim(),
      location: values.location.trim() || null,
      jobDescription: values.jobDescription.trim() || null,
      applicationUrl: values.applicationUrl.trim() || null,
      salaryRange: values.salaryRange.trim() || null,
      applicationDate: values.applicationDate || null,
      status: values.status,
      followUpDate: values.followUpDate || null,
      notes: values.notes.trim(),
    });
  };

  const fieldError = (name: keyof FormValues) => fieldErrors[name]
    ? <p id={`application-${name}-error`} className="mt-1 text-xs text-rose-300">{fieldErrors[name]}</p>
    : null;

  return (
    <section className="glass-card space-y-5 border border-brand-500/25 p-5 sm:p-7" aria-labelledby="application-form-heading">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="application-form-heading" className="text-lg font-semibold text-white">
            {application ? 'Edit application' : 'Add an application'}
          </h2>
          <p className="mt-1 text-sm text-slate-400">Keep your opportunity details and next follow-up together.</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="button-quiet h-9 w-9 p-0"
          aria-label="Close application form"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass} htmlFor="application-companyName">
            Company name <span className="text-rose-300">*</span>
            <input
              id="application-companyName"
              name="companyName"
              value={values.companyName}
              onChange={handleChange}
              maxLength={120}
              required
              aria-invalid={Boolean(fieldErrors.companyName)}
              aria-describedby={fieldErrors.companyName ? 'application-companyName-error' : undefined}
              className={`${inputClass} mt-1.5`}
              placeholder="Company"
            />
            {fieldError('companyName')}
          </label>
          <label className={labelClass} htmlFor="application-jobTitle">
            Job title <span className="text-rose-300">*</span>
            <input
              id="application-jobTitle"
              name="jobTitle"
              value={values.jobTitle}
              onChange={handleChange}
              maxLength={160}
              required
              aria-invalid={Boolean(fieldErrors.jobTitle)}
              aria-describedby={fieldErrors.jobTitle ? 'application-jobTitle-error' : undefined}
              className={`${inputClass} mt-1.5`}
              placeholder="Role"
            />
            {fieldError('jobTitle')}
          </label>
          <label className={labelClass} htmlFor="application-location">
            Location
            <input
              id="application-location"
              name="location"
              value={values.location}
              onChange={handleChange}
              maxLength={120}
              aria-invalid={Boolean(fieldErrors.location)}
              className={`${inputClass} mt-1.5`}
              placeholder="City, remote, or hybrid"
            />
            {fieldError('location')}
          </label>
          <label className={labelClass} htmlFor="application-applicationUrl">
            Application URL
            <input
              id="application-applicationUrl"
              name="applicationUrl"
              type="url"
              value={values.applicationUrl}
              onChange={handleChange}
              maxLength={2048}
              aria-invalid={Boolean(fieldErrors.applicationUrl)}
              className={`${inputClass} mt-1.5`}
              placeholder="https://"
            />
            {fieldError('applicationUrl')}
          </label>
          <label className={labelClass} htmlFor="application-salaryRange">
            Salary range
            <input
              id="application-salaryRange"
              name="salaryRange"
              value={values.salaryRange}
              onChange={handleChange}
              maxLength={100}
              aria-invalid={Boolean(fieldErrors.salaryRange)}
              className={`${inputClass} mt-1.5`}
              placeholder="Optional"
            />
            {fieldError('salaryRange')}
          </label>
          <label className={labelClass} htmlFor="application-status">
            Status
            <select
              id="application-status"
              name="status"
              value={values.status}
              onChange={handleChange}
              className={`${inputClass} mt-1.5`}
            >
              {APPLICATION_STATUSES.map((status) => (
                <option key={status} value={status}>{APPLICATION_STATUS_LABELS[status]}</option>
              ))}
            </select>
          </label>
          <label className={labelClass} htmlFor="application-applicationDate">
            Application date
            <input
              id="application-applicationDate"
              name="applicationDate"
              type="date"
              value={values.applicationDate}
              onChange={handleChange}
              className={`${inputClass} mt-1.5`}
            />
          </label>
          <label className={labelClass} htmlFor="application-followUpDate">
            Follow-up date
            <input
              id="application-followUpDate"
              name="followUpDate"
              type="date"
              value={values.followUpDate}
              onChange={handleChange}
              className={`${inputClass} mt-1.5`}
            />
          </label>
        </div>

        <label className={labelClass} htmlFor="application-jobDescription">
          Job description
          <textarea
            id="application-jobDescription"
            name="jobDescription"
            value={values.jobDescription}
            onChange={handleChange}
            maxLength={20000}
            rows={4}
            aria-invalid={Boolean(fieldErrors.jobDescription)}
            className={`${inputClass} mt-1.5 resize-y`}
            placeholder="Optional role details"
          />
          {fieldError('jobDescription')}
        </label>

        <label className={labelClass} htmlFor="application-notes">
          Personal notes
          <textarea
            id="application-notes"
            name="notes"
            value={values.notes}
            onChange={handleChange}
            maxLength={5000}
            rows={3}
            aria-invalid={Boolean(fieldErrors.notes)}
            className={`${inputClass} mt-1.5 resize-y`}
            placeholder="Follow-up details, contacts, or reminders"
          />
          {fieldError('notes')}
        </label>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-800 pt-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={isSaving} className="button-secondary justify-center">
            Cancel
          </button>
          <button type="submit" disabled={isSaving} className="button-primary justify-center disabled:cursor-not-allowed disabled:opacity-50">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isSaving ? 'Saving...' : application ? 'Save changes' : 'Add application'}
          </button>
        </div>
      </form>
    </section>
  );
};

export default ApplicationForm;
