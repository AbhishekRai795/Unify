import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Users, Tag, ExternalLink, Video } from 'lucide-react';
import { format } from 'date-fns';
import { useData } from '../../contexts/DataContext';
import { useTheme } from '../../contexts/ThemeContext';
import Loader from '../common/Loader';

const EventsList: React.FC = () => {
  const { events, isLoading, registerForEvent } = useData();
  const { isDark } = useTheme();
  const [selectedType, setSelectedType] = useState('all');
  const [registering, setRegistering] = useState<string | null>(null);

  const eventTypes = ['all', 'workshop', 'seminar', 'competition', 'meeting', 'social'];
  const liveEvents = events.filter(event => event.isLive);

  const filteredEvents = liveEvents.filter(event => 
    selectedType === 'all' || event.eventType === selectedType
  );

  const handleRegister = async (eventId: string) => {
    setRegistering(eventId);
    try {
      const success = await registerForEvent(eventId);
      if (success) {
        alert('Successfully registered for event!');
      } else {
        alert('Registration failed. Please try again.');
      }
    } catch (error) {
      alert('An error occurred during registration.');
    } finally {
      setRegistering(null);
    }
  };

  const getEventTypeColor = (type: string) => {
    const lightColors = {
      workshop: 'bg-blue-100 text-blue-800',
      seminar: 'bg-green-100 text-green-800',
      competition: 'bg-red-100 text-red-800',
      meeting: 'bg-yellow-100 text-yellow-800',
      social: 'bg-purple-100 text-purple-800'
    };
    
    const darkColors = {
      workshop: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
      seminar: 'bg-green-500/20 text-green-300 border border-green-500/30',
      competition: 'bg-red-500/20 text-red-300 border border-red-500/30',
      meeting: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
      social: 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
    };
    
    const colors = isDark ? darkColors : lightColors;
    return colors[type as keyof typeof colors] || (isDark ? 'bg-gray-500/20 text-gray-300 border border-gray-500/30' : 'bg-gray-100 text-gray-800');
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-all duration-300 ${isDark ? 'aurora-bg' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'}`}>
        <Loader size="lg" text="Loading events..." />
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-all duration-300 ${isDark ? 'aurora-bg' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'}`}>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`
            text-3xl font-bold mb-2 transition-all duration-300
            ${isDark 
              ? 'text-dark-text-primary bg-gradient-to-r from-accent-400 to-primary-400 bg-clip-text text-transparent' 
              : 'text-gray-900'
            }
          `}>Live Events</h1>
          <p className={`transition-colors duration-300 ${isDark ? 'text-dark-text-secondary' : 'text-gray-600'}`}>
            Stay updated with all the exciting events happening across chapters.
          </p>
        </div>

        {/* Filter */}
        <div className={`
          rounded-xl p-6 backdrop-blur-md border mb-8 transition-all duration-300
          ${isDark 
            ? 'bg-gradient-to-br from-dark-surface/80 to-dark-card/60 border-accent-500/20 shadow-2xl shadow-accent-500/10' 
            : 'bg-white/80 border-white/20'
          }
        `}>
          <div className="flex flex-wrap items-center gap-4">
            <span className={`text-sm font-medium ${isDark ? 'text-dark-text-primary' : 'text-gray-700'}`}>Filter by type:</span>
            {eventTypes.map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 backdrop-blur-sm
                  ${selectedType === type
                    ? (isDark 
                        ? 'bg-gradient-to-r from-accent-600/20 to-primary-600/20 border border-accent-500/50 text-accent-200 shadow-lg shadow-accent-500/20' 
                        : 'bg-blue-600 text-white'
                      )
                    : (isDark 
                        ? 'bg-dark-card/40 hover:bg-dark-surface/60 text-gray-300 hover:text-accent-200 border border-dark-border/30 hover:border-accent-500/40' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      )
                  }
                `}
              >
                {type === 'all' ? 'All Events' : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
          
          <div className={`mt-4 text-sm ${isDark ? 'text-dark-text-secondary' : 'text-gray-600'}`}>
            Showing {filteredEvents.length} live events
          </div>
        </div>

        {/* Events List */}
        {filteredEvents.length > 0 ? (
          <div className="space-y-6">
            {filteredEvents.map((event) => (
              <div key={event.id} className={`
                rounded-2xl backdrop-blur-md border overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1
                ${isDark 
                  ? 'bg-dark-surface/30 border-accent-500/20 shadow-accent-500/10 hover:shadow-accent-500/20 hover:bg-dark-surface/40' 
                  : 'bg-white/80 border-white/20'
                }
              `}>
                <div className="md:flex">
                  {event.imageUrl && (
                    <div className="md:w-80 h-48 md:h-auto">
                      <img
                        src={event.imageUrl}
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getEventTypeColor(event.eventType)}`}>
                            {event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1)}
                          </span>
                          <div className="flex items-center space-x-1 text-green-600">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-xs font-medium">Live</span>
                          </div>
                        </div>
                        
                        <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-dark-text-primary' : 'text-gray-900'}`}>
                          {event.title}
                        </h3>
                        
                        <p className={`mb-3 ${isDark ? 'text-dark-text-secondary' : 'text-gray-600'}`}>
                          {event.description}
                        </p>
                        
                        <div className={`text-sm font-medium mb-4 ${isDark ? 'text-accent-400' : 'text-blue-600'}`}>
                          by {event.chapterName}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className={`flex items-center text-sm ${isDark ? 'text-dark-text-secondary' : 'text-gray-600'}`}>
                        <Calendar className={`h-4 w-4 mr-2 ${isDark ? 'text-accent-400' : ''}`} />
                        <span>
                          {format(new Date(event.startDateTime), 'PPP')}
                        </span>
                      </div>
                      
                      <div className={`flex items-center text-sm ${isDark ? 'text-dark-text-secondary' : 'text-gray-600'}`}>
                        <Clock className={`h-4 w-4 mr-2 ${isDark ? 'text-accent-400' : ''}`} />
                        <span>
                          {format(new Date(event.startDateTime), 'p')} - {format(new Date(event.endDateTime), 'p')}
                        </span>
                      </div>
                      
                      <div className={`flex items-center text-sm ${isDark ? 'text-dark-text-secondary' : 'text-gray-600'}`}>
                        {event.isOnline ? (
                          <>
                            <Video className={`h-4 w-4 mr-2 ${isDark ? 'text-accent-400' : ''}`} />
                            <span>Online Event</span>
                          </>
                        ) : (
                          <>
                            <MapPin className={`h-4 w-4 mr-2 ${isDark ? 'text-accent-400' : ''}`} />
                            <span>{event.location}</span>
                          </>
                        )}
                      </div>
                      
                      {event.maxAttendees && (
                        <div className={`flex items-center text-sm ${isDark ? 'text-dark-text-secondary' : 'text-gray-600'}`}>
                          <Users className={`h-4 w-4 mr-2 ${isDark ? 'text-accent-400' : ''}`} />
                          <span>
                            {event.currentAttendees} / {event.maxAttendees} attendees
                          </span>
                        </div>
                      )}
                    </div>

                    {event.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {event.tags.map((tag, index) => (
                          <span key={index} className={`
                            inline-flex items-center text-xs px-2 py-1 rounded-full backdrop-blur-sm
                            ${isDark 
                              ? 'bg-accent-500/20 text-accent-200 border border-accent-500/30' 
                              : 'bg-gray-100 text-gray-700'
                            }
                          `}>
                            <Tag className={`h-3 w-3 mr-1 ${isDark ? 'text-accent-400' : ''}`} />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {event.registrationRequired && (
                          <button
                            onClick={() => handleRegister(event.id)}
                            disabled={registering === event.id || Boolean(event.maxAttendees && event.currentAttendees && event.currentAttendees >= event.maxAttendees)}
                            className={`
                              px-6 py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 backdrop-blur-sm
                              ${isDark 
                                ? 'bg-gradient-to-r from-accent-600/80 to-primary-600/80 text-white border border-accent-500/30 hover:from-accent-500/90 hover:to-primary-500/90 shadow-lg shadow-accent-500/25' 
                                : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                              }
                            `}
                          >
                            {registering === event.id 
                              ? 'Registering...' 
                              : (event.maxAttendees && event.currentAttendees >= event.maxAttendees)
                                ? 'Full'
                                : 'Register'
                            }
                          </button>
                        )}
                        
                        {event.isOnline && event.meetingLink && (
                          <a
                            href={event.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center space-x-1 font-medium transition-colors duration-200 ${isDark ? 'text-accent-400 hover:text-accent-300' : 'text-blue-600 hover:text-blue-700'}`}
                          >
                            <ExternalLink className="h-4 w-4" />
                            <span>Join Meeting</span>
                          </a>
                        )}
                      </div>
                      
                      {event.registrationDeadline && (
                        <div className={`text-xs ${isDark ? 'text-dark-text-muted' : 'text-gray-500'}`}>
                          Registration deadline: {format(new Date(event.registrationDeadline), 'PPp')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={`
            p-12 text-center rounded-2xl backdrop-blur-md border transition-all duration-300
            ${isDark 
              ? 'bg-dark-surface/30 border-accent-500/20 shadow-accent-500/10' 
              : 'bg-white/80 border-white/20'
            }
          `}>
            <Calendar className={`h-16 w-16 mx-auto mb-4 ${isDark ? 'text-dark-text-muted' : 'text-gray-300'}`} />
            <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-dark-text-primary' : 'text-gray-900'}`}>No live events</h3>
            <p className={`${isDark ? 'text-dark-text-secondary' : 'text-gray-600'}`}>
              There are no live events at the moment. Check back later for updates!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsList;