// ChapterCardWithPayment.tsx
// Enhanced chapter card component that displays fee information
import React, { useEffect, useState } from 'react';

interface ChapterCardWithPaymentProps {
  chapterId: string;
  chapterName: string;
  headName?: string;
  memberCount?: number;
  status?: string;
  onJoinClick: (chapterId: string, isPaid: boolean) => void;
  isRegistered?: boolean;
}

export const ChapterCardWithPayment: React.FC<ChapterCardWithPaymentProps> = ({
  chapterId,
  chapterName,
  headName,
  memberCount = 0,
  status = 'active',
  onJoinClick,
  isRegistered = false
}) => {
  const [feeInfo, setFeeInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchChapterFees();
  }, [chapterId]);

  const fetchChapterFees = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/chapters/${chapterId}/fees`);
      const data = await response.json();

      if (response.ok) {
        setFeeInfo(data.feeInfo);
      } else {
        console.warn('Failed to fetch fees:', data.error);
        // Default to free if can't fetch
        setFeeInfo({ isPaid: false, displayFee: 'Free' });
      }
    } catch (err) {
      console.error('Error fetching chapter fees:', err);
      setFeeInfo({ isPaid: false, displayFee: 'Free' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = () => {
    return status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  const getFeeColor = () => {
    if (!feeInfo?.isPaid) return 'text-green-600';
    return 'text-blue-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-5 border border-gray-200">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-800 mb-1">{chapterName}</h3>
          {headName && (
            <p className="text-sm text-gray-600 mb-2">Head: {headName}</p>
          )}
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor()}`}>
          {status}
        </span>
      </div>

      <div className="flex items-center justify-between mb-4 py-3 border-y border-gray-200">
        <div className="flex items-center text-gray-700">
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
          </svg>
          <span className="text-sm">{memberCount} members</span>
        </div>

        {loading ? (
          <div className="text-gray-500 text-sm">Loading...</div>
        ) : (
          <div className={`text-lg font-bold ${getFeeColor()}`}>
            {feeInfo?.displayFee || 'Free'}
          </div>
        )}
      </div>

      {feeInfo?.isPaid && (
        <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2 mb-4">
          <p className="text-xs text-blue-800">
            <span className="font-semibold">Registration Required:</span> This is a paid chapter. A registration fee of {feeInfo.displayFee} applies.
          </p>
        </div>
      )}

      {!isRegistered && (
        <button
          onClick={() => onJoinClick(chapterId, feeInfo?.isPaid || false)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition duration-200"
        >
          {feeInfo?.isPaid ? 'Join (Pay)' : 'Join Chapter'}
        </button>
      )}

      {isRegistered && (
        <div className="w-full bg-green-100 text-green-800 font-semibold py-2 px-4 rounded text-center">
          ✓ Registered
        </div>
      )}
    </div>
  );
};

export default ChapterCardWithPayment;
