import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Clock, Mail, Tag, CheckCircle, XCircle, Sparkles } from 'lucide-react';
import { Chapter, ChapterProfile } from '../../types/chapter';
import Modal from '../common/Modal';
import { studentAPI } from '../../services/api';
import { encodeS3Url } from '../../utils/s3Utils';

interface ChapterCardProps {
  chapter: Chapter;
}

const ChapterCard: React.FC<ChapterCardProps> = ({ chapter }) => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profile, setProfile] = useState<ChapterProfile | null>(null);
  const [isProfileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const openProfile = async () => {
    setShowProfileModal(true);
    setProfileError(null);

    if (profile) return; // already loaded

    try {
      setProfileLoading(true);
      const result = await studentAPI.getChapterProfile(chapter.id);
      setProfile(result.profile || null);
    } catch (err: any) {
      console.error('Failed to load chapter profile:', err);
      setProfileError(err?.message || 'Unable to load chapter information.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleRegister = () => {
    if (!chapter.isRegistrationOpen) {
      setShowModal(true);
      return;
    }

    // Navigate to the registration page
    navigate(`/student/chapters/${chapter.id}/register`);
  };

  return (
    <>
      <div className="bg-white/80 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden hover:shadow-lg transition-all duration-200 group">
        {chapter.imageUrl && (
          <div className="relative overflow-hidden">
            <img
              src={encodeS3Url(chapter.imageUrl)}
              alt={chapter.name}
              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute top-4 right-4">
              {chapter.isRegistrationOpen ? (
                <span className="flex items-center space-x-1 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                  <CheckCircle className="h-3 w-3" />
                  <span>Open</span>
                </span>
              ) : (
                <span className="flex items-center space-x-1 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                  <XCircle className="h-3 w-3" />
                  <span>Closed</span>
                </span>
              )}
            </div>
          </div>
        )}

        <div className="p-6">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
              {chapter.name}
            </h3>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              {chapter.category}
            </span>
          </div>

          <p className="text-gray-600 text-sm mb-4 line-clamp-3">
            {chapter.description}
          </p>

          <div className="space-y-2 mb-4">
            <div className="flex items-center text-sm text-gray-600">
              <Users className="h-4 w-4 mr-2" />
              <span>{chapter.memberCount} members</span>
              {chapter.maxMembers && (
                <span className="text-gray-400">/ {chapter.maxMembers}</span>
              )}
            </div>
            
            <div className="flex items-center text-sm text-gray-600">
              <Clock className="h-4 w-4 mr-2" />
              <span>{chapter.meetingSchedule}</span>
            </div>
            
            <div className="flex items-center text-sm text-gray-600">
              <Mail className="h-4 w-4 mr-2" />
              <span>{chapter.contactEmail}</span>
            </div>
          </div>

          {chapter.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {chapter.tags.slice(0, 3).map((tag, index) => (
                <span key={index} className="inline-flex items-center text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                </span>
              ))}
              {chapter.tags.length > 3 && (
                <span className="text-xs text-gray-500 px-2 py-1">
                  +{chapter.tags.length - 3} more
                </span>
              )}
            </div>
          )}

          <button
            onClick={handleRegister}
            className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
              chapter.isRegistrationOpen
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 hover:shadow-md'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            {chapter.isRegistrationOpen ? 'Register Now' : 'Registration Closed'}
          </button>

          <button
            onClick={openProfile}
            className="mt-3 w-full py-2.5 px-4 rounded-xl border border-blue-200 text-blue-700 bg-blue-50/80 hover:bg-blue-100 transition-all duration-300 flex items-center justify-center gap-2 font-semibold shadow-sm"
          >
            <Sparkles className="h-4 w-4 text-blue-600" />
            Explore
          </button>
        </div>
      </div>

      {/* Registration Closed Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Registration Closed"
      >
        <div className="text-center py-4">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Registration Not Available
          </h3>
          <p className="text-gray-600 mb-4">
            Registration for <strong>{chapter.name}</strong> is currently closed. 
            Please check back later or contact the chapter admin for more information.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-700">
              <strong>Contact:</strong> {chapter.contactEmail}
            </p>
            <p className="text-sm text-gray-700">
              <strong>Admin:</strong> {chapter.adminName}
            </p>
          </div>
          <button
            onClick={() => setShowModal(false)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Got it
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        title={`About ${chapter.name}`}
        size="lg"
      >
        <div className="space-y-4">
          {isProfileLoading ? (
            <div className="text-center py-8">Loading chapter data...</div>
          ) : profileError ? (
            <div className="text-center text-red-600 py-6">{profileError}</div>
          ) : profile ? (
            <div className="space-y-3">
              {profile.posterImageUrl && (
                <img src={encodeS3Url(profile.posterImageUrl)} alt={`${chapter.name} poster`} className="w-full h-56 object-cover rounded-lg" />
              )}
              <h3 className="text-lg font-semibold">About</h3>
              <p className="text-sm text-gray-700 whitespace-pre-line">{profile.about || chapter.description || 'No additional details yet.'}</p>

              {(profile.mission || profile.vision) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profile.mission && (<div><h4 className="font-semibold">Mission</h4><p className="text-sm text-gray-700">{profile.mission}</p></div>)}
                  {profile.vision && (<div><h4 className="font-semibold">Vision</h4><p className="text-sm text-gray-700">{profile.vision}</p></div>)}
                </div>
              )}

              {profile.highlights && profile.highlights.length > 0 && (
                <div>
                  <h4 className="font-semibold">Highlights</h4>
                  <ul className="list-disc ml-5 text-sm text-gray-700">
                    {profile.highlights.map((item, idx) => (<li key={idx}>{item}</li>))}
                  </ul>
                </div>
              )}

              {profile.achievements && profile.achievements.length > 0 && (
                <div>
                  <h4 className="font-semibold">Achievements</h4>
                  <ul className="list-disc ml-5 text-sm text-gray-700">
                    {profile.achievements.map((item, idx) => (<li key={idx}>{item}</li>))}
                  </ul>
                </div>
              )}

              {profile.galleryImageUrls && profile.galleryImageUrls.length > 0 && (
                <div>
                  <h4 className="font-semibold">Gallery</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {profile.galleryImageUrls.map((url, idx) => (
                      <img key={idx} src={encodeS3Url(url)} alt={`Gallery ${idx + 1}`} className="h-24 w-full object-cover rounded" />
                    ))}
                  </div>
                </div>
              )}

              {profile.contact && (
                <div className="text-sm text-gray-700">
                  <strong>Contact:</strong> {profile.contact}
                </div>
              )}

              {profile.socialLinks && Object.keys(profile.socialLinks).length > 0 && (
                <div className="text-sm text-gray-700">
                  <strong>Links:</strong> {Object.entries(profile.socialLinks).map(([key, val]) => (
                    <div key={key}><a href={val} className="text-blue-600 hover:underline" target="_blank" rel="noreferrer">{key}</a></div>
                  ))}
                </div>
              )}

              <div className="text-xs text-gray-500">Last updated: {profile.updatedAt || 'N/A'}</div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-6">No chapter profile has been configured yet.</div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default ChapterCard;