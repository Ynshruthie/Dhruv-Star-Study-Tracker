import React, { createContext, useState, useEffect } from 'react';
import api from '../utils/api';

export const AuthContext = createContext();

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
    const token = localStorage.getItem('dhruv_token') || legacyToken;

    if (legacyToken && !localStorage.getItem('dhruv_token')) {
      localStorage.setItem('dhruv_token', legacyToken);
    }

    if (!token) {
      setUser(null);
      setSimulatedTime(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
    } catch (err) {
      console.error('Auth verification failed:', err);
      localStorage.removeItem('dhruv_token');
      setUser(null);
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
    localStorage.setItem('dhruv_token', token);
    setSimulatedTime(null);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('dhruv_token');
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
