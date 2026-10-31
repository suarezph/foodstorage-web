import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  api,
  refreshSession,
  setAccessToken,
  setSessionExpiredHandler,
} from '../lib/api/client.js';

const AuthContext = createContext(null);

/**
 * status: 'loading' (checking for an existing session) | 'authed' | 'anon'
 * The access token is held in memory by lib/api; the refresh cookie restores it after a reload.
 */
export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState({ status: 'loading', user: null });

  const clear = useCallback(() => {
    setAccessToken(null);
    queryClient.clear();
    setState({ status: 'anon', user: null });
  }, [queryClient]);

  useEffect(() => {
    setSessionExpiredHandler(clear);
    let cancelled = false;
    refreshSession()
      .then((data) => !cancelled && setState({ status: 'authed', user: data.user }))
      .catch(() => !cancelled && setState({ status: 'anon', user: null }));
    return () => {
      cancelled = true;
    };
  }, [clear]);

  const startSession = useCallback((data) => {
    setAccessToken(data.accessToken);
    setState({ status: 'authed', user: data.user });
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      async login(credentials) {
        const data = await api('/auth/login', { method: 'POST', body: credentials, auth: false });
        startSession(data);
        return data.user;
      },
      /** Ends every other session and returns a fresh one (also clears "must change password"). */
      async changePassword(passwords) {
        startSession(await api('/auth/change-password', { method: 'POST', body: passwords }));
      },
      async logout() {
        try {
          await api('/auth/logout', { method: 'POST', auth: false });
        } finally {
          clear();
        }
      },
      setUser: (user) => setState((s) => ({ ...s, user })),
    }),
    [state, startSession, clear],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
