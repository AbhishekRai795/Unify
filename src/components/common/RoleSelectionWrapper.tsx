import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Shield, User, UserCog, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const RoleSelectionWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, setActiveRole, isAuthenticated, isLoading } = useAuth();
  const { isDark } = useTheme();

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-dark-bg' : 'bg-gray-50'}`}>
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // If not authenticated or already has an active role, just render children
  if (!isAuthenticated || !user || user.activeRole) {
    return <>{children}</>;
  }

  // If authenticated but no active role (multi-role user), show selection screen
  const roleDetails: { [key: string]: { icon: React.ElementType, name: string, description: string, color: string, gradient: string } } = {
    student: { 
      icon: User, 
      name: 'Student', 
      description: 'Explore communities, join events, and earn reward points.',
      color: 'blue',
      gradient: 'from-blue-500 to-cyan-500'
    },
    'chapter-head': { 
      icon: Shield, 
      name: 'Community Head', 
      description: 'Manage your community, organize meetings, and issue certificates.',
      color: 'purple',
      gradient: 'from-purple-500 to-indigo-500'
    },
    admin: { 
      icon: UserCog, 
      name: 'Admin', 
      description: 'System-wide management, chapter oversight, and platform settings.',
      color: 'red',
      gradient: 'from-red-500 to-orange-500'
    },
  };

  const handleRoleSelect = (role: string) => {
    setActiveRole(role);
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-300 ${isDark ? 'bg-dark-bg' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'}`}>
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center space-x-2 mb-4"
          >
            <div className={`h-[2px] w-8 rounded-full ${isDark ? 'bg-accent-500/30' : 'bg-blue-200'}`} />
            <span className={`text-sm font-bold uppercase tracking-widest ${isDark ? 'text-accent-400' : 'text-blue-600'}`}>
              Identity Selection
            </span>
            <div className={`h-[2px] w-8 rounded-full ${isDark ? 'bg-accent-500/30' : 'bg-blue-200'}`} />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`text-4xl md:text-5xl font-bold mb-4 tracking-tight ${isDark ? 'text-dark-text-primary' : 'text-slate-900'}`}
          >
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">{user.name}</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`text-lg ${isDark ? 'text-dark-text-secondary' : 'text-slate-600'}`}
          >
            Please choose a role to continue to your dashboard
          </motion.p>
        </div>

        <div className="flex flex-wrap justify-center gap-6">
          {user.groups.map((role, index) => {
            const details = roleDetails[role] || { 
              icon: User, 
              name: role, 
              description: 'Access your account features.', 
              color: 'gray',
              gradient: 'from-gray-500 to-slate-500'
            };
            const Icon = details.icon;

            return (
              <motion.button
                key={role}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 * (index + 3) }}
                onClick={() => handleRoleSelect(role)}
                className={`
                  relative group text-center p-8 rounded-3xl border-2 transition-all duration-300
                  w-full md:w-[320px] lg:w-[350px] flex flex-col items-center
                  ${isDark 
                    ? 'bg-dark-surface/50 border-dark-border/50 hover:border-accent-500/50 hover:bg-dark-card shadow-lg hover:shadow-accent-500/10' 
                    : 'bg-white border-white hover:border-blue-300 shadow-xl hover:shadow-2xl hover:shadow-blue-500/10'
                  }
                `}
              >
                <div className={`
                  w-16 h-16 rounded-2xl mb-6 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-lg
                  bg-gradient-to-br ${details.gradient} text-white
                `}>
                  <Icon className="h-8 w-8" />
                </div>

                <div className="space-y-2">
                  <h3 className={`text-xl font-bold transition-colors duration-300 ${isDark ? 'text-dark-text-primary group-hover:text-accent-400' : 'text-slate-900 group-hover:text-blue-600'}`}>
                    {details.name}
                  </h3>
                  <p className={`text-sm leading-relaxed ${isDark ? 'text-dark-text-secondary' : 'text-slate-500'}`}>
                    {details.description}
                  </p>
                </div>

                <div className={`
                  mt-6 flex items-center justify-center text-sm font-bold uppercase tracking-wider transition-colors duration-300
                  ${isDark ? 'text-accent-400 group-hover:text-accent-300' : 'text-blue-600 group-hover:text-blue-700'}
                `}>
                  <span>Select Role</span>
                  <CheckCircle2 className="h-4 w-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>

                {/* Decorative background element */}
                <div className={`
                  absolute -top-4 -right-4 w-24 h-24 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500
                  bg-gradient-to-br ${details.gradient}
                `} />
              </motion.button>
            );
          })}
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-12 text-center"
        >
          <p className={`text-sm ${isDark ? 'text-dark-text-muted' : 'text-slate-400'}`}>
            You can always switch your role later from the navigation bar.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default RoleSelectionWrapper;
