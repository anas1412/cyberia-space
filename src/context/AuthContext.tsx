import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id, Doc } from '../../convex/_generated/dataModel';
import { saveSession, getSession, clearSession } from '../lib/storage';

type AuthCtx = {
  user: Doc<"users"> | null;
  userId: Id<"users"> | null;
  token: string | null;
  isGuest: boolean;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (token: string, userId: string) => Promise<void>;
  loginAsGuest: (token: string, userId: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token,    setToken]    = useState<string | null>(null);
  const [userId,   setUserId]   = useState<Id<"users"> | null>(null);
  const [booting,  setBooting]  = useState(true);

  const logoutMutation = useMutation(api.auth.logout);
  const user = useQuery(
    api.auth.validateSession,
    token ? { token } : 'skip'
  );

  useEffect(() => {
    getSession().then(s => {
      if (s) { setToken(s.token); setUserId(s.userId as Id<"users">); }
      setBooting(false);
    });
  }, []);

  async function login(t: string, uid: string) {
    await saveSession(t, uid);
    setToken(t);
    setUserId(uid as Id<"users">);
  }

  async function loginAsGuest(t: string, uid: string) {
    await saveSession(t, uid);
    setToken(t);
    setUserId(uid as Id<"users">);
  }

  async function logout() {
    if (token) await logoutMutation({ token });
    await clearSession();
    setToken(null);
    setUserId(null);
  }

  return (
    <AuthContext.Provider value={{
      user: user ?? null,
      userId,
      token,
      isGuest: !!user?.isGuest,
      isLoading: booting || (!!token && user === undefined),
      isLoggedIn: !!user,
      login,
      loginAsGuest,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
