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
      <div className="max-w-[1600px] mx-auto px-8 sm:px-20 lg:px-32 xl:px-40 py-4">
        {/* Navigation */}
        <div className="mb-4 flex justify-start">
          <button
            onClick={() => navigate('/head/dashboard')}
            className={`group flex items-center text-sm font-medium transition-all duration-200 ${isDark ? 'text-dark-text-secondary hover:text-dark-text-primary' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <div className={`p-2 mr-2 rounded-lg border transition-all ${isDark ? 'bg-dark-surface border-dark-border group-hover:border-blue-500/50 group-hover:bg-blue-600/10' : 'bg-white border-slate-200 group-hover:border-blue-300 group-hover:bg-blue-50'}`}>
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            </div>
            Back to Dashboard
          </button>
        </div>

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="inline-flex items-center justify-center mb-4">
            <div className={`h-1 w-12 rounded-full ${isDark ? 'bg-blue-500/50' : 'bg-blue-200'}`} />
            <div className={`mx-4 h-2 w-2 rounded-full ${isDark ? 'bg-blue-500' : 'bg-blue-400'}`} />
            <div className={`h-1 w-12 rounded-full ${isDark ? 'bg-blue-500/50' : 'bg-blue-200'}`} />
          </div>
          
          <h1 className={`text-4xl font-bold mb-3 tracking-tight ${isDark ? 'text-dark-text-primary' : 'text-slate-900'}`}>Meeting Calendar</h1>
          <p className={`text-lg font-medium max-w-2xl ${isDark ? 'text-dark-text-secondary' : 'text-slate-600'}`}>
            {profile?.chapterName || 'Manage your chapter'} &bull; google Meet Integration
          </p>

          <div className="mt-3 flex items-center justify-center space-x-4">
            <button 
              onClick={refreshData}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl border transition-all duration-500 group ${isDark ? 'bg-dark-surface border-dark-border hover:border-blue-500/50' : 'bg-white border-slate-200 hover:border-blue-300 shadow-sm'}`}
            >
              <RefreshCw className={`h-4 w-4 text-gray-500 group-hover:rotate-180 transition-transform duration-500`} />
              <span className="text-xs font-semibold text-gray-500">Refresh Calendar</span>
            </button>
          </div>
        </div>


        {/* Calendar Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="pb-4"
        >

          {chapterId ? (
            <MeetingCalendar chapterId={chapterId} />
          ) : (
            <div className="bg-white/80 backdrop-blur-xl p-12 rounded-3xl border border-white/20 text-center space-y-4">
              <div className="p-4 bg-orange-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto">
                <RefreshCw className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">No Chapter Found</h3>
              <p className="text-gray-600 max-w-sm mx-auto">
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
