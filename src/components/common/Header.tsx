import React from 'react';
import { Link } from 'react-router-dom';
import { LogOut, User, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Header: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();

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
    <header className="bg-white/90 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to={dashboardPath} className="flex items-center space-x-2">
            <Users className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Unify
            </span>
          </Link>

          {isAuthenticated && user && user.activeRole ? (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 px-3 py-1 bg-gray-100 rounded-full">
                <User className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-800">
                  {user.name}
                </span>
                <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full capitalize">
                  {user.activeRole.replace('-', ' ')}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </div>
          ) : (
            <Link
              to="/"
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Login / Register
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
