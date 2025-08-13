import React, { useEffect, useState } from 'react';
import { Search, Users, MapPin, Clock, UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { studentAPI } from '../../services/api';
import ErrorMessage from '../common/ErrorMessage';

interface Chapter {
  id: string;
  name: string;
  chapterHead?: string;
  description?: string;
  status?: string;
  isRegistered: boolean;
}

interface ChapterCardProps {
  chapter: Chapter;
  onRegister: () => void;
  onLeave: () => void;
  isLoading: boolean;
}

const ChapterCard: React.FC<ChapterCardProps> = ({ chapter, onRegister, onLeave, isLoading }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{chapter.name}</h3>
            {chapter.description && (
              <p className="text-gray-600 text-sm mb-3">{chapter.description}</p>
            )}
            
            <div className="space-y-2">
              {chapter.chapterHead && (
                <div className="flex items-center text-sm text-gray-500">
                  <Users className="h-4 w-4 mr-2" />
                  <span>Head: {chapter.chapterHead}</span>
                </div>
              )}
              <div className="flex items-center text-sm text-gray-500">
                <MapPin className="h-4 w-4 mr-2" />
                <span>Active Chapter</span>
              </div>
            </div>
          </div>
          
          <div className="ml-4">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              chapter.isRegistered 
                ? 'bg-green-100 text-green-800' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              {chapter.isRegistered ? 'Registered' : 'Available'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center text-sm text-gray-500">
            <Clock className="h-4 w-4 mr-1" />
            <span>Always Open</span>
          </div>
          
          {chapter.isRegistered ? (
            <button
              onClick={onLeave}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-red-300 text-red-700 bg-white rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <UserMinus className="h-4 w-4 mr-2" />
              )}
              Leave Chapter
            </button>
          ) : (
            <button
              onClick={onRegister}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              Join Chapter
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const ChaptersList: React.FC = () => {
  const { user } = useAuth();
  const { myChapters, fetchMyChapters, error: contextError } = useData();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchChapters();
    fetchMyChapters();
  }, []);

  const fetchChapters = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch all chapters and available chapters
      const [allChaptersResponse, availableChaptersResponse] = await Promise.all([
        studentAPI.getAllChapters(),
        studentAPI.getAvailableChapters()
      ]);
      
      const allChapters = allChaptersResponse.chapters || [];
      const availableChapters = availableChaptersResponse.chapters || [];
      
      // Combine and mark registration status
      const combinedChapters = allChapters.map((chapter: any) => ({
        id: chapter.id,
        name: chapter.name,
        chapterHead: chapter.chapterHead,
        description: chapter.description,
        status: chapter.status,
        isRegistered: !availableChapters.some((available: any) => available.id === chapter.id)
      }));
      
      setChapters(combinedChapters);
    } catch (error) {
      console.error('Error fetching chapters:', error);
      setError('Failed to load chapters. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const isRegisteredForChapter = (chapterId: string) => {
    return myChapters.some(chapter => 
      chapter.id === chapterId || chapter.name === chapterId
    );
  };

  const handleRegister = async (chapterId: string) => {
    if (!user) return;
    
    setActionLoading(chapterId);
    setError(null);
    
    try {
      const chapter = chapters.find(c => c.id === chapterId);
      if (!chapter) return;
      
      await studentAPI.registerForChapter(chapter.name, {
        name: user.name,
        email: user.email
      });
      
      // Refresh data
      await Promise.all([fetchChapters(), fetchMyChapters()]);
      
    } catch (error) {
      console.error('Registration error:', error);
      setError('Failed to register for chapter. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLeave = async (chapterId: string) => {
    setActionLoading(chapterId);
    setError(null);
    
    try {
      const chapter = chapters.find(c => c.id === chapterId);
      if (!chapter) return;
      
      await studentAPI.leaveChapter(chapter.name);
      
      // Refresh data
      await Promise.all([fetchChapters(), fetchMyChapters()]);
      
    } catch (error) {
      console.error('Leave chapter error:', error);
      setError('Failed to leave chapter. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredChapters = chapters.filter(chapter =>
    chapter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (chapter.chapterHead && chapter.chapterHead.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const registeredChapters = filteredChapters.filter(chapter => 
    isRegisteredForChapter(chapter.id)
  );
  const availableChapters = filteredChapters.filter(chapter => 
    !isRegisteredForChapter(chapter.id)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Chapters</h1>
        <p className="text-gray-600 mt-2">
          Discover and join chapters that match your interests and goals.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search chapters..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Error Message */}
      {(error || contextError) && (
        <ErrorMessage 
          message={error || contextError || 'An error occurred'} 
          onDismiss={() => setError(null)} 
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">{chapters.length}</p>
              <p className="text-sm text-gray-600">Total Chapters</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-50 rounded-lg">
              <UserPlus className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">{registeredChapters.length}</p>
              <p className="text-sm text-gray-600">Registered</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-50 rounded-lg">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">{availableChapters.length}</p>
              <p className="text-sm text-gray-600">Available</p>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading chapters...</span>
        </div>
      )}

      {/* Chapters Content */}
      {!isLoading && (
        <>
          {/* My Registered Chapters */}
          {registeredChapters.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">My Chapters</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {registeredChapters.map((chapter) => (
                  <ChapterCard
                    key={chapter.id}
                    chapter={chapter}
                    onRegister={() => handleRegister(chapter.id)}
                    onLeave={() => handleLeave(chapter.id)}
                    isLoading={actionLoading === chapter.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Available Chapters */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {registeredChapters.length > 0 ? 'Available Chapters' : 'All Chapters'}
            </h2>
            
            {availableChapters.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableChapters.map((chapter) => (
                  <ChapterCard
                    key={chapter.id}
                    chapter={chapter}
                    onRegister={() => handleRegister(chapter.id)}
                    onLeave={() => handleLeave(chapter.id)}
                    isLoading={actionLoading === chapter.id}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg text-gray-600 mb-2">
                  {searchTerm ? 'No chapters found' : 'No available chapters'}
                </p>
                <p className="text-gray-500">
                  {searchTerm 
                    ? 'Try adjusting your search terms' 
                    : 'All chapters have been registered or none are currently available'
                  }
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Empty State */}
      {!isLoading && chapters.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg text-gray-600 mb-2">No chapters available</p>
          <p className="text-gray-500">
            Chapters will appear here when they become available.
          </p>
        </div>
      )}
    </div>
  );
};

export default ChaptersList;
