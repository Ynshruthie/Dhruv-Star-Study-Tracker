import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { AuthContext } from './AuthContextDefinition';
const TOKEN_STORAGE_KEY = 'dhruv_token';
const USER_STORAGE_KEY = 'dhruv_user';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simulatedTime, setSimulatedTimeState] = useState(() => {
    return localStorage.getItem('dhruv_simulated_time') || null;
  });

  const setSimulatedTime = (time) => {
    if (time) {
      localStorage.setItem('dhruv_simulated_time', time);
      setSimulatedTimeState(time);
    } else {
      localStorage.removeItem('dhruv_simulated_time');
      setSimulatedTimeState(null);
    }
  };

  const checkAuth = async () => {
    const legacyToken = localStorage.getItem('token');
    const token = localStorage.getItem(TOKEN_STORAGE_KEY) || legacyToken;
    const savedUser = localStorage.getItem(USER_STORAGE_KEY);

    if (legacyToken && !localStorage.getItem(TOKEN_STORAGE_KEY)) {
      localStorage.setItem(TOKEN_STORAGE_KEY, legacyToken);
    }

    if (!token) {
      localStorage.removeItem(USER_STORAGE_KEY);
      setUser(null);
      setSimulatedTime(null);
      setLoading(false);
      return;
    }

    // Restore the last verified user immediately, so a normal refresh or an
    // app restart stays on the same dashboard while the session is checked.
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    }

    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.data.user));
    } catch (err) {
      console.error('Auth verification failed:', err);
      // A 401/403 means the session is no longer valid. For temporary
      // connectivity/server errors, keep the stored session and retry on the
      // next refresh instead of unexpectedly sending the user to Login.
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(USER_STORAGE_KEY);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (student_id, password) => {
    const res = await api.post('/auth/login', { student_id, password });
    const { token, user: userData } = res.data;
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
    setSimulatedTime(null);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    setSimulatedTime(null);
    setUser(null);
  };

  const triggerSeed = async () => {
    await api.post('/seed');
    await checkAuth();
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      simulatedTime,
      setSimulatedTime,
      triggerSeed,
      refreshUser: checkAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};
