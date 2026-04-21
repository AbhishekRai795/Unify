import React, { useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Users, 
  BookOpen, 
  Clock, 
  ArrowRight,
  Activity,
  CreditCard,
  MessageSquare,
  Megaphone,
  Video,
  History,
  UserPlus,
  Info
} from 'lucide-react';

import { Link } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useChat } from '../../contexts/ChatContext';
import { useTheme } from '../../contexts/ThemeContext';
import Loader from '../common/Loader';
import ConversationsList from '../chat/ConversationsList';
import MeetingCalendarView from './MeetingCalendarView';
import { motion, Variants } from 'framer-motion';


// Animation variants for Framer Motion
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
    },
  },
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { dashboardData, myChapters, events, eventRegistrations, pendingRegistrations, isLoading, fetchDashboard, fetchMyChapters, fetchEvents, fetchEventRegistrations, fetchPendingRegistrations } = useData();
  const { conversations, setActiveConversation, setIsWidgetOpen, setActiveChapterId, refreshConversations } = useChat();
  const { isDark } = useTheme();

  const getChapterId = (chapter: any): string =>
    chapter?.chapterId || chapter?.chapterID || chapter?.id || '';

  const getChapterName = (chapter: any): string =>
    chapter?.name || chapter?.chapterName || 'Chapter';

  const getHeadRecipientId = (chapter: any): string =>
    chapter?.headId ||
    chapter?.headID ||
    chapter?.headUserId ||
    chapter?.head_user_id ||
    chapter?.chapterHeadUserId ||
    chapter?.chapterHeadId ||
    chapter?.headSub ||
    chapter?.chapterHeadSub ||
    '';

  const resolveRecipientIdFromConversations = (chapter: any): string => {
    const expectedName = (chapter?.headName || chapter?.chapterHead || '').trim().toLowerCase();
    if (!expectedName) return '';

    const byName = (conversations || []).find((conv: any) => {
      const name = (conv?.otherParticipantName || conv?.recipientName || '').trim().toLowerCase();
      return !!name && name === expectedName;
    });
    return byName?.otherParticipantId || byName?.recipientId || '';
  };

  const studentChapterIds = useMemo(
    () => Array.from(new Set(
      (myChapters || [])
        .map((chapter) => getChapterId(chapter))
        .filter(Boolean)
    )) as string[],
    [myChapters]
  );

  useEffect(() => {
    fetchDashboard();
    fetchMyChapters();
    fetchEvents();
    fetchEventRegistrations();
    fetchPendingRegistrations();
  }, []);

  useEffect(() => {
    // Keep announcements fresh on dashboard without manual refresh.
    const intervalId = window.setInterval(() => {
      fetchEvents();
    }, 15000);
    return () => window.clearInterval(intervalId);
  }, [fetchEvents]);

  useEffect(() => {
    if (studentChapterIds.length === 0) return;

    setActiveChapterId(studentChapterIds[0]);
    refreshConversations(studentChapterIds);
  }, [studentChapterIds, setActiveChapterId, refreshConversations]);

  const activityList = useMemo(() => {
    const activities: any[] = [];
    
    // Chapter joins
    (myChapters || []).forEach(chapter => {
      activities.push({
        id: `join-${chapter.chapterId || chapter.id}`,
        type: 'registration',
        message: `Successfully joined ${getChapterName(chapter)} chapter`,
        timestamp: chapter.joinedAt || chapter.createdAt || new Date().toISOString()
      });
    });

    // Event registrations
    (eventRegistrations || []).forEach((reg, idx) => {
      const eventId = reg.eventId || (reg as any).eventID;
      const event = events.find(e => (e.id === eventId || e.eventId === eventId));
      activities.push({
        id: `event-${reg.id || eventId || idx}`,
        type: 'event',
        message: `Registered for event: ${event?.title || 'Event'}`,
        timestamp: reg.registeredAt || new Date().toISOString()
      });
    });

    // Pending requests
    (pendingRegistrations || []).forEach((reg, idx) => {
      activities.push({
        id: `pending-${reg.registrationId || reg.id || idx}`,
        type: 'request',
        message: `Applied for membership in ${reg.chapterName}`,
        timestamp: reg.appliedAt || new Date().toISOString()
      });
    });

    return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [myChapters, eventRegistrations, pendingRegistrations, events]);

  if (isLoading && !dashboardData) {
    return <div className="min-h-screen flex items-center justify-center"><Loader /></div>;
  }

  const registeredChaptersCount = Number(dashboardData?.student?.registeredChaptersCount || myChapters.length || 0);
  const totalChaptersCount = Number(dashboardData?.stats?.totalChapters || 0);
  const availableChaptersCount = Math.max(totalChaptersCount - registeredChaptersCount, 0);
  const attendedEventsCount = Number(dashboardData?.stats?.completedEvents || dashboardData?.attendedEvents?.length || 0);
  const upcomingEventsCount = Number(dashboardData?.stats?.upcomingEvents || 0);

  const stats = [
    {
      label: 'Registered Chapters',
      value: registeredChaptersCount,
      icon: Users,
      color: 'blue',
      change: 'Currently joined',
      link: '/student/chapters'
    },
    {
      label: 'Available Chapters',
      value: availableChaptersCount,
      icon: BookOpen,
      color: 'green',
      change: `${totalChaptersCount} total active`,
      link: '/student/chapters'
    },
    {
      label: 'Events Attended',
      value: attendedEventsCount,
      icon: Calendar,
      color: 'purple',
      change: 'Completed events',
      link: '/student/events'
    },
    {
      label: 'Upcoming Events',
      value: upcomingEventsCount,
      icon: Clock,
      color: 'orange',
      change: 'Scheduled ahead',
      link: '/student/events'
    }
  ];

  const announcements = (events || [])
    .flatMap((event: any) => {
      const list = Array.isArray(event.announcements) ? event.announcements : [];
      return list.map((announcement: any, index: number) => ({
        id: `${event.eventId || event.id}-announcement-${index}`,
        message: announcement?.message || '',
        timestamp: announcement?.timestamp || event.updatedAt || event.createdAt,
        chapterName: event.chapterName || event.chapterId || 'Unknown Chapter',
        eventName: event.title || event.eventId || event.id || 'Event'
      }));
    })
  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-dark-bg' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'}`}>
      <motion.div 
        className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-gray-600 dark:text-dark-text-secondary mt-2">
            Discover new opportunities and stay connected with your chapters.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            const colors = {
              blue: 'bg-blue-500',
              green: 'bg-green-500',
              purple: 'bg-purple-500',
              orange: 'bg-orange-500'
            };
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  to={stat.link}
                  className="block bg-white/80 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:shadow-lg hover:bg-white/90 transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary mb-1">{stat.label}</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${colors[stat.color as keyof typeof colors]} group-hover:scale-110 transition-transform duration-200`}>
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

