import axios from 'axios';
import type {
  DashboardResponse,
  HealthStatusResponse,
  UserProfileRequest,
  UserProfileResponse,
} from '../types';
import { clearStoredAuthSession, getStoredAuthSession } from './authSession';

export const AUTH_SESSION_INVALIDATED_EVENT = 'careerlens:auth-session-invalidated';

const api = axios.create({
  baseURL: import.meta.env.DEV
    ? '/api'
    : import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  try {
    const session = getStoredAuthSession();
    if (session) {
      config.headers.Authorization = `Bearer ${session.token}`;
    }
  } catch {
    clearStoredAuthSession();
    return Promise.reject(new Error('The saved authentication session could not be read.'));
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearStoredAuthSession();
      window.dispatchEvent(new Event(AUTH_SESSION_INVALIDATED_EVENT));
    }
    return Promise.reject(error);
  },
);

export const checkHealth = async (): Promise<HealthStatusResponse> => {
  const response = await api.get<HealthStatusResponse>('/health');
  return response.data;
};

export const getProfile = async (): Promise<UserProfileResponse> => {
  const response = await api.get<UserProfileResponse>('/profile');
  return response.data;
};

export const updateProfile = async (
  profileData: UserProfileRequest,
): Promise<UserProfileResponse> => {
  const response = await api.put<UserProfileResponse>('/profile', profileData);
  return response.data;
};

export const getDashboard = async (): Promise<DashboardResponse> => {
  const response = await api.get<DashboardResponse>('/dashboard');
  return response.data;
};

export default api;
