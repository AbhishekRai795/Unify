import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Loader2,
  Ticket,
  Video,
  Search,
  History,
  ArrowRight
} from 'lucide-react';
import { attendanceAPI } from '../../services/attendanceApi';
import { useChapterHead } from '../../contexts/ChapterHeadContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { useSearchParams } from 'react-router-dom';

interface AttendanceSelectorProps {
  onSelect: (meetingId: string) => void;
}

const AttendanceSelector: React.FC<AttendanceSelectorProps> = ({ onSelect }) => {
  const { fetchMyEvents, chapters, fetchMyChapters } = useChapterHead();
  const { isDark } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const activeTab = (searchParams.get('type') === 'events' ? 'events' : 'meetings') as 'meetings' | 'events';
  const setActiveTab = (tab: 'meetings' | 'events') => {
    setSearchParams({ type: tab === 'meetings' ? 'meetings' : 'events' });
  };

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, [chapters.length]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // If chapters aren't loaded yet, fetch them first
      if (chapters.length === 0) {
        await fetchMyChapters();
      }

      const [meetingsRes, eventsData] = await Promise.all([
        attendanceAPI.listMeetings(),
        fetchMyEvents()
      ]);
      setMeetings(meetingsRes.meetings || []);
      setEvents(eventsData || []);
    } catch (err) {
      console.error('Error loading selection data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = () => {
    if (activeTab === 'meetings') {
      return meetings.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()));
    } else if (activeTab === 'events') {
      return events.filter(e => e.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return [];
  };

  if (isLoading && meetings.length === 0 && events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-400">
        <Loader2 className="h-10 w-10 animate-spin mb-4 text-blue-600" />
        <p className="font-medium">Syncing with Chapter Records...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar - Registrations Style */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6"
      >
        <div className="flex items-center space-x-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 border rounded-xl text-sm outline-none transition-all ${isDark ? 'bg-dark-bg/50 border-dark-border focus:ring-accent-500/50 focus:border-accent-500 text-dark-text-primary' : 'bg-white border-slate-200 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700'}`}
            />
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-slate-100/50 dark:bg-dark-bg/50 p-1 rounded-xl border border-slate-200/50 dark:border-dark-border/50">
          <button
            onClick={() => setActiveTab('meetings')}
            className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all ${activeTab === 'meetings' ? (isDark ? 'bg-dark-surface text-accent-400 shadow-lg border border-accent-500/30' : 'bg-white text-blue-600 shadow-md border border-blue-100') : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Video size={14} />
            <span>Meetings</span>
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all ${activeTab === 'events' ? (isDark ? 'bg-dark-surface text-accent-400 shadow-lg border border-accent-500/30' : 'bg-white text-blue-600 shadow-md border border-blue-100') : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Ticket size={14} />
            <span>Events</span>
          </button>
        </div>
      </motion.div>

      {/* Table Interface - Registrations Style */}
      <div className={`overflow-hidden rounded-xl border ${isDark ? 'border-dark-border/50 bg-dark-surface/50' : 'border-slate-200 bg-white shadow-sm'}`}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className={`${isDark ? 'bg-white/5' : 'bg-slate-50/50'} border-b ${isDark ? 'border-dark-border/50' : 'border-slate-100'}`}>
                <th className="px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Session Details</th>
                <th className="px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider text-center">Type</th>
                <th className="px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider text-center">Date / Time</th>
                <th className="px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-dark-border/50' : 'divide-slate-100'}`}>
              <AnimatePresence mode="wait">
                {filteredItems().length === 0 ? (
                  <motion.tr
                    key="empty-state"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Clock size={48} className="mb-4 opacity-20" />
                        <p className="font-medium italic">No sessions found matching your criteria</p>
                      </div>
                    </td>
                  </motion.tr>
                ) : (
                  filteredItems().map((item, index) => (
                    <motion.tr
                      key={activeTab === 'meetings' ? (item.meetingId || `m-${index}`) : (item.eventId || `e-${index}`)}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`group transition-all ${isDark ? 'hover:bg-white/5' : 'hover:bg-blue-50/50'} cursor-pointer`}
                      onClick={() => onSelect(activeTab === 'meetings' ? item.meetingId : `event-${item.eventId}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-4">
                          <div className={`h-12 w-12 rounded-xl flex items-center justify-center shadow-inner transition-all group-hover:scale-110 bg-blue-50 text-blue-600 dark:bg-blue-500/10`}>
                            {activeTab === 'meetings' ? <Video size={20} /> : <Ticket size={20} />}
                          </div>
                          <div className="flex flex-col">
                            <p className={`font-semibold text-sm ${isDark ? 'text-dark-text-primary' : 'text-slate-800'}`}>{item.title}</p>
                            <div className="flex items-center space-x-2 mt-0.5">
                              <p className={`text-xs ${isDark ? 'text-dark-text-muted' : 'text-slate-500'}`}>
                                {activeTab === 'meetings' ? 'Google Meet Session' : (item.location || 'Offline Event')}
                              </p>
                              <span className="text-slate-300 dark:text-slate-600">•</span>
                              <code className={`text-[10px] font-mono ${isDark ? 'text-accent-400/70' : 'text-blue-500'}`}>
                                ID: {activeTab === 'meetings' ? item.meetingId : item.eventId}
                              </code>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400`}>
                          {activeTab === 'meetings' ? 'Meeting' : 'Event'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`text-xs font-medium ${isDark ? 'text-dark-text-primary' : 'text-slate-700'}`}>
                            {new Date(item.startDateTime || item.createdAt).toLocaleDateString()}
                          </span>
                          <span className={`text-[10px] ${isDark ? 'text-dark-text-muted' : 'text-slate-400'}`}>
                            {new Date(item.startDateTime || item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <div className={`p-2 rounded-lg ${isDark ? 'text-accent-400' : 'text-blue-600'} group-hover:translate-x-1 transition-transform`}>
                            <ArrowRight size={20} />
                          </div>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-6 flex items-center justify-between text-xs text-slate-400 italic">
        <p>Tip: Click any row to initialize the attendance session.</p>
        <div className="flex items-center space-x-4">
          <span className="flex items-center"><History size={12} className="mr-1" /> Meeting Sync Active</span>
          <span className="flex items-center"><Calendar size={12} className="mr-1" /> Events Auto-Synced</span>
        </div>
      </div>
    </div>
  );
};

export default AttendanceSelector;
