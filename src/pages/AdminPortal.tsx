// src/pages/AdminPortal.tsx
import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { adminApi } from '../services/adminApi';
import { paymentAPI } from '../services/paymentApi';
import { useAuth } from '../contexts/AuthContext';
import EditChapter from '../components/admin/EditChapter';
import CreateChapterWithPayment from '../components/admin/CreateChapterWithPayment';
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
}

interface TransparencyData {
  chapter: {
    chapterId: string;
    chapterName: string;
    headName?: string;
    headEmail?: string;
  };
  overallStats: {
    chapterMembersCountFromChapterTable: number;
    chapterEnrolledMembersCountFromRegistrations: number;
    uniqueStudentsWithEventRegistrations: number;
    totalEvents: number;
    totalPaidEvents: number;
    totalEventRegistrationRows: number;
    totalCompletedPayments: number;
    totalPendingPayments: number;
    totalFailedPayments: number;
    totalRevenueInRupees: number;
  };
  eventStats: Array<{
    eventId: string;
    title: string;
    isPaid: boolean;
    registrationFee: number;
    enrolledCount: number;
    completedPaidCount: number;
    pendingCount: number;
    failedCount: number;
    revenueInRupees: number;
  }>;
  enrolledMembers: Array<{
    userId: string;
    studentName: string;
    studentEmail: string;
    sapId?: number;
    year?: number;
    approvedAt?: string;
  }>;
  paymentRecords: Array<{
    eventId: string;
    eventTitle: string;
    userId: string;
    studentName: string;
    studentEmail: string;
    sapId?: number;
    year?: number;
    paymentStatus: string;
    amountInRupees: number;
    transactionId?: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    createdAt?: string;
    completedAt?: string;
  }>;
  razorpayInsights?: {
    available: boolean;
    sampledPayments: number;
    methodBreakdown?: Record<string, number>;
    statusBreakdown?: Record<string, number>;
    notes?: string;
  };
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showTransparencyModal, setShowTransparencyModal] = useState(false);
  const [selectedChapterForTransparency, setSelectedChapterForTransparency] = useState<Chapter | null>(null);
  const [transparencyLoading, setTransparencyLoading] = useState(false);
  const [transparencyError, setTransparencyError] = useState('');
  const [transparencyData, setTransparencyData] = useState<TransparencyData | null>(null);
  const [eventFilter, setEventFilter] = useState<string>('all');

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
      
      // Test listChapterHeads to compare with updateChapter
      console.log('=== Testing listChapterHeads for comparison ===');
      try {
        const headsData = await adminApi.listChapterHeads();
        console.log('ListChapterHeads works! Data:', headsData);
      } catch (headError) {
        console.error('ListChapterHeads failed:', headError);
      }
      
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

  const handleEditChapter = (chapter: Chapter) => {
    console.log('Edit button clicked for chapter:', chapter.chapterId);
    navigate(`/admin/chapters/edit/${chapter.chapterId}`);
  };

  const handleOpenPaymentTransparency = async (chapter: Chapter) => {
    setSelectedChapterForTransparency(chapter);
    setShowTransparencyModal(true);
    setTransparencyLoading(true);
    setTransparencyError('');
    setTransparencyData(null);
    setEventFilter('all');

    try {
      const data = await paymentAPI.getAdminPaymentTransparency(chapter.chapterId, true);
      setTransparencyData(data);
    } catch (e: any) {
      setTransparencyError(e?.error || e?.message || 'Failed to load payment transparency data');
    } finally {
      setTransparencyLoading(false);
    }
  };

  const closeTransparencyModal = () => {
    setShowTransparencyModal(false);
    setSelectedChapterForTransparency(null);
    setTransparencyData(null);
    setTransparencyError('');
    setEventFilter('all');
  };

  const escapeCsv = (value: unknown) => {
    const str = String(value ?? '');
    if (str.includes('"') || str.includes(',') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const downloadCsv = (filename: string, rows: Array<Array<unknown>>) => {
    const csv = rows.map((row) => row.map((cell) => escapeCsv(cell)).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!user?.groups.includes('admin')) {
    return (
      <div className="p-6">
        <div className="text-red-600">Access denied: Admin privileges required</div>
      </div>
    );
  }

  const filteredPayments = transparencyData?.paymentRecords.filter((row) =>
    eventFilter === 'all' ? true : row.eventId === eventFilter
  ) || [];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Portal</h1>
        <button 
          onClick={() => navigate('/admin/chapters/create-with-payment')}
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
                        onClick={() => handleEditChapter(chapter)}
                      >
                        Edit
                      </button>
                      <button 
                        className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
                        onClick={() => handleOpenPaymentTransparency(chapter)}
                      >
                        Payment Stats
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

      {showTransparencyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={closeTransparencyModal} />
          <div className="relative bg-white w-full max-w-7xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Payment Statistics</h2>
                <p className="text-sm text-gray-600">
                  {selectedChapterForTransparency?.chapterName} ({selectedChapterForTransparency?.chapterId})
                </p>
              </div>
              <button
                onClick={closeTransparencyModal}
                className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded"
              >
                Close
              </button>
            </div>

            <div className="p-4 space-y-5">
              {transparencyLoading && (
                <div className="text-center py-12 text-gray-600">Loading Payment Statistics </div>
              )}

              {transparencyError && (
                <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700">{transparencyError}</div>
              )}

              {!transparencyLoading && transparencyData && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="bg-blue-50 border border-blue-100 rounded p-3">
                      <p className="text-xs text-blue-700">Chapter Members</p>
                      <p className="text-xl font-bold text-blue-900">{transparencyData.overallStats.chapterMembersCountFromChapterTable}</p>
                    </div>
                    <div className="bg-purple-50 border border-purple-100 rounded p-3">
                      <p className="text-xs text-purple-700">Enrolled Members</p>
                      <p className="text-xl font-bold text-purple-900">{transparencyData.overallStats.chapterEnrolledMembersCountFromRegistrations}</p>
                    </div>
                    <div className="bg-green-50 border border-green-100 rounded p-3">
                      <p className="text-xs text-green-700">Completed Payments</p>
                      <p className="text-xl font-bold text-green-900">{transparencyData.overallStats.totalCompletedPayments}</p>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-100 rounded p-3">
                      <p className="text-xs text-yellow-700">Pending Payments</p>
                      <p className="text-xl font-bold text-yellow-900">{transparencyData.overallStats.totalPendingPayments}</p>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-100 rounded p-3">
                      <p className="text-xs text-emerald-700">Revenue</p>
                      <p className="text-xl font-bold text-emerald-900">₹{transparencyData.overallStats.totalRevenueInRupees.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 border rounded p-3">
                    <h3 className="font-semibold text-gray-900 mb-2">Razorpay Insights</h3>
                    <p className="text-sm text-gray-700 mb-2">{transparencyData.razorpayInsights?.notes || 'No Razorpay insights available.'}</p>
                    {transparencyData.razorpayInsights?.available && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="font-medium text-gray-900 mb-1">Method Breakdown</p>
                          <ul className="space-y-1">
                            {Object.entries(transparencyData.razorpayInsights.methodBreakdown || {}).map(([method, count]) => (
                              <li key={method} className="text-gray-700">{method}: {count}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 mb-1">Status Breakdown</p>
                          <ul className="space-y-1">
                            {Object.entries(transparencyData.razorpayInsights.statusBreakdown || {}).map(([status, count]) => (
                              <li key={status} className="text-gray-700">{status}: {count}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-white border rounded p-3">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                      <h3 className="font-semibold text-gray-900">Event-wise Stats</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => downloadCsv(
                            `event-payment-stats-${transparencyData.chapter.chapterId}-${new Date().toISOString().split('T')[0]}.csv`,
                            [
                              ['Event ID', 'Event Title', 'Is Paid', 'Fee', 'Enrolled', 'Completed', 'Pending', 'Failed', 'Revenue'],
                              ...transparencyData.eventStats.map((e) => [
                                e.eventId, e.title, e.isPaid ? 'YES' : 'NO', e.registrationFee,
                                e.enrolledCount, e.completedPaidCount, e.pendingCount, e.failedCount, e.revenueInRupees
                              ])
                            ]
                          )}
                          className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
                        >
                          Export Event CSV
                        </button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left">Event</th>
                            <th className="px-3 py-2 text-left">Type</th>
                            <th className="px-3 py-2 text-left">Enrolled</th>
                            <th className="px-3 py-2 text-left">Completed</th>
                            <th className="px-3 py-2 text-left">Pending</th>
                            <th className="px-3 py-2 text-left">Failed</th>
                            <th className="px-3 py-2 text-left">Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transparencyData.eventStats.map((evt) => (
                            <tr key={evt.eventId} className="border-t">
                              <td className="px-3 py-2">{evt.title}</td>
                              <td className="px-3 py-2">{evt.isPaid ? 'Paid' : 'Free'}</td>
                              <td className="px-3 py-2">{evt.enrolledCount}</td>
                              <td className="px-3 py-2">{evt.completedPaidCount}</td>
                              <td className="px-3 py-2">{evt.pendingCount}</td>
                              <td className="px-3 py-2">{evt.failedCount}</td>
                              <td className="px-3 py-2">₹{evt.revenueInRupees.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-white border rounded p-3">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                      <h3 className="font-semibold text-gray-900">Student Payment Details</h3>
                      <div className="flex flex-wrap gap-2">
                        <select
                          className="border rounded px-2 py-1 text-sm"
                          value={eventFilter}
                          onChange={(e) => setEventFilter(e.target.value)}
                        >
                          <option value="all">All Events</option>
                          {transparencyData.eventStats.map((evt) => (
                            <option key={evt.eventId} value={evt.eventId}>{evt.title}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => downloadCsv(
                            `student-payment-details-${transparencyData.chapter.chapterId}-${new Date().toISOString().split('T')[0]}.csv`,
                            [
                              ['Event ID', 'Event Title', 'User ID', 'Student Name', 'Email', 'SAP', 'Year', 'Payment Status', 'Amount (INR)', 'Transaction ID', 'Razorpay Order ID', 'Razorpay Payment ID', 'Created At', 'Completed At'],
                              ...filteredPayments.map((p) => [
                                p.eventId, p.eventTitle, p.userId, p.studentName, p.studentEmail, p.sapId ?? '', p.year ?? '',
                                p.paymentStatus, p.amountInRupees, p.transactionId ?? '', p.razorpayOrderId ?? '', p.razorpayPaymentId ?? '',
                                p.createdAt ?? '', p.completedAt ?? ''
                              ])
                            ]
                          )}
                          className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                        >
                          Export Payment CSV
                        </button>
                      </div>
                    </div>
                    <div className="overflow-x-auto max-h-[300px]">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left">Student</th>
                            <th className="px-3 py-2 text-left">Event</th>
                            <th className="px-3 py-2 text-left">Status</th>
                            <th className="px-3 py-2 text-left">Amount</th>
                            <th className="px-3 py-2 text-left">Razorpay Payment ID</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPayments.map((row, idx) => (
                            <tr key={`${row.eventId}-${row.userId}-${idx}`} className="border-t">
                              <td className="px-3 py-2">
                                <div className="font-medium">{row.studentName}</div>
                                <div className="text-xs text-gray-500">{row.studentEmail}</div>
                              </td>
                              <td className="px-3 py-2">{row.eventTitle}</td>
                              <td className="px-3 py-2">{row.paymentStatus}</td>
                              <td className="px-3 py-2">₹{Number(row.amountInRupees || 0).toFixed(2)}</td>
                              <td className="px-3 py-2 text-xs font-mono">{row.razorpayPaymentId || '-'}</td>
                            </tr>
                          ))}
                          {filteredPayments.length === 0 && (
                            <tr>
                              <td className="px-3 py-4 text-center text-gray-500" colSpan={5}>No payment rows for selected filter.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-white border rounded p-3">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">Currently Enrolled Chapter Members</h3>
                      <button
                        onClick={() => downloadCsv(
                          `chapter-enrolled-members-${transparencyData.chapter.chapterId}-${new Date().toISOString().split('T')[0]}.csv`,
                          [
                            ['User ID', 'Student Name', 'Email', 'SAP', 'Year', 'Approved At'],
                            ...transparencyData.enrolledMembers.map((m) => [m.userId, m.studentName, m.studentEmail, m.sapId ?? '', m.year ?? '', m.approvedAt ?? ''])
                          ]
                        )}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        Export Members CSV
                      </button>
                    </div>
                    <div className="overflow-x-auto max-h-[240px]">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left">Name</th>
                            <th className="px-3 py-2 text-left">Email</th>
                            <th className="px-3 py-2 text-left">SAP</th>
                            <th className="px-3 py-2 text-left">Year</th>
                            <th className="px-3 py-2 text-left">Approved</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transparencyData.enrolledMembers.map((member) => (
                            <tr key={member.userId} className="border-t">
                              <td className="px-3 py-2">{member.studentName}</td>
                              <td className="px-3 py-2">{member.studentEmail}</td>
                              <td className="px-3 py-2">{member.sapId ?? '-'}</td>
                              <td className="px-3 py-2">{member.year ?? '-'}</td>
                              <td className="px-3 py-2">{member.approvedAt ? new Date(member.approvedAt).toLocaleString() : '-'}</td>
                            </tr>
                          ))}
                          {transparencyData.enrolledMembers.length === 0 && (
                            <tr>
                              <td className="px-3 py-4 text-center text-gray-500" colSpan={5}>No approved chapter members found.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
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

// Main AdminPortal component with routing
const AdminPortal: React.FC = () => {
  return (
    <ChapterHeadProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/dashboard" element={<AdminDashboard />} />
        <Route path="/chapters/edit/:chapterId" element={<EditChapter />} />
        <Route path="/chapters/create-with-payment" element={<CreateChapterWithPayment />} />
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </ChapterHeadProvider>
  );
};

export default AdminPortal;
