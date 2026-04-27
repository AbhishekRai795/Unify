import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, User, Mail, AlertCircle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useChapterHead } from '../../contexts/ChapterHeadContext';
import { useAuth } from '../../contexts/AuthContext';
import { adminApi } from '../../services/adminApi';
import { paymentAPI } from '../../services/paymentApi';
import Loader from '../common/Loader';
import { useTheme } from '../../contexts/ThemeContext';

const EditChapter: React.FC = () => {
  const { chapterId } = useParams<{ chapterId: string }>();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { chapters, refreshData } = useChapterHead();
  const { user } = useAuth();
  
  console.log('EditChapter component loaded');
  console.log('Chapter ID from params:', chapterId);
  console.log('Available chapters:', chapters.map(c => c.chapterId));
  console.log('User role:', user?.activeRole, 'User groups:', user?.groups);
  
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
    headName: '',
    isPaid: false,
    registrationFee: 0,
    registrationOpen: true
  });

  // Check user permissions
  const canEditChapter = () => {
    if (!user) return false;
    
    // Admin can edit any chapter
    if (user.groups.includes('admin')) {
      return true;
    }
    
    // Chapter heads can only view but not actually change head assignments
    // (since they can't assign/remove their own role)
    if (user.groups.includes('chapter_head')) {
      // Check if this is their chapter
      const isTheirChapter = chapters.some(c => 
        c.chapterId === chapterId && c.headEmail === user.email
      );
      return isTheirChapter;
    }
    
    return false;
  };

  const isAdminUser = () => user?.groups.includes('admin') || false;

  // Load chapter data
  useEffect(() => {
    const loadChapterData = async () => {
      if (!chapterId) {
        setError('Chapter ID is missing');
        setLoading(false);
        return;
      }

      // Check permissions first
      if (!canEditChapter()) {
        setError('You do not have permission to edit this chapter');
        setLoading(false);
        return;
      }

      try {
        let chapterData;
        
        if (isAdminUser()) {
          // For admins: use listChapters which returns full data including headEmail/headName.
          // The old getChapter lambda only returns a legacy `chapterHead` field, not headEmail/headName.
          try {
            const listResult = await adminApi.listChapters({ limit: 200 });
            const allChapters = listResult.chapters || [];
            chapterData = allChapters.find((c: any) => c.chapterId === chapterId);
          } catch (listError) {
            console.warn('listChapters failed, falling back to getChapter:', listError);
          }

          // Fallback: try the old getChapter endpoint
          if (!chapterData) {
            console.log('Fetching chapter data directly from API for:', chapterId);
            chapterData = await adminApi.getChapter(chapterId);
          }
        } else {
          // For chapter heads: look in context first (their own chapters)
          if (chapters.length > 0) {
            chapterData = chapters.find(c => c.chapterId === chapterId);
          }
          if (!chapterData) {
            try {
              chapterData = await adminApi.getChapter(chapterId);
            } catch (apiError: any) {
              if (apiError.message?.includes('403') || apiError.message?.includes('Forbidden')) {
                setError('Chapter heads cannot modify chapter head assignments. Please contact an administrator.');
                setLoading(false);
                return;
              }
              throw apiError;
            }
          }
        }

        if (!chapterData) {
          setError('Chapter not found');
          setLoading(false);
          return;
        }
        
        setChapter(chapterData);
        setFormData({
          chapterName: chapterData.chapterName || '',
          headEmail: chapterData.headEmail || '',
          headName: chapterData.headName || '',
          isPaid: chapterData.isPaid || false,
          registrationFee: chapterData.registrationFee ? chapterData.registrationFee / 100 : 0,
          registrationOpen: chapterData.registrationOpen !== undefined ? chapterData.registrationOpen : true
        });
        setLoading(false);
      } catch (error: any) {
        console.error('Error fetching chapter:', error);
        setError(error.message || 'Chapter not found or failed to load');
        setLoading(false);
      }
    };

    loadChapterData();
  }, [chapterId, chapters, user]);

  const typeLabel = (chapter as any)?.type === 'club' ? 'Club' : 'Chapter';

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === 'registrationFee' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Only admins or the chapter head themselves can submit changes
    if (!canEditChapter()) {
      setNotification({
        type: 'error',
        message: `You do not have permission to modify this ${typeLabel.toLowerCase()}`
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    
    if (!formData.headEmail.trim()) {
      setNotification({
        type: 'error',
        message: `${typeLabel} head email is required`
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    if (!chapterId) {
      setNotification({
        type: 'error',
        message: `${typeLabel} ID is missing`
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Call the edit API (only works for admins)
      // Try using updateChapter directly instead of editChapterHead
      console.log('Trying updateChapter directly...');
      await adminApi.updateChapter(chapterId, {
        headEmail: isAdminUser() ? formData.headEmail.trim() : undefined,
        headName: isAdminUser() ? (formData.headName.trim() || undefined) : undefined,
        isPaid: isAdminUser() ? formData.isPaid : undefined,
        registrationFee: isAdminUser() ? (formData.isPaid ? formData.registrationFee * 100 : 0) : undefined,
        registrationOpen: formData.registrationOpen
      });

      setNotification({
        type: 'success',
        message: `${typeLabel} head updated successfully!`
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
      console.error(`Error updating ${typeLabel.toLowerCase()} head:`, error);
      const errorMsg = error?.error || error?.message || `Failed to update ${typeLabel.toLowerCase()} head`;
      setNotification({
        type: 'error',
        message: errorMsg
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
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-dark-bg' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'}`}>
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-dark-bg' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'}`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`backdrop-blur-md rounded-xl border p-8 max-w-md w-full mx-4 transition-colors duration-300 ${isDark ? 'bg-dark-surface/90 border-dark-border/70' : 'bg-white/80 border-white/20'}`}
        >
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className={`text-xl font-semibold mb-2 ${isDark ? 'text-dark-text-primary' : 'text-gray-900'}`}>Error</h2>
            <p className={`mb-6 ${isDark ? 'text-dark-text-secondary' : 'text-gray-600'}`}>{error}</p>
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
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-dark-bg' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'}`}>
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
            Back to {typeLabel === 'Club' ? 'Clubs' : 'Chapters'}
          </button>
          
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">
                {chapter?.chapterName?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className={`text-3xl font-bold ${isDark ? 'text-dark-text-primary' : 'text-gray-900'}`}>Edit Community Head</h1>
              <p className={isDark ? 'text-dark-text-secondary' : 'text-gray-600'}>{chapter?.chapterName}</p>
            </div>
          </div>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`backdrop-blur-md rounded-xl border overflow-hidden transition-colors duration-300 ${isDark ? 'bg-dark-surface/85 border-dark-border/70' : 'bg-white/80 border-white/20'}`}
        >
          <div className="p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Current Community Head</h2>
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
                  New Community Head Email *
                </label>
                <div className="relative">
                  <Mail className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="email"
                    id="headEmail"
                    required
                    disabled={!isAdminUser()}
                    value={formData.headEmail}
                    onChange={(e) => handleInputChange('headEmail', e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      !isAdminUser() ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                    placeholder={`Enter new ${typeLabel.toLowerCase()} head email`}
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {isAdminUser() 
                    ? `This email will be used to assign ${typeLabel.toLowerCase()} head role to the user`
                    : `Only administrators can modify ${typeLabel.toLowerCase()} head assignments`
                  }
                </p>
              </div>

              <div>
                <label htmlFor="headName" className="block text-sm font-medium text-gray-700 mb-2">
                  Community Head Name (Optional)
                </label>
                <div className="relative">
                  <User className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    id="headName"
                    disabled={!isAdminUser()}
                    value={formData.headName}
                    onChange={(e) => handleInputChange('headName', e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      !isAdminUser() ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                    placeholder={`Enter ${typeLabel.toLowerCase()} head full name`}
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Display name for the {typeLabel.toLowerCase()} head (can be updated later)
                </p>
              </div>

              {/* Payment Configuration Options */}
              {isAdminUser() && (
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Community Settings</h3>
                  
                  {/* Registration Toggle - Available to both Admin and Head */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="font-medium text-gray-700">Registration Open</p>
                      <p className="text-sm text-gray-500">Allow new students to join this {typeLabel.toLowerCase()}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.registrationOpen}
                        onChange={(e) => setFormData(prev => ({ ...prev, registrationOpen: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                  </div>

                  {isAdminUser() && (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="font-medium text-gray-700">Paid {typeLabel}</p>
                          <p className="text-sm text-gray-500">Require students to pay a fee to join</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.isPaid}
                            onChange={(e) => setFormData(prev => ({ ...prev, isPaid: e.target.checked }))}
                            className="sr-only peer"
                            disabled={!isAdminUser()}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      {formData.isPaid && (
                        <div className="mt-4">
                          <label htmlFor="registrationFee" className="block text-sm font-medium text-gray-700 mb-2">
                            Registration Fee (₹)
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">₹</span>
                            <input
                              type="number"
                              id="registrationFee"
                              min="0"
                              step="0.01"
                              disabled={!isAdminUser()}
                              value={formData.registrationFee}
                              onChange={(e) => handleInputChange('registrationFee', e.target.value)}
                              className={`w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                !isAdminUser() ? 'bg-gray-100 cursor-not-allowed' : ''
                              }`}
                              placeholder="e.g. 100"
                            />
                          </div>
                          <p className="text-sm text-gray-500 mt-1">Amount students must pay via Razorpay to join</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Warning Message - Different for admin vs chapter head */}
              {isAdminUser() ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
                    <div>
                      <h3 className="text-sm font-medium text-yellow-800">Important</h3>
                      <p className="text-sm text-yellow-700 mt-1">
                        Changing the {typeLabel.toLowerCase()} head will:
                      </p>
                      <ul className="text-sm text-yellow-700 mt-2 list-disc list-inside space-y-1">
                        <li>Remove the current head from the chapter_head role</li>
                        <li>Assign the chapter_head role to the new email address</li>
                        <li>Update the {typeLabel.toLowerCase()} information to point to the new head</li>
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                    <div>
                      <h3 className="text-sm font-medium text-blue-800">Community Head View</h3>
                      <p className="text-sm text-blue-700 mt-1">
                        You are viewing this {typeLabel.toLowerCase()}'s information as a community head. Only administrators can modify community head assignments.
                      </p>
                      <p className="text-sm text-blue-700 mt-2">
                        If you need to transfer your {typeLabel.toLowerCase()} head role to someone else, please contact an administrator.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                >
                  {canEditChapter() ? 'Cancel' : 'Back'}
                </button>
                {canEditChapter() && (
                    <button
                      type="submit"
                      disabled={saving || (isAdminUser() && !formData.headEmail.trim())}
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
                )}
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default EditChapter;