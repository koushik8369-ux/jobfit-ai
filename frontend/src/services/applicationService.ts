import api from './api';
import type {
  CreateJobApplicationRequest,
  JobApplication,
  JobApplicationListQuery,
  JobApplicationListResponse,
  JobApplicationStats,
  UpdateJobApplicationRequest,
} from '../types';

export interface CreateJobApplicationResult {
  application: JobApplication;
  alreadyExists: boolean;
}

export const createApplication = async (
  request: CreateJobApplicationRequest,
): Promise<CreateJobApplicationResult> => {
  const response = await api.post<JobApplication>('/applications', request);
  return {
    application: response.data,
    alreadyExists: response.status === 200,
  };
};

export const getApplications = async (
  query: JobApplicationListQuery = {},
): Promise<JobApplicationListResponse> => {
  const response = await api.get<JobApplicationListResponse>('/applications', { params: query });
  return response.data;
};

export const getApplicationStats = async (): Promise<JobApplicationStats> => {
  const response = await api.get<JobApplicationStats>('/applications/stats');
  return response.data;
};

export const getApplication = async (id: string): Promise<JobApplication> => {
  const response = await api.get<JobApplication>(`/applications/${encodeURIComponent(id)}`);
  return response.data;
};

export const updateApplication = async (
  id: string,
  request: UpdateJobApplicationRequest,
): Promise<JobApplication> => {
  const response = await api.patch<JobApplication>(
    `/applications/${encodeURIComponent(id)}`,
    request,
  );
  return response.data;
};

export const deleteApplication = async (id: string): Promise<void> => {
  await api.delete(`/applications/${encodeURIComponent(id)}`);
};
