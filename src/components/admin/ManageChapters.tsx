import React, { useState } from 'react';
import { Users, Settings, Eye, Mail, Calendar, Tag } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import Modal from '../common/Modal';

const ManageChapters: React.FC = () => {
  const { chapters, updateChapterRegistration } = useData();
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const handleToggleRegistration = async (chapterId: string, currentStatus: boolean) => {
    setUpdating(chapterId);
    try {
      const success = await updateChapterRegistration(chapterId, !currentStatus);
      if (success) {
        // Success feedback could be added here
      } else {
        alert('Failed to update registration status');
      }
    } catch (error) {
      alert('An error occurred while updating');
    } finally {
      setUpdating(null);
    }
  };

  const selectedChapterData = chapters.find(c => c.id === selectedChapter);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Chapters</h1>
          <p className="text-gray-600">
            Control registration status and view chapter details.
          </p>
        </div>

        {/* Chapters List */}
        <div className="bg-white/80 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chapter
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Members
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registration Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {chapters.map((chapter) => (
                  <tr key={chapter.id} className="hover:bg-gray-50/50 transition-colors duration-200">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {chapter.imageUrl && (
                          <img
                            src={chapter.imageUrl}
                            alt={chapter.name}
                            className="h-10 w-10 rounded-lg object-cover mr-3"
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {chapter.name}
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {chapter.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {chapter.category}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1 text-gray-400" />
                        {chapter.memberCount}
                        {chapter.maxMembers && (
                          <span className="text-gray-500">/{chapter.maxMembers}</span>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        chapter.isRegistrationOpen
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {chapter.isRegistrationOpen ? 'Open' : 'Closed'}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedChapter(chapter.id);
                            setShowDetailsModal(true);
                          }}
                          className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => handleToggleRegistration(chapter.id, chapter.isRegistrationOpen)}
                          disabled={updating === chapter.id}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                            chapter.isRegistrationOpen
                              ? 'bg-red-100 text-red-800 hover:bg-red-200'
                              : 'bg-green-100 text-green-800 hover:bg-green-200'
                          } ${updating === chapter.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {updating === chapter.id
                            ? 'Updating...'
                            : chapter.isRegistrationOpen
                              ? 'Close Registration'
                              : 'Open Registration'
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Chapter Details Modal */}
        <Modal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedChapter(null);
          }}
          title="Chapter Details"
          size="lg"
        >
          {selectedChapterData && (
            <div className="space-y-6">
              {selectedChapterData.imageUrl && (
                <img
                  src={selectedChapterData.imageUrl}
                  alt={selectedChapterData.name}
                  className="w-full h-48 object-cover rounded-lg"
                />
              )}
              
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {selectedChapterData.name}
                </h3>
                <p className="text-gray-600 mb-4">
                  {selectedChapterData.description}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-700">
                    <Users className="h-4 w-4 mr-2 text-blue-600" />
                    <span>{selectedChapterData.memberCount} members</span>
                    {selectedChapterData.maxMembers && (
                      <span className="text-gray-500"> (max: {selectedChapterData.maxMembers})</span>
                    )}
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-700">
                    <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                    <span>{selectedChapterData.meetingSchedule}</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-700">
                    <Mail className="h-4 w-4 mr-2 text-blue-600" />
                    <span>{selectedChapterData.contactEmail}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Requirements</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {selectedChapterData.requirements.map((req, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-blue-600 mr-2">•</span>
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Benefits</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {selectedChapterData.benefits.map((benefit, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-green-600 mr-2">•</span>
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {selectedChapterData.tags.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedChapterData.tags.map((tag, index) => (
                      <span key={index} className="inline-flex items-center text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  Created: {new Date(selectedChapterData.createdAt).toLocaleDateString()}
                </div>
                <div className="text-sm text-gray-500">
                  Updated: {new Date(selectedChapterData.updatedAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};

export default ManageChapters;