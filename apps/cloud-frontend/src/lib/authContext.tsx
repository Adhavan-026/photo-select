'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'SUPER_ADMIN' | 'STUDIO_OWNER' | 'EMPLOYEE' | 'CLIENT';
  studioId: string | null;
  isVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (accessToken: string, refreshToken: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Read tokens on initial load
    const savedUser = localStorage.getItem('ps_user');
    const token = localStorage.getItem('ps_access_token');
    
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        // Clear corrupt storage
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  const login = (accessToken: string, refreshToken: string, userData: User) => {
    localStorage.setItem('ps_access_token', accessToken);
    localStorage.setItem('ps_refresh_token', refreshToken);
    localStorage.setItem('ps_user', JSON.stringify(userData));
    setUser(userData);
    
    // Redirect based on role
    if (userData.role === 'SUPER_ADMIN') {
      router.push('/dashboard/super-admin');
    } else if (userData.role === 'STUDIO_OWNER' || userData.role === 'EMPLOYEE') {
      router.push('/dashboard/studio');
    } else {
      router.push('/'); // Default
    }
  };

  const logout = () => {
    localStorage.removeItem('ps_access_token');
    localStorage.removeItem('ps_refresh_token');
    localStorage.removeItem('ps_user');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
