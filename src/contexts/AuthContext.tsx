import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser, UserRole } from '../types/user';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<boolean>;
  register: (userData: any) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored user session
    const storedUser = localStorage.getItem('unify_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string, role: UserRole): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Mock authentication - replace with actual AWS Cognito integration
      const mockUser: AuthUser = {
        id: Math.random().toString(36).substr(2, 9),
        name: role === 'admin' ? 'Admin User' : 'Student User',
        email,
        role,
        student: role === 'student' ? {
          id: Math.random().toString(36).substr(2, 9),
          name: 'Student User',
          sapId: 'SAP' + Math.random().toString().substr(2, 6),
          year: 2024,
          email,
          registeredChapters: [],
          createdAt: new Date().toISOString()
        } : undefined,
        admin: role === 'admin' ? {
          id: Math.random().toString(36).substr(2, 9),
          name: 'Admin User',
          email,
          permissions: ['manage_chapters', 'create_events', 'view_registrations'],
          createdAt: new Date().toISOString()
        } : undefined
      };

      setUser(mockUser);
      localStorage.setItem('unify_user', JSON.stringify(mockUser));
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: any): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Mock registration - replace with actual AWS Cognito integration
      const newUser: AuthUser = {
        id: Math.random().toString(36).substr(2, 9),
        name: userData.name,
        email: userData.email,
        role: 'student',
        student: {
          id: Math.random().toString(36).substr(2, 9),
          name: userData.name,
          sapId: userData.sapId,
          year: userData.year,
          email: userData.email,
          registeredChapters: [],
          createdAt: new Date().toISOString()
        }
      };

      setUser(newUser);
      localStorage.setItem('unify_user', JSON.stringify(newUser));
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('unify_user');
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    register,
    logout,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};