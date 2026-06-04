import React, { createContext, useState, useEffect, useContext } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user profile if token exists on boot
  useEffect(() => {
    const bootstrapAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const profile = await api.getProfile();
          setUser(profile);
        } catch (err) {
          console.error('Failed to load profile on boot', err);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    bootstrapAuth();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await api.login(email, password);
      localStorage.setItem('token', data.token);
      const profile = await api.getProfile();
      setUser(profile);
      setLoading(false);
      return profile;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const register = async (username, email, password) => {
    setLoading(true);
    try {
      const data = await api.register(username, email, password);
      localStorage.setItem('token', data.token);
      const profile = await api.getProfile();
      setUser(profile);
      setLoading(false);
      return profile;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const refreshProfile = async () => {
    try {
      const profile = await api.getProfile();
      setUser(profile);
      return profile;
    } catch (err) {
      console.error('Failed to refresh profile', err);
    }
  };

  const updateProfileData = async (profileData) => {
    try {
      const updated = await api.updateProfile(profileData);
      setUser(updated);
      return updated;
    } catch (err) {
      console.error('Failed to update profile data', err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshProfile, updateProfileData }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
