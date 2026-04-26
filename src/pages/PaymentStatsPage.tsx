import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { paymentAPI } from '../services/paymentApi';
import { adminApi } from '../services/adminApi';
import { ArrowLeft, Download, Filter, TrendingUp, Users, Calendar, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import Loader from '../components/common/Loader';
import { useTheme } from '../contexts/ThemeContext';

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
    value?: number;
    transactionId?: string;
    razorpayPaymentId?: string;
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
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<TransparencyData | null>(null);
  const [viewType, setViewType] = useState<'chapter' | 'events'>('events');
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [chapterName, setChapterName] = useState('');
  const pageClass = isDark ? 'bg-dark-bg' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50';
  const cardClass = isDark ? 'bg-dark-surface/85 border-dark-border/70' : 'bg-white/80 border-white/20';
  const cardStrongClass = isDark ? 'bg-dark-surface/92 border-dark-border/70' : 'bg-white/90 border-white/20';
  const headingClass = isDark ? 'text-dark-text-primary' : 'text-gray-900';
  const subtleClass = isDark ? 'text-dark-text-secondary' : 'text-gray-600';

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
        m.paymentStatus || 'UNKNOWN', m.value ?? m.amountPaid ?? 0, m.approvedAt || ''
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
      <div className={`min-h-screen flex items-center justify-center ${pageClass}`}>
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen p-8 flex flex-col items-center justify-center ${pageClass}`}>
        <div className={`backdrop-blur-md p-8 rounded-2xl shadow-xl border max-w-md text-center transition-colors duration-300 ${isDark ? 'bg-dark-surface/90 border-red-500/30' : 'bg-white/80 border-red-100'}`}>
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className={`text-2xl font-bold mb-2 ${headingClass}`}>Access Denied Or Error</h1>
          <p className={`mb-6 ${subtleClass}`}>{error}</p>
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
    <div className={`min-h-screen transition-colors duration-300 ${pageClass}`}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation & Header */}
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-8">
            <button
                onClick={() => navigate(-1)}
                className={`group flex items-center text-sm font-medium transition-all duration-200 ${isDark ? 'text-dark-text-secondary hover:text-dark-text-primary' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <div className={`p-2 mr-2 rounded-lg border transition-all ${isDark ? 'bg-dark-surface border-dark-border group-hover:border-accent-500/50 group-hover:bg-accent-600/10' : 'bg-white border-slate-200 group-hover:border-blue-300 group-hover:bg-blue-50'}`}>
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              </div>
              Back to Dashboard
            </button>

            <button
              onClick={handleExport}
              className={`flex items-center px-4 sm:px-6 py-2 sm:py-3 rounded-xl text-sm font-bold transition-all shadow-lg active:scale-95 mt-4 sm:mt-0 ${isDark ? 'bg-accent-600 text-white hover:bg-accent-700' : 'bg-gray-900 text-white hover:bg-black'}`}
            >
              <Download className="w-4 h-4 mr-2" />
              {viewType === 'chapter' ? 'Export Members' : 'Export Stats'}
            </button>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="flex items-center justify-center space-x-4 mb-4">
              <div className={`h-[2px] w-12 rounded-full ${isDark ? 'bg-accent-500/30' : 'bg-blue-200'}`} />
              <div className={`w-2 h-2 rounded-full ${isDark ? 'bg-accent-400' : 'bg-blue-500'}`} />
              <div className={`h-[2px] w-12 rounded-full ${isDark ? 'bg-accent-500/30' : 'bg-blue-200'}`} />
            </div>
            <h1 className={`text-3xl sm:text-4xl font-bold mb-4 tracking-tight ${isDark ? 'text-dark-text-primary' : 'text-[#1a1f36]'}`}>
              Payment Statistics Dashboard
            </h1>
            <p className={`text-base sm:text-lg max-w-2xl mx-auto font-normal flex items-center justify-center gap-2 ${isDark ? 'text-dark-text-secondary' : 'text-slate-500'}`}>
              <ShieldCheck className="w-5 h-5 text-green-500" />
              Chapter Management Center • <span className={`${isDark ? 'text-accent-400' : 'text-blue-600'} font-medium`}>{chapterName}</span>
            </p>
          </motion.div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`backdrop-blur-md rounded-xl p-4 sm:p-6 border shadow-sm hover:shadow-lg transition-all duration-200 group ${cardClass}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs sm:text-sm font-medium mb-1 ${subtleClass}`}>Active Members</p>
                    <p className={`text-2xl sm:text-3xl font-bold ${headingClass}`}>{data?.overallStats.chapterEnrolledMembersCountFromRegistrations}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-500 group-hover:scale-110 transition-transform duration-200">
                    <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={`backdrop-blur-md rounded-xl p-4 sm:p-6 border shadow-sm hover:shadow-lg transition-all duration-200 group ${cardClass}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs sm:text-sm font-medium mb-1 ${subtleClass}`}>Active Events</p>
                    <p className={`text-2xl sm:text-3xl font-bold ${headingClass}`}>{data?.overallStats.totalEvents}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-500 group-hover:scale-110 transition-transform duration-200">
                    <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={`backdrop-blur-md rounded-xl p-4 sm:p-6 border shadow-sm hover:shadow-lg transition-all duration-200 group ${cardClass}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs sm:text-sm font-medium mb-1 ${subtleClass}`}>Total Revenue</p>
                    <p className={`text-2xl sm:text-3xl font-bold ${headingClass}`}>₹{data?.overallStats.totalRevenueInRupees.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-500 group-hover:scale-110 transition-transform duration-200">
                    <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className={`backdrop-blur-md rounded-xl p-4 sm:p-6 border shadow-sm hover:shadow-lg transition-all duration-200 group ${cardClass}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs sm:text-sm font-medium mb-1 ${subtleClass}`}>Success Rate</p>
                    <p className={`text-2xl sm:text-3xl font-bold ${headingClass}`}>
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
                    <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                </div>
            </motion.div>
        </div>

        {/* Main Interface Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8">
            
            {/* Sidebar Controls */}
            <div className="lg:col-span-1 space-y-6">
                <div className={`backdrop-blur-md rounded-xl p-4 sm:p-6 border shadow-sm ${cardClass}`}>
                  <h2 className={`text-lg sm:text-xl font-bold mb-4 ${headingClass}`}>View Category</h2>
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => setViewType('events')}
                            className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                                viewType === 'events' 
                                ? (isDark ? 'bg-accent-600/30 text-accent-300' : 'bg-blue-50 text-blue-700 font-semibold')
                                : (isDark ? 'text-dark-text-secondary hover:bg-dark-surface' : 'text-gray-700 hover:bg-gray-50')
                            }`}
                        >
                            <Calendar className={`w-5 h-5 mr-3 ${isDark ? 'text-accent-400' : 'text-blue-500'}`} /> Event Registrations
                        </button>
                        <button
                            onClick={() => setViewType('chapter')}
                            className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                                viewType === 'chapter' 
                                ? (isDark ? 'bg-accent-600/30 text-accent-300' : 'bg-blue-50 text-blue-700 font-semibold')
                                : (isDark ? 'text-dark-text-secondary hover:bg-dark-surface' : 'text-gray-700 hover:bg-gray-50')
                            }`}
                        >
                            <Users className={`w-5 h-5 mr-3 ${isDark ? 'text-purple-400' : 'text-purple-500'}`} /> Chapter Joining
                        </button>
                    </div>
                </div>

                {viewType === 'events' && (
                    <div className={`backdrop-blur-md rounded-xl p-4 sm:p-6 border shadow-sm ${cardClass}`}>
                      <h2 className={`text-lg sm:text-xl font-bold mb-4 flex items-center ${headingClass}`}>
                            <Filter className="w-5 h-5 mr-2 text-gray-500" /> Event Filter
                        </h2>
                        <div className="space-y-2">
                            <select
                                value={eventFilter}
                                onChange={(e) => setEventFilter(e.target.value)}
                                className={`w-full border text-sm rounded-lg block p-2.5 outline-none font-medium ${isDark ? 'bg-dark-card border-dark-border text-dark-text-primary focus:ring-accent focus:border-accent' : 'bg-white border-gray-200 text-gray-900 focus:ring-blue-500 focus:border-blue-500'}`}
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
            <div className="lg:col-span-3">
                <div className={`backdrop-blur-md rounded-2xl sm:rounded-3xl border shadow-xl overflow-hidden min-h-[600px] flex flex-col ${cardStrongClass}`}>
                    <div className="flex-1 overflow-x-auto custom-scrollbar">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
                            <thead className={`${isDark ? 'bg-dark-surface/90' : 'bg-gray-50/80'} sticky top-0 z-10 border-b ${isDark ? 'border-dark-border' : 'border-gray-200'}`}>
                                <tr>
                                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 dark:text-dark-text-muted uppercase tracking-wider">Student</th>
                                    <th className="hidden md:table-cell px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 dark:text-dark-text-muted uppercase tracking-wider">Details</th>
                                    {viewType === 'events' && (
                                        <th className="hidden sm:table-cell px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 dark:text-dark-text-muted uppercase tracking-wider">Event</th>
                                    )}
                                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-center text-xs font-medium text-gray-500 dark:text-dark-text-muted uppercase tracking-wider">Status</th>
                                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-right text-xs font-medium text-gray-500 dark:text-dark-text-muted uppercase tracking-wider">Value</th>
                                </tr>
                            </thead>
                            <tbody className={`bg-transparent divide-y ${isDark ? 'divide-dark-border/50' : 'divide-gray-100'}`}>
                                {displayData.map((row: any, idx: number) => (
                                    <tr key={idx} className={`${isDark ? 'hover:bg-dark-surface/50' : 'hover:bg-blue-50/40'} transition-colors group`}>
                                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                            <div className={`text-sm font-bold ${headingClass} group-hover:text-blue-700 transition-colors`}>{row.studentName}</div>
                                            <div className={`text-xs font-medium ${subtleClass}`}>{row.studentEmail}</div>
                                        </td>
                                        <td className="hidden md:table-cell px-4 sm:px-6 py-4 whitespace-nowrap">
                                            <div className={`text-xs font-bold ${subtleClass}`}>SAP: <span className={`font-mono ${isDark ? 'text-accent-400' : 'text-blue-600'}`}>{row.sapId || 'N/A'}</span></div>
                                            <div className={`text-[10px] uppercase mt-1 ${subtleClass}`}>Year: {row.year || 'N/A'}</div>
                                        </td>
                                        {viewType === 'events' && (
                                            <td className="hidden sm:table-cell px-4 sm:px-6 py-4 whitespace-nowrap">
                                                <div className={`text-xs font-semibold max-w-[150px] truncate ${subtleClass}`} title={row.eventTitle}>
                                                    {row.eventTitle}
                                                </div>
                                            </td>
                                        )}
                                        <td className="px-4 sm:px-6 py-4 text-center">
                                            <span className={`px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold uppercase inline-block ${
                                                row.paymentStatus === 'COMPLETED' || row.paymentStatus === 'NA' || row.paymentStatus === 'FREE'
                                                ? (isDark ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-700')
                                                : row.paymentStatus === 'PENDING' 
                                                    ? (isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700')
                                                    : (isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-700')
                                            }`}>
                                                {row.paymentStatus === 'NA' || row.paymentStatus === 'FREE' ? 'FREE' : row.paymentStatus}
                                            </span>
                                        </td>
                                        <td className="px-4 sm:px-6 py-4 text-right whitespace-nowrap">
                                            <div className={`text-sm font-bold ${headingClass}`}>
                                                ₹{Number(row.value ?? row.amountInRupees ?? row.amountPaid ?? 0).toLocaleString('en-IN')}
                                            </div>
                                            <div className={`text-xs mt-1 font-mono break-all normal-case ${subtleClass}`}>
                                                {row.razorpayPaymentId || row.transactionId || 'InternalRef'}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {displayData.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-24 text-center text-gray-400 dark:text-dark-text-muted font-medium italic">
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
