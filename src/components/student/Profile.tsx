import React from 'react';
import { User, Mail, Hash, GraduationCap, Calendar, Users, BookOpen } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const { chapters } = useData();

  if (!user || !user.student) {
    return null;
  }

  const registeredChapterIds = user.student.registeredChapters;
  const registeredChapters = chapters.filter(chapter => 
    registeredChapterIds.includes(chapter.id)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-white/80 backdrop-blur-md rounded-xl border border-white/20 p-8 mb-8">
          <div className="flex items-center space-x-6">
            <div className="w-24 h-24 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
              <User className="h-12 w-12 text-white" />
            </div>
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {user.student.name}
              </h1>
              <p className="text-gray-600 mb-4">Student Profile</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center text-gray-700">
                  <Mail className="h-5 w-5 mr-3 text-blue-600" />
                  <span>{user.student.email}</span>
                </div>
                
                <div className="flex items-center text-gray-700">
                  <Hash className="h-5 w-5 mr-3 text-blue-600" />
                  <span>SAP ID: {user.student.sapId}</span>
                </div>
                
                <div className="flex items-center text-gray-700">
                  <GraduationCap className="h-5 w-5 mr-3 text-blue-600" />
                  <span>Academic Year: {user.student.year}</span>
                </div>
                
                <div className="flex items-center text-gray-700">
                  <Calendar className="h-5 w-5 mr-3 text-blue-600" />
                  <span>Joined: {new Date(user.student.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-md rounded-xl border border-white/20 p-6 text-center">
            <Users className="h-12 w-12 text-blue-600 mx-auto mb-3" />
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {registeredChapters.length}
            </div>
            <div className="text-gray-600">Registered Chapters</div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-md rounded-xl border border-white/20 p-6 text-center">
            <BookOpen className="h-12 w-12 text-green-600 mx-auto mb-3" />
            <div className="text-2xl font-bold text-gray-900 mb-1">0</div>
            <div className="text-gray-600">Events Attended</div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-md rounded-xl border border-white/20 p-6 text-center">
            <Calendar className="h-12 w-12 text-purple-600 mx-auto mb-3" />
            <div className="text-2xl font-bold text-gray-900 mb-1">0</div>
            <div className="text-gray-600">Upcoming Events</div>
          </div>
        </div>

        {/* Registered Chapters */}
        <div className="bg-white/80 backdrop-blur-md rounded-xl border border-white/20 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">My Chapters</h2>
          
          {registeredChapters.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {registeredChapters.map((chapter) => (
                <div key={chapter.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {chapter.name}
                    </h3>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      {chapter.category}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {chapter.description}
                  </p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="h-4 w-4 mr-2" />
                      <span>{chapter.memberCount} members</span>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>{chapter.meetingSchedule}</span>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="h-4 w-4 mr-2" />
                      <span>{chapter.contactEmail}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No chapters yet</h3>
              <p className="text-gray-600 mb-6">
                You haven't registered for any chapters yet. Explore available chapters to get started!
              </p>
              <a
                href="/student/chapters"
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
              >
                Browse Chapters
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;