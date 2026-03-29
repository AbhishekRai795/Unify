// CreateChapterWithPayment.tsx
// Admin component to create chapters with payment configuration
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../services/adminApi';
import { paymentAPI } from '../../services/paymentApi';

interface CreateChapterFormData {
  chapterName: string;
  headEmail: string;
  headName: string;
  isPaid: boolean;
  registrationFee: number;
}

export const CreateChapterWithPayment: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState<CreateChapterFormData>({
    chapterName: '',
    headEmail: '',
    headName: '',
    isPaid: false,
    registrationFee: 0
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else if (name === 'registrationFee') {
      // Handle number input separately to avoid parsing issues
      const numValue = value === '' ? 0 : parseFloat(value) || 0;
      setFormData(prev => ({
        ...prev,
        registrationFee: numValue >= 0 ? numValue : 0
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validation
    if (!formData.chapterName.trim()) {
      setError('Chapter name is required');
      return;
    }

    if (formData.isPaid && formData.registrationFee <= 0) {
      setError('Please enter a valid registration fee for paid chapters');
      return;
    }

    try {
      setLoading(true);

      if (formData.isPaid) {
        // PAID chapter: call the new payment Lambda which creates both the Chapter
        // record AND the ChapterPayments CONFIG record atomically in DynamoDB.
        const result = await paymentAPI.createChapterWithPayment({
          chapterName: formData.chapterName.trim(),
          headEmail: formData.headEmail.trim() || undefined,
          headName: formData.headName.trim() || undefined,
          isPaid: true,
          registrationFee: Math.round(formData.registrationFee * 100) // Convert ₹ to paise
        });
        console.log('✅ Paid chapter created:', result);
      } else {
        // FREE chapter: use the existing adminApi (unchanged)
        const chapterData = {
          chapterName: formData.chapterName.trim(),
          headEmail: formData.headEmail.trim() || undefined,
          headName: formData.headName.trim() || undefined
        };
        const result = await adminApi.createChapter(chapterData);
        console.log('✅ Free chapter created:', result);
      }

      setSuccess(true);
      setFormData({
        chapterName: '',
        headEmail: '',
        headName: '',
        isPaid: false,
        registrationFee: 0
      });

      // Show success message and redirect after 2 seconds
      setTimeout(() => {
        navigate('/admin/dashboard');
      }, 2000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create chapter';
      setError(errorMsg);
      console.error('Chapter creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Create New Chapter</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
            Chapter created successfully! Redirecting...
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        {/* Chapter Name */}
        <div>
          <label htmlFor="chapterName" className="block text-sm font-medium text-gray-700 mb-2">
            Chapter Name *
          </label>
          <input
            type="text"
            id="chapterName"
            name="chapterName"
            value={formData.chapterName}
            onChange={handleInputChange}
            disabled={loading}
            placeholder="e.g., AI & Machine Learning Club"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            required
          />
        </div>

        {/* Head Name */}
        <div>
          <label htmlFor="headName" className="block text-sm font-medium text-gray-700 mb-2">
            Chapter Head Name
          </label>
          <input
            type="text"
            id="headName"
            name="headName"
            value={formData.headName}
            onChange={handleInputChange}
            disabled={loading}
            placeholder="e.g., Dr. John Doe"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          />
        </div>

        {/* Head Email */}
        <div>
          <label htmlFor="headEmail" className="block text-sm font-medium text-gray-700 mb-2">
            Chapter Head Email
          </label>
          <input
            type="email"
            id="headEmail"
            name="headEmail"
            value={formData.headEmail}
            onChange={handleInputChange}
            disabled={loading}
            placeholder="e.g., head@university.edu"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          />
        </div>

        {/* Payment Configuration */}
        <div className="bg-gray-50 rounded-lg p-5 border-2 border-gray-200">
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="isPaid"
              name="isPaid"
              checked={formData.isPaid}
              onChange={handleInputChange}
              disabled={loading}
              className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300 cursor-pointer"
            />
            <label htmlFor="isPaid" className="ml-3 text-lg font-semibold text-gray-700 cursor-pointer">
              This is a Paid Chapter
            </label>
          </div>

          {formData.isPaid && (
            <div className="mt-4 pl-8 space-y-2">
              <label htmlFor="registrationFee" className="block text-sm font-medium text-gray-700">
                Registration Fee (₹) *
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xl font-semibold text-gray-600">₹</span>
                <input
                  type="number"
                  id="registrationFee"
                  name="registrationFee"
                  value={formData.registrationFee || ''}
                  onChange={handleInputChange}
                  disabled={loading}
                  placeholder="500"
                  min="0"
                  step="1"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 text-gray-900"
                />
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Amount will be charged to students who register for this chapter.
              </p>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Summary</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>
              <strong>Chapter:</strong> {formData.chapterName || 'Not entered'}
            </li>
            {formData.headName && (
              <li>
                <strong>Head:</strong> {formData.headName}
              </li>
            )}
            <li>
              <strong>Type:</strong> {formData.isPaid ? 'Paid' : 'Free'}
            </li>
            {formData.isPaid && formData.registrationFee > 0 && (
              <li>
                <strong>Registration Fee:</strong> ₹{formData.registrationFee.toFixed(2)}
              </li>
            )}
          </ul>
        </div>

        {/* Buttons */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition duration-200 flex items-center justify-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </>
            ) : (
              'Create Chapter'
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/chapters')}
            disabled={loading}
            className="flex-1 bg-gray-300 hover:bg-gray-400 disabled:opacity-50 text-gray-800 font-bold py-3 px-6 rounded-lg transition duration-200"
          >
            Cancel
          </button>
        </div>
        </form>
      </div>
    </div>
  );
};

export default CreateChapterWithPayment;
