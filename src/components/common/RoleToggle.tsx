import React, { useState } from 'react';
import { Shield, User, UserCog, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';

const RoleToggle: React.FC = () => {
  const { user, setActiveRole } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  // Don't show if user doesn't have multiple roles
  if (!user || user.groups.length <= 1) {
    return null;
  }

  const roleDetails: { [key: string]: { icon: React.ElementType, name: string, color: string } } = {
    student: { icon: User, name: 'Student', color: 'blue' },
    'chapter-head': { icon: Shield, name: 'Chapter Head', color: 'purple' },
    admin: { icon: UserCog, name: 'Admin', color: 'red' },
  };

  const handleRoleSwitch = (role: string) => {
    if (role !== user.activeRole) {
      setActiveRole(role);
      setIsOpen(false);
      
      // Navigate to appropriate dashboard
      const dashboardPaths: { [key: string]: string } = {
        student: '/student/dashboard',
        'chapter-head': '/head/dashboard',
        admin: '/admin/dashboard',
      };
      
      navigate(dashboardPaths[role] || '/', { replace: true });
    }
  };

  const currentRole = roleDetails[user.activeRole] || roleDetails[user.groups[0]];
  const CurrentIcon = currentRole?.icon || User;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center space-x-2 px-3 py-2 rounded-xl transition-all duration-300 group border
          ${isDark 
            ? 'bg-dark-surface/80 border-dark-border/50 hover:bg-dark-card hover:border-accent-500/50 text-dark-text-primary' 
            : 'bg-white/80 border-gray-200/50 hover:bg-gray-50 hover:border-blue-300 text-gray-700'
          }
          backdrop-blur-md hover:shadow-lg
          ${isDark ? 'hover:shadow-accent-500/20' : 'hover:shadow-blue-500/20'}
        `}
        title="Switch Role"
      >
        <CurrentIcon className={`
          h-4 w-4 transition-colors duration-300
          ${isDark ? 'text-accent-400 group-hover:text-accent-300' : 'text-blue-600 group-hover:text-blue-700'}
        `} />
        <span className="text-sm font-medium">
          {currentRole?.name || 'Select Role'}
        </span>
        <ChevronDown className={`
          h-4 w-4 transition-transform duration-300
          ${isOpen ? 'rotate-180' : 'rotate-0'}
          ${isDark ? 'text-dark-text-secondary' : 'text-gray-400'}
        `} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className={`
            absolute right-0 top-full mt-2 w-48 rounded-xl shadow-xl border backdrop-blur-md z-20
            ${isDark 
              ? 'bg-dark-surface/90 border-dark-border/50' 
              : 'bg-white/90 border-gray-200/50'
            }
            animate-in slide-in-from-top-2 duration-200
          `}>
            <div className="p-2">
              {user.groups.map((role) => {
                const roleInfo = roleDetails[role];
                const RoleIcon = roleInfo?.icon || User;
                const isActive = role === user.activeRole;
                
                return (
                  <button
                    key={role}
                    onClick={() => handleRoleSwitch(role)}
                    className={`
                      w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 text-left
                      ${isActive 
                        ? isDark 
                          ? 'bg-accent-500/20 text-accent-300 border border-accent-500/30' 
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                        : isDark
                          ? 'hover:bg-dark-card text-dark-text-primary hover:text-accent-300'
                          : 'hover:bg-gray-50 text-gray-700 hover:text-blue-600'
                      }
                    `}
                  >
                    <RoleIcon className="h-4 w-4" />
                    <div className="flex-1">
                      <span className="text-sm font-medium">
                        {roleInfo?.name || role}
                      </span>
                      {isActive && (
                        <span className={`
                          text-xs block
                          ${isDark ? 'text-accent-400' : 'text-blue-500'}
                        `}>
                          Current
                        </span>
                      )}
                    </div>
                    {isActive && (
                      <div className={`
                        w-2 h-2 rounded-full
                        ${isDark ? 'bg-accent-400' : 'bg-blue-500'}
                      `} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RoleToggle;
