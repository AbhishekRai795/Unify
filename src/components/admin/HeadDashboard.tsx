import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Calendar, Settings, TrendingUp, Plus, Eye } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';

// Define a specific type for the colors to ensure type safety
type StatColor = 'blue' | 'green' | 'purple' | 'orange';

const HeadDashboard: React.FC = () => {
  const { user } = useAuth();
  const { chapters, events, chapterRegistrations } = useData();

  // For demo purposes, assume head manages their specific chapters
  // You would filter these based on the logged-in user's chapter
  const managedChapters = chapters; 
  const totalRegistrations = chapterRegistrations.length;
  const activeEvents = events.filter(event => event.isLive).length;
  const openRegistrations = chapters.filter(chapter => chapter.isRegistrationOpen).length;

  const stats: { icon: React.ElementType; label: string; value: number; color: StatColor; link: string }[] = [
    {
      icon: Users,
      label: 'Total Chapters',
      value: managedChapters.length,
      color: 'blue',
      link: '/head/chapters' // FIX: Changed from /admin
    },
    {
      icon: Calendar,
      label: 'Active Events',
      value: activeEvents,
      color: 'green',
      link: '/head/events' // FIX: Changed from /admin
    },
    {
      icon: TrendingUp,
      label: 'Registrations',
      value: totalRegistrations,
      color: 'purple',
      link: '/head/registrations' // FIX: Changed from /admin
    },
    {
      icon: Settings,
      label: 'Open Registrations',
      value: openRegistrations,
      color: 'orange',
      link: '/head/chapters' // FIX: Changed from /admin
    }
  ];

  // Use a Record to map the StatColor type to string class names
  const colorClasses: Record<StatColor, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500'
  };

  const recentActivities = [
    { type: 'registration', message: 'New student registered for Tech Innovators', time: '2 hours ago' },
    { type: 'event', message: 'AI Workshop event created', time: '4 hours ago' },
    { type: 'chapter', message: 'Creative Arts Society registration opened', time: '1 day ago' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, {user?.name}! 👋
          </h1>
          <p className="text-gray-600">
            Manage your chapter, events, and student registrations from your dashboard.
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

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white/80 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                to="/head/events/create" // FIX: Changed from /admin
                className="flex items-center p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg hover:from-green-100 hover:to-green-200 transition-all duration-200 group"
              >
                <Plus className="h-5 w-5 text-green-600 mr-3 group-hover:scale-110 transition-transform duration-200" />
                <div>
                  <p className="font-medium text-green-900">Create Event</p>
                  <p className="text-sm text-green-700">Post a new event for students</p>
                </div>
              </Link>
              
              <Link
                to="/head/chapters" // FIX: Changed from /admin
                className="flex items-center p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all duration-200 group"
              >
                <Settings className="h-5 w-5 text-blue-600 mr-3 group-hover:scale-110 transition-transform duration-200" />
                <div>
                  <p className="font-medium text-blue-900">Manage Chapters</p>
                  <p className="text-sm text-blue-700">Open/close registrations</p>
                </div>
              </Link>
              
              <Link
                to="/head/registrations" // FIX: Changed from /admin
                className="flex items-center p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg hover:from-purple-100 hover:to-purple-200 transition-all duration-200 group"
              >
                <Eye className="h-5 w-5 text-purple-600 mr-3 group-hover:scale-110 transition-transform duration-200" />
                <div>
                  <p className="font-medium text-purple-900">View Registrations</p>
                  <p className="text-sm text-purple-700">See who has registered</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white/80 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">{activity.message}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
              
              {recentActivities.length === 0 && (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chapter Overview */}
        <div className="bg-white/80 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Chapter Overview</h2>
            <Link
              to="/head/chapters" // FIX: Changed from /admin
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              View All →
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {managedChapters.slice(0, 3).map((chapter) => (
              <div key={chapter.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">{chapter.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    chapter.isRegistrationOpen 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {chapter.isRegistrationOpen ? 'Open' : 'Closed'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{chapter.description}</p>
                <div className="text-xs text-gray-500">
                  {chapter.memberCount} members
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeadDashboard;
