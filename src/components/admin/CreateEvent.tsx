import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Video, 
  Tag, 
  Image as ImageIcon, 
  AlertCircle, 
  CheckCircle, 
  ArrowLeft,
  Info,
  Type,
  Globe,
  Settings2,
  DollarSign,
  Loader2,
  Plus
} from 'lucide-react';
import { useChapterHead } from '../../contexts/ChapterHeadContext';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';

const CreateEvent: React.FC = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { chapters, profile, createEvent } = useChapterHead();
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    chapterId: profile?.chapterId || '',
    eventType: 'workshop' as 'workshop' | 'seminar' | 'competition' | 'meeting' | 'social',
    startDateTime: '',
    endDateTime: '',
    location: '',
    isOnline: false,
    meetingLink: '',
    maxAttendees: '',
    registrationRequired: true,
    registrationDeadline: '',
    tags: '',
    imageUrl: '',
    isPaid: false,
    registrationFee: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await createEvent(formData);
      
      if (success) {
        setNotification({
          type: 'success',
          message: 'Event created successfully!'
        });
        
        setTimeout(() => {
          navigate('/head/dashboard');
        }, 2000);
      } else {
        setNotification({
          type: 'error',
          message: 'Failed to create event. Please try again.'
        });
      }
    } catch (error: any) {
      setNotification({
        type: 'error',
        message: error.message || 'An unexpected error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const pageClass = isDark ? 'bg-dark-bg' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50';
  const headingClass = isDark ? 'text-dark-text-primary' : 'text-[#1a1f36]';
  const cardClass = isDark ? 'bg-dark-surface/85 border-dark-border/70' : 'bg-white/80 border-white/20';
  const inputClass = isDark ? 'bg-dark-bg border-dark-border focus:border-accent-500 text-dark-text-primary' : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-800';
  const labelClass = isDark ? 'text-dark-text-muted' : 'text-slate-500';

  return (
    <div className={`h-screen flex flex-col transition-colors duration-300 overflow-hidden ${pageClass}`}>
      {/* Navigation */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex-shrink-0">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <button
            onClick={() => navigate('/head/dashboard')}
            className={`group flex items-center text-sm font-medium transition-all duration-200 ${isDark ? 'text-dark-text-secondary hover:text-dark-text-primary' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <div className={`p-2 mr-2 rounded-lg border transition-all ${isDark ? 'bg-dark-surface border-dark-border group-hover:border-accent-500/50 group-hover:bg-accent-600/10' : 'bg-white border-slate-200 group-hover:border-blue-300 group-hover:bg-blue-50'}`}>
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            </div>
            Back to Dashboard
          </button>
        </motion.div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-12">
        <div className="max-w-7xl mx-auto">
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
            <h1 className={`text-4xl font-bold mb-4 tracking-tight ${headingClass}`}>
              Create New Event
            </h1>
            <p className={`text-lg max-w-2xl mx-auto font-normal ${isDark ? 'text-dark-text-secondary' : 'text-slate-500'}`}>
              Post a new event to engage with students across communities.
            </p>
          </motion.div>

          {notification && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`mb-8 p-4 rounded-xl border flex items-center gap-3 ${
                notification.type === 'success'
                  ? 'bg-green-500/10 border-green-500/20 text-green-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}
            >
              {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              <span className="font-semibold">{notification.message}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Basic Information */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={`backdrop-blur-md rounded-3xl border p-6 space-y-6 ${cardClass} shadow-xl shadow-blue-500/5`}
              >
                <h3 className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 ${isDark ? 'text-accent-400' : 'text-blue-600'}`}>
                  <Info size={14} /> Basic Information
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${labelClass}`}>Event Title *</label>
                    <div className="relative">
                      <Type className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        required
                        placeholder="Enter event title"
                        className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm transition-all outline-none ${inputClass}`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${labelClass}`}>Description *</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      required
                      rows={3}
                      placeholder="Describe your event..."
                      className={`w-full px-4 py-3 border rounded-xl text-sm transition-all outline-none min-h-[100px] ${inputClass}`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${labelClass}`}>Community *</label>
                      <select
                        name="chapterId"
                        value={formData.chapterId}
                        onChange={handleChange}
                        required
                        className={`w-full px-3 py-3 border rounded-xl text-sm transition-all outline-none appearance-none ${inputClass}`}
                      >
                        <option value="">Select</option>
                        {chapters.map(chapter => (
                          <option key={chapter.chapterId} value={chapter.chapterId}>
                            {chapter.chapterName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${labelClass}`}>Event Type *</label>
                      <select
                        name="eventType"
                        value={formData.eventType}
                        onChange={handleChange}
                        required
                        className={`w-full px-3 py-3 border rounded-xl text-sm transition-all outline-none appearance-none ${inputClass}`}
                      >
                        <option value="workshop">Workshop</option>
                        <option value="seminar">Seminar</option>
                        <option value="competition">Competition</option>
                        <option value="meeting">Meeting</option>
                        <option value="social">Social</option>
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Card 2: Schedule & Location */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`backdrop-blur-md rounded-3xl border p-6 space-y-6 ${cardClass} shadow-xl shadow-blue-500/5`}
              >
                <h3 className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 ${isDark ? 'text-accent-400' : 'text-blue-600'}`}>
                  <Calendar size={14} /> Schedule & Location
                </h3>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${labelClass}`}>Start Time *</label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="datetime-local"
                          name="startDateTime"
                          value={formData.startDateTime}
                          onChange={handleChange}
                          required
                          className={`w-full pl-10 pr-3 py-3 border rounded-xl text-sm transition-all outline-none ${inputClass}`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${labelClass}`}>End Time *</label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="datetime-local"
                          name="endDateTime"
                          value={formData.endDateTime}
                          onChange={handleChange}
                          required
                          className={`w-full pl-10 pr-3 py-3 border rounded-xl text-sm transition-all outline-none ${inputClass}`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-dark-bg/50 border-dark-border' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Globe size={16} className={isDark ? 'text-accent-400' : 'text-blue-600'} />
                        <span className={`text-sm font-bold ${isDark ? 'text-dark-text-primary' : 'text-slate-800'}`}>Online Event</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          name="isOnline"
                          checked={formData.isOnline}
                          onChange={handleChange}
                          className="sr-only peer"
                        />
                        <div className={`w-10 h-5 rounded-full transition-all peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all ${isDark ? 'bg-dark-border peer-checked:bg-accent-600' : 'bg-slate-300 peer-checked:bg-blue-600'}`}></div>
                      </label>
                    </div>

                    <div className="relative">
                      {formData.isOnline ? <Video className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /> : <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />}
                      <input
                        type={formData.isOnline ? "url" : "text"}
                        name={formData.isOnline ? "meetingLink" : "location"}
                        value={formData.isOnline ? formData.meetingLink : formData.location}
                        onChange={handleChange}
                        required
                        placeholder={formData.isOnline ? "Meeting Link" : "Venue Address"}
                        className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm transition-all outline-none ${inputClass}`}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Card 3: Attendance & Registration */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className={`backdrop-blur-md rounded-3xl border p-6 space-y-6 ${cardClass} shadow-xl shadow-blue-500/5`}
              >
                <h3 className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 ${isDark ? 'text-accent-400' : 'text-blue-600'}`}>
                  <Settings2 size={14} /> Attendance & Registration
                </h3>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${labelClass}`}>Capacity</label>
                      <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="number"
                          name="maxAttendees"
                          value={formData.maxAttendees}
                          onChange={handleChange}
                          placeholder="Unlimited"
                          className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm transition-all outline-none ${inputClass}`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${labelClass}`}>Tags</label>
                      <div className="relative">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          name="tags"
                          value={formData.tags}
                          onChange={handleChange}
                          placeholder="tech, social..."
                          className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm transition-all outline-none ${inputClass}`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-dark-bg/50 border-dark-border' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <span className={`text-sm font-bold ${isDark ? 'text-dark-text-primary' : 'text-slate-800'}`}>Registration Required</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          name="registrationRequired"
                          checked={formData.registrationRequired}
                          onChange={handleChange}
                          className="sr-only peer"
                        />
                        <div className={`w-10 h-5 rounded-full transition-all peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all ${isDark ? 'bg-dark-border peer-checked:bg-accent-600' : 'bg-slate-300 peer-checked:bg-blue-600'}`}></div>
                      </label>
                    </div>

                    {formData.registrationRequired && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="relative"
                      >
                        <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${labelClass}`}>Deadline</label>
                        <Calendar className="absolute left-3 top-[34px] h-4 w-4 text-slate-400" />
                        <input
                          type="datetime-local"
                          name="registrationDeadline"
                          value={formData.registrationDeadline}
                          onChange={handleChange}
                          className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm transition-all outline-none ${inputClass}`}
                        />
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Card 4: Media & Pricing */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className={`backdrop-blur-md rounded-3xl border p-6 space-y-6 ${cardClass} shadow-xl shadow-blue-500/5`}
              >
                <h3 className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 ${isDark ? 'text-accent-400' : 'text-blue-600'}`}>
                  <DollarSign size={14} /> Media & Pricing
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${labelClass}`}>Cover Image URL</label>
                    <div className="relative">
                      <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="url"
                        name="imageUrl"
                        value={formData.imageUrl}
                        onChange={handleChange}
                        placeholder="https://..."
                        className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm transition-all outline-none ${inputClass}`}
                      />
                    </div>
                  </div>

                  <div className={`p-4 rounded-2xl border transition-all ${formData.isPaid ? (isDark ? 'bg-accent-500/5 border-accent-500/30' : 'bg-blue-50 border-blue-100') : (isDark ? 'bg-dark-bg/50 border-dark-border' : 'bg-slate-50 border-slate-200')}`}>
                    <div className="flex items-center justify-between mb-4">
                      <span className={`text-sm font-bold ${isDark ? 'text-dark-text-primary' : 'text-slate-800'}`}>Paid Event</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          name="isPaid"
                          checked={formData.isPaid}
                          onChange={handleChange}
                          className="sr-only peer"
                        />
                        <div className={`w-10 h-5 rounded-full transition-all peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all ${isDark ? 'bg-dark-border peer-checked:bg-accent-600' : 'bg-slate-300 peer-checked:bg-blue-600'}`}></div>
                      </label>
                    </div>

                    {formData.isPaid && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="relative"
                      >
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                        <input
                          type="number"
                          name="registrationFee"
                          value={formData.registrationFee}
                          onChange={handleChange}
                          required
                          placeholder="0.00"
                          className={`w-full pl-8 pr-4 py-3 border rounded-xl text-sm font-bold transition-all outline-none ${inputClass}`}
                        />
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-dark-border">
              <button
                type="button"
                onClick={() => navigate('/head/dashboard')}
                disabled={isLoading}
                className={`px-6 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${isDark ? 'bg-dark-surface border border-dark-border text-dark-text-secondary hover:text-dark-text-primary hover:bg-dark-card' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className={`px-8 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-2xl transition-all flex items-center justify-center gap-2 transform hover:scale-[1.01] ${isLoading ? 'opacity-50 cursor-not-allowed' : ''} ${isDark ? 'bg-accent-600 text-white hover:bg-accent-700 shadow-accent-600/20' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/20'}`}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus size={16} />}
                Create Event
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateEvent;