import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import type {
  AuthUser,
  LoginRequest,
  RegisterRequest,
  UserResponse,
} from '../types';
import { loginUser, registerUser } from '../services/authService';
import { AUTH_SESSION_INVALIDATED_EVENT } from '../services/api';
import {
  clearStoredAuthSession,
  getStoredAuthSession,
  setStoredAuthSession,
} from '../services/authSession';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuthContextValue {
  /** Currently authenticated user, or null if unauthenticated. */
  user: AuthUser | null;
  /** True while the initial session restore is in progress. */
  isLoading: boolean;
  /** Authenticate with the backend; keeps the session only for this browser tab. */
  login: (data: LoginRequest) => Promise<void>;
  /** Clear session from state and browser storage. */
  logout: () => void;
  /** Register a new account; returns the created user record. */
  register: (data: RegisterRequest) => Promise<UserResponse>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const session = getStoredAuthSession();
      if (session) {
        setUser(session.user);
      }
    } catch {
      clearStoredAuthSession();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleInvalidSession = () => {
      setUser(null);
      clearStoredAuthSession();
    };

    window.addEventListener(AUTH_SESSION_INVALIDATED_EVENT, handleInvalidSession);
    return () => window.removeEventListener(AUTH_SESSION_INVALIDATED_EVENT, handleInvalidSession);
  }, []);

  const login = async (data: LoginRequest): Promise<void> => {
    const response = await loginUser(data);
    const authUser: AuthUser = {
      id: response.id,
      fullName: response.fullName,
      email: response.email,
      role: response.role,
    };
    setStoredAuthSession({ user: authUser, token: response.token });
    setUser(authUser);
  };

  const logout = (): void => {
    setUser(null);
    clearStoredAuthSession();
  };

  const register = async (data: RegisterRequest): Promise<UserResponse> => {
    return registerUser(data);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
};
