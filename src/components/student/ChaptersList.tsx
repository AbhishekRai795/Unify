import React, { useEffect, useState } from 'react';
import { Search, Users, MapPin, Clock, UserPlus, UserMinus, Loader2, CheckCircle, XCircle, Mail } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { studentAPI } from '../../services/api';
import ErrorMessage from '../common/ErrorMessage';

interface Chapter {
  id: string;
  name: string;
  chapterHead?: string;
  description?: string;
  status?: string;
  isRegistered: boolean;
  registrationStatus?: 'none' | 'pending' | 'approved' | 'rejected' | 'left' | 'kicked';
  isRegistrationOpen?: boolean;
  memberCount?: number;
  contactEmail?: string;
  category?: string;
}

interface ChapterCardProps {
  chapter: Chapter;
  onRegister: () => void;
  onLeave: () => void;
  isLoading: boolean;
}

const ChapterCard: React.FC<ChapterCardProps> = ({ chapter, onRegister, onLeave, isLoading }) => {
  const { isDark } = useTheme();
  const isRegistrationOpen = chapter.isRegistrationOpen || false; // Default to closed
  const isPending = chapter.registrationStatus === 'pending';
  const isApproved = chapter.registrationStatus === 'approved' || chapter.isRegistered;
  const isRejected = chapter.registrationStatus === 'rejected';
  const isLeft = chapter.registrationStatus === 'left';
  const isKicked = chapter.registrationStatus === 'kicked';
  const canRegister = !isApproved && !isPending && isRegistrationOpen;
  
  return (
    <div className={`
      group relative rounded-lg shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 overflow-hidden backdrop-blur-md border
      ${isDark 
        ? 'bg-dark-surface/90 border-dark-border hover:shadow-2xl hover:shadow-accent-500/10' 
        : 'bg-white border-gray-200'
      }
      hover:scale-[1.02] glow-effect
    `}>
      {/* Subtle background gradient */}
      <div className={`
        absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300
        ${isDark 
          ? 'from-accent-500/10 to-primary-500/10' 
          : 'from-gray-50/50 to-white/80'
        }
      `}></div>
      
      {/* Header */}
      <div className={`
        relative p-6 border-b transition-all duration-300
        ${isDark 
          ? 'bg-dark-card/50 border-dark-border' 
          : 'bg-gray-50 border-gray-200'
        }
      `}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className={`
              text-xl font-semibold mb-2 transition-colors duration-200
              ${isDark 
                ? 'text-dark-text-primary group-hover:text-accent-400' 
                : 'text-gray-900 group-hover:text-blue-600'
              }
            `}>{chapter.name}</h3>
            {chapter.category && (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 mb-2">
                {chapter.category}
              </span>
            )}
            {chapter.description && (
              <p className="text-gray-600 text-sm leading-relaxed">{chapter.description}</p>
            )}
          </div>
          
          <div className="ml-4 flex flex-col items-end space-y-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              isApproved
                ? 'bg-green-100 text-green-800' 
                : isPending
                  ? 'bg-yellow-100 text-yellow-800'
                  : isRejected
                    ? 'bg-red-100 text-red-800'
                    : isLeft
                      ? 'bg-gray-100 text-gray-700'
                      : isKicked
                        ? 'bg-red-100 text-red-800'
                        : isRegistrationOpen
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-700'
            }`}>
              {isApproved ? (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Registered
                </>
              ) : isPending ? (
                <>
                  <Clock className="h-3 w-3 mr-1" />
                  Pending Approval
                </>
              ) : isRejected ? (
                <>
                  <XCircle className="h-3 w-3 mr-1" />
                  Rejected
                </>
              ) : isLeft ? (
                <>
                  <UserMinus className="h-3 w-3 mr-1" />
                  Left Chapter
                </>
              ) : isKicked ? (
                <>
                  <XCircle className="h-3 w-3 mr-1" />
                  Removed
                </>
              ) : isRegistrationOpen ? (
                <>
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                  Open
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3 mr-1" />
                  Closed
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative p-6">
        <div className="space-y-3 mb-6">
          {chapter.chapterHead && (
            <div className="flex items-center text-sm text-gray-600">
              <Users className="h-4 w-4 mr-2 text-gray-400" />
              <span className="font-medium">Head: {chapter.chapterHead}</span>
            </div>
          )}
          
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="h-4 w-4 mr-2 text-gray-400" />
            <span>Active Chapter</span>
          </div>
          
          {chapter.memberCount !== undefined && (
            <div className="flex items-center text-sm text-gray-600">
              <Users className="h-4 w-4 mr-2 text-gray-400" />
              <span>{chapter.memberCount} members</span>
            </div>
          )}

          {chapter.contactEmail && (
            <div className="flex items-center text-sm text-gray-600">
              <Mail className="h-4 w-4 mr-2 text-gray-400" />
              <span className="truncate">{chapter.contactEmail}</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t border-gray-200">
          {isApproved ? (
            <button
              onClick={onLeave}
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center px-4 py-3 border border-red-300 text-red-700 bg-white rounded-lg hover:bg-red-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <UserMinus className="h-4 w-4 mr-2" />
              )}
              Leave Chapter
            </button>
          ) : isPending ? (
            <button
              disabled
              className="w-full inline-flex items-center justify-center px-4 py-3 bg-yellow-100 text-yellow-800 rounded-lg cursor-not-allowed font-medium"
            >
              <Clock className="h-4 w-4 mr-2" />
              Waiting for Approval
            </button>
          ) : isRejected ? (
            <button
              disabled
              className="w-full inline-flex items-center justify-center px-4 py-3 bg-red-100 text-red-800 rounded-lg cursor-not-allowed font-medium"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Application Rejected
            </button>
          ) : (isLeft || isKicked) && isRegistrationOpen ? (
            <button
              onClick={onRegister}
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              Re-join Chapter
            </button>
          ) : (
            <button
              onClick={onRegister}
              disabled={isLoading || !isRegistrationOpen}
              className={`w-full inline-flex items-center justify-center px-4 py-3 rounded-lg transition-colors font-medium disabled:cursor-not-allowed ${
                canRegister
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              {!isRegistrationOpen ? 'Registration Closed' : 'Join Chapter'}
            </button>
          )}
          
          {/* Registration Status Message */}
          {!isApproved && (
            <div className={`text-xs text-center mt-3 px-3 py-2 rounded ${
              isPending
                ? 'text-yellow-700 bg-yellow-50'
                : isRejected
                  ? 'text-red-700 bg-red-50'
                  : isLeft
                    ? 'text-blue-700 bg-blue-50'
                    : isKicked
                      ? 'text-red-700 bg-red-50'
                      : isRegistrationOpen 
                        ? 'text-green-700 bg-green-50' 
                        : 'text-gray-700 bg-gray-50'
            }`}>
              {isPending
                ? 'Your application is pending approval'
                : isRejected
                  ? 'Your application was rejected'
                  : isLeft
                    ? 'You left this chapter - you can re-join anytime'
                    : isKicked
                      ? 'You were removed from this chapter - you can re-apply'
                      : isRegistrationOpen 
                        ? 'Registration is currently open' 
                        : 'Registration is currently closed'
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ChaptersList: React.FC = () => {
  const { user } = useAuth();
  const { error: contextError } = useData();
  const { isDark } = useTheme();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchChapters();
  }, []);

  const fetchChapters = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch fresh registration data first
      const [chaptersResponse, myChaptersData, pendingData] = await Promise.all([
        studentAPI.getAllChapters(),
        studentAPI.getMyChapters(),
        studentAPI.getPendingRegistrations()
      ]);
      
      console.log('=== API RESPONSE DEBUG ===');
      console.log('Chapters response:', chaptersResponse);
      console.log('My chapters:', myChaptersData);
      console.log('Pending registrations:', pendingData);
      
      const allChapters = chaptersResponse.chapters || [];
      const currentMyChapters = myChaptersData.chapters || [];
      const currentPendingRegs = pendingData.registrations || [];
      
      // Transform chapters to match expected format with fresh data
      const transformedChapters = allChapters.map((chapter: any) => {
        // Check if user has any registration for this chapter
        const registrationData = currentPendingRegs.find((reg: any) => 
          reg.chapterId === chapter.id || reg.chapterName === chapter.name
        );
        
        // Check if user is currently registered (approved)
        const isRegistered = currentMyChapters.some((myChapter: any) => 
          myChapter.id === chapter.id || myChapter.name === chapter.name
        );
        
        // Determine registration status
        let registrationStatus = 'none';
        if (isRegistered) {
          registrationStatus = 'approved';
        } else if (registrationData) {
          registrationStatus = registrationData.status;
        }
        
        console.log(`Chapter ${chapter.name}:`, {
          isRegistered,
          registrationData: registrationData?.status,
          finalStatus: registrationStatus
        });
        
        return {
          id: chapter.id,
          name: chapter.name,
          chapterHead: chapter.adminName || chapter.headName,
          description: chapter.description,
          status: chapter.status || 'active',
          isRegistered: isRegistered,
          registrationStatus: registrationStatus,
          isRegistrationOpen: chapter.isRegistrationOpen !== undefined ? chapter.isRegistrationOpen : (chapter.registrationOpen !== undefined ? chapter.registrationOpen : false),
          memberCount: chapter.memberCount || 0,
          contactEmail: chapter.contactEmail,
          category: chapter.category || 'General'
        };
      });
      
      console.log('Transformed chapters:', transformedChapters);
      setChapters(transformedChapters);
    } catch (error) {
      console.error('Error fetching chapters:', error);
      setError('Failed to load chapters. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };



  const handleRegister = async (chapterId: string) => {
    if (!user) return;
    
    const chapter = chapters.find(c => c.id === chapterId);
    if (!chapter) return;
    
    // Check if registration is open
    if (!chapter.isRegistrationOpen) {
      setError('Registration is currently closed for this chapter.');
      return;
    }
    
    setActionLoading(chapterId);
    setError(null);
    
    try {
      await studentAPI.registerForChapter(chapter.name, {
        name: user.name,
        email: user.email
      });
      
      // Refresh data with fresh API calls
      await fetchChapters();
      
    } catch (error: any) {
      console.error('Registration error:', error);
      const errorMessage = error?.message || 'Failed to register for chapter. Please try again.';
      setError(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const handleLeave = async (chapterId: string) => {
    setActionLoading(chapterId);
    setError(null);
    
    try {
      // Use chapterId directly as the backend expects chapterId in the URL
      await studentAPI.leaveChapter(chapterId);
      
      // Refresh data with fresh API calls
      await fetchChapters();
      
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
    chapter.registrationStatus === 'approved' || chapter.isRegistered
  );
  const pendingChapters = filteredChapters.filter(chapter => 
    chapter.registrationStatus === 'pending'
  );
  const rejectedChapters = filteredChapters.filter(chapter => 
    chapter.registrationStatus === 'rejected'
  );

  const availableChapters = filteredChapters.filter(chapter => 
    chapter.registrationStatus === 'none' || !chapter.registrationStatus
  );
  const reJoinableChapters = filteredChapters.filter(chapter => 
    chapter.registrationStatus === 'left' || chapter.registrationStatus === 'kicked'
  );

  const openChapters = availableChapters.filter(chapter => chapter.isRegistrationOpen);
  const closedChapters = availableChapters.filter(chapter => !chapter.isRegistrationOpen);

  return (
    <div className={`
      min-h-screen transition-all duration-300
      ${isDark 
        ? 'bg-dark-bg' 
        : 'bg-gray-50'
      }
    `}>
      {/* Background decoration for dark mode */}
      {isDark && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-500/5 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        </div>
      )}
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className={`
            text-3xl font-bold mb-4 transition-all duration-300
            ${isDark 
              ? 'text-dark-text-primary bg-gradient-to-r from-accent-400 to-primary-400 bg-clip-text text-transparent' 
              : 'text-gray-900'
            }
          `}>
            Browse Chapters
          </h1>
          <p className={`
            text-lg max-w-2xl mx-auto transition-colors duration-300
            ${isDark ? 'text-dark-text-secondary' : 'text-gray-600'}
          `}>
            Discover and join chapters that match your interests and goals.
          </p>
        </div>

      {/* Search */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search chapters by name or chapter head..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Error Message */}
      {(error || contextError) && (
        <ErrorMessage 
          message={error || contextError || 'An error occurred'} 
          onDismiss={() => setError(null)} 
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
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
            <div className="p-3 bg-yellow-50 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">{pendingChapters.length}</p>
              <p className="text-sm text-gray-600">Pending Approval</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-50 rounded-lg">
              <UserPlus className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">{openChapters.length}</p>
              <p className="text-sm text-gray-600">Open for Registration</p>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mr-3" />
          <span className="text-gray-600">Loading chapters...</span>
        </div>
      )}

      {/* Chapters Content */}
      {!isLoading && (
        <>
          {/* My Registered Chapters */}
          {registeredChapters.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">My Chapters</h2>
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  {registeredChapters.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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

          {/* Pending Approval Chapters */}
          {pendingChapters.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Pending Approval</h2>
                <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                  {pendingChapters.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {pendingChapters.map((chapter) => (
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

          {/* Open Registration Chapters */}
          {openChapters.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Open for Registration</h2>
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {openChapters.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {openChapters.map((chapter) => (
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

          {/* Re-joinable Chapters (Left or Kicked) */}
          {reJoinableChapters.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Available to Re-join</h2>
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {reJoinableChapters.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {reJoinableChapters.map((chapter) => (
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

          {/* Rejected Applications */}
          {rejectedChapters.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Rejected Applications</h2>
                <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                  {rejectedChapters.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {rejectedChapters.map((chapter) => (
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

          {/* Closed Registration Chapters */}
          {closedChapters.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Registration Closed</h2>
                <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium">
                  {closedChapters.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {closedChapters.map((chapter) => (
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

          {/* Empty State */}
          {availableChapters.length === 0 && registeredChapters.length === 0 && pendingChapters.length === 0 && rejectedChapters.length === 0 && reJoinableChapters.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm ? 'No chapters found' : 'No chapters available'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm 
                  ? 'Try adjusting your search terms to find the chapters you\'re looking for.' 
                  : 'Chapters will appear here when they become available. Check back later!'
                }
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Clear Search
                </button>
              )}
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
};

export default ChaptersList;
