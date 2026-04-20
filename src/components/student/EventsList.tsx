import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Users, Tag, ExternalLink, Video, CheckCircle, Sparkles, ArrowLeft, Award, Download, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useData } from '../../contexts/DataContext';
import { useTheme } from '../../contexts/ThemeContext';
import Loader from '../common/Loader';
import { EventPaymentModal } from './EventPaymentModal';
import { encodeS3Url } from '../../utils/s3Utils';
import CertificateTemplate from '../admin/CertificateTemplate';
import html2canvas from 'html2canvas';
import { paymentAPI } from '../../services/paymentApi';


const EventsList: React.FC = () => {
  const { 
    events, 
    eventRegistrations, 
    dashboardData,
    fetchEvents, 
    fetchEventRegistrations, 
    registerForEvent, 
    isLoading 
  } = useData();
  const { isDark } = useTheme();
  const [selectedType, setSelectedType] = useState('all');
  const [activeTab, setActiveTab] = useState<'live' | 'ended'>('live');
  const [registering, setRegistering] = useState<string | null>(null);
  const [issuedCertificates, setIssuedCertificates] = useState<any[]>([]);
  const [downloadingCert, setDownloadingCert] = useState<string | null>(null);
  const [showCertPreview, setShowCertPreview] = useState<any | null>(null);
  const [paymentModal, setPaymentModal] = useState<{ isOpen: boolean; event: any }>({
    isOpen: false,
    event: null
  });

  React.useEffect(() => {
    fetchEvents();
    loadMyCertificates();
  }, []);

  const loadMyCertificates = async () => {
    try {
      const resp = await paymentAPI.getMyCertificates();
      setIssuedCertificates(resp.certificates || []);
    } catch (err) {
      console.error('Failed to load certificates');
    }
  };

  const eventTypes = ['all', 'workshop', 'seminar', 'competition', 'meeting', 'social'];
  
  const liveEvents = events.filter(event => 
    event.isLive && new Date() <= new Date(event.endDateTime || event.startDateTime)
  );
  
  const endedEvents = events.filter(event => 
    !event.isLive || new Date() > new Date(event.endDateTime || event.startDateTime)
  );

  const displayEvents = activeTab === 'live' ? liveEvents : endedEvents;

  const filteredEvents = displayEvents.filter(event => 
    selectedType === 'all' || event.eventType === selectedType
  );

  const handleRegister = async (event: any) => {
    if (event.isPaid) {
      setPaymentModal({ isOpen: true, event });
      return;
    }

    setRegistering(event.eventId || event.id);
    try {
      const success = await registerForEvent(event.eventId || event.id, event.chapterId, false);
      if (success) {
        alert('Successfully registered for event!');
      }
    } catch (error: any) {
      alert(error.message || 'An error occurred during registration.');
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
      <div className="relative w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <div className="mb-6">
          <button
            onClick={() => window.location.href = '/student/dashboard'}
            className={`
              group flex items-center text-sm font-medium transition-all duration-200
              ${isDark ? 'text-dark-text-secondary hover:text-accent-300' : 'text-slate-600 hover:text-slate-900'}
            `}
          >
            <div className={`
              p-2 mr-2 rounded-lg border transition-all
              ${isDark 
                ? 'bg-dark-surface/40 border-accent-500/20 group-hover:border-accent-400 group-hover:bg-accent-500/10' 
                : 'bg-white border-slate-200 group-hover:border-blue-300 group-hover:bg-blue-50'
              }
            `}>
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            </div>
            Back to Dashboard
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className={`
            text-4xl font-black mb-4 transition-all duration-300 tracking-tight
            ${isDark 
              ? 'text-dark-text-primary bg-gradient-to-r from-accent-400 via-primary-400 to-accent-600 bg-clip-text text-transparent' 
              : 'text-slate-900'
            }
          `}>
            {activeTab === 'live' ? 'Live Events' : 'Past Events'}
          </h1>
          <p className={`
            text-lg max-w-2xl mx-auto transition-colors duration-300 font-medium
            ${isDark ? 'text-dark-text-secondary' : 'text-slate-600'}
          `}>
            {activeTab === 'live' 
              ? 'Stay updated with all the exciting events happening across chapters.' 
              : 'View successfully concluded events and their highlights.'
            }
          </p>
        </div>

        {/* Filter Section */}
        <div className={`
          rounded-2xl p-6 backdrop-blur-md border mb-8 transition-all duration-300
          ${isDark 
            ? 'bg-gradient-to-br from-dark-surface/80 to-dark-card/60 border-accent-500/20 shadow-2xl shadow-accent-500/10' 
            : 'bg-white/80 border-white/20 shadow-xl shadow-blue-500/5'
          }
        `}>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            {/* Left side: Type filters */}
            <div className="flex flex-wrap items-center gap-4">
              <span className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-dark-text-secondary' : 'text-slate-500'}`}>Filter by type:</span>
              <div className="flex flex-wrap gap-2">
                {eventTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`
                      px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300
                      ${selectedType === type
                        ? (isDark 
                            ? 'bg-accent-600 text-white shadow-lg shadow-accent-500/30' 
                            : 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                          )
                        : (isDark 
                            ? 'bg-dark-card/40 hover:bg-dark-surface/60 text-dark-text-secondary border border-dark-border/30' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          )
                      }
                    `}
                  >
                    {type === 'all' ? 'All Events' : type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Right side: Status card (Live/Ended) */}
            <div className={`
              p-1.5 rounded-[1.25rem] border backdrop-blur-sm flex items-center gap-1
              ${isDark 
                ? 'bg-dark-bg/40 border-dark-border/50' 
                : 'bg-slate-50/50 border-slate-200/50'
              }
            `}>
              {[
                { id: 'live', label: 'Live', icon: Sparkles },
                { id: 'ended', label: 'Past', icon: Clock }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'live' | 'ended')}
                  className={`
                    flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300
                    ${activeTab === tab.id
                      ? (isDark 
                          ? 'bg-dark-surface text-accent-400 shadow-lg border border-accent-500/30' 
                          : 'bg-white text-blue-600 shadow-md border border-blue-100'
                        )
                      : (isDark 
                          ? 'text-dark-text-muted hover:text-dark-text-secondary' 
                          : 'text-slate-400 hover:text-slate-600'
                        )
                    }
                  `}
                >
                  <tab.icon size={14} className={activeTab === tab.id ? 'animate-pulse' : ''} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="mt-6 flex items-center justify-between">
             <div className={`text-sm font-medium ${isDark ? 'text-dark-text-secondary' : 'text-slate-500'}`}>
                Showing <span className={isDark ? 'text-accent-400' : 'text-blue-600'}>{filteredEvents.length}</span> {activeTab} events
             </div>
             {activeTab === 'ended' && (
                <div className={`text-[10px] uppercase font-black tracking-widest px-3 py-1 rounded-full ${isDark ? 'bg-white/5 text-dark-text-muted' : 'bg-slate-100 text-slate-400'}`}>
                   Archive Access
                </div>
             )}
          </div>
        </div>

        {/* Events List */}
        {filteredEvents.length > 0 ? (
          <div className="space-y-6">
            {filteredEvents.map((event) => {
              const eventId = event.eventId || event.id;
              const attendedList = dashboardData?.attendedEvents || dashboardData?.student?.attendedEvents || [];
              const isRegistered = 
                eventRegistrations.some((reg: any) => reg.eventId === eventId) ||
                (Array.isArray(attendedList) && attendedList.includes(eventId));
              const isRegistrationClosed = !!(event.registrationDeadline && new Date() > new Date(event.registrationDeadline));
              const isPastEvent = new Date() > new Date(event.endDateTime || event.startDateTime);
                
              return (
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
                          src={encodeS3Url(event.imageUrl)} 
                          alt={event.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
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
                            {isPastEvent ? (
                              <div className="flex items-center space-x-1 text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                <span className="text-xs font-medium">Ended</span>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-1 text-green-600">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-xs font-medium">Live</span>
                              </div>
                            )}
                            {isRegistered && (
                              <div className="flex items-center space-x-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                <CheckCircle className="h-3 w-3" />
                                <span className="text-xs font-bold">Registered</span>
                              </div>
                            )}
                          </div>
                          
                          <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-dark-text-primary' : 'text-gray-900'}`}>
                            {event.title}
                          </h3>
                          
                          <p className={`mb-3 ${isDark ? 'text-dark-text-secondary' : 'text-gray-600'}`}>
                            {event.description}
                          </p>
                          
                          <div className={`text-sm font-medium mb-4 flex items-center justify-between ${isDark ? 'text-accent-400' : 'text-blue-600'}`}>
                            <span>by {event.chapterName}</span>
                            <span className={`px-3 py-1 rounded-lg text-xs font-bold ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
                              {event.isPaid ? `₹${event.registrationFee}` : 'FREE'}
                            </span>
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
                              onClick={() => handleRegister(event)}
                              disabled={isPastEvent || registering === eventId || isRegistered || Boolean(event.maxAttendees && event.currentAttendees && event.currentAttendees >= event.maxAttendees) || isRegistrationClosed}
                              className={`
                                px-6 py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 backdrop-blur-sm
                                ${isPastEvent
                                  ? 'bg-gray-200 text-gray-400 border border-gray-300 cursor-not-allowed'
                                  : isDark 
                                    ? 'bg-gradient-to-r from-accent-600/80 to-primary-600/80 text-white border border-accent-500/30 hover:from-accent-500/90 hover:to-primary-500/90 shadow-lg shadow-accent-500/25' 
                                    : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                                }
                              `}
                            >
                              {isPastEvent
                                ? 'Event Ended'
                                : isRegistered
                                  ? 'Registered'
                                  : registering === eventId 
                                    ? 'Registering...' 
                                    : isRegistrationClosed
                                      ? 'Registration Closed'
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

                          {/* Know More About It Button */}
                          <button
                            onClick={() => window.open(`/student/events/${encodeURIComponent(eventId)}/about`, '_blank')}
                            className={`
                              px-4 py-2.5 rounded-xl font-semibold transition-all duration-300 backdrop-blur-sm flex items-center justify-center gap-2 shadow-sm
                              ${isDark
                                ? 'border border-accent-500/30 text-accent-300 bg-accent-500/10 hover:bg-accent-500/20'
                                : 'border border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100'
                              }
                            `}
                          >
                            <Sparkles className={`h-4 w-4 ${isDark ? 'text-accent-400' : 'text-blue-600'}`} />
                            Explore
                          </button>

                          {/* Download Certificate Button */}
                          {(() => {
                            const issuedCert = issuedCertificates.find(c => c.eventId === eventId);
                            if (issuedCert) {
                              return (
                                <button
                                  onClick={() => setShowCertPreview({ event, cert: issuedCert })}
                                  className="px-4 py-2.5 rounded-xl font-bold transition-all duration-300 bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-500/20 flex items-center gap-2"
                                >
                                  <Award className="h-4 w-4" />
                                  Download Certificate
                                </button>
                              );
                            }
                            return null;
                          })()}
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
              );
            })}
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
            <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-dark-text-primary' : 'text-gray-900'}`}>
              No {activeTab} events
            </h3>
            <p className={`${isDark ? 'text-dark-text-secondary' : 'text-gray-600'}`}>
              {activeTab === 'live' 
                ? 'There are no live events at the moment. Check back later for updates!' 
                : 'No ended events found in the records.'
              }
            </p>
          </div>
        )}

        {/* Payment Modal */}
        <EventPaymentModal
          isOpen={paymentModal.isOpen}
          event={paymentModal.event}
          onClose={() => setPaymentModal({ isOpen: false, event: null })}
          onPaymentSuccess={async () => {
            alert('Registration and payment successful!');
            await fetchEvents();
            await fetchEventRegistrations();
            setPaymentModal({ isOpen: false, event: null });
          }}
        />

        {/* Certificate Preview & Download Modal */}
        {showCertPreview && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setShowCertPreview(null)} />
            <div className="relative bg-white rounded-3xl p-6 shadow-2xl max-w-4xl w-full animate-scale-in">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Your Certificate</h2>
                  <p className="text-slate-500">Congratulations on your achievement!</p>
                </div>
                <button onClick={() => setShowCertPreview(null)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="h-6 w-6 text-gray-400" />
                </button>
              </div>

              <div className="relative aspect-video w-full mb-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 overflow-hidden flex items-center justify-center">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-[0.35] sm:scale-[0.45] md:scale-[0.6] lg:scale-[0.7] xl:scale-[0.8] origin-center shadow-xl transition-transform">
                  <CertificateTemplate
                    studentName={showCertPreview.cert.studentName}
                    eventName={showCertPreview.cert.eventName}
                    chapterName={showCertPreview.cert.chapterName}
                    headName={showCertPreview.cert.headName || 'Chapter Head'}
                    date={showCertPreview.cert.date}
                    certificateType={showCertPreview.cert.certificateType}
                  />
                </div>
              </div>

              <button
                onClick={async () => {
                  setDownloadingCert(showCertPreview.cert.eventId);
                  const certElement = document.getElementById('certificate-to-download');
                  if (certElement) {
                    // Create a temporal container for high-fidelity capture
                    const container = document.createElement('div');
                    container.style.position = 'fixed';
                    container.style.left = '-9999px';
                    container.style.top = '0';
                    container.style.zIndex = '-1';
                    document.body.appendChild(container);

                    // Clone the element and remove viewport-specific scaling transforms
                    const clone = certElement.cloneNode(true) as HTMLElement;
                    clone.style.transform = 'none';
                    clone.style.position = 'relative';
                    clone.style.margin = '0';
                    container.appendChild(clone);

                    try {
                      const canvas = await html2canvas(clone, { 
                        scale: 2, 
                        useCORS: true,
                        backgroundColor: null,
                        logging: false,
                        width: 960,
                        height: 540
                      });
                      const link = document.createElement('a');
                      link.download = `Certificate-${showCertPreview.event.title}.png`;
                      link.href = canvas.toDataURL('image/png');
                      link.click();
                    } catch (err) {
                      console.error('Download failed:', err);
                    } finally {
                      document.body.removeChild(container);
                    }
                  }
                  setDownloadingCert(null);
                }}
                disabled={downloadingCert === showCertPreview.cert.eventId}
                className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all flex items-center justify-center gap-2"
              >
                {downloadingCert === showCertPreview.cert.eventId ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Download className="h-5 w-5" />
                )}
                {downloadingCert === showCertPreview.cert.eventId ? 'Generating...' : 'Download Certificate (PNG)'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsList;
