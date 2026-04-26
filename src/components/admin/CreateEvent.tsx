import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, Users, Video, Tag, Image, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
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
        
        // Redirect after a short delay
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

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-dark-bg' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'}`}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/head/dashboard')}
            className={`group flex items-center text-sm font-medium transition-all duration-200 ${isDark ? 'text-dark-text-secondary hover:text-dark-text-primary' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <div className={`p-2 mr-2 rounded-lg border transition-all ${isDark ? 'bg-dark-surface border-dark-border group-hover:border-accent-500/50 group-hover:bg-accent-600/10' : 'bg-white border-slate-200 group-hover:border-blue-300 group-hover:bg-blue-50'}`}>
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            </div>
            Back to Dashboard
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <div className={`h-[2px] w-12 rounded-full ${isDark ? 'bg-accent-500/30' : 'bg-blue-200'}`} />
            <div className={`w-2 h-2 rounded-full ${isDark ? 'bg-accent-400' : 'bg-blue-500'}`} />
            <div className={`h-[2px] w-12 rounded-full ${isDark ? 'bg-accent-500/30' : 'bg-blue-200'}`} />
          </div>
          <h1 className={`
            text-4xl font-bold mb-4 transition-all duration-300 tracking-tight
            ${isDark 
              ? 'text-dark-text-primary' 
              : 'text-[#1a1f36]'
            }
          `}>
            Create New Event
          </h1>
          <p className={`
            text-lg max-w-2xl mx-auto transition-colors duration-300 font-normal
            ${isDark ? 'text-dark-text-secondary' : 'text-slate-500'}
          `}>
            Post a new event to engage with students across communities.
          </p>
        </div>

        {/* Notification */}
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`mb-6 p-4 rounded-lg flex items-center ${
              notification.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle className="h-5 w-5 mr-2" />
            ) : (
              <AlertCircle className="h-5 w-5 mr-2" />
            )}
            {notification.message}
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className={`backdrop-blur-md rounded-xl border p-4 sm:p-6 lg:p-8 transition-colors duration-300 ${isDark ? 'bg-dark-surface/85 border-dark-border/70' : 'bg-white/80 border-white/20'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Title */}
            <div className="md:col-span-2">
              <label htmlFor="title" className={`block text-sm font-medium mb-2 ${isDark ? 'text-dark-text-secondary' : 'text-gray-700'}`}>
                Event Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 ${isDark ? 'bg-dark-card border-dark-border' : 'border-gray-300'}`}
                placeholder="Enter event title"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label htmlFor="description" className={`block text-sm font-medium mb-2 ${isDark ? 'text-dark-text-secondary' : 'text-gray-700'}`}>
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={3}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[50px] max-h-[150px] text-gray-900 ${isDark ? 'bg-dark-card border-dark-border' : 'border-gray-300'}`}
                placeholder="Describe your event..."
              />
            </div>

            {/* Chapter */}
            <div>
              <label htmlFor="chapterId" className={`block text-sm font-medium mb-2 ${isDark ? 'text-dark-text-secondary' : 'text-gray-700'}`}>
                Community (Chapter/Club) *
              </label>
              <select
                id="chapterId"
                name="chapterId"
                value={formData.chapterId}
                onChange={handleChange}
                required
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 ${isDark ? 'bg-dark-card border-dark-border' : 'border-gray-300'}`}
              >
                <option value="">Select a community</option>
                {chapters.map(chapter => (
                  <option key={chapter.chapterId} value={chapter.chapterId}>
                    {chapter.chapterName} ({(chapter as any).type === 'club' ? 'Club' : 'Chapter'})
                  </option>
                ))}
              </select>
            </div>

            {/* Event Type */}
            <div>
              <label htmlFor="eventType" className={`block text-sm font-medium mb-2 ${isDark ? 'text-dark-text-secondary' : 'text-gray-700'}`}>
                Event Type *
              </label>
              <select
                id="eventType"
                name="eventType"
                value={formData.eventType}
                onChange={handleChange}
                required
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 ${isDark ? 'bg-dark-card border-dark-border' : 'border-gray-300'}`}
              >
                <option value="workshop">Workshop</option>
                <option value="seminar">Seminar</option>
                <option value="competition">Competition</option>
                <option value="meeting">Meeting</option>
                <option value="social">Social Event</option>
              </select>
            </div>

            {/* Start Date & Time */}
            <div>
              <label htmlFor="startDateTime" className={`block text-sm font-medium mb-2 ${isDark ? 'text-dark-text-secondary' : 'text-gray-700'}`}>
                Start Date & Time *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="datetime-local"
                  id="startDateTime"
                  name="startDateTime"
                  value={formData.startDateTime}
                  onChange={handleChange}
                  required
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 ${isDark ? 'bg-dark-card border-dark-border' : 'border-gray-300'}`}
                />
              </div>
            </div>

            {/* End Date & Time */}
            <div>
              <label htmlFor="endDateTime" className={`block text-sm font-medium mb-2 ${isDark ? 'text-dark-text-secondary' : 'text-gray-700'}`}>
                End Date & Time *
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="datetime-local"
                  id="endDateTime"
                  name="endDateTime"
                  value={formData.endDateTime}
                  onChange={handleChange}
                  required
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 ${isDark ? 'bg-dark-card border-dark-border' : 'border-gray-300'}`}
                />
              </div>
            </div>

            {/* Online/Offline Toggle & Location/Link */}
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="sm:col-span-1">
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-dark-text-secondary' : 'text-gray-700'}`}>Event Type</label>
                <div className={`flex items-center space-x-3 h-[50px] px-4 rounded-lg ${isDark ? 'bg-dark-card border border-dark-border' : 'bg-gray-50 border border-gray-200'}`}>
                  <input
                    type="checkbox"
                    id="isOnline"
                    name="isOnline"
                    checked={formData.isOnline}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isOnline" className={`text-sm font-medium ${isDark ? 'text-dark-text-primary' : 'text-gray-700'}`}>
                    Online Event
                  </label>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor={formData.isOnline ? "meetingLink" : "location"} className={`block text-sm font-medium mb-2 ${isDark ? 'text-dark-text-secondary' : 'text-gray-700'}`}>
                  {formData.isOnline ? "Meeting Link" : "Location"} *
                </label>
                <div className="relative">
                  {formData.isOnline ? (
                    <>
                      <Video className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="url"
                        id="meetingLink"
                        name="meetingLink"
                        value={formData.meetingLink}
                        onChange={handleChange}
                        required={formData.isOnline}
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 ${isDark ? 'bg-dark-card border-dark-border' : 'border-gray-300'}`}
                        placeholder="Meeting link"
                      />
                    </>
                  ) : (
                    <>
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        id="location"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        required={!formData.isOnline}
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 ${isDark ? 'bg-dark-card border-dark-border' : 'border-gray-300'}`}
                        placeholder="Location"
                      />
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Max Attendees */}
            <div>
              <label htmlFor="maxAttendees" className={`block text-sm font-medium mb-2 ${isDark ? 'text-dark-text-secondary' : 'text-gray-700'}`}>
                Max Attendees
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="number"
                  id="maxAttendees"
                  name="maxAttendees"
                  value={formData.maxAttendees}
                  onChange={handleChange}
                  min="1"
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 ${isDark ? 'bg-dark-card border-dark-border' : 'border-gray-300'}`}
                  placeholder="Unlimited"
                />
              </div>
            </div>

            {/* Registration Required & Deadline */}
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-dark-text-secondary' : 'text-gray-700'}`}>Registration</label>
                <div className={`flex items-center space-x-3 h-[50px] px-4 rounded-lg ${isDark ? 'bg-dark-card border border-dark-border' : 'bg-gray-50 border border-gray-200'}`}>
                  <input
                    type="checkbox"
                    id="registrationRequired"
                    name="registrationRequired"
                    checked={formData.registrationRequired}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="registrationRequired" className={`text-sm font-medium ${isDark ? 'text-dark-text-primary' : 'text-gray-700'}`}>
                    Registration Required
                  </label>
                </div>
              </div>

              {formData.registrationRequired && (
                <div>
                  <label htmlFor="registrationDeadline" className={`block text-sm font-medium mb-2 ${isDark ? 'text-dark-text-secondary' : 'text-gray-700'}`}>
                    Reg Deadline
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="datetime-local"
                      id="registrationDeadline"
                      name="registrationDeadline"
                      value={formData.registrationDeadline}
                      onChange={handleChange}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 ${isDark ? 'bg-dark-card border-dark-border' : 'border-gray-300'}`}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Tags */}
            <div>
              <label htmlFor="tags" className={`block text-sm font-medium mb-2 ${isDark ? 'text-dark-text-secondary' : 'text-gray-700'}`}>
                Tags (Separated by commas)
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 ${isDark ? 'bg-dark-card border-dark-border' : 'border-gray-300'}`}
                  placeholder="tech, social..."
                />
              </div>
            </div>

            {/* Image URL */}
            <div>
              <label htmlFor="imageUrl" className={`block text-sm font-medium mb-2 ${isDark ? 'text-dark-text-secondary' : 'text-gray-700'}`}>
                Image URL
              </label>
              <div className="relative">
                <Image className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="url"
                  id="imageUrl"
                  name="imageUrl"
                  value={formData.imageUrl}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 ${isDark ? 'bg-dark-card border-dark-border' : 'border-gray-300'}`}
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Paid vs Free Toggle */}
            <div className={`md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl ${isDark ? 'bg-dark-card border border-dark-border' : 'bg-gray-50 border border-gray-200'}`}>
              <div className="flex items-center">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="isPaid"
                      checked={formData.isPaid}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-sm font-semibold ${isDark ? 'text-dark-text-primary' : 'text-gray-900'}`}>Paid Event</span>
                  </div>
                </label>
              </div>

              {formData.isPaid && (
                <div className="flex items-center space-x-2">
                  <label htmlFor="registrationFee" className={`text-sm font-medium whitespace-nowrap ${isDark ? 'text-dark-text-secondary' : 'text-gray-700'}`}>
                    Fee:
                  </label>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                    <input
                      type="number"
                      id="registrationFee"
                      name="registrationFee"
                      value={formData.registrationFee}
                      onChange={handleChange}
                      placeholder="0.00"
                      className={`w-full pl-7 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-all text-gray-900 ${isDark ? 'bg-dark-surface border-dark-border' : 'border-gray-300'}`}
                      required={formData.isPaid}
                      min="1"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="md:col-span-2 flex flex-col sm:flex-row items-center justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/head/dashboard')}
                className={`w-full sm:w-auto px-6 py-3 border rounded-lg transition-colors duration-200 ${isDark ? 'border-dark-border text-dark-text-primary hover:bg-dark-card' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto px-10 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
              >
                {isLoading ? 'Creating...' : 'Create Event'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEvent;