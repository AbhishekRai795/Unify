// src/pages/AdminPortal.tsx
import React, { useEffect, useState } from 'react';
import { adminApi } from '../services/adminApi';
import { useAuth } from '../contexts/AuthContext';

interface Chapter {
  chapterId: string;
  chapterName: string;
  headEmail?: string | null;
  headName?: string | null;
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
  status: string;
}

const AdminPortal: React.FC = () => {
  const { user } = useAuth();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showCreateForm, setShowCreateForm] = useState(false);

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
    if (!window.confirm('Are you sure you want to archive this chapter?')) {
      return;
    }
    
    try {
      await adminApi.deleteChapter(chapterId);
      await loadChapters(); // Refresh the list
    } catch (e: any) {
      setError(e?.error || e?.message || 'Delete failed');
    }
  };

  if (!user?.groups.includes('admin')) {
    return (
      <div className="p-6">
        <div className="text-red-600">Access denied: Admin privileges required</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Portal</h1>
        <button 
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Create Chapter
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {showCreateForm && (
        <CreateChapterForm 
          onSuccess={() => {
            setShowCreateForm(false);
            loadChapters();
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="text-gray-600">Loading chapters...</div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase">
                  Chapter Name
                </th>
                <th className="px-6 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase">
                  Chapter Head
                </th>
                <th className="px-6 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase">
                  Members
                </th>
                <th className="px-6 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase">
                  Created Date
                </th>
                <th className="px-6 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {chapters.map((chapter) => (
                <tr key={chapter.chapterId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 border-b">{chapter.chapterName}</td>
                  <td className="px-6 py-4 border-b">
                    {chapter.headName && <div className="font-medium">{chapter.headName}</div>}
                    {chapter.headEmail && <div className="text-sm text-gray-600">{chapter.headEmail}</div>}
                    {!chapter.headName && !chapter.headEmail && <span className="text-gray-400">No head assigned</span>}
                  </td>
                  <td className="px-6 py-4 border-b">{chapter.memberCount ?? 0}</td>
                  <td className="px-6 py-4 border-b">
                    {new Date(chapter.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 border-b">
                    <div className="flex space-x-2">
                      <button 
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        onClick={() => {/* TODO: Add edit functionality */}}
                      >
                        Edit
                      </button>
                      <button 
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                        onClick={() => handleDeleteChapter(chapter.chapterId)}
                      >
                        Archive
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {chapters.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No chapters found. Create your first chapter to get started.
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

// Create Chapter Form Component
const CreateChapterForm: React.FC<{
  onSuccess: () => void;
  onCancel: () => void;
}> = ({ onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    chapterName: '',
    headEmail: '',
    headName: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.chapterName.trim()) {
      setError('Chapter name is required');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      
      await adminApi.createChapter({
        chapterName: formData.chapterName.trim(),
        headEmail: formData.headEmail.trim() || undefined,
        headName: formData.headName.trim() || undefined
      });
      
      onSuccess();
    } catch (e: any) {
      setError(e?.error || e?.message || 'Failed to create chapter');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 border border-gray-200 rounded-lg mb-6">
      <h2 className="text-lg font-semibold mb-4">Create New Chapter</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chapter Name *
            </label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.chapterName}
              onChange={(e) => setFormData(prev => ({ ...prev, chapterName: e.target.value }))}
              placeholder="Enter chapter name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Head Email (optional)
            </label>
            <input
              type="email"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.headEmail}
              onChange={(e) => setFormData(prev => ({ ...prev, headEmail: e.target.value }))}
              placeholder="head@example.com"
            />
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Head Name (optional)
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.headName}
            onChange={(e) => setFormData(prev => ({ ...prev, headName: e.target.value }))}
            placeholder="Enter head's full name"
          />
        </div>
        
        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Chapter'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminPortal;
