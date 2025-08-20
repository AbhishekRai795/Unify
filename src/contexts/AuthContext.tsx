import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { jwtDecode } from 'jwt-decode';
import { CognitoUserPool } from 'amazon-cognito-identity-js';

// Updated Types with proper Cognito JWT structure
interface DecodedToken {
  email?: string;
  'cognito:username'?: string;
  username?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  preferred_username?: string;
  'cognito:groups'?: string[] | string;
  exp: number;
  sub: string;
  aud?: string;
  iss?: string;
  iat?: number;
  token_use?: string;
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
  UserPoolId: import.meta.env.VITE_USER_POOL_ID || 'ap-south-1_ueutDQExM', // Your User Pool ID
  ClientId: import.meta.env.VITE_USER_POOL_WEB_CLIENT_ID || '6uac5t9b0oub9b1cjoot94uplc', // Your App Client ID
};

const userPool = new CognitoUserPool(poolData);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Debug JWT token function
  const debugJWTToken = (token: string) => {
    try {
      const decodedToken = jwtDecode<DecodedToken>(token);
      console.log('=== JWT TOKEN DEBUG ===');
      console.log('Full token payload:', decodedToken);
      console.log('Available claims:', Object.keys(decodedToken));
      console.log('Email-related claims:', {
        email: decodedToken.email,
        'cognito:username': decodedToken['cognito:username'],
        username: decodedToken.username,
        preferred_username: decodedToken.preferred_username,
        sub: decodedToken.sub
      });
      console.log('Groups:', decodedToken['cognito:groups']);
      console.log('========================');
    } catch (error) {
      console.error('Error decoding JWT:', error);
    }
  };

  // Helper function to extract email from token
  const extractEmailFromToken = (decodedToken: DecodedToken): string | null => {
    return decodedToken.email || 
           decodedToken['cognito:username'] || 
           decodedToken.username || 
           decodedToken.sub || 
           null;
  };

  // Helper function to extract name from token
  const extractNameFromToken = (decodedToken: DecodedToken): string => {
    return decodedToken.name || 
           decodedToken.given_name || 
           decodedToken['cognito:username'] || 
           'Unknown User';
  };

  // Helper function to parse groups
  const parseGroups = (groups: string[] | string | undefined): string[] => {
    if (!groups) return [];
    
    if (Array.isArray(groups)) {
      return groups;
    }
    
    if (typeof groups === 'string') {
      // Handle case where groups come as string "[admin]" or "admin"
      return groups.replace(/[\[\]]/g, '').split(',').map((g: string) => g.trim()).filter(Boolean);
    }
    
    return [];
  };

  useEffect(() => {
    const token = localStorage.getItem('idToken');
    if (token) {
      try {
        debugJWTToken(token); // Debug the token
        
        const decodedToken: DecodedToken = jwtDecode<DecodedToken>(token);
        
        if (decodedToken.exp * 1000 > Date.now()) {
          const userEmail = extractEmailFromToken(decodedToken);
          const userName = extractNameFromToken(decodedToken);
          const userGroups = parseGroups(decodedToken['cognito:groups']);
          
          if (!userEmail) {
            console.error('No email found in token during initialization');
            localStorage.removeItem('idToken');
            localStorage.removeItem('activeRole');
            setIsLoading(false);
            return;
          }

          const savedActiveRole = localStorage.getItem('activeRole');

          // On initial load, respect the saved role if it's valid
          const activeRole = savedActiveRole && userGroups.includes(savedActiveRole)
            ? savedActiveRole
            : userGroups.length === 1 ? userGroups[0] : '';

          setUser({
            email: userEmail,
            name: userName,
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
      debugJWTToken(token); // Debug the token
      
      const decodedToken: DecodedToken = jwtDecode<DecodedToken>(token);
      
      const userEmail = extractEmailFromToken(decodedToken);
      const userName = extractNameFromToken(decodedToken);
      const userGroups = parseGroups(decodedToken['cognito:groups']);

      if (!userEmail) {
        throw new Error('No email found in token');
      }

      console.log('Processed user data:', { userEmail, userName, userGroups });

      // IMPORTANT: Don't set activeRole for multi-role users
      let activeRole = '';
      if (userGroups.length === 1) {
        activeRole = userGroups[0];
      } else if (userGroups.includes('admin')) {
        // Admin priority - if user has admin role, set it as default
        activeRole = 'admin';
      }
      // If multiple roles and no admin, leave activeRole empty to force selection

      localStorage.setItem('idToken', token);
      if (activeRole) {
        localStorage.setItem('activeRole', activeRole);
      } else {
        // Ensure old role is cleared if no new one is set
        localStorage.removeItem('activeRole');
      }

      setUser({
        email: userEmail,
        name: userName,
        groups: userGroups,
        activeRole,
      });
    } catch (error) {
      console.error("Failed to process login:", error);
      throw error;
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
