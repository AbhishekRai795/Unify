import React, { useState, useEffect } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  parseISO,
} from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon, 
  Video, 
  X,
  Trash2,
  Loader2,
  AlertCircle,
  Clock,
  Timer,
  AlignLeft,
  Type,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { googleMeetAPI } from '../../services/googleMeetApi';
import { paymentAPI } from '../../services/paymentApi';
import { useTheme } from '../../contexts/ThemeContext';


interface Meeting {
  meetingId: string;
  chapterId: string;
  eventId?: string;
  title: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  meetLink: string;
  createdBy: string;
  createdAt: string;
}

interface MeetingCalendarProps {
  chapterId: string;
  isReadOnly?: boolean;
}

const MeetingCalendar: React.FC<MeetingCalendarProps> = ({ chapterId, isReadOnly = false }) => {
  const { isDark } = useTheme();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view] = useState<'month' | 'week' | 'day'>('month');
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  
  // New Meeting Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '10:00',
    duration: '60',
    sendInvites: true,
    isForEvent: false,
    eventId: ''
  });

  const [isOAuthConnected] = useState(true);

  // Fetch meetings
  const fetchMeetings = async () => {
    setIsLoading(true);
    try {
      const response = await googleMeetAPI.listMeetings(chapterId);
      setMeetings(response.meetings || []);
    } catch (err: any) {
      console.error('Failed to fetch meetings:', err);
      setError(err.message || 'Failed to load meetings');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEvents = async () => {
    setIsLoadingEvents(true);
    try {
      // paymentAPI.listEvents returns all events, we filter for this chapter
      const response = await paymentAPI.listEvents();
      const eventsList = Array.isArray(response) ? response : (response?.events || []);
      const chapterEvents = eventsList.filter((e: any) => e.chapterId === chapterId && e.isLive);
      setEvents(chapterEvents);
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
    fetchEvents();
  }, [chapterId]);

  // Calendar Logic
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  
  const days = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const nextPeriod = () => {
    if (view === 'month') setCurrentDate(addMonths(currentDate, 1));
    if (view === 'week') setCurrentDate(addWeeks(currentDate, 1));
    if (view === 'day') setCurrentDate(addDays(currentDate, 1));
  };

  const prevPeriod = () => {
    if (view === 'month') setCurrentDate(subMonths(currentDate, 1));
    if (view === 'week') setCurrentDate(subWeeks(currentDate, 1));
    if (view === 'day') setCurrentDate(subDays(currentDate, 1));
  };

  const handleDateClick = (day: Date) => {
    if (isReadOnly) return;
    setSelectedDate(day);
    setFormData({
      ...formData,
      startTime: '10:00',
      duration: '60'
    });
    setEditingMeeting(null);
    setIsModalOpen(true);
  };

  const handleMeetingClick = (e: React.MouseEvent, meeting: Meeting) => {
    e.stopPropagation();
    if (isReadOnly) return;
    setEditingMeeting(meeting);
    const start = parseISO(meeting.startDateTime);
    const end = parseISO(meeting.endDateTime);
    const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
    setSelectedDate(start);
    setFormData({
      title: meeting.title,
      description: meeting.description,
      startTime: format(start, 'HH:mm'),
      duration: durationMinutes.toString(),
      sendInvites: false,
      isForEvent: !!meeting.eventId,
      eventId: meeting.eventId || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) return;

    setIsLoading(true);
    try {
      const start = new Date(selectedDate);
      const [startH, startM] = formData.startTime.split(':');
      start.setHours(parseInt(startH), parseInt(startM));

      const end = new Date(start.getTime() + parseInt(formData.duration) * 60000);

      const data = {
        chapterId,
        title: formData.title,
        description: formData.description,
        startDateTime: start.toISOString(),
        endDateTime: end.toISOString(),
        sendInvites: formData.sendInvites,
        eventId: formData.isForEvent ? formData.eventId : undefined
      };

      if (editingMeeting) {
        await googleMeetAPI.updateMeeting(chapterId, editingMeeting.meetingId, data);
      } else {
        await googleMeetAPI.createMeeting(data);
      }

      setIsModalOpen(false);
      fetchMeetings();
    } catch (err: any) {
      setError(err.message || 'Failed to save meeting');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editingMeeting) return;
    if (!window.confirm('Are you sure you want to delete this meeting?')) return;

    setIsLoading(true);
    try {
      await googleMeetAPI.deleteMeeting(chapterId, editingMeeting.meetingId);
      setIsModalOpen(false);
      fetchMeetings();
    } catch (err: any) {
      setError(err.message || 'Failed to delete meeting');
    } finally {
      setIsLoading(false);
    }
  };

  const connectGoogle = async () => {
    try {
      const { url } = await googleMeetAPI.initOAuth();
      window.location.href = url;
    } catch (err: any) {
      setError('Failed to connect to Google: ' + err.message);
    }
  };

  const getMeetingsForDay = (day: Date) => {
    return meetings.filter(m => isSameDay(parseISO(m.startDateTime), day));
  };

  return (
    <div className={`flex flex-col rounded-lg border shadow-sm transition-all duration-300 overflow-hidden ${
      isDark ? 'bg-dark-surface border-dark-border' : 'bg-white border-slate-200'
    }`}>

      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-gray-100 dark:border-dark-border">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
              <CalendarIcon className={`h-5 w-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <h2 className={`text-xl font-bold tracking-tight ${isDark ? 'text-dark-text-primary' : 'text-slate-800'}`}>
              {format(currentDate, 'MMMM yyyy')}
            </h2>
          </div>
          
          <div className={`flex p-1 rounded-md ${isDark ? 'bg-black/20' : 'bg-slate-100'}`}>
            <button 
              onClick={prevPeriod}
              className={`p-1.5 rounded-md transition-all ${isDark ? 'hover:bg-white/5 text-dark-text-secondary' : 'hover:bg-white text-slate-500'}`}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setCurrentDate(new Date())}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${isDark ? 'hover:bg-white/5 text-dark-text-secondary' : 'hover:bg-white text-slate-600'}`}
            >
              Today
            </button>
            <button 
              onClick={nextPeriod}
              className={`p-1.5 rounded-md transition-all ${isDark ? 'hover:bg-white/5 text-dark-text-secondary' : 'hover:bg-white text-slate-500'}`}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {!isReadOnly && !isOAuthConnected && (
            <button 
              onClick={connectGoogle}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all font-semibold text-sm"
            >
              <Video className="h-4 w-4" />
              <span>Connect Google</span>
            </button>
          )}

          {!isReadOnly && isOAuthConnected && (
            <button 
              onClick={() => handleDateClick(new Date())}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all font-semibold text-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Schedule Meet</span>
            </button>
          )}
        </div>

      </div>

      {/* Calendar Grid */}
      <div className="w-full">
        {view === 'month' && (
          <div className="grid grid-cols-7 min-h-[400px]">
            {/* Day Names */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div 
                key={day} 
                className={`p-2 text-center text-[10px] font-bold uppercase tracking-wider border-b transition-colors ${
                  isDark ? 'text-dark-text-muted border-dark-border bg-dark-card/50' : 'text-slate-500 border-slate-100 bg-slate-50'
                }`}
              >
                {day}
              </div>
            ))}
            
            {/* Days */}
            {days.map((day) => {
              const items = getMeetingsForDay(day);
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isToday = isSameDay(day, new Date());

              return (
                <div 
                  key={day.toString()}
                  onClick={() => handleDateClick(day)}
                  className={`min-h-[100px] p-1 border-r border-b transition-all cursor-pointer group/day relative ${
                    isDark ? 'border-dark-border hover:bg-white/5' : 'border-slate-100 hover:bg-blue-50/20'
                  } ${!isCurrentMonth ? (isDark ? 'opacity-20' : 'bg-slate-50/20 opacity-30') : ''}`}
                >
                  <div className="flex justify-end mb-1">
                    <span className={`text-xs font-mono w-6 h-6 flex items-center justify-center rounded-sm transition-all ${
                      isToday ? 'bg-blue-600 text-white' : 
                      isCurrentMonth ? (isDark ? 'text-dark-text-primary' : 'text-slate-600') : (isDark ? 'text-dark-text-muted' : 'text-slate-400')
                    }`}>
                      {format(day, 'd')}
                    </span>
                  </div>

                  <div className="space-y-1 relative z-10">
                    {items.slice(0, 3).map((m) => (
                      <div
                        key={m.meetingId}
                        onClick={(e) => handleMeetingClick(e, m)}
                        className={`flex items-center space-x-1 px-1.5 py-1 rounded-sm text-[9px] font-medium truncate transition-all border ${
                          isDark 
                            ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20' 
                            : 'bg-blue-50 border-blue-100 text-blue-700 hover:bg-blue-100'
                        }`}
                      >
                        <Video className="h-2.5 w-2.5 shrink-0" />
                        <span className="truncate">
                          {format(parseISO(m.startDateTime), 'HH:mm')} {m.title}
                        </span>
                      </div>
                    ))}
                    {items.length > 3 && (
                      <div className={`text-[9px] font-medium pl-1 ${isDark ? 'text-dark-text-muted' : 'text-slate-400'}`}>
                        + {items.length - 3} more
                      </div>
                    )}
                  </div>

                  {/* Highlight on hover */}
                  <div className={`absolute inset-0 opacity-0 group-hover/day:opacity-100 transition-opacity pointer-events-none border m-0 ${
                    isDark ? 'border-blue-500/20' : 'border-blue-500/20'
                  }`} />
                </div>
              );
            })}
          </div>
        )}
        
        {/* Placeholder for Week/Day views */}
        {(view === 'week' || view === 'day') && (
          <div className={`flex flex-col items-center justify-center p-20 text-center ${isDark ? 'text-dark-text-muted' : 'text-slate-400'}`}>
            <div className="p-4 rounded-full bg-gray-100/50 dark:bg-white/5 mb-4">
              <CalendarIcon className="h-10 w-10 opacity-20" />
            </div>
            <p className="font-bold tracking-tight italic">
              {view.charAt(0).toUpperCase() + view.slice(1)} view is currently under construction
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.98, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0, y: 10 }}
              className="relative w-full max-w-4xl bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden"
            >
              <div className="p-6 flex items-center justify-between border-b border-gray-100">
                <h3 className="text-xl font-bold text-gray-800">
                  {editingMeeting ? 'Edit Meeting Details' : 'Schedule New Meeting'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  {/* Left Column: Context & Content */}
                  <div className="space-y-4">
                    <div>
                      <label className="flex items-center text-xs font-semibold text-gray-700 mb-1.5">
                        <Type className="h-3.5 w-3.5 mr-2 text-blue-500" />
                        Meeting Title
                      </label>
                      <input 
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        placeholder="E.g. Monthly Chapter Sync"
                        className="w-full px-4 py-2.5 rounded-xl bg-gray-50/50 border border-gray-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                      />
                    </div>

                    <div className="p-4 bg-gray-50/50 rounded-[1.5rem] border border-gray-200/50 space-y-4">
                      <label className="flex items-center text-sm font-bold text-gray-700">
                        <Users className="h-4 w-4 mr-2 text-blue-600" />
                        Meeting Audience
                      </label>
                      
                      <div className="grid grid-cols-2 gap-3 p-1 bg-gray-100/50 rounded-2xl border border-gray-200/30">
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, isForEvent: false})}
                          className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                            !formData.isForEvent 
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                              : 'text-gray-500 hover:bg-gray-200/50'
                          }`}
                        >
                          Whole Chapter
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, isForEvent: true})}
                          className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                            formData.isForEvent 
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                              : 'text-gray-500 hover:bg-gray-200/50'
                          }`}
                        >
                          Specific Event
                        </button>
                      </div>

                      <AnimatePresence mode="wait">
                        {formData.isForEvent && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-3 overflow-hidden"
                          >
                            <label className="text-xs font-bold text-blue-600 px-1">Select Target Event</label>
                            <select
                              required={formData.isForEvent}
                              value={formData.eventId}
                              onChange={(e) => setFormData({...formData, eventId: e.target.value})}
                              className="w-full px-4 py-2.5 rounded-xl bg-white border border-blue-100 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-sm font-medium text-gray-700 cursor-pointer"
                            >
                              <option value="">Select an Event...</option>
                              {events.map(event => (
                                <option key={event.eventId} value={event.eventId}>
                                  {event.title}
                                </option>
                              ))}
                            </select>
                            {events.length === 0 && !isLoadingEvents && (
                              <p className="text-[10px] text-amber-600 font-bold px-1 italic">
                                No live events found for this chapter.
                              </p>
                            )}
                          </motion.div>
                        )}
                        {!formData.isForEvent && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-3"
                          >
                            <p className="text-[11px] text-blue-600/80 font-bold italic leading-relaxed">
                              * All registered chapter members will receive an invite and a notification for this meeting.
                            </p>
                          </motion.div>
                        )}
                        {formData.isForEvent && formData.eventId && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="bg-green-500/5 border border-green-500/10 rounded-xl p-3"
                          >
                            <p className="text-[11px] text-green-600/80 font-bold italic leading-relaxed">
                              * Only students whose registration is Approved/Paid for this event will be invited.
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div>
                      <label className="flex items-center text-xs font-semibold text-gray-700 mb-1.5">
                        <AlignLeft className="h-3.5 w-3.5 mr-2 text-blue-500" />
                        Description
                      </label>
                      <textarea 
                        rows={4}
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        placeholder="What's this meeting about? (Optional)"
                        className="w-full px-4 py-2.5 rounded-xl bg-gray-50/50 border border-gray-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none outline-none text-sm"
                      />
                    </div>
                  </div>

                  {/* Right Column: Logistics */}
                  <div className="space-y-4">
                    <div>
                      <label className="flex items-center text-xs font-semibold text-gray-700 mb-1.5">
                        <CalendarIcon className="h-3.5 w-3.5 mr-2 text-blue-500" />
                        Date
                      </label>
                      <input 
                        type="date"
                        required
                        value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                        onChange={(e) => setSelectedDate(new Date(e.target.value))}
                        className="w-full px-4 py-2.5 rounded-xl bg-gray-50/50 border border-gray-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center text-xs font-semibold text-gray-700 mb-1.5">
                          <Clock className="h-3.5 w-3.5 mr-2 text-blue-500" />
                          Start Time
                        </label>
                        <input 
                          type="time"
                          required
                          value={formData.startTime}
                          onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                          className="w-full px-4 py-2.5 rounded-xl bg-gray-50/50 border border-gray-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                        />
                      </div>
                      <div>
                        <label className="flex items-center text-xs font-semibold text-gray-700 mb-1.5">
                          <Timer className="h-3.5 w-3.5 mr-2 text-blue-500" />
                          Duration
                        </label>
                        <select 
                          required
                          value={formData.duration}
                          onChange={(e) => setFormData({...formData, duration: e.target.value})}
                          className="w-full px-4 py-2.5 rounded-xl bg-gray-50/50 border border-gray-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none appearance-none cursor-pointer text-sm"
                        >
                          <option value="15">15 Minutes</option>
                          <option value="30">30 Minutes</option>
                          <option value="45">45 Minutes</option>
                          <option value="60">1 Hour</option>
                          <option value="90">1.5 Hours</option>
                          <option value="120">2 Hours</option>
                          <option value="180">3 Hours</option>
                        </select>
                      </div>
                    </div>

                    <div className="p-3 bg-blue-50/30 rounded-xl border border-blue-100/50">
                      <label className="flex items-center h-full cursor-pointer">
                        <input 
                          type="checkbox"
                          id="sendInvites"
                          checked={formData.sendInvites}
                          onChange={(e) => setFormData({...formData, sendInvites: e.target.checked})}
                          className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500/10 transition-all mr-3"
                        />
                        <span className="text-xs text-gray-700 font-semibold italic">
                          Send Google Calendar invites to all members
                        </span>
                      </label>
                    </div>

                    <div className="pt-4 flex items-center justify-between border-t border-gray-100">
                      {editingMeeting ? (
                        <button 
                          type="button"
                          onClick={handleDelete}
                          className="flex items-center space-x-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl transition-all font-bold text-xs"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Cancel Meeting</span>
                        </button>
                      ) : <div />}

                      <div className="flex items-center space-x-3">
                        <button 
                          type="button"
                          onClick={() => setIsModalOpen(false)}
                          className="px-5 py-2.5 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-all text-sm"
                        >
                          Discard
                        </button>
                        <button 
                          type="submit"
                          disabled={isLoading}
                          className="flex items-center space-x-2 px-8 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 font-bold text-sm"
                        >
                          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
                          <span>{editingMeeting ? 'Update Schedule' : 'Launch Meeting'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Error Toast */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 bg-red-600 text-white rounded-2xl shadow-2xl flex items-center space-x-3"
          >
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">{error}</span>
            <button onClick={() => setError(null)} className="p-1 hover:bg-white/20 rounded-full">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MeetingCalendar;
