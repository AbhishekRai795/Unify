// PaymentHistory.tsx
// Component to display student payment history and transaction details
import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { paymentAPI } from '../../services/paymentApi';
import { useTheme } from '../../contexts/ThemeContext';

interface PaymentTransaction {
  transactionId: string;
  chapterId: string;
  eventId?: string;
  amount: number;
  amountInRupees?: number;
  displayAmount: string;
  paymentStatus: 'COMPLETED' | 'FAILED' | 'PENDING' | 'NA' | 'FREE';
  transactionType?: 'CHAPTER' | 'EVENT';
  razorpayPaymentId?: string | null;
  receiptUrl?: string | null;
  receiptId?: string | null;
  createdAt: string;
  completedAt?: string;
}

export const PaymentHistory: React.FC = () => {
  const { isDark } = useTheme();
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchPaymentHistory();
  }, []);

  const fetchPaymentHistory = async () => {
    try {
      setLoading(true);
      setError('');

      const data = await paymentAPI.getPaymentHistory();

      setTransactions(data.transactions || []);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch payment history';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      COMPLETED: { bg: 'bg-green-100', text: 'text-green-800', icon: '✓' },
      FAILED: { bg: 'bg-red-100', text: 'text-red-800', icon: '✗' },
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '⏳' },
      NA: { bg: 'bg-blue-100', text: 'text-blue-800', icon: '✓' },
      FREE: { bg: 'bg-emerald-100', text: 'text-emerald-800', icon: '✓' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
        {config.icon} {status === 'NA' || status === 'FREE' ? 'REGISTERED' : status}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`min-h-screen transition-all duration-300 ${isDark ? 'aurora-bg' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'}`}>
      <div className="relative w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <div className="mb-6">
          <button
            onClick={() => window.location.href = '/student/dashboard'}
            className={`
              group flex items-center text-sm font-medium transition-all duration-200
              ${isDark ? 'text-dark-text-secondary hover:text-accent-300' : 'text-slate-600 hover:text-slate-900'}
            `}
          >
            <div className={`
              p-2 mr-2 rounded-lg border transition-all
              ${isDark 
                ? 'bg-dark-surface/40 border-accent-500/20 group-hover:border-accent-400 group-hover:bg-accent-500/10' 
                : 'bg-white border-slate-200 group-hover:border-blue-300 group-hover:bg-blue-50'
              }
            `}>
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            </div>
            Back to Dashboard
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <div className={`h-[2px] w-12 rounded-full ${isDark ? 'bg-accent-500/30' : 'bg-blue-200'}`} />
            <div className={`w-2 h-2 rounded-full ${isDark ? 'bg-accent-400' : 'bg-blue-500'}`} />
            <div className={`h-[2px] w-12 rounded-full ${isDark ? 'bg-accent-500/30' : 'bg-blue-200'}`} />
          </div>
          <h1 className={`
            text-4xl font-bold mb-4 transition-all duration-300 tracking-tight
            ${isDark 
              ? 'text-dark-text-primary' 
              : 'text-[#1a1f36]'
            }
          `}>Payment History</h1>
          <p className={`
            text-lg max-w-2xl mx-auto transition-colors duration-300 font-normal
            ${isDark ? 'text-dark-text-secondary' : 'text-slate-500'}
          `}>
            Track your transactions and registration history across Unify chapters.
          </p>
        </div>

        <div className={`
          rounded-xl p-8 backdrop-blur-md border transition-all duration-300
          ${isDark 
            ? 'bg-dark-surface/30 border-accent-500/20 shadow-accent-500/10 hover:shadow-accent-500/20 hover:bg-dark-surface/40' 
            : 'bg-white/80 border-white/20 shadow-sm'
          }
        `}>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : transactions.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-600 text-lg">No payment transactions found</p>
          <p className="text-gray-500 text-sm mt-2">Join a chapter to see your registration history here</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-300">
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Transaction ID</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Amount</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Receipt</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.transactionId} className="border-b border-gray-200 hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {formatDate(tx.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {tx.transactionType || 'CHAPTER'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                    {tx.transactionId || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                    {tx.displayAmount}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {getStatusBadge(tx.paymentStatus)}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {tx.paymentStatus === 'COMPLETED' && tx.receiptUrl ? (
                      <a
                        href={tx.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        Download
                      </a>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => {
                        // Could show modal with full details
                        alert(`Payment ID: ${tx.razorpayPaymentId || 'N/A'}\nReceipt ID: ${tx.receiptId || 'N/A'}`);
                      }}
                      className="text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {transactions.length > 0 && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Payment Summary</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-blue-700">Total Transactions</p>
              <p className="text-2xl font-bold text-blue-900">{transactions.length}</p>
            </div>
            <div>
              <p className="text-blue-700">Successful Payments</p>
              <p className="text-2xl font-bold text-green-600">
                {transactions.filter(t => t.paymentStatus === 'COMPLETED').length}
              </p>
            </div>
            <div>
              <p className="text-blue-700">Total Spent</p>
              <p className="text-2xl font-bold text-blue-900">
                ₹{(transactions
                  .filter(t => t.paymentStatus === 'COMPLETED')
                  .reduce((sum, t) => sum + (t.amountInRupees ?? (t.amount / 100)), 0)).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  </div>
);
};

export default PaymentHistory;
