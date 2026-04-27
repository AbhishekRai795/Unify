import React from 'react';
import { useChapterHead } from '../contexts/ChapterHeadContext';
import MeetingCalendar from '../components/Calendar/MeetingCalendar';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Loader from '../components/common/Loader';

import { useTheme } from '../contexts/ThemeContext';

const ChapterCalendarPage: React.FC = () => {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const { profile, chapters, isLoading, refreshData } = useChapterHead();
  
  // Get the first managed chapter ID
  const chapterId = profile?.chapterId || (Array.isArray(chapters) && chapters.length > 0 ? (chapters[0].chapterId || chapters[0].id) : null);

  if (isLoading && !chapterId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Loader />
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-12 transition-colors duration-300 ${isDark ? 'bg-dark-bg' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'}`}>
      {/* Navigation - Aligned with logo */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
        <div className="mb-4 flex justify-between items-center">
          <button
            onClick={() => navigate('/head/dashboard')}
            className={`group flex items-center text-sm font-medium transition-all duration-200 ${isDark ? 'text-dark-text-secondary hover:text-dark-text-primary' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <div className={`p-2 mr-2 rounded-lg border transition-all ${isDark ? 'bg-dark-surface border-dark-border group-hover:border-blue-500/50 group-hover:bg-blue-600/10' : 'bg-white border-slate-200 group-hover:border-blue-300 group-hover:bg-blue-50'}`}>
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            </div>
            <span className="hidden sm:inline">Back to Dashboard</span>
          </button>
          <div className="sm:hidden">
            <button 
              onClick={refreshData}
              className={`p-2 rounded-lg border transition-all ${isDark ? 'bg-dark-surface border-dark-border hover:border-blue-500/50' : 'bg-white border-slate-200 hover:border-blue-300'}`}
            >
              <RefreshCw className={`h-4 w-4 ${isDark ? 'text-dark-text-secondary' : 'text-slate-600'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-6 md:mb-8">
          <div className="inline-flex items-center justify-center mb-3">
            <div className={`h-1 w-10 rounded-full ${isDark ? 'bg-blue-500/50' : 'bg-blue-200'}`} />
            <div className={`mx-3 h-1.5 w-1.5 rounded-full ${isDark ? 'bg-blue-500' : 'bg-blue-400'}`} />
            <div className={`h-1 w-10 rounded-full ${isDark ? 'bg-blue-500/50' : 'bg-blue-200'}`} />
          </div>
          
          <h1 className={`text-3xl sm:text-4xl font-bold mb-2 tracking-tight ${isDark ? 'text-dark-text-primary' : 'text-slate-900'}`}>Meeting Calendar</h1>
          <p className={`text-base sm:text-lg font-medium max-w-2xl mx-auto ${isDark ? 'text-dark-text-secondary' : 'text-slate-600'}`}>
            {profile?.chapterName || 'Manage your chapter'} &bull; Google Meet Integration
          </p>

          <div className="mt-4 hidden sm:flex items-center justify-center space-x-4">
            <button 
              onClick={refreshData}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border transition-all duration-300 group ${isDark ? 'bg-dark-surface border-dark-border hover:border-blue-500/50' : 'bg-white border-slate-200 hover:border-blue-300 shadow-sm'}`}
            >
              <RefreshCw className={`h-3.5 w-3.5 text-gray-500 transition-transform duration-500 group-hover:rotate-180`} />
              <span className="text-xs font-semibold text-gray-500">Refresh</span>
            </button>
          </div>
        </div>


        {/* Calendar Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="pb-4"
        >

          {chapterId ? (
            <MeetingCalendar chapterId={chapterId} />
          ) : (
            <div className={`p-6 sm:p-12 rounded-2xl sm:rounded-3xl text-center space-y-4 ${isDark ? 'bg-dark-surface' : 'bg-white/80 backdrop-blur-xl border border-white/20'}`}>
              <div className={`p-3 sm:p-4 w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto ${isDark ? 'bg-orange-500/20' : 'bg-orange-100'}`}>
                <RefreshCw className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500" />
              </div>
              <h3 className={`text-lg sm:text-xl font-bold ${isDark ? 'text-dark-text-primary' : 'text-gray-900'}`}>No Chapter Found</h3>
              <p className={`text-sm sm:text-base max-w-xs sm:max-w-sm mx-auto ${isDark ? 'text-dark-text-secondary' : 'text-gray-600'}`}>
                We couldn't find a chapter linked to your account. Please contact the administrator.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ChapterCalendarPage;
