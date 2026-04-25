import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Activity, ChevronLeft, Calendar, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const StudentAttendanceStats: React.FC = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { myChapters, attendanceStats } = useData();

  const getChapterName = (chapter: any): string =>
    chapter?.name || chapter?.chapterName || 'Chapter';

  const getChapterId = (chapter: any): string =>
    chapter?.chapterId || chapter?.chapterID || chapter?.id || '';

  const pageClass = isDark ? 'bg-dark-bg' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50';
  const cardClass = isDark ? 'bg-dark-surface/85 border-dark-border/70' : 'bg-white/80 border-white/20';
  const headingClass = isDark ? 'text-dark-text-primary' : 'text-gray-900';
  const subtleClass = isDark ? 'text-dark-text-secondary' : 'text-gray-600';

  return (
    <div className={`min-h-screen transition-colors duration-300 ${pageClass} p-4 sm:p-8`}>
      <div className="max-w-5xl mx-auto">
        <button 
          onClick={() => navigate('/student/dashboard')}
          className={`group flex items-center text-sm font-medium transition-all duration-200 mb-8 ${isDark ? 'text-dark-text-secondary hover:text-dark-text-primary' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <div className={`p-2 mr-2 rounded-lg border transition-all ${isDark ? 'bg-dark-surface border-dark-border group-hover:border-accent-500/50 group-hover:bg-accent-600/10' : 'bg-white border-slate-200 group-hover:border-blue-300 group-hover:bg-blue-50'}`}>
            <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          </div>
          Back to Dashboard
        </button>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className={`text-4xl font-bold mb-4 tracking-tight ${headingClass}`}>
            My Attendance Statistics
          </h1>
          <p className={`${subtleClass} text-lg`}>
            Track your participation across all your joined chapters.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(myChapters || []).map((chapter: any, index: number) => {
            const chapterId = getChapterId(chapter);
            // In a real app, attendanceStats would have per-chapter breakdown
            const chapterAttendance = (attendanceStats?.attendance || []).filter((a: any) => a.chapterId === chapterId);
            const attendedCount = chapterAttendance.length;
            const totalMeetings = 12; // Placeholder, should come from backend
            const percent = Math.round((attendedCount / totalMeetings) * 100);

            return (
              <motion.div
                key={chapterId}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className={`backdrop-blur-md rounded-[2rem] p-6 border shadow-xl ${cardClass}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className={`text-xl font-bold truncate max-w-[200px] ${headingClass}`}>
                    {getChapterName(chapter)}
                  </h2>
                  <div className={`p-2 rounded-lg ${percent >= 75 ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                    <Activity className="h-5 w-5" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className={`text-xs uppercase tracking-wider font-bold ${subtleClass}`}>Meetings</p>
                      <div className="flex items-baseline space-x-1">
                        <span className={`text-2xl font-black ${headingClass}`}>{attendedCount}</span>
                        <span className={`text-sm ${subtleClass}`}>/ {totalMeetings}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs uppercase tracking-wider font-bold ${subtleClass}`}>Score</p>
                      <p className={`text-2xl font-black ${percent >= 75 ? 'text-green-500' : 'text-blue-500'}`}>
                        {percent}%
                      </p>
                    </div>
                  </div>

                  <div className="w-full bg-gray-100 dark:bg-dark-bg/50 rounded-full h-3 overflow-hidden border border-gray-200 dark:border-dark-border">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`h-full rounded-full ${percent >= 75 ? 'bg-gradient-to-r from-green-400 to-green-600' : 'bg-gradient-to-r from-blue-400 to-blue-600'}`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="flex items-center space-x-2 text-xs font-medium text-gray-500">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      <span>{attendedCount} Present</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs font-medium text-gray-500">
                      <AlertCircle className="h-3 w-3 text-red-400" />
                      <span>{totalMeetings - attendedCount} Absent</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {(myChapters || []).length === 0 && (
            <div className="col-span-full py-20 text-center">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-300 opacity-50" />
              <p className={`${subtleClass} italic`}>You haven't joined any chapters yet to track attendance.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentAttendanceStats;
