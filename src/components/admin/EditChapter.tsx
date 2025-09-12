import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, User, Mail, AlertCircle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useChapterHead } from '../../contexts/ChapterHeadContext';
import { adminApi } from '../../services/adminApi';
import Loader from '../common/Loader';

const EditChapter: React.FC = () => {
  const { chapterId } = useParams<{ chapterId: string }>();
  const navigate = useNavigate();
  const { chapters, refreshData } = useChapterHead();
  
  console.log('EditChapter component loaded');
  console.log('Chapter ID from params:', chapterId);
  console.log('Available chapters:', chapters.map(c => c.chapterId));
  
  const [chapter, setChapter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  
  const [formData, setFormData] = useState({
    chapterName: '',
    headEmail: '',
    headName: ''
  });

  // Load chapter data
  useEffect(() => {
    const loadChapterData = async () => {
      if (!chapterId) {
        setError('Chapter ID is missing');
        setLoading(false);
        return;
      }

      // First try to find in chapters array from context
      if (chapters.length > 0) {
        const foundChapter = chapters.find(c => c.chapterId === chapterId);
        if (foundChapter) {
          setChapter(foundChapter);
          setFormData({
            chapterName: foundChapter.chapterName || '',
            headEmail: foundChapter.headEmail || '',
            headName: foundChapter.headName || ''
          });
          setLoading(false);
          return;
        }
      }

      // If not found in context or context is empty, fetch directly from API
      try {
        console.log('Fetching chapter data directly from API for:', chapterId);
        const chapterData = await adminApi.getChapter(chapterId);
        setChapter(chapterData);
        setFormData({
          chapterName: chapterData.chapterName || '',
          headEmail: chapterData.headEmail || '',
          headName: chapterData.headName || ''
        });
        setLoading(false);
      } catch (error: any) {
        console.error('Error fetching chapter:', error);
        setError('Chapter not found or failed to load');
        setLoading(false);
      }
    };

    loadChapterData();
  }, [chapterId, chapters]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.headEmail.trim()) {
      setNotification({
        type: 'error',
        message: 'Chapter head email is required'
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    if (!chapterId) {
      setNotification({
        type: 'error',
        message: 'Chapter ID is missing'
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Call the edit API
      await adminApi.editChapterHead({
        email: formData.headEmail.trim(),
        chapterId: chapterId,
        headName: formData.headName.trim() || undefined
      });

      setNotification({
        type: 'success',
        message: 'Chapter head updated successfully!'
      });

      // Refresh data and navigate back after a short delay
      await refreshData();
      
      setTimeout(() => {
        // Navigate back to appropriate portal based on current path
        const currentPath = window.location.pathname;
        if (currentPath.includes('/admin/')) {
          navigate('/admin/dashboard');
        } else {
          navigate('/head/chapters');
        }
      }, 2000);

    } catch (error: any) {
      console.error('Error updating chapter head:', error);
      setNotification({
        type: 'error',
        message: error.message || 'Failed to update chapter head'
      });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Navigate back to appropriate portal based on current path
    const currentPath = window.location.pathname;
    if (currentPath.includes('/admin/')) {
      navigate('/admin/dashboard');
    } else {
      navigate('/head/chapters');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-md rounded-xl border border-white/20 p-8 max-w-md w-full mx-4"
        >
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={handleCancel}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              Go Back
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Notification */}
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`mb-6 p-4 rounded-lg flex items-center ${
              notification.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle className="h-5 w-5 mr-2" />
            ) : (
              <AlertCircle className="h-5 w-5 mr-2" />
            )}
            {notification.message}
          </motion.div>
        )}

        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={handleCancel}
            className="flex items-center text-blue-600 hover:text-blue-700 mb-4 transition-colors duration-200"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Chapters
          </button>
          
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">
                {chapter?.chapterName?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Edit Chapter Head</h1>
              <p className="text-gray-600">{chapter?.chapterName}</p>
            </div>
          </div>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden"
        >
          <div className="p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Current Chapter Head</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {chapter?.headName || 'Not assigned'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {chapter?.headEmail || 'No email'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="headEmail" className="block text-sm font-medium text-gray-700 mb-2">
                  New Chapter Head Email *
                </label>
                <div className="relative">
                  <Mail className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="email"
                    id="headEmail"
                    required
                    value={formData.headEmail}
                    onChange={(e) => handleInputChange('headEmail', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter new chapter head email"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  This email will be used to assign chapter head role to the user
                </p>
              </div>

              <div>
                <label htmlFor="headName" className="block text-sm font-medium text-gray-700 mb-2">
                  Chapter Head Name (Optional)
                </label>
                <div className="relative">
                  <User className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    id="headName"
                    value={formData.headName}
                    onChange={(e) => handleInputChange('headName', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter chapter head full name"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Display name for the chapter head (can be updated later)
                </p>
              </div>

              {/* Warning Message */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
                  <div>
                    <h3 className="text-sm font-medium text-yellow-800">Important</h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      Changing the chapter head will:
                    </p>
                    <ul className="text-sm text-yellow-700 mt-2 list-disc list-inside space-y-1">
                      <li>Remove the current head from the chapter_head role</li>
                      <li>Assign the chapter_head role to the new email address</li>
                      <li>Update the chapter information to point to the new head</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !formData.headEmail.trim()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default EditChapter;