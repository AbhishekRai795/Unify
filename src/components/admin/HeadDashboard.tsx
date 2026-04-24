import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Calendar, Settings, TrendingUp, Plus, Eye, RefreshCw, AlertCircle, MessageSquare, Megaphone, Activity, ArrowRight, Video, History, UserPlus, Info, BookOpen, CreditCard } from 'lucide-react';
import { motion, Variants } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useChapterHead } from '../../contexts/ChapterHeadContext';
import { useChat } from '../../contexts/ChatContext';
import ConversationsList from '../chat/ConversationsList';
import MeetingCalendarView from '../student/MeetingCalendarView';
import Loader from '../common/Loader';

import { chapterHeadAPI } from '../../services/chapterHeadApi';
import { useTheme } from '../../contexts/ThemeContext';

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

// Define a specific type for the colors to ensure type safety
type StatColor = 'blue' | 'green' | 'purple' | 'orange';

const HeadDashboard: React.FC = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const { 
    profile,
    chapters,
    dashboardStats,
    recentActivities,
    isLoading,
    error,
    refreshData
  } = useChapterHead();
  const { setActiveChapterId, refreshConversations } = useChat();
  const [managedEvents, setManagedEvents] = useState<any[]>([]);

  const getChapterId = (chapter: any): string =>
    chapter?.chapterId || chapter?.chapterID || chapter?.id || '';
  const isNonEmptyString = (value: unknown): value is string =>
    typeof value === 'string' && value.trim().length > 0;

  const chapterList = useMemo(() => (Array.isArray(chapters) ? chapters : []), [chapters]);
  const headChapterIds = useMemo<string[]>(
    () =>
      Array.from(
        new Set(
          [profile?.chapterId, profile?.chapterID, ...chapterList.map((ch) => getChapterId(ch))].filter(isNonEmptyString)
        )
      ),
    [profile?.chapterId, profile?.chapterID, chapterList]
  );

  useEffect(() => {
    if (user?.activeRole === 'chapter-head') {
      refreshData();
    }
  }, [user?.activeRole]);

  useEffect(() => {
    const defaultChapterId = headChapterIds.length > 0 ? headChapterIds[0] : null;

    if (defaultChapterId) {
      setActiveChapterId(defaultChapterId);
      refreshConversations(headChapterIds);
    }
  }, [headChapterIds, setActiveChapterId, refreshConversations]);

  useEffect(() => {
    const loadManagedEvents = async () => {
      try {
        const chapterIds: string[] = Array.from(new Set(chapterList.map((ch) => getChapterId(ch)).filter(isNonEmptyString)));
        if (chapterIds.length === 0) {
          setManagedEvents([]);
          return;
        }

        const responses = await Promise.all(
          chapterIds.map((chapterId) => chapterHeadAPI.getMyEvents(chapterId).catch(() => ({ events: [] })))
        );

        const mergedEvents = responses.flatMap((res: any) => res?.events || []);
        setManagedEvents(mergedEvents);
      } catch (err) {
        console.warn('Failed to load managed events for announcements', err);
      }
    };

    loadManagedEvents();
  }, [chapterList]);

  const stats: { icon: React.ElementType; label: string; value: number; color: StatColor; link: string }[] = [
    {
      icon: Users,
      label: 'My Chapters',
      value: dashboardStats?.totalChapters || 0,
      color: 'blue',
      link: '/head/chapters'
    },
    {
      icon: Calendar,
      label: 'Active Events',
      value: dashboardStats?.activeEvents || 0,
      color: 'green',
      link: '/head/events/manage'
    },
    {
      icon: TrendingUp,
      label: 'Total Members',
      value: dashboardStats?.totalMembers || 0,
      color: 'purple',
      link: '/head/registrations'
    },
    {
      icon: Settings,
      label: 'Pending Requests',
      value: dashboardStats?.pendingRegistrations || 0,
      color: 'orange',
      link: '/head/registrations'
    },
  ];

  // Use a Record to map the StatColor type to string class names
  const colorClasses: Record<StatColor, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500'
  };

  const announcements = useMemo(() => {
    const chapterIdSet = new Set(chapterList.map((ch) => getChapterId(ch)).filter(Boolean));

    return (managedEvents || [])
      .filter((event: any) => chapterIdSet.size === 0 || chapterIdSet.has(event.chapterId))
      .flatMap((event: any) => {
        const list = Array.isArray(event.announcements) ? event.announcements : [];
        return list.map((announcement: any, index: number) => ({
          id: `${event.eventId || event.id}-announcement-${index}`,
          message: announcement?.message || '',
          timestamp: announcement?.timestamp || event.updatedAt || event.createdAt,
          chapterName: event.chapterName || event.chapterId || 'Chapter',
          eventName: event.title || event.eventId || event.id || 'Event'
        }));
      })
      .filter((item: any) => item.message)
      .sort((a: any, b: any) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
  }, [managedEvents, chapterList]);

  const activityList = useMemo(() => {
    return [...(recentActivities || [])].sort((a: any, b: any) => 
      new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
    );
  }, [recentActivities]);

  if (isLoading && !dashboardStats) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-dark-bg' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'}`}>
        <Loader />
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-dark-bg' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'}`}>
      <motion.div 
        className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Error Display */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
              <div className="flex-1">
                <p className="text-red-800">{error}</p>
              </div>
              <button
                onClick={refreshData}
                className="ml-3 text-red-600 hover:text-red-700"
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </motion.div>
        )}

        {/* Welcome Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, {user?.name}! 
          </h1>
          <p className="text-gray-600">
            {profile?.chapterName ? `Managing ${profile.chapterName} chapter` : 'Manage your chapter, events, and student registrations from your dashboard.'}
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
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
                    <p className="text-sm font-medium text-gray-600 mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${colorClasses[stat.color]} group-hover:scale-110 transition-transform duration-200`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Top Section Grid - 3 Columns Equi-sized */}
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8"
          variants={containerVariants}
        >
          {/* Quick Actions */}
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
            <div className="space-y-3 flex-1 overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar">
              <motion.div whileHover={{ scale: 1.03, x: 5 }} transition={{ type: 'spring', stiffness: 300 }}>
                <Link to="/head/events/create" className="flex items-center justify-between p-3 rounded-xl hover:bg-white/50 dark:hover:bg-dark-card/50 transition-colors group">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-lg ${isDark ? 'bg-gradient-to-br from-green-600/20 to-accent-600/20 border border-green-500/30' : 'bg-green-100/70'}`}>
                        <Plus className={`h-5 w-5 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-dark-text-primary">Create Event</p>
                      <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Post a new event for students</p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 dark:text-dark-text-muted group-hover:text-green-600 transition-colors" />
                </Link>
              </motion.div>
              
              <motion.div whileHover={{ scale: 1.03, x: 5 }} transition={{ type: 'spring', stiffness: 300 }}>
                <Link to="/head/events/manage" className="flex items-center justify-between p-3 rounded-xl hover:bg-white/50 dark:hover:bg-dark-card/50 transition-colors group">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-lg ${isDark ? 'bg-gradient-to-br from-orange-600/20 to-accent-600/20 border border-orange-500/30' : 'bg-orange-100/70'}`}>
                        <Plus className={`h-5 w-5 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-dark-text-primary">Manage Events</p>
                      <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Edit or delete existing events</p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 dark:text-dark-text-muted group-hover:text-orange-600 transition-colors" />
                </Link>
              </motion.div>
              
              <motion.div whileHover={{ scale: 1.03, x: 5 }} transition={{ type: 'spring', stiffness: 300 }}>
                <Link to="/head/chapters" className="flex items-center justify-between p-3 rounded-xl hover:bg-white/50 dark:hover:bg-dark-card/50 transition-colors group">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-lg ${isDark ? 'bg-gradient-to-br from-blue-600/20 to-accent-600/20 border border-blue-500/30' : 'bg-blue-100/70'}`}>
                        <Settings className={`h-5 w-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-dark-text-primary">Manage Chapters</p>
                      <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Open/close registrations</p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 dark:text-dark-text-muted group-hover:text-blue-600 transition-colors" />
                </Link>
              </motion.div>
              
              <motion.div whileHover={{ scale: 1.03, x: 5 }} transition={{ type: 'spring', stiffness: 300 }}>
                <Link to="/head/registrations" className="flex items-center justify-between p-3 rounded-xl hover:bg-white/50 dark:hover:bg-dark-card/50 transition-colors group">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-lg ${isDark ? 'bg-gradient-to-br from-purple-600/20 to-accent-600/20 border border-purple-500/30' : 'bg-purple-100/70'}`}>
                        <Eye className={`h-5 w-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-dark-text-primary">View Registrations</p>
                      <p className="text-sm text-gray-600 dark:text-dark-text-secondary">See who has registered</p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 dark:text-dark-text-muted group-hover:text-purple-600 transition-colors" />
                </Link>
              </motion.div>
              
              <motion.div whileHover={{ scale: 1.03, x: 5 }} transition={{ type: 'spring', stiffness: 300 }}>
                <Link to="/head/messages" className="flex items-center justify-between p-3 rounded-xl hover:bg-white/50 dark:hover:bg-dark-card/50 transition-colors group">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-lg ${isDark ? 'bg-gradient-to-br from-emerald-600/20 to-accent-600/20 border border-emerald-500/30' : 'bg-emerald-100/70'}`}>
                        <MessageSquare className={`h-5 w-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-dark-text-primary">Messaging</p>
                      <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Open dedicated chat workspace</p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 dark:text-dark-text-muted group-hover:text-emerald-600 transition-colors" />
                </Link>
              </motion.div>

              <motion.div whileHover={{ scale: 1.03, x: 5 }} transition={{ type: 'spring', stiffness: 300 }}>
                <button
                  onClick={() => {
                    const chId = profile?.chapterId || (headChapterIds.length > 0 ? headChapterIds[0] : null);
                    if (chId) {
                      navigate(`/head/chapter/${chId}/stats`);
                    }
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/50 dark:hover:bg-dark-card/50 transition-colors group text-left"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-lg ${isDark ? 'bg-gradient-to-br from-indigo-600/20 to-accent-600/20 border border-indigo-500/30' : 'bg-indigo-100/70'}`}>
                        <TrendingUp className={`h-5 w-5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-dark-text-primary">Payment Stats</p>
                      <p className="text-sm text-gray-600 dark:text-dark-text-secondary">View real-time financial transparency</p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 dark:text-dark-text-muted group-hover:text-indigo-600 transition-colors" />
                </button>
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

            <div className={`space-y-3 p-4 ${isDark ? 'bg-dark-bg/80' : 'bg-gray-50/50'} rounded-2xl border border-gray-100 dark:border-dark-border/50 h-[350px] overflow-y-auto custom-scrollbar`}>
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
                <div className="text-center py-6">
                  <Megaphone className="h-8 w-8 text-gray-300 dark:text-dark-text-muted mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-dark-text-muted text-sm italic">No announcements yet</p>
                </div>
              )}
            </div>
          </motion.div>

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
              <MeetingCalendarView chapterIds={headChapterIds} />
            </div>
          </motion.div>
        </motion.div>

        {/* Second Row - 3 Columns */}
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8"
          variants={containerVariants}
        >
          {/* Recent Messages */}
          <motion.div variants={itemVariants} className="h-[500px]">
            <ConversationsList chapterIds={headChapterIds} />
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
                activityList.map((activity, index) => {
                  const msg = (activity.message || '').toString().toLowerCase();
                  const typ = (activity.type || '').toString().toLowerCase();
                  
                  let Icon = Activity; // Changed default from Info to Activity to test
                  let color = 'text-indigo-600 bg-indigo-50';
                  
                  if (typ === 'registration' || msg.includes('join') || msg.includes('regist')) {
                    Icon = UserPlus;
                    color = 'text-green-600 bg-green-50';
                  } else if (typ === 'event' || msg.includes('event')) {
                    Icon = Calendar;
                    color = 'text-blue-600 bg-blue-50';
                  } else if (typ === 'meeting' || msg.includes('meet') || msg.includes('sched')) {
                    Icon = Video;
                    color = 'text-purple-600 bg-purple-50';
                  } else if (typ === 'payment' || msg.includes('pay') || msg.includes('wallet') || msg.includes('paid') || msg.includes('buy') || msg.includes('purchas')) {
                    Icon = CreditCard;
                    color = 'text-amber-600 bg-amber-50';
                  } else if (typ === 'chapter_update' || msg.includes('updat')) {
                    Icon = RefreshCw;
                    color = 'text-emerald-600 bg-emerald-50';
                  }
                  
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
                to="/head/chapters"
                className="p-2 rounded-lg bg-indigo-50 dark:bg-accent-500/10 text-indigo-600 dark:text-accent-400 hover:bg-indigo-100 dark:hover:bg-accent-500/20 transition-all group"
                title="View All Chapters"
              >
                <BookOpen className="h-5 w-5" />
              </Link>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
              {chapterList.length > 0 ? (
                chapterList.map((chapter, index) => (
                  <motion.div 
                    key={chapter.chapterId || chapter.chapterID || chapter.id || index}
                    className="p-4 rounded-xl border border-gray-100 dark:border-dark-border/40 bg-white/50 dark:bg-dark-card/30 transition-all shadow-sm"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 mr-4">
                        <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary transition-colors">
                          {chapter.chapterName || chapter.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                          Active since {new Date(chapter.createdAt || Date.now()).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                          chapter.registrationStatus === 'open' 
                            ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' 
                            : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                        }`}>
                          {chapter.registrationStatus === 'open' ? 'Live' : 'Closed'}
                        </span>
                        <p className="text-[10px] text-gray-500 mt-2">
                          {chapter.memberCount || 0} Members
                        </p>
                      </div>
                    </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-dark-text-muted mt-3 pt-3 border-t border-gray-50 dark:border-dark-border/30">
                    <div className="flex items-center space-x-3">
                      <span className="flex items-center">
                        <Users className="h-3 w-3 mr-1" />
                        Management
                      </span>
                      <span className="capitalize px-2 py-0.5 bg-gray-100 dark:bg-dark-bg/50 rounded text-[10px]">
                        {chapter.status || 'active'}
                      </span>
                    </div>
                  </div>
                </motion.div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-10">
                  <div className="p-4 rounded-full bg-gray-50 dark:bg-dark-bg/50 mb-4">
                    <Users className="h-10 w-10 text-gray-300 dark:text-dark-text-muted" />
                  </div>
                  <p className="text-gray-500 dark:text-dark-text-muted">No chapters assigned</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default HeadDashboard;
