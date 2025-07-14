import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Users, Tag, ExternalLink, Video } from 'lucide-react';
import { format } from 'date-fns';
import { useData } from '../../contexts/DataContext';
import Loader from '../common/Loader';

const EventsList: React.FC = () => {
  const { events, isLoading, registerForEvent } = useData();
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
    const colors = {
      workshop: 'bg-blue-100 text-blue-800',
      seminar: 'bg-green-100 text-green-800',
      competition: 'bg-red-100 text-red-800',
      meeting: 'bg-yellow-100 text-yellow-800',
      social: 'bg-purple-100 text-purple-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <Loader size="lg" text="Loading events..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Live Events</h1>
          <p className="text-gray-600">
            Stay updated with all the exciting events happening across chapters.
          </p>
        </div>

        {/* Filter */}
        <div className="bg-white/80 backdrop-blur-md rounded-xl p-6 border border-white/20 mb-8">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Filter by type:</span>
            {eventTypes.map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  selectedType === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type === 'all' ? 'All Events' : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredEvents.length} live events
          </div>
        </div>

        {/* Events List */}
        {filteredEvents.length > 0 ? (
          <div className="space-y-6">
            {filteredEvents.map((event) => (
              <div key={event.id} className="bg-white/80 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden hover:shadow-lg transition-all duration-200">
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
                        
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          {event.title}
                        </h3>
                        
                        <p className="text-gray-600 mb-3">
                          {event.description}
                        </p>
                        
                        <div className="text-sm text-blue-600 font-medium mb-4">
                          by {event.chapterName}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>
                          {format(new Date(event.startDateTime), 'PPP')}
                        </span>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="h-4 w-4 mr-2" />
                        <span>
                          {format(new Date(event.startDateTime), 'p')} - {format(new Date(event.endDateTime), 'p')}
                        </span>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-600">
                        {event.isOnline ? (
                          <>
                            <Video className="h-4 w-4 mr-2" />
                            <span>Online Event</span>
                          </>
                        ) : (
                          <>
                            <MapPin className="h-4 w-4 mr-2" />
                            <span>{event.location}</span>
                          </>
                        )}
                      </div>
                      
                      {event.maxAttendees && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Users className="h-4 w-4 mr-2" />
                          <span>
                            {event.currentAttendees} / {event.maxAttendees} attendees
                          </span>
                        </div>
                      )}
                    </div>

                    {event.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {event.tags.map((tag, index) => (
                          <span key={index} className="inline-flex items-center text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                            <Tag className="h-3 w-3 mr-1" />
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
                            disabled={registering === event.id || (event.maxAttendees && event.currentAttendees >= event.maxAttendees)}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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
                            className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 font-medium"
                          >
                            <ExternalLink className="h-4 w-4" />
                            <span>Join Meeting</span>
                          </a>
                        )}
                      </div>
                      
                      {event.registrationDeadline && (
                        <div className="text-xs text-gray-500">
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
          <div className="bg-white/80 backdrop-blur-md rounded-xl border border-white/20 p-12 text-center">
            <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No live events</h3>
            <p className="text-gray-600">
              There are no live events at the moment. Check back later for updates!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsList;