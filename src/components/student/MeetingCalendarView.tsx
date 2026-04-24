import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Video, Calendar as CalendarIcon, ExternalLink, Loader2, X, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { googleMeetAPI } from '../../services/googleMeetApi';

import { useSmartPolling } from '../../hooks/useSmartPolling';

interface Meeting {
  meetingId: string;
  chapterId: string;
  title: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  meetLink: string;
}

interface MeetingCalendarViewProps {
  chapterIds: string[];
}

const MeetingCalendarView: React.FC<MeetingCalendarViewProps> = ({ chapterIds }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [, setError] = useState<string | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  const fetchAllMeetings = async () => {
    if (chapterIds.length === 0) return;
    try {
      const allMeetings: Meeting[] = [];
      await Promise.all(chapterIds.map(async (id) => {
        try {
          const response = await googleMeetAPI.listMeetings(id);
          if (response.meetings) allMeetings.push(...response.meetings);
        } catch (err) {
          console.warn(`Failed to fetch meetings for chapter ${id}`, err);
        }
      }));
      setMeetings(allMeetings);
    } catch (err: any) {
      setError('Failed to load meetings');
    } finally {
      setIsLoading(false);
    }
  };

  // Smart Polling for Meetings
  useSmartPolling(fetchAllMeetings, { 
    enabled: chapterIds.length > 0,
    activeInterval: 45000 // Poll every 45s for meetings
  });

  useEffect(() => {
    if (chapterIds.length > 0) {
      setIsLoading(true);
      fetchAllMeetings();
    }
  }, [chapterIds]);

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentDate)),
    end: endOfWeek(endOfMonth(currentDate)),
  });

  const getMeetingsForDay = (day: Date) => {
    return meetings.filter(m => isSameDay(parseISO(m.startDateTime), day));
  };

  return (
    <div className="bg-white/40 backdrop-blur-xl rounded-2xl border border-white/20 shadow-md flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-white/20">
        <h3 className="font-bold text-gray-800 text-lg flex items-center space-x-2">
          <CalendarIcon className="h-5 w-5 text-indigo-600" />
          <span>{format(currentDate, 'MMMM yyyy')}</span>
        </h3>
        <div className="flex space-x-2 bg-gray-100/50 p-1 rounded-xl">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-1.5 hover:bg-white rounded-lg transition-colors">
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 hover:bg-white rounded-lg text-xs font-medium transition-colors">
            Today
          </button>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-1.5 hover:bg-white rounded-lg transition-colors">
            <ChevronRight className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <div className="grid grid-cols-7 text-center py-2 border-b border-gray-100">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={`${d}-${i}`} className="text-[10px] font-bold text-gray-400">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day) => {
            const items = getMeetingsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());

            return (
              <div 
                key={day.toString()}
                className={`min-h-[80px] p-1 border-r border-b border-gray-50 flex flex-col items-center ${
                  !isCurrentMonth ? 'opacity-30' : ''
                }`}
              >
                <span className={`text-[11px] font-medium w-5 h-5 flex items-center justify-center rounded-full mb-1 ${
                  isToday ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600'
                }`}>
                  {format(day, 'd')}
                </span>
                <div className="w-full space-y-1">
                  {items.map(m => (
                    <motion.div
                      key={m.meetingId}
                      layoutId={m.meetingId}
                      onClick={() => setSelectedMeeting(m)}
                      className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] rounded-md truncate cursor-pointer hover:bg-indigo-200 transition-colors"
                    >
                      {m.title}
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail Overlay */}
      <AnimatePresence>
        {selectedMeeting && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 bg-indigo-900/40 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4"
            >
              <div className="flex justify-between items-start">
                <h4 className="text-xl font-bold text-gray-900">{selectedMeeting.title}</h4>
                <button onClick={() => setSelectedMeeting(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-indigo-500" />
                  <span>{format(parseISO(selectedMeeting.startDateTime), 'eeee, MMMM d')}</span>
                </div>
                <div className="flex items-center space-x-2 pl-6">
                  <span>{format(parseISO(selectedMeeting.startDateTime), 'HH:mm')} - {format(parseISO(selectedMeeting.endDateTime), 'HH:mm')}</span>
                </div>
                {selectedMeeting.description && (
                  <p className="mt-2 text-gray-500 italic leading-relaxed">
                    "{selectedMeeting.description}"
                  </p>
                )}
              </div>
              <a 
                href={selectedMeeting.meetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center space-x-2 w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
              >
                <Video className="h-5 w-5" />
                <span>Join Meeting</span>
                <ExternalLink className="h-4 w-4 opacity-50" />
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {isLoading && meetings.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-[2px]">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
        </div>
      )}
    </div>
  );
};

export default MeetingCalendarView;
