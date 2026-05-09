'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '@/lib/types';

interface AuthState {
  user:       User | null;
  token:      string | null;
  loading:    boolean;
  login:      (token: string, user: User) => void;
  logout:     () => void;
  updateUser: (user: User) => void;
  isAdmin:    boolean;
}

const AuthContext = createContext<AuthState>({
  user: null, token: null, loading: true,
  login: () => {}, logout: () => {}, updateUser: () => {}, isAdmin: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [token,   setToken]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem('l2r_token');
    const u = localStorage.getItem('l2r_user');
    if (t && u && t !== 'undefined' && t !== 'null') {
      try {
        setToken(t);
        setUser(JSON.parse(u));
      } catch {}
    } else {
      localStorage.removeItem('l2r_token');
      localStorage.removeItem('l2r_user');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    function handleExpired() {
      setToken(null);
      setUser(null);
    }
    window.addEventListener('l2r-auth-expired', handleExpired);
    return () => window.removeEventListener('l2r-auth-expired', handleExpired);
  }, []);

  const login = useCallback((t: string, u: User) => {
    setToken(t);
    setUser(u);
    localStorage.setItem('l2r_token', t);
    localStorage.setItem('l2r_user', JSON.stringify(u));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('l2r_token');
    localStorage.removeItem('l2r_user');
  }, []);

  const updateUser = useCallback((u: User) => {
    setUser(u);
    localStorage.setItem('l2r_user', JSON.stringify(u));
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser, isAdmin: user?.role === 'ADMIN' }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
