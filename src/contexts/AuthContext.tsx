import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { jwtDecode } from 'jwt-decode';
import { CognitoUserPool } from 'amazon-cognito-identity-js';

// --- Updated Types ---
interface DecodedToken {
  email: string;
  name: string;
  'cognito:groups'?: string[];
  exp: number;
}

export type Role = 'student' | 'chapter-head' | 'admin';

interface AuthUser {
  email: string;
  name: string;
  groups: string[]; // Groups from cognito:groups claim
  activeRole: string; // One of the groups
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  setActiveRole: (role: string) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const poolData = {
    UserPoolId: 'ap-south-1_ueutDQExM', // Your User Pool ID
    ClientId: '6uac5t9b0oub9b1cjoot94uplc', // Your App Client ID
};
const userPool = new CognitoUserPool(poolData);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('idToken');
    if (token) {
      try {
        const decodedToken: DecodedToken = jwtDecode(token);
        if (decodedToken.exp * 1000 > Date.now()) {
          const userGroups = decodedToken['cognito:groups'] || [];
          const savedActiveRole = localStorage.getItem('activeRole');
          
          // On initial load, respect the saved role if it's valid
          const activeRole = savedActiveRole && userGroups.includes(savedActiveRole)
              ? savedActiveRole
              : userGroups.length === 1 ? userGroups[0] : '';

          setUser({
            email: decodedToken.email,
            name: decodedToken.name,
            groups: userGroups,
            activeRole,
          });
        } else {
          localStorage.removeItem('idToken');
          localStorage.removeItem('activeRole');
        }
      } catch (error) {
        console.error("Failed to decode token on initial load:", error);
        localStorage.removeItem('idToken');
        localStorage.removeItem('activeRole');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (token: string) => {
    try {
      const decodedToken: DecodedToken = jwtDecode(token);
      const userGroups = decodedToken['cognito:groups'] || [];
      
      // FIX: Only set activeRole if there's one group. Otherwise, require selection.
      const activeRole = userGroups.length === 1 ? userGroups[0] : ''; 
      
      localStorage.setItem('idToken', token);
      localStorage.setItem('activeRole', activeRole);
      
      setUser({
        email: decodedToken.email,
        name: decodedToken.name,
        groups: userGroups,
        activeRole,
      });
    } catch (error) {
      console.error("Failed to process login:", error);
    }
  };

  const setActiveRole = (role: string) => {
    if (user && user.groups.includes(role)) {
      localStorage.setItem('activeRole', role);
      setUser({ ...user, activeRole: role });
    } else {
      console.error(`User does not have the role: ${role}`);
    }
  };

  const logout = () => {
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) {
        cognitoUser.signOut();
    }
    localStorage.removeItem('idToken');
    localStorage.removeItem('activeRole');
    setUser(null);
    window.location.href = '/'; 
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user,
    setActiveRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
