import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

axios.defaults.withCredentials = true; // مهم باش تبعث الكوكيز مع الطلبات

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

const login = async (username, password) => {
  try {
    const response = await axios.post('http://localhost:5454/api/login', 
      { username, password },
      { withCredentials: true }
    );
      if (response.data.success) {
        setUser(response.data.user);
        return response.data;
      }
      return response.data; 
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Server error' };
    }
  };

  const logout = async () => {
    try {
      await axios.post('http://localhost:5454/api/logout');
      setUser(null);
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  };

  const checkAuth = async () => {
    try {
      const response = await axios.get('http://localhost:5454/api/check-auth');
      if (response.data.authenticated) {
        setUser(response.data.user);
      } else {
        setUser(null);
      }
      return response.data;
    } catch (error) {
      setUser(null);
      return { authenticated: false };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
