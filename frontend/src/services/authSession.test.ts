import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearStoredAuthSession,
  getStoredAuthSession,
  setStoredAuthSession,
} from './authSession';

const user = {
  id: 'user-id',
  fullName: 'Sample User',
  email: 'sample@example.com',
  role: 'USER' as const,
};

describe('browser-tab authentication storage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('stores the active token in sessionStorage only', () => {
    setStoredAuthSession({ user, token: 'test-token' });

    expect(sessionStorage.getItem('careerlens_session')).toContain('test-token');
    expect(localStorage.getItem('careerlens_session')).toBeNull();
  });

  it('moves a legacy localStorage session into sessionStorage and clears it', () => {
    localStorage.setItem('careerlens_session', JSON.stringify({ user, token: 'legacy-token' }));

    expect(getStoredAuthSession()).toEqual({ user, token: 'legacy-token' });
    expect(localStorage.getItem('careerlens_session')).toBeNull();
    expect(sessionStorage.getItem('careerlens_session')).toContain('legacy-token');
  });

  it('clears a stale persistent token when a tab session already exists', () => {
    sessionStorage.setItem('careerlens_session', JSON.stringify({ user, token: 'current-token' }));
    localStorage.setItem('careerlens_session', JSON.stringify({ user, token: 'stale-token' }));

    expect(getStoredAuthSession()).toEqual({ user, token: 'current-token' });
    expect(localStorage.getItem('careerlens_session')).toBeNull();
  });

  it('clears both current and legacy browser session keys on logout', () => {
    setStoredAuthSession({ user, token: 'test-token' });
    localStorage.setItem('careerlens_user', JSON.stringify(user));

    clearStoredAuthSession();

    expect(sessionStorage.getItem('careerlens_session')).toBeNull();
    expect(localStorage.getItem('careerlens_session')).toBeNull();
    expect(localStorage.getItem('careerlens_user')).toBeNull();
  });
});
