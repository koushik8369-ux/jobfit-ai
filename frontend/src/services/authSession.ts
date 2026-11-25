import type { AuthUser } from '../types';

const SESSION_STORAGE_KEY = 'careerlens_session';

export interface AuthSession {
  user: AuthUser;
  token: string;
}

function isAuthSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const session = value as Partial<AuthSession>;
  return typeof session.token === 'string'
    && session.token.length > 0
    && !!session.user
    && typeof session.user.id === 'string'
    && typeof session.user.email === 'string'
    && typeof session.user.fullName === 'string'
    && typeof session.user.role === 'string';
}

export function getStoredAuthSession(): AuthSession | null {
  let serialized = sessionStorage.getItem(SESSION_STORAGE_KEY);
  const legacySession = localStorage.getItem(SESSION_STORAGE_KEY);
  if (serialized === null && legacySession !== null) {
    serialized = legacySession;
  }
  if (legacySession !== null) {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }
  if (serialized !== null && sessionStorage.getItem(SESSION_STORAGE_KEY) === null) {
    sessionStorage.setItem(SESSION_STORAGE_KEY, serialized);
  }
  if (serialized === null) {
    return null;
  }

  const parsed: unknown = JSON.parse(serialized);
  if (isAuthSession(parsed)) {
    return parsed;
  }

  clearStoredAuthSession();
  return null;
}

export function setStoredAuthSession(session: AuthSession): void {
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

export function clearStoredAuthSession(): void {
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem('careerlens_user');
}
