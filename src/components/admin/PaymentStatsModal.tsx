import React, { useEffect, useState } from 'react';
import { paymentAPI } from '../../services/paymentApi';

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

interface PaymentStatsModalProps {
  chapterId: string;
  chapterName: string;
  onClose: () => void;
}

const PaymentStatsModal: React.FC<PaymentStatsModalProps> = ({ chapterId, chapterName, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<TransparencyData | null>(null);
  const [viewType, setViewType] = useState<'chapter' | 'events'>('events');
  const [eventFilter, setEventFilter] = useState<string>('all');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        const result = await paymentAPI.getAdminPaymentTransparency(chapterId, true);
        setData(result);
      } catch (e: any) {
        console.error("Transparency error:", e);
        setError(e?.error || e?.message || 'Failed to load payment statistics');
      } finally {
        setLoading(false);
      }
    };

    if (chapterId) {
      loadData();
    }
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-7xl max-h-[95vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-6 text-white flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold font-display tracking-tight">Payment Statistics Dashboard</h2>
            <p className="text-blue-100 text-sm mt-1 opacity-90">
              {chapterName} • <span className="font-mono">{chapterId}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
            title="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-500 font-medium">Fetching secure financial data...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-xl shadow-sm">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-bold text-red-800">Error loading data</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                  <button 
                    onClick={() => window.location.reload()}
                    className="mt-4 px-4 py-2 bg-red-100 text-red-800 rounded-lg text-xs font-bold hover:bg-red-200 transition-colors"
                  >
                    Retry Loading
                  </button>
                </div>
              </div>
            </div>
          )}

          {!loading && data && (
            <>
              {/* Summary Dashboard */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Members</p>
                  <p className="text-3xl font-black text-blue-600">{data.overallStats.chapterEnrolledMembersCountFromRegistrations}</p>
                  <p className="text-[10px] text-gray-500 mt-2 flex items-center">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>
                    Live enrollment count
                  </p>
                </div>
                <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Events</p>
                  <p className="text-3xl font-black text-indigo-600">{data.overallStats.totalEvents}</p>
                  <p className="text-[10px] text-gray-500 mt-2">Active & Completed</p>
                </div>
                <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Revenue</p>
                  <p className="text-3xl font-black text-emerald-600">₹{data.overallStats.totalRevenueInRupees.toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-gray-500 mt-2">Sum of all completions</p>
                </div>
                <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Razorpay Verified</p>
                  <p className="text-3xl font-black text-amber-600">{data.razorpayInsights?.available ? 'ACTIVE' : 'N/A'}</p>
                  <p className="text-[10px] text-gray-500 mt-2 italic">Direct bank sync status</p>
                </div>
              </div>

              {/* Main Content Sections */}
              <div className="space-y-6">
                {/* 1. Category Switcher & Filters */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100">
                    <button
                      onClick={() => setViewType('events')}
                      className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                        viewType === 'events' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Event Registrations
                    </button>
                    <button
                      onClick={() => setViewType('chapter')}
                      className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                        viewType === 'chapter' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Chapter Members
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    {viewType === 'events' && (
                      <select
                        className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none shadow-sm min-w-[200px]"
                        value={eventFilter}
                        onChange={(e) => setEventFilter(e.target.value)}
                      >
                        <option value="all">All Events Detailed</option>
                        {data.eventStats.map((evt) => (
                          <option key={evt.eventId} value={evt.eventId}>{evt.title}</option>
                        ))}
                      </select>
                    )}
                    <button
                      onClick={handleExport}
                      className="inline-flex items-center px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all shadow-lg active:scale-95"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {viewType === 'chapter' ? 'Export Members CSV' : 'Export Stats CSV'}
                    </button>
                  </div>
                </div>

                {/* 2. Detailed Data Table */}
                <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50/80 backdrop-blur sticky top-0 z-10">
                        <tr>
                          <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Student Details</th>
                          <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Academic</th>
                          {viewType === 'events' && (
                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Target Event</th>
                          )}
                          <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                          <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Financials</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {displayData.map((row: any, idx: number) => (
                          <tr key={idx} className="hover:bg-blue-50/30 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{row.studentName}</div>
                              <div className="text-xs text-gray-500 font-medium">{row.studentEmail}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-xs text-gray-700 font-bold">SAP: <span className="font-mono text-blue-600">{row.sapId || 'N/A'}</span></div>
                              <div className="text-[10px] text-gray-500 uppercase mt-1">Year: {row.year || 'N/A'}</div>
                            </td>
                            {viewType === 'events' && (
                              <td className="px-6 py-4">
                                <div className="text-xs font-semibold text-gray-700 max-w-[200px] truncate" title={row.eventTitle}>
                                  {row.eventTitle}
                                </div>
                                <div className="text-[9px] text-gray-400 font-mono mt-1">
                                  ID: {row.eventId?.substring(0, 12)}...
                                </div>
                              </td>
                            )}
                            <td className="px-6 py-4 text-center">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-tighter uppercase inline-block ${
                                row.paymentStatus === 'COMPLETED' || row.paymentStatus === 'NA' || row.paymentStatus === 'FREE'
                                  ? row.paymentStatus === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-emerald-50 text-emerald-600'
                                  : row.paymentStatus === 'PENDING' 
                                    ? 'bg-amber-100 text-amber-700' 
                                    : 'bg-red-100 text-red-700'
                              }`}>
                                {row.paymentStatus === 'NA' || row.paymentStatus === 'FREE' ? 'Free' : row.paymentStatus}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="text-sm font-black text-gray-900">
                                ₹{Number(row.value ?? row.amountInRupees ?? row.amountPaid ?? 0).toLocaleString('en-IN', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })}
                              </div>
                              <div className="text-[9px] font-mono text-gray-400 mt-1 break-all normal-case">
                                {row.razorpayPaymentId || row.transactionId || 'InternalRef'}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {displayData.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-6 py-20 text-center text-gray-400 font-medium italic">
                              No records found for this selection.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3. Aggregated Performance (Insights) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Event Performance Aggregation */}
                  <div className="lg:col-span-2 bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 border-b pb-4">Top Performing Events</h3>
                    <div className="space-y-4">
                      {data.eventStats.slice(0, 5).map((evt) => (
                        <div key={evt.eventId} className="flex items-center justify-between group">
                          <div className="flex-1 min-w-0 pr-4">
                            <p className="text-sm font-bold text-gray-800 truncate group-hover:text-blue-600 transition-colors">{evt.title}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[10px] text-gray-500 font-bold uppercase">{evt.completedPaidCount} Paid</span>
                              <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                              <span className="text-[10px] text-gray-500 font-bold uppercase">{evt.enrolledCount} Total</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-gray-900">₹{evt.revenueInRupees.toLocaleString()}</p>
                            <div className="w-24 h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                              <div 
                                className="h-full bg-blue-500 rounded-full" 
                                style={{ width: `${Math.min(100, (evt.completedPaidCount / (evt.enrolledCount || 1)) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment Health */}
                  <div className="bg-gray-900 rounded-3xl p-6 text-white shadow-xl">
                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">Payment Health</h3>
                    <div className="space-y-6">
                      <div>
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-xs font-bold text-gray-400">SUCCESS RATE</span>
                          <span className="text-xl font-black text-green-400">
                            {Math.round((data.overallStats.totalCompletedPayments / (data.overallStats.totalEventRegistrationRows || 1)) * 100)}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-400" 
                            style={{ width: `${(data.overallStats.totalCompletedPayments / (data.overallStats.totalEventRegistrationRows || 1)) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div className="pt-6 border-t border-white/10">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Method Breakdown</p>
                        <div className="space-y-3">
                          {Object.entries(data.razorpayInsights?.methodBreakdown || { 'UPI/Cards': data.overallStats.totalCompletedPayments }).map(([method, count]: [string, any]) => (
                            <div key={method} className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
                              <span className="text-xs font-bold capitalize text-gray-300">{method}</span>
                              <span className="text-xs font-black text-white">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentStatsModal;
