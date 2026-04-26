import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { adminApi } from '../services/adminApi';
import { useAuth } from '../contexts/AuthContext';
import EditChapter from '../components/admin/EditChapter';
import CreateChapterWithPayment from '../components/admin/CreateChapterWithPayment';
import PaymentStatsPage from './PaymentStatsPage';
import { ChapterHeadProvider } from '../contexts/ChapterHeadContext';

interface Chapter {
  chapterId: string;
  chapterName: string;
  headEmail?: string | null;
  headName?: string | null;
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
  status: string;
  type?: 'chapter' | 'club';
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'chapter' | 'club'>('chapter');

  // Check if user has admin access
  useEffect(() => {
    if (user && !user.groups.includes('admin')) {
      setError('Access denied: Admin privileges required');
      return;
    }
  }, [user]);

  const loadChapters = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await adminApi.listChapters();
      setChapters(data.chapters || []);
    } catch (e: any) {
      setError(e?.error || e?.message || 'Failed to load chapters');
      console.error('Error loading chapters:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.groups.includes('admin')) {
      loadChapters();
    }
  }, [user]);

  const handleDeleteChapter = async (chapterId: string) => {
    const typeLabel = activeTab === 'club' ? 'club' : 'chapter';
    if (!window.confirm(`Are you sure you want to permanently DELETE this ${typeLabel} and its head assignment? This action cannot be undone.`)) {
      return;
    }
    
    try {
      await adminApi.deleteChapter(chapterId);
      await loadChapters(); // Refresh the list
    } catch (e: any) {
      setError(e?.error || e?.message || 'Delete failed');
    }
  };

  const handleEditChapter = (chapter: Chapter) => {
    navigate(`/admin/chapters/edit/${chapter.chapterId}`);
  };

  const handleOpenPaymentTransparency = (chapter: Chapter) => {
    navigate(`/admin/chapter/${chapter.chapterId}/stats`);
  };

  const filteredItems = chapters.filter(c => {
    // If type is missing, treat as chapter
    const itemType = (c as any).type || 'chapter';
    return itemType === activeTab;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Admin Portal</h1>
        <button 
          onClick={() => navigate(`/admin/chapters/create-with-payment?type=${activeTab}`)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-md transition-all w-full sm:w-auto"
        >
          Create {activeTab === 'chapter' ? 'Chapter' : 'Club'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-xl w-full sm:w-fit">
        <button
          onClick={() => setActiveTab('chapter')}
          className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'chapter' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Chapters
        </button>
        <button
          onClick={() => setActiveTab('club')}
          className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'club' 
              ? 'bg-white text-indigo-600 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Clubs
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-gray-100">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {activeTab === 'chapter' ? 'Chapter' : 'Club'} Name
                </th>
                <th className="hidden md:table-cell px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {activeTab === 'chapter' ? 'Chapter' : 'Club'} Head
                </th>
                <th className="hidden lg:table-cell px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Members
                </th>
                <th className="hidden lg:table-cell px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Created Date
                </th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredItems.map((item) => (
                <tr key={item.chapterId} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 sm:px-6 py-4 font-semibold text-gray-900">
                    {item.chapterName}
                    <div className="md:hidden text-sm text-gray-500 font-normal">
                      {item.headName || item.headEmail || 'No head'}
                    </div>
                  </td>
                  <td className="hidden md:table-cell px-4 sm:px-6 py-4">
                    {item.headName && <div className="font-medium text-gray-800">{item.headName}</div>}
                    {item.headEmail && <div className="text-sm text-gray-500">{item.headEmail}</div>}
                    {!item.headName && !item.headEmail && <span className="text-gray-400 italic">No head assigned</span>}
                  </td>
                  <td className="hidden lg:table-cell px-4 sm:px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {item.memberCount ?? 0} members
                    </span>
                  </td>
                  <td className="hidden lg:table-cell px-4 sm:px-6 py-4 text-sm text-gray-500">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 sm:px-6 py-4">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button 
                        className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors text-center"
                        onClick={() => handleEditChapter(item)}
                      >
                        Edit
                      </button>
                      <button 
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-colors text-center"
                        onClick={() => handleOpenPaymentTransparency(item)}
                      >
                        Stats
                      </button>
                      <button 
                        className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors text-center"
                        onClick={() => handleDeleteChapter(item.chapterId)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <div className="bg-gray-100 p-4 rounded-full mb-4">
                        <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <p className="text-lg font-medium text-gray-900">No {activeTab}s found</p>
                      <p className="text-sm text-gray-500 mt-1">Create your first {activeTab} to get started.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};



// Main AdminPortal component with routing
const AdminPortal: React.FC = () => {
  return (
    <ChapterHeadProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/dashboard" element={<AdminDashboard />} />
        <Route path="/chapters/edit/:chapterId" element={<EditChapter />} />
        <Route path="/chapters/create-with-payment" element={<CreateChapterWithPayment />} />
        <Route path="/chapter/:chapterId/stats" element={<PaymentStatsPage />} />
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </ChapterHeadProvider>
  );
};

export default AdminPortal;
