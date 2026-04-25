import React, { useState } from 'react';
import { UserCheck, Camera, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AttendanceSelector from './AttendanceSelector';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

interface AttendanceHeaderManagerProps {
  role: 'student' | 'chapter-head' | 'admin';
  fullWidth?: boolean;
}

const AttendanceHeaderManager: React.FC<AttendanceHeaderManagerProps> = ({ role, fullWidth }) => {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  return (
    <>
      {/* Header Buttons */}
      <div className={`flex items-center ${fullWidth ? 'w-full' : 'space-x-2'}`}>
        {role === 'chapter-head' && (
          <button
            onClick={() => navigate('/head/attendance/select')}
            className={`
              transition-all duration-300 backdrop-blur-md border shadow-sm flex items-center
              ${fullWidth 
                ? 'w-full space-x-3 p-4 rounded-lg' 
                : 'p-2 rounded-xl'
              }
              ${isDark 
                ? 'bg-dark-card/80 border-dark-border text-dark-text-secondary hover:text-accent-400 hover:bg-dark-surface' 
                : 'bg-white border-gray-200 text-gray-600 hover:text-blue-600 hover:shadow-md'
              }
            `}
            title="Start Attendance Session"
          >
            <UserCheck className="h-5 w-5" />
            {fullWidth && <span className="font-medium">Take Attendance</span>}
          </button>
        )}

        {role === 'student' && (
          <button
            onClick={() => navigate('/student/attendance/scan')}
            className={`
              transition-all duration-300 backdrop-blur-md border shadow-sm flex items-center
              ${fullWidth 
                ? 'w-full space-x-3 p-4 rounded-lg' 
                : 'p-2 rounded-xl'
              }
              ${isDark 
                ? 'bg-dark-card/80 border-dark-border text-dark-text-secondary hover:text-primary-400 hover:bg-dark-surface' 
                : 'bg-white border-gray-200 text-gray-600 hover:text-purple-600 hover:shadow-md'
              }
            `}
            title="Scan Attendance QR"
          >
            <Camera className="h-5 w-5" />
            {fullWidth && <span className="font-medium">Scan Attendance</span>}
          </button>
        )}
      </div>
    </>
  );
};

const ModalWrapper: React.FC<{ 
  children: React.ReactNode; 
  onClose: () => void; 
  title: string;
  isDark: boolean;
  maxWidth?: string;
}> = ({ children, onClose, title, isDark, maxWidth = "max-w-2xl" }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="absolute inset-0 bg-black/40 backdrop-blur-md"
    />
    <motion.div 
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      className={`relative w-full ${maxWidth} bg-white dark:bg-dark-surface rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-dark-border overflow-hidden`}
    >
      <div className="p-6 border-b border-gray-100 dark:border-dark-border flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
        <h2 className="text-xl font-bold text-gray-800 dark:text-dark-text-primary">{title}</h2>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
        >
          <X className="h-6 w-6 text-gray-500" />
        </button>
      </div>
      {children}
    </motion.div>
  </div>
);

export default AttendanceHeaderManager;
