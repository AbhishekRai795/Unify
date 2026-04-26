import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Loader2,
  Ticket,
  Video,
  Search,
  History,
  CheckCircle2,
  XCircle,
  ChevronLeft
} from 'lucide-react';
import { attendanceAPI } from '../../services/attendanceApi';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { useSearchParams, useNavigate } from 'react-router-dom';

const StudentAttendanceStats: React.FC = () => {
  const navigate = useNavigate();
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
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await attendanceAPI.getStats();
      setMeetings(res.meetings || []);
      setEvents(res.events || []);
    } catch (err) {
      console.error('Error loading attendance stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = () => {
    const items = activeTab === 'meetings' ? meetings : events;
    return items.filter(item => 
      (item.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.meetingId || item.eventId || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  if (isLoading && meetings.length === 0 && events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-400">
        <Loader2 className="h-10 w-10 animate-spin mb-4 text-blue-600" />
        <p className="font-medium">Fetching your attendance history...</p>
      </div>
    );
  }

  const pageClass = isDark ? 'bg-dark-bg' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50';

  return (
    <div className={`min-h-screen py-8 px-4 sm:px-6 lg:px-8 ${pageClass}`}>
      <div className="max-w-[1400px] mx-auto">
        {/* Back Button */}
        <button 
          onClick={() => navigate('/student/dashboard')}
          className={`group flex items-center text-sm font-medium transition-all duration-200 mb-8 ${isDark ? 'text-dark-text-secondary hover:text-dark-text-primary' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <div className={`p-2 mr-2 rounded-lg border transition-all ${isDark ? 'bg-dark-surface border-dark-border group-hover:border-accent-500/50 group-hover:bg-accent-600/10' : 'bg-white border-slate-200 group-hover:border-blue-300 group-hover:bg-blue-50'}`}>
            <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          </div>
          Back to Dashboard
        </button>

        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <div className={`h-[2px] w-12 rounded-full ${isDark ? 'bg-accent-500/30' : 'bg-blue-200'}`} />
            <div className={`w-2 h-2 rounded-full ${isDark ? 'bg-accent-400' : 'bg-blue-500'}`} />
            <div className={`h-[2px] w-12 rounded-full ${isDark ? 'bg-accent-500/30' : 'bg-blue-200'}`} />
          </div>
          <h1 className={`
            text-4xl font-bold mb-4 transition-all duration-300 tracking-tight
            ${isDark ? 'text-dark-text-primary' : 'text-[#1a1f36]'}
          `}>
            Attendance Stats
          </h1>
          <p className={`
            text-lg max-w-2xl mx-auto transition-colors duration-300 font-normal
            ${isDark ? 'text-dark-text-secondary' : 'text-slate-500'}
          `}>
            Track and review your participation for all your communities
          </p>
        </div>

        <div className="flex flex-col h-full">
          {/* Toolbar - Exact Same as Selector */}
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
                  placeholder="Search history..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-xl text-sm outline-none transition-all ${isDark ? 'bg-dark-bg/50 border-dark-border focus:ring-accent-500/50 focus:border-accent-500 text-dark-text-primary' : 'bg-white border-slate-200 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700'}`}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 bg-slate-100/50 dark:bg-dark-bg/50 p-1 rounded-xl border border-slate-200/50 dark:border-dark-border/50">
              <button
                onClick={() => setActiveTab('meetings')}
                className={`flex items-center space-x-2 px-6 py-2 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all ${activeTab === 'meetings' ? (isDark ? 'bg-dark-surface text-accent-400 shadow-lg border border-accent-500/30' : 'bg-white text-blue-600 shadow-md border border-blue-100') : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Video size={14} />
                <span>Meetings</span>
              </button>
              <button
                onClick={() => setActiveTab('events')}
                className={`flex items-center space-x-2 px-6 py-2 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all ${activeTab === 'events' ? (isDark ? 'bg-dark-surface text-accent-400 shadow-lg border border-accent-500/30' : 'bg-white text-blue-600 shadow-md border border-blue-100') : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Ticket size={14} />
                <span>Events</span>
              </button>
            </div>
          </motion.div>

          {/* Table Interface */}
          <div className={`overflow-hidden rounded-2xl border ${isDark ? 'border-dark-border/50 bg-dark-surface/50' : 'border-slate-200 bg-white shadow-sm'}`}>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className={`${isDark ? 'bg-white/5' : 'bg-slate-50/50'} border-b ${isDark ? 'border-dark-border/50' : 'border-slate-100'}`}>
                    <th className="px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Session Details</th>
                    <th className="px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider text-center">Type</th>
                    <th className="px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider text-center">Date / Time</th>
                    <th className="px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">Status</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-dark-border/50' : 'divide-slate-100'}`}>
                  <AnimatePresence mode="popLayout">
                    {filteredItems().length === 0 ? (
                      <motion.tr
                        key="empty-state"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <td colSpan={4} className="px-6 py-20 text-center">
                          <div className="flex flex-col items-center justify-center text-slate-400">
                            <Clock size={48} className="mb-4 opacity-20" />
                            <p className="font-medium italic">No attendance records found</p>
                          </div>
                        </td>
                      </motion.tr>
                    ) : (
                      filteredItems().map((item, index) => (
                        <motion.tr
                          key={activeTab === 'meetings' ? (item.meetingId || `m-${index}`) : (item.eventId || `e-${index}`)}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: index * 0.05 }}
                          className={`group transition-all ${isDark ? 'hover:bg-white/5' : 'hover:bg-blue-50/50'}`}
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
                              {item.isPresent ? (
                                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 font-bold text-[11px] uppercase tracking-wider">
                                  <CheckCircle2 size={14} />
                                  <span>Present</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 font-bold text-[11px] uppercase tracking-wider">
                                  <XCircle size={14} />
                                  <span>Absent</span>
                                </span>
                              )}
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
            <p>Your attendance records are synced automatically with community sessions.</p>
            <div className="flex items-center space-x-4">
              <span className="flex items-center"><History size={12} className="mr-1" /> History Updated</span>
              <span className="flex items-center"><Calendar size={12} className="mr-1" /> All Records Secure</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentAttendanceStats;
