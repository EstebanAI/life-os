import { createContext, useContext, useState, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lifeos_user')); } catch { return null; }
  });

  const login = useCallback(async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    localStorage.setItem('lifeos_token', res.data.token);
    localStorage.setItem('lifeos_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
  }, []);

  const register = useCallback(async (username, password) => {
    const res = await api.post('/auth/register', { username, password });
    localStorage.setItem('lifeos_token', res.data.token);
    localStorage.setItem('lifeos_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('lifeos_token');
    localStorage.removeItem('lifeos_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
