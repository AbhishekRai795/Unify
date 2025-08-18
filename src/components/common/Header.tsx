import React from 'react';
import { Link } from 'react-router-dom';
import { LogOut, User, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from './ThemeToggle';

const Header: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { isDark } = useTheme();

  const handleLogout = () => {
    logout();
    // The logout function in the context already handles redirection.
  };

  // Logic to determine the correct dashboard path based on activeRole
  const getDashboardPath = () => {
    if (!isAuthenticated || !user || !user.activeRole) return '/';
    switch (user.activeRole) {
      case 'student':
        return '/student/dashboard';
      case 'chapter-head':
        return '/head/dashboard';
      case 'admin':
        return '/admin/dashboard';
      default:
        // Fallback if activeRole is not set but user is authenticated
        if (user.groups.includes('admin')) return '/admin/dashboard';
        if (user.groups.includes('chapter-head')) return '/head/dashboard';
        if (user.groups.includes('student')) return '/student/dashboard';
        return '/';
    }
  };

  const dashboardPath = getDashboardPath();

  return (
    <header className={`
      ${isDark 
        ? 'bg-dark-surface/90 border-dark-border/50' 
        : 'bg-white/90 border-gray-200/50'
      } 
      backdrop-blur-md border-b sticky top-0 z-50 transition-all duration-300
    `}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to={dashboardPath} className="flex items-center space-x-2 group">
            <Users className={`
              h-8 w-8 transition-all duration-300 group-hover:scale-110
              ${isDark ? 'text-accent-400' : 'text-blue-600'}
            `} />
            <span className={`
              text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent transition-all duration-300
              ${isDark 
                ? 'from-accent-400 to-primary-400' 
                : 'from-blue-600 to-purple-600'
              }
            `}>
              Unify
            </span>
          </Link>

          {isAuthenticated && user && user.activeRole ? (
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <div className={`
                flex items-center space-x-2 px-3 py-1 rounded-full backdrop-blur-md border transition-all duration-300
                ${isDark 
                  ? 'bg-dark-card/80 border-dark-border text-dark-text-primary' 
                  : 'bg-gray-100 border-gray-200 text-gray-800'
                }
              `}>
                <User className={`h-4 w-4 ${isDark ? 'text-accent-400' : 'text-gray-600'}`} />
                <span className="text-sm font-medium">
                  {user.name}
                </span>
                <span className={`
                  text-xs px-2 py-1 rounded-full capitalize transition-all duration-300
                  ${isDark 
                    ? 'text-primary-300 bg-dark-surface border border-primary-500/30' 
                    : 'text-gray-500 bg-white'
                  }
                `}>
                  {user.activeRole.replace('-', ' ')}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className={`
                  flex items-center space-x-1 px-3 py-2 rounded-lg transition-all duration-200 backdrop-blur-md border
                  ${isDark 
                    ? 'text-dark-text-secondary hover:text-red-400 hover:bg-red-500/10 border-dark-border hover:border-red-500/30' 
                    : 'text-gray-600 hover:text-red-600 hover:bg-red-50 border-gray-200 hover:border-red-200'
                  }
                `}
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <Link
                to="/"
                className={`
                  px-4 py-2 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg backdrop-blur-md border
                  ${isDark 
                    ? 'bg-gradient-to-r from-accent-600 to-primary-600 hover:from-accent-500 hover:to-primary-500 text-white border-accent-500/30 hover:border-accent-400/50' 
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-blue-500/30'
                  }
                  hover:scale-105 hover:shadow-xl
                  ${isDark ? 'hover:shadow-accent-500/25' : 'hover:shadow-blue-500/25'}
                `}
              >
                Login / Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
