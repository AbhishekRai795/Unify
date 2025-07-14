import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Clock, Mail, Tag, CheckCircle, XCircle } from 'lucide-react';
import { Chapter } from '../../types/chapter';
import Modal from '../common/Modal';

interface ChapterCardProps {
  chapter: Chapter;
}

const ChapterCard: React.FC<ChapterCardProps> = ({ chapter }) => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

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
              src={chapter.imageUrl}
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
    </>
  );
};

export default ChapterCard;