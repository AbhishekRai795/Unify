import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Calendar, BookOpen, TrendingUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';

// Define a specific type for the colors to ensure type safety
type StatColor = 'blue' | 'green' | 'purple' | 'orange';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  // FIX: Use `chapterRegistrations` which is provided by DataContext
  const { chapters, events, chapterRegistrations } = useData();

  const openChapters = chapters.filter(chapter => chapter.isRegistrationOpen);
  const liveEvents = events.filter(event => event.isLive);
  
  // The registeredChapters are now derived from the correct context value
  const myRegisteredChapters = chapterRegistrations || [];

  const stats: { icon: React.ElementType; label: string; value: number; color: StatColor; link: string }[] = [
    {
      icon: Users,
      label: 'Available Chapters',
      value: chapters.length,
      color: 'blue',
      link: '/student/chapters'
    },
    {
      icon: BookOpen,
      label: 'Open Registrations',
      value: openChapters.length,
      color: 'green',
      link: '/student/chapters'
    },
    {
      icon: Calendar,
      label: 'Live Events',
      value: liveEvents.length,
      color: 'purple',
      link: '/student/events'
    },
    {
      icon: TrendingUp,
      label: 'My Chapters',
      value: myRegisteredChapters.length,
      color: 'orange',
      link: '/student/profile'
    }
  ];

  const colorClasses: Record<StatColor, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.name}! 👋
          </h1>
          <p className="text-gray-600">
            Discover new opportunities and stay connected with your chapters.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Link
              key={index}
              to={stat.link}
              className="bg-white/80 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:shadow-lg transition-all duration-200 group"
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
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quick Actions */}
          <div className="bg-white/80 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                to="/student/chapters"
                className="flex items-center p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all duration-200 group"
              >
                <Users className="h-5 w-5 text-blue-600 mr-3 group-hover:scale-110 transition-transform duration-200" />
                <div>
                  <p className="font-medium text-blue-900">Browse Chapters</p>
                  <p className="text-sm text-blue-700">Find and join new chapters</p>
                </div>
              </Link>
              
              <Link
                to="/student/events"
                className="flex items-center p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg hover:from-purple-100 hover:to-purple-200 transition-all duration-200 group"
              >
                <Calendar className="h-5 w-5 text-purple-600 mr-3 group-hover:scale-110 transition-transform duration-200" />
                <div>
                  <p className="font-medium text-purple-900">View Events</p>
                  <p className="text-sm text-purple-700">See what's happening</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white/80 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
            <div className="space-y-4">
              {liveEvents.slice(0, 3).map((event) => (
                <div key={event.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 animate-pulse"></div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">{event.title}</p>
                    <p className="text-xs text-gray-600">{event.chapterName}</p>
                    <p className="text-xs text-green-600 font-medium">Live Event</p>
                  </div>
                </div>
              ))}
              
              {liveEvents.length === 0 && (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Featured Chapters */}
        {openChapters.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Open for Registration</h2>
              <Link
                to="/student/chapters"
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                View All →
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {openChapters.slice(0, 3).map((chapter) => (
                <div key={chapter.id} className="bg-white/80 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden hover:shadow-lg transition-all duration-200 group">
                  {chapter.imageUrl && (
                    <img
                      src={chapter.imageUrl}
                      alt={chapter.name}
                      className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  )}
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 mb-2">{chapter.name}</h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{chapter.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        Registration Open
                      </span>
                      <span className="text-xs text-gray-500">
                        {chapter.memberCount} members
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
