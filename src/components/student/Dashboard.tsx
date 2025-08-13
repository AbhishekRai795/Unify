import React, { useEffect } from 'react';
import { 
  Calendar, 
  Users, 
  BookOpen, 
  TrendingUp, 
  Clock, 
  MapPin,
  ArrowRight,
  Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import Loader from '../common/Loader';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { dashboardData, myChapters, isLoading, fetchDashboard, fetchMyChapters } = useData();

  useEffect(() => {
    fetchDashboard();
    fetchMyChapters();
  }, []);

  if (isLoading && !dashboardData) {
    return <Loader />;
  }

  const stats = [
    {
      label: 'Registered Chapters',
      value: dashboardData?.registeredChaptersCount || 0,
      icon: Users,
      color: 'blue',
      change: '+2 this month'
    },
    {
      label: 'Available Chapters',
      value: dashboardData?.totalAvailableChapters || 0,
      icon: BookOpen,
      color: 'green',
      change: 'Total active'
    },
    {
      label: 'Events Attended',
      value: '0', // Will be updated when events are implemented
      icon: Calendar,
      color: 'purple',
      change: 'This semester'
    },
    {
      label: 'Learning Hours',
      value: '0', // Will be calculated based on events
      icon: Clock,
      color: 'orange',
      change: 'This month'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-gray-600 mt-2">
          Discover new opportunities and stay connected with your chapters.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const IconComponent = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{stat.change}</p>
                </div>
                <div className={`p-3 rounded-lg bg-${stat.color}-50`}>
                  <IconComponent className={`h-6 w-6 text-${stat.color}-600`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
            <Activity className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            <Link
              to="/student/chapters"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Browse Chapters</p>
                  <p className="text-sm text-gray-600">Find and join new chapters</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
            </Link>
            <Link
              to="/student/events"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <Calendar className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">View Events</p>
                  <p className="text-sm text-gray-600">See what's happening</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            <Clock className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {dashboardData?.recentActivity ? (
              <p className="text-gray-600">{dashboardData.recentActivity}</p>
            ) : (
              <p className="text-gray-500 italic">No recent activity</p>
            )}
          </div>
        </div>
      </div>

      {/* My Chapters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">My Chapters</h2>
          <Link
            to="/student/chapters"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            View All
          </Link>
        </div>
        
        {myChapters.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myChapters.slice(0, 4).map((chapter) => (
              <div
                key={chapter.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{chapter.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Joined on {new Date(chapter.registeredAt).toLocaleDateString()}
                    </p>
                    {chapter.chapterHead && (
                      <p className="text-xs text-gray-500 mt-1">
                        Head: {chapter.chapterHead}
                      </p>
                    )}
                  </div>
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">You haven't joined any chapters yet</p>
            <Link
              to="/student/chapters"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse Chapters
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
