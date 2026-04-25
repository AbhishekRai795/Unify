import React from 'react';
import { useNavigate } from 'react-router-dom';
import AttendanceSelector from '../../components/attendance/AttendanceSelector';
import { 
  ChevronLeft, 
  ShieldCheck
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { useChapterHead } from '../../contexts/ChapterHeadContext';

const AttendanceSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { profile } = useChapterHead();

  const handleSelect = (meetingId: string) => {
    navigate(`/head/attendance/${meetingId}`);
  };

  const pageClass = isDark ? 'bg-dark-bg' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50';
  const headingClass = isDark ? 'text-dark-text-primary' : 'text-[#1a1f36]';
  const subtleClass = isDark ? 'text-dark-text-secondary' : 'text-slate-500';

  return (
    <div className={`min-h-screen transition-colors duration-300 ${pageClass}`}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/head/dashboard')}
            className={`group flex items-center text-sm font-medium transition-all duration-200 ${isDark ? 'text-dark-text-secondary hover:text-dark-text-primary' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <div className={`p-2 mr-2 rounded-lg border transition-all ${isDark ? 'bg-dark-surface border-dark-border group-hover:border-accent-500/50 group-hover:bg-accent-600/10' : 'bg-white border-slate-200 group-hover:border-blue-300 group-hover:bg-blue-50'}`}>
              <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            </div>
            Back to Dashboard
          </button>
        </div>

        {/* Header - Registrations Style */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="flex items-center justify-center space-x-4 mb-4">
            <div className={`h-[2px] w-12 rounded-full ${isDark ? 'bg-accent-500/30' : 'bg-blue-200'}`} />
            <div className={`w-2 h-2 rounded-full ${isDark ? 'bg-accent-400' : 'bg-blue-500'}`} />
            <div className={`h-[2px] w-12 rounded-full ${isDark ? 'bg-accent-500/30' : 'bg-blue-200'}`} />
          </div>
          <h1 className={`text-4xl font-bold mb-4 tracking-tight ${headingClass}`}>
            Attendance Sessions
          </h1>
          <p className={`text-lg max-w-2xl mx-auto font-normal flex items-center justify-center gap-2 ${subtleClass}`}>
            <ShieldCheck className="w-5 h-5 text-green-500" />
            Track and manage attendance for <span className="text-blue-600 font-medium">{profile?.chapterName || 'your chapter'}</span>
          </p>
        </motion.div>

        {/* Main Interface Content - Registrations Table Area */}
        <div className="mx-auto">
            <AttendanceSelector 
                onSelect={handleSelect} 
            />
        </div>
      </div>
    </div>
  );
};

export default AttendanceSelectionPage;
