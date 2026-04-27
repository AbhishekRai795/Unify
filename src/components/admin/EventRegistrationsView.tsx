import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Users, 
  Search, 
  Download, 
  ArrowLeft, 
  Mail, 
  CheckCircle, 
  Loader2,
  User,
  Clock,
  RefreshCw,
  Calendar,
  MessageSquare
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useChapterHead } from '../../contexts/ChapterHeadContext';
import { useTheme } from '../../contexts/ThemeContext';
import { paymentAPI } from '../../services/paymentApi';
import { attendanceAPI } from '../../services/attendanceApi';
import { formatDistanceToNow } from 'date-fns';
import { useChat } from '../../contexts/ChatContext';

const EventRegistrationsView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { fetchMyEvents } = useChapterHead();
  const { setActiveConversation, setIsWidgetOpen, refreshConversations } = useChat();
  
  const eventId = searchParams.get('eventId');
  const [eventData, setEventData] = useState<any>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    if (!eventId) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const [allEvents, regRes, attRes] = await Promise.all([
        fetchMyEvents().catch(() => []),
        paymentAPI.getEventRegistrationsForEvent(eventId).catch(() => ({ registrations: [] })),
        attendanceAPI.getEventAttendance(eventId).catch(() => ({ attendance: [] }))
      ]);

      const currentEvent = Array.isArray(allEvents) 
        ? allEvents.find((e: any) => e.eventId === eventId)
        : null;
      
      setEventData(currentEvent);
      setRegistrations(regRes?.registrations || []);
      setAttendance(attRes?.attendance || []);
      
    } catch (err: any) {
      setError(err.message || 'Failed to load registration data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!eventId) {
      setError('No event selected.');
      setIsLoading(false);
      return;
    }
    loadData();
  }, [eventId]);

  const startChatWithStudent = async (registration: any) => {
    const recipientId = registration.userId || registration.studentEmail;
    if (!recipientId || !eventData?.chapterId) return;

    setActiveConversation({
      chapterId: eventData.chapterId,
      recipientId,
      recipientName: registration.studentName || 'Student'
    });
    setIsWidgetOpen(true);
    await refreshConversations(eventData.chapterId);
  };

  const handleExportCsv = () => {
    if (registrations.length === 0) return;
    const headers = ['Student Name', 'Email', 'Payment Status', 'Attendance', 'Applied Date'];
    const rows = registrations.map(reg => [
      reg.studentName || 'Participant',
      reg.studentEmail || reg.userId || 'N/A',
      reg.paymentStatus || 'REGISTERED',
      attendance.some(a => a.userId === reg.userId) ? 'PRESENT' : 'ABSENT',
      reg.joinedAt ? new Date(reg.joinedAt).toLocaleString() : 'N/A'
    ]);
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registrations-${eventData?.title || eventId}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredRegistrations = registrations.filter(reg => 
    (reg.studentName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (reg.studentEmail || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`min-h-screen ${isDark ? 'bg-dark-bg text-dark-text-primary' : 'bg-gray-50 text-gray-900'}`}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Navigation - Similar to ManageEvents */}
        <div className="mb-6 text-left">
          <button
            onClick={() => navigate('/head/events/manage')}
            className={`group flex items-center text-sm font-medium transition-all duration-200 ${isDark ? 'text-gray-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <div className={`p-2 mr-2 rounded-lg border transition-all ${isDark ? 'bg-dark-surface border-dark-border group-hover:border-accent-500/50 group-hover:bg-accent-600/10' : 'bg-white border-slate-200 group-hover:border-blue-300 group-hover:bg-blue-50'}`}>
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            </div>
            Back to Events
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 rounded-xl border border-red-100 flex items-center text-red-700 animate-shake">
            <div className="p-1.5 bg-red-100 rounded-lg mr-3">
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Heading & Header - Matching ManageEvents centered style */}
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
            Event Participants
          </h1>
          <p className={`
            text-lg max-w-2xl mx-auto transition-colors duration-300 font-normal
            ${isDark ? 'text-dark-text-secondary' : 'text-slate-500'}
          `}>
            {eventData ? `Managing participants for ${eventData.title}` : 'View and manage student entries for this event.'}
          </p>
        </div>

        {/* Filters - Matching Registrations.tsx layout */}
        <div className={`rounded-xl border p-4 mb-8 flex flex-col md:flex-row items-center justify-between gap-4 ${isDark ? 'bg-dark-surface border-dark-border shadow-sm' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${isDark ? 'bg-dark-bg border-dark-border text-white' : 'bg-gray-50 border-gray-200 text-gray-900 focus:bg-white'}`}
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleExportCsv}
              disabled={isLoading || registrations.length === 0}
              className="flex items-center justify-center gap-2 px-6 py-2 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 transition-all disabled:opacity-50 shadow-md transform hover:scale-[1.02]"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <button
              onClick={loadData}
              disabled={isLoading}
              className={`p-2.5 rounded-xl border transition-all ${isDark ? 'bg-dark-surface border-dark-border hover:bg-white/5 text-gray-400' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-500 shadow-sm'}`}
            >
              <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Table - Exact layout of Registrations.tsx */}
        <div className={`rounded-xl border overflow-hidden shadow-sm ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-white border-gray-200'}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={`${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied Date</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-dark-border' : 'divide-gray-200'}`}>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <Loader2 className="h-10 w-10 animate-spin mx-auto text-blue-600 mb-4" />
                      <p className="text-gray-500 font-medium">Loading participants...</p>
                    </td>
                  </tr>
                ) : filteredRegistrations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <Users className="h-16 w-16 mx-auto mb-4 opacity-10" />
                      <h3 className="text-lg font-bold">No registrations found</h3>
                      <p className="text-gray-500">Wait for students to register for this event.</p>
                    </td>
                  </tr>
                ) : (
                  filteredRegistrations.map((reg, index) => {
                    const isPresent = attendance.some(a => a.userId === reg.userId);
                    return (
                      <motion.tr 
                        key={`${reg.userId}-${index}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className={`hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mr-3 shadow-sm">
                              <User className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {reg.studentName || 'Participant'}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center">
                                <Mail className="h-3 w-3 mr-1" />
                                {reg.studentEmail || reg.userId}
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            (reg.paymentStatus || 'REGISTERED') === 'REGISTERED' || reg.paymentStatus === 'COMPLETED'
                              ? 'text-green-600 bg-green-50 dark:bg-green-500/10 dark:text-green-400'
                              : 'text-yellow-600 bg-yellow-50 dark:bg-yellow-500/10 dark:text-yellow-400'
                          }`}>
                            {reg.paymentStatus || 'REGISTERED'}
                          </span>
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            {isPresent ? (
                              <div className="flex items-center text-green-600 dark:text-green-400">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                <span className="text-xs font-medium">Present</span>
                              </div>
                            ) : (
                              <div className="flex items-center text-gray-400">
                                <Clock className="h-4 w-4 mr-2" />
                                <span className="text-xs font-medium">Absent</span>
                              </div>
                            )}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 text-sm">
                          <div className={`flex items-center ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                            <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                            {reg.joinedAt ? new Date(reg.joinedAt).toLocaleDateString() : 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500 ml-6">
                            {reg.joinedAt ? formatDistanceToNow(new Date(reg.joinedAt), { addSuffix: true }) : ''}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <button
                            onClick={() => startChatWithStudent(reg)}
                            className="flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
                          >
                            <MessageSquare className="h-4 w-4 mr-1.5" />
                            Chat
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Footer */}
        {!isLoading && registrations.length > 0 && (
          <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
            <p>Showing {filteredRegistrations.length} of {registrations.length} registrations</p>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> {attendance.length} Present</span>
              <span className="flex items-center gap-1"><Users className="h-3 w-3 text-blue-500" /> {registrations.length} Total</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventRegistrationsView;
