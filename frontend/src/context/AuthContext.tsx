import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setAccessToken, setOnAuthError } from '../lib/api';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const clearAuth = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setOnAuthError(clearAuth);
    return () => setOnAuthError(null);
  }, [clearAuth]);

  useEffect(() => {
    // Attempt silent refresh on mount
    (async () => {
      try {
        const refresh = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api'}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (refresh.ok) {
          const { accessToken } = await refresh.json();
          setAccessToken(accessToken);
          const me = await api.get<User>('/auth/me');
          setUser(me.data);
        }
      } catch {
        // not logged in
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    setAccessToken(res.data.accessToken);
    const me = await api.get<User>('/auth/me');
    setUser(me.data);
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    clearAuth();
  }, [clearAuth]);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
