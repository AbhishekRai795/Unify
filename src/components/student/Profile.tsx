import React, { useEffect, useState } from 'react';
import { User, Mail, Calendar, Users, BookOpen, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { studentAPI } from '../../services/api';
import Loader from '../common/Loader';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const { myChapters, fetchMyChapters } = useData();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await studentAPI.getProfile();
        setProfile(data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchProfile();
      fetchMyChapters();
    }
  }, [user]);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Student Profile</h1>

      {/* Profile Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-6 mb-6">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="h-10 w-10 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{profile?.name || user?.name}</h2>
            <p className="text-gray-600 flex items-center mt-1">
              <Mail className="h-4 w-4 mr-2" />
              {profile?.email || user?.email}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-50 rounded-lg mx-auto mb-3">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{profile?.totalChapters || 0}</p>
            <p className="text-sm text-gray-600">Chapters Joined</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-green-50 rounded-lg mx-auto mb-3">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">0</p>
            <p className="text-sm text-gray-600">Events Attended</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-50 rounded-lg mx-auto mb-3">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {profile?.memberSince ? 
                new Date(profile.memberSince).toLocaleDateString() : 
                'N/A'
              }
            </p>
            <p className="text-sm text-gray-600">Member Since</p>
          </div>
        </div>
      </div>

      {/* Registered Chapters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <BookOpen className="h-5 w-5 mr-2" />
          My Chapters
        </h3>
        
        {myChapters.length > 0 ? (
          <div className="space-y-4">
            {myChapters.map((chapter) => (
              <div
                key={chapter.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{chapter.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Joined: {new Date(chapter.registeredAt).toLocaleDateString()}
                    </p>
                    {chapter.chapterHead && (
                      <p className="text-sm text-gray-500 mt-1">
                        Chapter Head: {chapter.chapterHead}
                      </p>
                    )}
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              You haven't registered for any chapters yet. Explore available chapters to get started!
            </p>
            <a
              href="/student/chapters"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse Chapters
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
