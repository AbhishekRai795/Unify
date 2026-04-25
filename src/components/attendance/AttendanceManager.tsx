import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Users, 
  MapPin, 
  RefreshCw, 
  Clock, 
  CheckCircle2,
  Calendar,
  Search,
  ArrowLeft
} from 'lucide-react';
import { attendanceAPI } from '../../services/attendanceApi';
import { useTheme } from '../../contexts/ThemeContext';
import { motion } from 'framer-motion';

interface AttendanceManagerProps {
  meetingId: string;
  onClose: () => void;
}

const AttendanceManager: React.FC<AttendanceManagerProps> = ({ meetingId, onClose }) => {
  const { isDark } = useTheme();
  const [token, setToken] = useState<string>('');
  const [useLocation, setUseLocation] = useState<boolean>(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [meeting, setMeeting] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [manualSearch, setManualSearch] = useState<string>('');
  const [eligibleStudents, setEligibleStudents] = useState<any[]>([]);
  const refreshInterval = useRef<any>(null);
  const listInterval = useRef<any>(null);

  const fetchToken = async () => {
    try {
      const fullId = meetingId + window.location.hash;
      const isEvent = fullId.startsWith('event-');
      const actualId = isEvent ? fullId.replace('event-', '') : fullId;

      let loc = null;
      if (useLocation && !location) {
        // Get current position
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(loc);
      } else if (useLocation && location) {
        loc = location;
      }

      const res = await attendanceAPI.generateToken(
        isEvent ? undefined : actualId, 
        loc || undefined, 
        useLocation,
        isEvent ? actualId : undefined
      );
      setToken(res.token);
    } catch (err) {
      console.error('Error fetching token:', err);
    }
  };

  const fetchAttendees = async () => {
    try {
      const fullId = meetingId + window.location.hash;
      const isEvent = fullId.startsWith('event-');
      const actualId = isEvent ? fullId.replace('event-', '') : fullId;
      
      const res = isEvent 
        ? await attendanceAPI.getEventAttendance(actualId)
        : await attendanceAPI.getMeetingAttendance(actualId);

      setAttendees(res.attendance || []);
      if (res.meeting) setMeeting(res.meeting);
      if (res.eligibleStudents) setEligibleStudents(res.eligibleStudents);
    } catch (err) {
      console.error('Error fetching attendees:', err);
    }
  };

  useEffect(() => {
    fetchToken();
    fetchAttendees();

    // Refresh token every 10 seconds
    refreshInterval.current = setInterval(fetchToken, 10000);
    // Refresh attendee list every 5 seconds
    listInterval.current = setInterval(fetchAttendees, 5000);

    return () => {
      if (refreshInterval.current) clearInterval(refreshInterval.current);
      if (listInterval.current) clearInterval(listInterval.current);
    };
  }, [meetingId, useLocation]);

  const handleManualMark = async (studentUserId: string) => {
    setIsLoading(true);
    try {
      const fullId = meetingId + window.location.hash;
      const isEvent = fullId.startsWith('event-');
      const actualId = isEvent ? fullId.replace('event-', '') : fullId;
      
      await attendanceAPI.markManually(actualId, studentUserId);
      await fetchAttendees();
    } catch (err) {
      console.error('Manual mark failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (userId: string, skipConfirm = false) => {
    if (!skipConfirm && !confirm('Are you sure you want to remove this attendance record?')) return;
    try {
      const fullId = meetingId + window.location.hash;
      const isEvent = fullId.startsWith('event-');
      const actualId = isEvent ? fullId.replace('event-', '') : fullId;
      
      await attendanceAPI.removeAttendance(actualId, userId);
      await fetchAttendees();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-dark-bg' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'}`}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Navigation */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={onClose}
            className={`group flex items-center text-sm font-medium transition-all duration-200 ${isDark ? 'text-dark-text-secondary hover:text-dark-text-primary' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <div className={`p-2 mr-2 rounded-lg border transition-all ${isDark ? 'bg-dark-surface border-dark-border group-hover:border-accent-500/50 group-hover:bg-accent-600/10' : 'bg-white border-slate-200 group-hover:border-blue-300 group-hover:bg-blue-50'}`}>
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            </div>
            Back to Sessions
          </button>

          <div className="flex items-center space-x-2">
            <div className="px-3 py-1 bg-green-100 dark:bg-green-500/10 text-green-600 rounded-full text-[10px] font-semibold animate-pulse flex items-center">
              <span className="h-1.5 w-1.5 bg-green-600 rounded-full mr-2"></span>
              LIVE SESSION
            </div>
          </div>
        </div>

        {/* Header */}
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
          <h1 className={`
            text-4xl font-bold mb-4 transition-all duration-300 tracking-tight
            ${isDark ? 'text-dark-text-primary' : 'text-[#1a1f36]'}
          `}>
            {meeting?.title || 'Attendance Management'}
          </h1>
          <div className={`
            flex items-center justify-center space-x-6 transition-colors duration-300
            ${isDark ? 'text-dark-text-secondary' : 'text-slate-500'}
          `}>
            {meeting?.startDateTime && !isNaN(new Date(meeting.startDateTime).getTime()) && (
              <span className="flex items-center text-sm">
                <Calendar className="h-4 w-4 mr-2 text-blue-500" />
                {new Date(meeting.startDateTime).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            )}
            <span className="flex items-center text-sm">
              <Users className="h-4 w-4 mr-2 text-blue-500" />
              {attendees.length} / {eligibleStudents.length} Students Present
            </span>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* QR Code Section */}
          <div className="lg:col-span-1">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`backdrop-blur-md rounded-3xl p-8 border transition-all duration-300 h-full flex flex-col items-center justify-center space-y-8 ${isDark ? 'bg-dark-surface/85 border-dark-border/70 shadow-2xl' : 'bg-white/80 border-white/20 shadow-xl'}`}
            >
              <div className="text-center space-y-2">
                <h3 className={`text-xl font-bold ${isDark ? 'text-dark-text-primary' : 'text-slate-800'}`}>Check-in QR Code</h3>
                <p className={`text-sm ${isDark ? 'text-dark-text-muted' : 'text-slate-500'}`}>Refreshes automatically every 10 seconds</p>
              </div>

              <div className={`p-6 rounded-3xl bg-white shadow-2xl border-4 ${isDark ? 'border-accent-500/20' : 'border-blue-50'}`}>
                {token ? (
                  <QRCodeSVG value={token} size={220} level="H" />
                ) : (
                  <div className="w-[220px] h-[220px] flex items-center justify-center">
                    <RefreshCw className="h-10 w-10 animate-spin text-blue-600" />
                  </div>
                )}
              </div>

              <div className="w-full space-y-4">
                <label className={`flex items-center justify-between p-5 rounded-2xl border transition-all cursor-pointer group ${useLocation ? (isDark ? 'bg-blue-500/10 border-blue-500/50' : 'bg-blue-50 border-blue-200 shadow-md') : (isDark ? 'bg-dark-bg/40 border-dark-border/50' : 'bg-slate-50/50 border-slate-200/50')}`}>
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-xl transition-colors ${useLocation ? 'bg-blue-500 text-white' : (isDark ? 'bg-dark-surface text-slate-500' : 'bg-white text-slate-400')}`}>
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <p className={`font-semibold text-sm ${isDark ? 'text-dark-text-primary' : 'text-slate-800'}`}>Geo-Fencing</p>
                      <p className={`text-xs ${isDark ? 'text-dark-text-muted' : 'text-slate-500'}`}>Validate student proximity (150m)</p>
                    </div>
                  </div>
                  <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${useLocation ? 'bg-blue-600' : 'bg-slate-300'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${useLocation ? 'translate-x-6' : 'translate-x-0'}`} />
                  </div>
                  <input 
                    type="checkbox" 
                    checked={useLocation}
                    onChange={(e) => {
                      setUseLocation(e.target.checked);
                      if (!e.target.checked) setLocation(null);
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </motion.div>
          </div>

          {/* Roster Section */}
          <div className="lg:col-span-2">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`backdrop-blur-md rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col h-full ${isDark ? 'bg-dark-surface/85 border-dark-border/70 shadow-2xl' : 'bg-white/80 border-white/20 shadow-xl'}`}
            >
              {/* Table Toolbar */}
              <div className={`p-6 border-b flex flex-wrap items-center justify-between gap-4 ${isDark ? 'border-dark-border/50 bg-white/5' : 'border-slate-100 bg-slate-50/50'}`}>
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                    <Users className="h-5 w-5" />
                  </div>
                  <h3 className={`text-lg font-semibold ${isDark ? 'text-dark-text-primary' : 'text-slate-800'}`}>Attendance Roster</h3>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Search students..."
                    value={manualSearch}
                    onChange={(e) => setManualSearch(e.target.value)}
                    className={`pl-10 pr-4 py-2 border rounded-xl text-sm outline-none transition-all w-64 ${isDark ? 'bg-dark-bg/50 border-dark-border focus:ring-accent-500/50 focus:border-accent-500 text-dark-text-primary' : 'bg-white border-slate-200 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700'}`}
                  />
                </div>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`${isDark ? 'bg-white/5' : 'bg-slate-50/30'}`}>
                      <th className="px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Student Details</th>
                      <th className="px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider text-center">SAP ID</th>
                      <th className="px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider text-center">Scan Time</th>
                      <th className="px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider text-center">Method</th>
                      <th className="px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-dark-border/50' : 'divide-slate-100'}`}>
                    {eligibleStudents.length === 0 && attendees.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-24 text-center">
                          <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="flex flex-col items-center"
                          >
                            <div className={`p-6 rounded-full mb-4 ${isDark ? 'bg-dark-bg/50' : 'bg-slate-50'}`}>
                              <Clock className={`h-12 w-12 ${isDark ? 'text-slate-700' : 'text-slate-200'}`} />
                            </div>
                            <p className={`font-medium italic ${isDark ? 'text-dark-text-muted' : 'text-slate-400'}`}>No students identified for this session</p>
                          </motion.div>
                        </td>
                      </tr>
                    ) : (
                      eligibleStudents
                        .filter(s => 
                          s.name.toLowerCase().includes(manualSearch.toLowerCase()) || 
                          s.sapId.includes(manualSearch)
                        )
                        .map((student, index) => {
                          const attendance = attendees.find(a => a.userId === student.userId);
                          const isPresent = !!attendance;

                          return (
                            <motion.tr 
                              key={student.userId}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.03 }}
                              className={`group transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-blue-50/30'}`}
                            >
                              <td className="px-6 py-4">
                                <div className="flex items-center space-x-4">
                                  <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm border-2 ${isPresent ? 'bg-green-100 text-green-600 border-green-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                                    {student.name.charAt(0)}
                                  </div>
                                  <div>
                                    <p className={`font-medium text-sm ${isDark ? 'text-dark-text-primary' : 'text-slate-800'}`}>{student.name}</p>
                                    <div className="flex items-center mt-0.5">
                                      {isPresent ? (
                                        <span className="flex items-center text-[10px] font-medium text-green-500 uppercase tracking-tighter">
                                          <CheckCircle2 className="h-3 w-3 mr-1" /> Present
                                        </span>
                                      ) : (
                                        <span className="flex items-center text-[10px] font-medium text-slate-400 uppercase tracking-tighter">
                                          <Clock className="h-3 w-3 mr-1" /> Absent
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <code className={`text-xs px-2 py-1 rounded bg-slate-100 dark:bg-white/5 font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                  {student.sapId}
                                </code>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className={`text-xs ${isDark ? 'text-dark-text-secondary' : 'text-slate-500'}`}>
                                  {attendance ? new Date(attendance.timestamp).toLocaleTimeString() : '-'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                {attendance ? (
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider ${attendance.method === 'QR_SCAN' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                    {attendance.method}
                                  </span>
                                ) : '-'}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex justify-end">
                                  <button
                                    onClick={() => !isLoading && (isPresent ? handleDelete(student.userId, true) : handleManualMark(student.userId))}
                                    disabled={isLoading}
                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isPresent ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  >
                                    <span className="sr-only">Toggle Attendance</span>
                                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isPresent ? 'translate-x-5' : 'translate-x-0'}`} />
                                  </button>
                                </div>
                              </td>
                            </motion.tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceManager;
