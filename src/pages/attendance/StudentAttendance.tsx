import React from 'react';
import { useNavigate } from 'react-router-dom';
import QRScanner from '../../components/attendance/QRScanner';
import { ArrowLeft } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const StudentAttendance: React.FC = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  return (
    <div className={`min-h-[calc(100vh-4rem)] transition-all duration-300 ${isDark ? 'bg-dark-bg' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'} py-8`}>
      <div className="w-full px-4 sm:px-6 lg:px-8">
        {/* Navigation */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/student/dashboard')}
            className={`
              group flex items-center text-sm font-medium transition-all duration-200
              ${isDark ? 'text-dark-text-secondary hover:text-accent-300' : 'text-slate-600 hover:text-slate-900'}
            `}
          >
            <div className={`
              p-2 mr-2 rounded-lg border transition-all
              ${isDark 
                ? 'bg-dark-surface/40 border-accent-500/20 group-hover:border-accent-400 group-hover:bg-accent-500/10' 
                : 'bg-white border-slate-200 group-hover:border-blue-300 group-hover:bg-blue-50'
              }
            `}>
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            </div>
            Back to Dashboard
          </button>
        </div>

        {/* Centered Scanner Card */}
        <div className="max-w-xl mx-auto">
          <div className="bg-white dark:bg-dark-surface rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-dark-border overflow-hidden">
            <QRScanner onClose={() => navigate('/student/dashboard')} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentAttendance;