<motion.div 
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          variants={containerVariants}
        >
          <motion.div 
            className={`
              p-6 rounded-2xl shadow-lg border transition-all duration-300 backdrop-blur-md h-[500px] flex flex-col
              ${isDark 
                ? 'bg-dark-surface/30 border-accent-500/20 shadow-accent-500/10 hover:shadow-accent-500/20' 
                : 'bg-white/40 border-white/20'
              }
            `}
            variants={itemVariants}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-dark-text-primary">Quick Actions</h2>
              <Activity className="h-5 w-5 text-gray-500 dark:text-dark-text-muted" />
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <motion.div whileHover={{ scale: 1.03, x: 5 }} transition={{ type: 'spring', stiffness: 300 }}>
                <Link to="/student/chapters" className="flex items-center justify-between p-3 rounded-xl hover:bg-white/50 dark:hover:bg-dark-card/50 transition-colors group">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-lg ${isDark ? 'bg-gradient-to-br from-blue-600/20 to-accent-600/20 border border-blue-500/30' : 'bg-blue-100/70'}`}>
                        <Users className={`h-5 w-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-dark-text-primary">Browse Chapters</p>
                      <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Find and join new chapters</p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 dark:text-dark-text-muted group-hover:text-blue-600 transition-colors" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03, x: 5 }} transition={{ type: 'spring', stiffness: 300 }}>
                <Link to="/student/events" className="flex items-center justify-between p-3 rounded-xl hover:bg-white/50 dark:hover:bg-dark-card/50 transition-colors group">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-lg ${isDark ? 'bg-gradient-to-br from-green-600/20 to-accent-600/20 border border-green-500/30' : 'bg-green-100/70'}`}>
                        <Calendar className={`h-5 w-5 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-dark-text-primary">View Events</p>
                      <p className="text-sm text-gray-600 dark:text-dark-text-secondary">See what's happening</p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 dark:text-dark-text-muted group-hover:text-green-600 transition-colors" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03, x: 5 }} transition={{ type: 'spring', stiffness: 300 }}>
                <Link to="/student/payments/history" className="flex items-center justify-between p-3 rounded-xl hover:bg-white/50 dark:hover:bg-dark-card/50 transition-colors group">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-lg ${isDark ? 'bg-gradient-to-br from-purple-600/20 to-accent-600/20 border border-purple-500/30' : 'bg-purple-100/70'}`}>
                        <CreditCard className={`h-5 w-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-dark-text-primary">Payment History</p>
                      <p className="text-sm text-gray-600 dark:text-dark-text-secondary">View your transactions</p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 dark:text-dark-text-muted group-hover:text-purple-600 transition-colors" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03, x: 5 }} transition={{ type: 'spring', stiffness: 300 }}>
                <Link to="/student/messages" className="flex items-center justify-between p-3 rounded-xl hover:bg-white/50 dark:hover:bg-dark-card/50 transition-colors group">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-lg ${isDark ? 'bg-gradient-to-br from-emerald-600/20 to-accent-600/20 border border-emerald-500/30' : 'bg-emerald-100/70'}`}>
                      <MessageSquare className={`h-5 w-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-dark-text-primary">Messaging</p>
                      <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Open your chat workspace</p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 dark:text-dark-text-muted group-hover:text-emerald-600 transition-colors" />
                </Link>
              </motion.div>
            </div>
          </motion.div>

          {/* Announcements */}
          <motion.div 
            className={`
              p-6 rounded-2xl shadow-lg border transition-all duration-300 backdrop-blur-md h-[500px] flex flex-col
              ${isDark 
                ? 'bg-dark-surface/30 border-accent-500/20 shadow-accent-500/10 hover:shadow-accent-500/20' 
                : 'bg-white/40 border-white/20'
              }
            `}
            variants={itemVariants}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-dark-text-primary">Announcements</h2>
              <Megaphone className="h-5 w-5 text-gray-500 dark:text-dark-text-muted" />
            </div>

            <div className={`space-y-3 p-4 ${isDark ? 'bg-dark-bg/80' : 'bg-gray-50/50'} rounded-2xl border border-gray-100 dark:border-dark-border/50 flex-1 overflow-y-auto custom-scrollbar`}>
              {announcements.length > 0 ? (
                announcements.map((item: any) => (
                  <div key={item.id} className="p-3 rounded-xl border border-gray-100 dark:border-dark-border/40 bg-white/70 dark:bg-dark-card/40">
                    <p className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">{item.message}</p>
                    <p className="text-xs text-gray-500 dark:text-dark-text-muted mt-1">
                      {item.timestamp ? `${new Date(item.timestamp).toLocaleDateString()} • ${new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Just now'}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-dark-text-secondary mt-2">
                       Chapter: <span className="font-medium text-gray-900 dark:text-dark-text-primary">{item.chapterName}</span> | Event: <span className="font-medium text-gray-900 dark:text-dark-text-primary">{item.eventName}</span>
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 h-full flex flex-col justify-center">
                  <Megaphone className="h-8 w-8 text-gray-300 dark:text-dark-text-muted mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-dark-text-muted text-sm italic">No announcements yet</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Chapter Meetings */}
          <motion.div 
            className={`
              p-6 rounded-2xl shadow-lg border transition-all duration-300 backdrop-blur-md h-[500px]
              ${isDark 
                ? 'bg-dark-surface/30 border-accent-500/20 shadow-accent-500/10 hover:shadow-accent-500/20' 
                : 'bg-white/40 border-white/20'
              }
            `}
            variants={itemVariants}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-dark-text-primary">Chapter Meetings</h2>
              <Video className="h-5 w-5 text-gray-500 dark:text-dark-text-muted" />
            </div>
            <div className="h-[390px]">
              <MeetingCalendarView chapterIds={studentChapterIds} />
            </div>
          </motion.div>
        </motion.div>

        {/* Second Row Grid - 3 Columns */}
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8"
          variants={containerVariants}
        >
          {/* Recent Messages */}
          <motion.div variants={itemVariants} className="h-[500px]">
            <ConversationsList chapterIds={studentChapterIds} />
          </motion.div>

          {/* Recent Activities */}
          <motion.div 
            className={`
              p-6 rounded-2xl shadow-lg border transition-all duration-300 backdrop-blur-md h-[500px] flex flex-col
              ${isDark 
                ? 'bg-dark-surface/30 border-accent-500/20 shadow-accent-500/10 hover:shadow-accent-500/20' 
                : 'bg-white/40 border-white/20 shadow-indigo-100'
              }
            `}
            variants={itemVariants}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary">Recent Activities</h2>
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-accent-500/10">
                <History className="h-5 w-5 text-indigo-600 dark:text-accent-400" />
              </div>
            </div>

            <div className={`flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4`}>
              {activityList.length > 0 ? (
                activityList.map((activity: any, index: number) => {
                  const Icon = activity.type === 'registration' ? UserPlus : 
                               activity.type === 'event' ? Calendar : Info;
                  const color = activity.type === 'registration' ? 'text-green-600 bg-green-50' : 
                                activity.type === 'event' ? 'text-blue-600 bg-blue-50' : 
                                'text-indigo-600 bg-indigo-50';
                  
                  return (
                    <motion.div 
                      key={activity.id || index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-start space-x-3 p-3 rounded-xl border border-gray-100 dark:border-dark-border/40 bg-white/50 dark:bg-dark-card/30 hover:bg-white/80 transition-colors"
                    >
                      <div className={`p-2 rounded-lg shrink-0 ${isDark ? 'bg-white/5' : color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-dark-text-primary line-clamp-2">
                          {activity.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-dark-text-muted mt-1">
                          {new Date(activity.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-10">
                  <div className="p-4 rounded-full bg-gray-50 dark:bg-dark-bg/50 mb-4">
                    <History className="h-10 w-10 text-gray-300 dark:text-dark-text-muted" />
                  </div>
                  <p className="text-gray-500 dark:text-dark-text-muted">No recent activity</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* My Chapters */}
          <motion.div 
            className={`
              p-6 rounded-2xl shadow-lg border transition-all duration-300 backdrop-blur-md h-[500px] flex flex-col
              ${isDark 
                ? 'bg-dark-surface/30 border-accent-500/20 shadow-accent-500/10 hover:shadow-accent-500/20' 
                : 'bg-white/40 border-white/20 shadow-indigo-100'
              }
            `}
            variants={itemVariants}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary">My Chapters</h2>
              <Link
                to="/student/chapters"
                className="p-2 rounded-lg bg-indigo-50 dark:bg-accent-500/10 text-indigo-600 dark:text-accent-400 hover:bg-indigo-100 dark:hover:bg-accent-500/20 transition-all group"
                title="View All Chapters"
              >
                <BookOpen className="h-5 w-5" />
              </Link>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
              {myChapters.length > 0 ? (
                myChapters.map((chapter) => (
                  <motion.div
                    key={getChapterId(chapter) || chapter?.name || chapter?.chapterName}
                    className="border border-white/30 dark:border-dark-border/50 rounded-xl p-4 bg-white/50 dark:bg-dark-card/30 hover:bg-white/80 transition-colors cursor-pointer group"
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 mr-4">
                        <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary group-hover:text-blue-600 dark:group-hover:text-accent-400 transition-colors">{getChapterName(chapter)}</h3>
                        <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                          Joined on {new Date(chapter.joinedAt || chapter.createdAt || Date.now()).toLocaleDateString()}
                        </p>
                        {(chapter.headName || chapter.chapterHead) && (
                          <p className="text-xs text-gray-500 dark:text-dark-text-muted mt-1">
                            Head: <span className="font-medium text-gray-900 dark:text-dark-text-primary">{chapter.headName || chapter.chapterHead}</span>
                          </p>
                        )}
                      </div>
                      
                      <div className="flex flex-col items-end space-y-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full shadow-sm"></div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const recipientId = getHeadRecipientId(chapter) || resolveRecipientIdFromConversations(chapter);
                            if (!recipientId) {
                              alert('Chat is available, but this chapter head user is not fully linked yet.');
                              return;
                            }
                            setActiveConversation({
                              chapterId: getChapterId(chapter),
                              recipientId,
                              recipientName: chapter.headName || chapter.chapterHead || 'Chapter Head'
                            });
                            setIsWidgetOpen(true);
                          }}
                          className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-accent-400 font-medium text-xs px-2 py-1 rounded-md transition-colors flex items-center"
                        >
                          <MessageSquare className="h-3 w-3 mr-1" /> Chat
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8 h-full flex flex-col justify-center">
                  <Users className="h-12 w-12 text-gray-400 dark:text-dark-text-muted mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-dark-text-secondary mb-4">You haven't joined any chapters yet</p>
                  <Link
                    to="/student/chapters"
                    className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-xl hover:opacity-90 transition-opacity"
                  >
                    Browse Chapters
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
