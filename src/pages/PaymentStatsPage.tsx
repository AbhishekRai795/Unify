import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { paymentAPI } from '../services/paymentApi';
import { adminApi } from '../services/adminApi';
import { ArrowLeft, Download, Filter, TrendingUp, Users, Calendar, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import Loader from '../components/common/Loader';

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
    totalRevenueInRupees: number;
    totalCompletedPayments: number;
    totalEventRegistrationRows: number;
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
    paymentStatus?: string;
    amountPaid?: number;
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
    razorpayPaymentId?: string;
    createdAt?: string;
    completedAt?: string;
  }>;
  razorpayInsights?: {
    available: boolean;
    methodBreakdown?: Record<string, number>;
    statusBreakdown?: Record<string, number>;
    notes?: string;
  };
}

const PaymentStatsPage: React.FC = () => {
  const { chapterId } = useParams<{ chapterId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<TransparencyData | null>(null);
  const [viewType, setViewType] = useState<'chapter' | 'events'>('events');
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [chapterName, setChapterName] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!chapterId) return;

      try {
        setLoading(true);
        setError('');
        
        // Load stats
        const result = await paymentAPI.getAdminPaymentTransparency(chapterId, true);
        setData(result);
        
        // Also fetch chapter name if not present in the result
        if (result.chapter?.chapterName) {
            setChapterName(result.chapter.chapterName);
        } else {
            const chaptersData = await adminApi.listChapters();
            const currentChapter = chaptersData.chapters?.find((c: any) => c.chapterId === chapterId);
            if (currentChapter) setChapterName(currentChapter.chapterName);
        }

      } catch (e: any) {
        console.error("Transparency error:", e);
        setError(e?.error || e?.message || 'Failed to load payment statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [chapterId]);

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

  const handleExport = () => {
    if (!data) return;
    const dateStr = new Date().toISOString().split('T')[0];
    
    if (viewType === 'chapter') {
      const headers = ['Student Name', 'Email', 'SAP ID', 'Year', 'Status', 'Amount Paid', 'Approved At'];
      const rows = data.enrolledMembers.map(m => [
        m.studentName, m.studentEmail, m.sapId || '', m.year || '', 
        'COMPLETED', m.amountPaid || 0, m.approvedAt || ''
      ]);
      downloadCsv(`chapter-members-${chapterId}-${dateStr}.csv`, [headers, ...rows]);
    } else {
      const headers = ['Event', 'Student Name', 'Email', 'SAP ID', 'Year', 'Status', 'Amount', 'Ref ID', 'Date'];
      const rows = (eventFilter === 'all' ? data.paymentRecords : data.paymentRecords.filter(r => r.eventId === eventFilter)).map(p => [
        p.eventTitle, p.studentName, p.studentEmail, p.sapId || '', p.year || '',
        p.paymentStatus, p.amountInRupees, p.razorpayPaymentId || p.transactionId || '', p.createdAt || ''
      ]);
      downloadCsv(`event-registrations-${chapterId}-${dateStr}.csv`, [headers, ...rows]);
    }
  };

  const filteredData = () => {
    if (!data) return [];
    if (viewType === 'chapter') {
      return data.enrolledMembers;
    } else {
      return data.paymentRecords.filter((row) =>
        eventFilter === 'all' ? true : row.eventId === eventFilter
      );
    }
  };

  const displayData = filteredData();

  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8 flex flex-col items-center justify-center">
            <div className="bg-white/80 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-red-100 max-w-md text-center">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied Or Error</h1>
                <p className="text-gray-600 mb-6">{error}</p>
                <div className="flex gap-4 justify-center">
                    <button 
                        onClick={() => navigate(-1)}
                        className="px-6 py-2 bg-gray-100 text-gray-800 rounded-xl font-bold hover:bg-gray-200 transition-colors flex items-center"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </button>
                    <button 
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" /> Retry
                    </button>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation & Title */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
                onClick={() => navigate(-1)}
                className="p-3 bg-white/80 backdrop-blur-md border border-white/20 rounded-xl hover:shadow-lg transition-all text-gray-600 hover:text-blue-600 group"
                title="Back to Dashboard"
            >
              <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
            </button>
            <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Payment Statistics Dashboard</h1>
                <p className="text-gray-500 font-medium flex items-center gap-2 mt-1">
                    <ShieldCheck className="w-4 h-4 text-green-500" />
                    Chapter Management Center • <span className="text-blue-600">{chapterName}</span>
                </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
              <button
                onClick={handleExport}
                className="flex items-center px-6 py-3 bg-gray-900 text-white rounded-2xl text-sm font-bold hover:bg-black transition-all shadow-xl active:scale-95"
              >
                <Download className="w-4 h-4 mr-2" />
                {viewType === 'chapter' ? 'Export Members CSV' : 'Export Stats CSV'}
              </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/80 backdrop-blur-md rounded-xl p-6 border border-white/20 shadow-sm hover:shadow-lg transition-all duration-200 group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Active Chapter Members</p>
                    <p className="text-3xl font-bold text-gray-900">{data?.overallStats.chapterEnrolledMembersCountFromRegistrations}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-500 group-hover:scale-110 transition-transform duration-200">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white/80 backdrop-blur-md rounded-xl p-6 border border-white/20 shadow-sm hover:shadow-lg transition-all duration-200 group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Managed Active Events</p>
                    <p className="text-3xl font-bold text-gray-900">{data?.overallStats.totalEvents}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-500 group-hover:scale-110 transition-transform duration-200">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white/80 backdrop-blur-md rounded-xl p-6 border border-white/20 shadow-sm hover:shadow-lg transition-all duration-200 group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Total Completion Value</p>
                    <p className="text-3xl font-bold text-gray-900">₹{data?.overallStats.totalRevenueInRupees.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-500 group-hover:scale-110 transition-transform duration-200">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white/80 backdrop-blur-md rounded-xl p-6 border border-white/20 shadow-sm hover:shadow-lg transition-all duration-200 group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Registration Success Hub</p>
                    <p className="text-3xl font-bold text-gray-900">
                    {(() => {
                  const totalRows = data?.overallStats.totalEventRegistrationRows ?? 0;
                  const completed = data?.overallStats.totalCompletedPayments ?? 0;
                  if (totalRows === 0) return '0%';
                  const percent = Math.round((completed / totalRows) * 100);
                  return `${percent}%`;
                })()}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-orange-500 group-hover:scale-110 transition-transform duration-200">
                    <ShieldCheck className="h-6 w-6 text-white" />
                  </div>
                </div>
            </motion.div>
        </div>

        {/* Main Interface Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Sidebar Controls */}
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white/80 backdrop-blur-md rounded-xl p-6 border border-white/20 shadow-sm">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">View Category</h2>
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => setViewType('events')}
                            className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                                viewType === 'events' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            <Calendar className="w-5 h-5 mr-3 text-blue-500" /> Event Registrations
                        </button>
                        <button
                            onClick={() => setViewType('chapter')}
                            className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                                viewType === 'chapter' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            <Users className="w-5 h-5 mr-3 text-purple-500" /> Chapter Joining
                        </button>
                    </div>
                </div>

                {viewType === 'events' && (
                    <div className="bg-white/80 backdrop-blur-md rounded-xl p-6 border border-white/20 shadow-sm">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                            <Filter className="w-5 h-5 mr-2 text-gray-500" /> Event Filter
                        </h2>
                        <div className="space-y-2">
                            <select
                                value={eventFilter}
                                onChange={(e) => setEventFilter(e.target.value)}
                                className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none font-medium"
                            >
                                <option value="all">All Events Summary</option>
                                {data?.eventStats.map((evt) => (
                                    <option key={evt.eventId} value={evt.eventId}>
                                        {evt.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Data Table Area */}
            <div className="lg:col-span-3 space-y-6">
                <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-white/20 shadow-xl overflow-hidden min-h-[600px] flex flex-col">
                    <div className="flex-1 overflow-x-auto custom-scrollbar">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50/80 sticky top-0 z-10 border-b border-gray-200">
                                <tr>
                                    <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase">Student Info</th>
                                    <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase">Academic</th>
                                    {viewType === 'events' && (
                                        <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase">Registered For</th>
                                    )}
                                    <th className="px-8 py-4 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-8 py-4 text-right text-xs font-medium text-gray-500 uppercase">Value</th>
                                </tr>
                            </thead>
                            <tbody className="bg-transparent divide-y divide-gray-100">
                                {displayData.map((row: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-blue-50/40 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{row.studentName}</div>
                                            <div className="text-xs text-gray-500 font-medium">{row.studentEmail}</div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="text-xs text-gray-700 font-bold">SAP: <span className="font-mono text-blue-600">{row.sapId || 'N/A'}</span></div>
                                            <div className="text-[10px] text-gray-500 uppercase mt-1">Year: {row.year || 'N/A'}</div>
                                        </td>
                                        {viewType === 'events' && (
                                            <td className="px-8 py-5">
                                                <div className="text-xs font-semibold text-gray-700 max-w-[200px] truncate" title={row.eventTitle}>
                                                    {row.eventTitle}
                                                </div>
                                                <div className="text-[9px] text-gray-400 font-mono mt-1">
                                                    ID: {row.eventId?.substring(0, 12)}
                                                </div>
                                            </td>
                                        )}
                                        <td className="px-8 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase inline-block ${
                                                row.paymentStatus === 'COMPLETED' || row.paymentStatus === 'NA' 
                                                ? 'bg-green-100 text-green-700' 
                                                : row.paymentStatus === 'PENDING' 
                                                    ? 'bg-amber-100 text-amber-700' 
                                                    : 'bg-red-100 text-red-700'
                                            }`}>
                                                {row.paymentStatus === 'NA' ? 'FREE' : row.paymentStatus}
                                            </span>
                                        </td>
                                        <td className="px-8 py-4 text-right">
                                            <div className="text-sm font-bold text-gray-900">
                                                ₹{Number(row.amountInRupees || row.amountPaid || 0).toLocaleString()}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1 uppercase">
                                                {row.razorpayPaymentId || row.transactionId?.substring(0, 10) || 'InternalRef'}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {displayData.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-24 text-center text-gray-400 font-medium italic">
                                            No payment records found for this combination.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentStatsPage;
