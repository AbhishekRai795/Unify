import React, { useEffect, useState } from 'react';
import { X, Wallet, History, ArrowUpRight, ArrowDownLeft, Calendar, Filter } from 'lucide-react';
import { getWalletBalance, getWalletHistory } from '../../services/walletApi';

interface Transaction {
  transactionId: string;
  type: string;
  amount: number;
  description: string;
  timestamp: string;
}

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose }) => {
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const bal = await getWalletBalance();
        setBalance(bal);
        const hist = await getWalletHistory();
        // Sort history by timestamp descending (most recent first)
        const sortedHist = [...hist].sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setTransactions(sortedHist);
      } catch (err: any) {
        setError(err.message || 'Failed to load wallet data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-md flex items-end sm:items-center justify-center z-50 p-0 sm:p-6 lg:p-8 transition-all duration-300 font-sans">
      <div className="bg-white dark:bg-dark-surface rounded-t-3xl sm:rounded-[2rem] shadow-2xl w-full sm:max-w-6xl h-[100dvh] sm:h-[85vh] overflow-hidden flex flex-col relative border border-white/40 dark:border-dark-border ring-1 ring-black/5">
        
        {/* Top Header / Decoration Area */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 opacity-10 dark:opacity-20 pointer-events-none" />

        {/* Modal Header */}
        <div className="relative z-10 px-4 py-5 sm:px-8 sm:py-8 border-b border-gray-100 dark:border-dark-border flex justify-between items-start gap-4">
          <div className="min-w-0">
            <div className="flex items-start sm:items-center gap-3 mb-1">
              <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200 dark:shadow-none flex-shrink-0">
                <Wallet size={22} />
              </div>
              <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight">Student Wallet</h2>
            </div>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 font-medium sm:ml-12 max-w-2xl">Track your rewards and manage point-based registrations</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 sm:p-3 rounded-2xl hover:bg-white dark:hover:bg-dark-surface hover:shadow-xl dark:hover:shadow-none text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all duration-300 border border-transparent hover:border-gray-100 dark:hover:border-dark-border flex-shrink-0"
          >
            <X size={24} />
          </button>
        </div>

        {/* Main Dashboard Content */}
        <div className="flex-1 flex min-h-0 overflow-y-auto md:overflow-hidden relative z-10 custom-scrollbar">
          <div className="max-w-[1400px] mx-auto w-full flex flex-col md:flex-row h-auto md:h-full overflow-visible md:overflow-hidden">
            
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-100 dark:border-indigo-900/30"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-t-indigo-600 animate-spin"></div>
                </div>
                <p className="text-indigo-600 dark:text-indigo-400 font-bold tracking-widest uppercase text-xs animate-pulse">Syncing Wallet...</p>
              </div>
            ) : error ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center text-3xl">⚠️</div>
                <h3 className="text-xl font-bold text-red-900 dark:text-red-400">Connection Error</h3>
                <p className="text-red-600/80 dark:text-red-400/60 max-w-md">{error}</p>
                <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold transition">Retry</button>
              </div>
            ) : (
              <>
                {/* Left Sidebar: Fixed/Sticky Balance & Stats */}
                <div className="w-full md:w-[320px] lg:w-[380px] p-4 sm:p-6 lg:p-8 flex-shrink-0 border-b md:border-b-0 md:border-r border-gray-50 dark:border-dark-border bg-gray-50/30 dark:bg-transparent overflow-visible">
                  <div className="space-y-4 sm:space-y-6">
                    <div className="bg-gray-900 dark:bg-indigo-950 rounded-2xl sm:rounded-[2rem] p-5 sm:p-8 text-white shadow-xl relative overflow-hidden group">
                      <div className="absolute -top-20 -right-20 w-48 h-48 bg-indigo-500/20 rounded-full blur-[80px]"></div>
                      <div className="relative z-10 space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-indigo-200/60 text-[10px] font-bold uppercase tracking-[0.2em]">Verified Balance</span>
                          <Wallet size={16} className="text-indigo-400/40" />
                        </div>
                        <div>
                          <h4 className="text-4xl sm:text-5xl font-bold tracking-tighter leading-none">{balance ?? 0}</h4>
                          <p className="text-indigo-300 text-xs font-bold mt-1 opacity-80 uppercase tracking-widest">Points</p>
                        </div>
                        <div className="pt-4 border-t border-white/10 flex gap-4">
                          <div className="flex-1">
                            <p className="text-[9px] uppercase tracking-widest text-indigo-300/40 mb-0.5">Status</p>
                            <p className="text-[10px] font-bold text-green-400 flex items-center gap-1">
                              <span className="w-1 h-1 bg-green-400 rounded-full animate-pulse"></span> Active
                            </p>
                          </div>
                          <div className="flex-1">
                            <p className="text-[9px] uppercase tracking-widest text-indigo-300/40 mb-0.5">Verified</p>
                            <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-tighter">Blockchain</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Insights */}
                    <div className="bg-white dark:bg-dark-surface/50 rounded-2xl sm:rounded-[1.5rem] p-4 sm:p-6 border border-gray-100 dark:border-dark-border shadow-sm">
                      <h5 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                        <Filter size={12} /> Insights
                      </h5>
                      <div className="space-y-3">
                          <div className="flex justify-between items-center bg-gray-50 dark:bg-dark-bg/40 p-3 rounded-xl">
                              <span className="text-xs text-gray-500 font-bold uppercase tracking-tight">Earning Path</span>
                              <span className="text-xs text-green-600 font-bold">Certificates</span>
                          </div>
                          <div className="flex justify-between items-center bg-gray-50 dark:bg-dark-bg/40 p-3 rounded-xl">
                              <span className="text-xs text-gray-500 font-bold uppercase tracking-tight">Utility</span>
                              <span className="text-xs text-indigo-600 font-bold">Events</span>
                          </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Area: Scrollable Activity Log */}
                <div className="flex-1 flex flex-col min-h-0 md:overflow-hidden min-w-0">
                  <div className="px-4 sm:px-6 lg:px-10 py-4 sm:py-6 border-b border-gray-50 dark:border-dark-border flex items-center justify-between gap-3 bg-white/50 dark:bg-transparent">
                    <h3 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
                      <History size={20} className="text-indigo-600" /> Recent Activity
                    </h3>
                    <div className="flex items-center gap-4">
                        <span className="hidden sm:inline bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                            Live Ledger
                        </span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 lg:p-10 lg:pr-6 space-y-3 custom-scrollbar">
                    {transactions.length === 0 ? (
                      <div className="text-center py-14 sm:py-20 px-4 bg-gray-50/50 dark:bg-dark-bg/10 rounded-2xl sm:rounded-[2rem] border-2 border-dashed border-gray-100 dark:border-dark-border flex flex-col items-center">
                        <div className="w-16 h-16 bg-white dark:bg-dark-surface rounded-2xl flex items-center justify-center text-2xl shadow-lg mb-4">⚓</div>
                        <h4 className="text-lg font-bold text-gray-400">No activity yet</h4>
                        <p className="text-xs text-gray-300 mt-1 uppercase tracking-widest font-bold">Awaiting Generation</p>
                      </div>
                    ) : (
                      transactions.map((tx) => (
                        <div 
                          key={tx.transactionId} 
                          className="group bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border hover:border-indigo-100 dark:hover:border-indigo-500/30 rounded-2xl p-4 flex flex-wrap sm:flex-nowrap items-start sm:items-center gap-3 sm:gap-4 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-600/5"
                        >
                          <div className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm ${
                            tx.type === 'CREDIT' 
                              ? 'bg-green-50 dark:bg-green-900/20 text-green-500' 
                              : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500'
                          }`}>
                            {tx.type === 'CREDIT' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${
                                    tx.type === 'CREDIT' ? 'bg-green-100/50 text-green-700' : 'bg-indigo-100/50 text-indigo-700'
                                }`}>
                                    {tx.type}
                                </span>
                                <span className="text-[9px] font-mono text-gray-300 uppercase tracking-tighter truncate">{tx.transactionId}</span>
                            </div>
                            <h4 className="text-sm font-bold text-gray-800 dark:text-white truncate">
                              {tx.description}
                            </h4>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight flex items-center gap-1 mt-1">
                                <Calendar size={10} /> {new Date(tx.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>

                          <div className="w-full sm:w-auto flex-shrink-0 text-left sm:text-right pl-16 sm:pl-0">
                            <div className={`text-xl font-bold tabular-nums ${
                              tx.type === 'CREDIT' ? 'text-green-500' : 'text-gray-900 dark:text-white'
                            }`}>
                              {tx.type === 'CREDIT' ? '+' : '-'}{tx.amount}
                            </div>
                            <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">Points</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
