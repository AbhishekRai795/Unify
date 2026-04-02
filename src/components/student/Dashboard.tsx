import React, { useEffect } from 'react';
import { 
  Calendar, 
  Users, 
  BookOpen, 
  Clock, 
  ArrowRight,
  Activity,
  CreditCard,
  MessageSquare
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useChat } from '../../contexts/ChatContext';
import { useTheme } from '../../contexts/ThemeContext';
import Loader from '../common/Loader';
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
  const { dashboardData, myChapters, isLoading, fetchDashboard, fetchMyChapters } = useData();
  const { setActiveConversation, setIsWidgetOpen } = useChat();
  const { isDark } = useTheme();

  useEffect(() => {
    fetchDashboard();
    fetchMyChapters();
  }, []);

  if (isLoading && !dashboardData) {
    return <div className="min-h-screen flex items-center justify-center"><Loader /></div>;
  }

  const stats = [
    {
      label: 'Registered Chapters',
      value: dashboardData?.student?.registeredChaptersCount || myChapters.length || 0,
      icon: Users,
      color: 'blue',
      change: '+2 this month'
    },
    {
      label: 'Available Chapters',
      value: dashboardData?.stats?.totalChapters || 0,
      icon: BookOpen,
      color: 'green',
      change: 'Total active'
    },
    {
      label: 'Events Attended',
      value: dashboardData?.stats?.completedEvents || '0',
      icon: Calendar,
      color: 'purple',
      change: 'This semester'
    },
    {
      label: 'Learning Hours',
      value: dashboardData?.stats?.upcomingEvents || '0',
      icon: Clock,
      color: 'orange',
      change: 'This month'
    }
  ];

  return (
    <div className={isDark ? 'aurora-bg' : ''}>
      <motion.div 
        className="space-y-8 p-4 md:p-6 lg:p-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants}>
          <h1 className="text-4xl font-bold text-gray-800 dark:text-dark-text-primary">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-gray-500 dark:text-dark-text-secondary mt-2 text-lg">
            Discover new opportunities and stay connected with your chapters.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          variants={containerVariants}
        >
          {stats.map((stat) => {
            const IconComponent = stat.icon;
            return (
              <motion.div
                key={stat.label}
                className={`
                  relative overflow-hidden p-6 rounded-2xl shadow-lg border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 backdrop-blur-md
                  ${isDark 
                    ? 'bg-dark-surface/30 border-accent-500/20 shadow-accent-500/10 hover:shadow-accent-500/20 hover:bg-dark-surface/40' 
                    : 'bg-white/40 border-white/20'
                  }
                `}
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary mt-2">{stat.value}</p>
                    <p className="text-xs text-gray-600 dark:text-dark-text-muted mt-1">{stat.change}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${isDark ? 'bg-gradient-to-br from-accent-600/20 to-primary-600/20 border border-accent-500/30' : 'bg-white/50'}`}>
                    <IconComponent className={`h-7 w-7 ${isDark ? 'text-accent-400' : `text-${stat.color}-600`}`} />
                  </div>
                </div>
                {/* Updated Highlight Bar - Only in Dark Mode */}
                {isDark && <div className="absolute bottom-0 left-0 h-1 w-full bg-accent"></div>}
              </motion.div>
            );
          })}
        </motion.div>

        {/* Quick Actions & Recent Activity Grid */}
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          variants={containerVariants}
        >
          <motion.div 
            className={`
              p-6 rounded-2xl shadow-lg border transition-all duration-300 backdrop-blur-md
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
            <div className="space-y-3">
              <motion.div whileHover={{ scale: 1.03, x: 5 }} transition={{ type: 'spring', stiffness: 300 }}>
                <Link to="/student/chapters" className="flex items-center justify-between p-3 rounded-xl hover:bg-white/50 dark:hover:bg-dark-card/50 transition-colors group">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-lg ${isDark ? 'bg-gradient-to-br from-accent-600/20 to-primary-600/20 border border-accent-500/30' : 'bg-blue-100/70'}`}>
                        <Users className={`h-5 w-5 ${isDark ? 'text-accent-400' : 'text-blue-600'}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-dark-text-primary">Browse Chapters</p>
                      <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Find and join new chapters</p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 dark:text-dark-text-muted group-hover:text-accent transition-colors" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03, x: 5 }} transition={{ type: 'spring', stiffness: 300 }}>
                <Link to="/student/events" className="flex items-center justify-between p-3 rounded-xl hover:bg-white/50 dark:hover:bg-dark-card/50 transition-colors group">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-lg ${isDark ? 'bg-gradient-to-br from-accent-600/20 to-primary-600/20 border border-accent-500/30' : 'bg-green-100/70'}`}>
                        <Calendar className={`h-5 w-5 ${isDark ? 'text-accent-400' : 'text-green-600'}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-dark-text-primary">View Events</p>
                      <p className="text-sm text-gray-600 dark:text-dark-text-secondary">See what's happening</p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 dark:text-dark-text-muted group-hover:text-accent transition-colors" />
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
                  <ArrowRight className="h-5 w-5 text-gray-400 dark:text-dark-text-muted group-hover:text-accent transition-colors" />
                </Link>
              </motion.div>
            </div>
          </motion.div>

          <motion.div 
            className={`
              p-6 rounded-2xl shadow-lg border transition-all duration-300 backdrop-blur-md
              ${isDark 
                ? 'bg-dark-surface/30 border-accent-500/20 shadow-accent-500/10 hover:shadow-accent-500/20' 
                : 'bg-white/40 border-white/20'
              }
            `}
            variants={itemVariants}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-dark-text-primary">Recent Activity</h2>
              <Clock className="h-5 w-5 text-gray-500 dark:text-dark-text-muted" />
            </div>
            <div className={`space-y-4 p-4 ${isDark ? 'bg-dark-bg/80' : 'bg-gray-50/50'} rounded-2xl border border-gray-100 dark:border-dark-border/50 max-h-[300px] overflow-y-auto custom-scrollbar`}>
              {dashboardData?.recentActivities && dashboardData.recentActivities.length > 0 ? (
                dashboardData.recentActivities.map((activity: any) => (
                  <div key={activity.id} className="flex items-start space-x-3 group cursor-default">
                    <div className={`mt-1 p-1.5 rounded-lg ${
                      activity.type.includes('event') ? 'bg-green-100 text-green-600' :
                      activity.type.includes('registration') ? 'bg-blue-100 text-blue-600' :
                      'bg-purple-100 text-purple-600'
                    }`}>
                      <Activity className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-dark-text-primary line-clamp-1 group-hover:text-accent transition-colors">
                        {activity.message}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-dark-text-muted mt-0.5">
                        {new Date(activity.timestamp).toLocaleDateString()} • {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <Clock className="h-8 w-8 text-gray-300 dark:text-dark-text-muted mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-dark-text-muted text-sm italic">No recent activities found</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>

        {/* My Chapters */}
        <motion.div 
          className="bg-white/40 dark:bg-dark-surface/70 dark:backdrop-blur-md rounded-2xl shadow-lg dark:shadow-none border border-white/20 dark:border-dark-border/50 p-6"
          variants={itemVariants}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-dark-text-primary">My Chapters</h2>
            <Link to="/student/chapters" className="text-accent hover:underline text-sm font-medium transition-colors">
              View All
            </Link>
          </div>
          
          {myChapters.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myChapters.slice(0, 4).map((chapter) => (
                <motion.div
                  key={chapter.id}
                  className="border border-white/30 dark:border-dark-border/50 rounded-xl p-4 hover:bg-white/50 dark:hover:bg-dark-card/50 transition-colors cursor-pointer"
                  whileHover={{ scale: 1.03 }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary">{chapter.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                        Joined on {new Date(chapter.joinedAt || chapter.createdAt || Date.now()).toLocaleDateString()}
                      </p>
                      {(chapter.headName || chapter.chapterHead) && (
                        <p className="text-xs text-gray-500 dark:text-dark-text-muted mt-1">
                          Head: {chapter.headName || chapter.chapterHead}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end space-y-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full shadow-sm"></div>
                      {chapter.headEmail && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            setActiveConversation({
                              chapterId: chapter.id,
                              recipientId: chapter.headId || chapter.headEmail,
                              recipientName: chapter.headName || chapter.chapterHead || 'Chapter Head'
                            });
                            setIsWidgetOpen(true);
                          }}
                          className="bg-accent/10 hover:bg-accent/20 text-accent font-medium text-xs px-2 py-1 rounded-md transition-colors flex items-center"
                        >
                          <MessageSquare className="h-3 w-3 mr-1" /> Chat
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 dark:text-dark-text-muted mx-auto mb-4" />
              <p className="text-gray-600 dark:text-dark-text-secondary mb-4">You haven't joined any chapters yet</p>
              <Link
                to="/student/chapters"
                className="inline-flex items-center px-4 py-2 bg-accent text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                Browse Chapters
              </Link>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
