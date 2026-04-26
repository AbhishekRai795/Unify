// CreateChapterWithPayment.tsx
// Admin component to create chapters with payment configuration
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { adminApi } from '../../services/adminApi';
import { paymentAPI } from '../../services/paymentApi';

interface CreateChapterFormData {
  chapterName: string;
  headEmail: string;
  headName: string;
  type: 'chapter' | 'club';
  isPaid: boolean;
  registrationFee: number;
}

import { 
  Shield, 
  Trophy, 
  ArrowLeft, 
  Plus, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle,
  Mail,
  User,
  Info,
  LayoutGrid,
  Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';

export const CreateChapterWithPayment: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark } = useTheme();
  
  // Parse type from URL query param
  const queryParams = new URLSearchParams(location.search);
  const initialType = (queryParams.get('type') as 'chapter' | 'club') || 'chapter';
  const typeLabel = initialType === 'club' ? 'Club' : 'Chapter';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState<CreateChapterFormData>({
    chapterName: '',
    headEmail: '',
    headName: '',
    type: initialType,
    isPaid: false,
    registrationFee: 0
  });

  // Update type if query param changes
  useEffect(() => {
    const newType = (queryParams.get('type') as 'chapter' | 'club') || 'chapter';
    setFormData(prev => ({ ...prev, type: newType }));
  }, [location.search]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else if (name === 'registrationFee') {
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

    if (!formData.chapterName.trim()) {
      setError(`${typeLabel} name is required`);
      return;
    }

    if (formData.isPaid && formData.registrationFee <= 0) {
      setError(`Please enter a valid registration fee for paid ${typeLabel.toLowerCase()}s`);
      return;
    }

    try {
      setLoading(true);

      if (formData.isPaid) {
        await paymentAPI.createChapterWithPayment({
          chapterName: formData.chapterName.trim(),
          headEmail: formData.headEmail.trim() || undefined,
          headName: formData.headName.trim() || undefined,
          type: formData.type,
          isPaid: true,
          registrationFee: Math.round(formData.registrationFee * 100)
        });
      } else {
        await adminApi.createChapter({
          chapterName: formData.chapterName.trim(),
          headEmail: formData.headEmail.trim() || undefined,
          headName: formData.headName.trim() || undefined,
          type: formData.type
        });
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/admin/dashboard');
      }, 2000);
    } catch (err: any) {
      const errorMsg = err?.error || err?.message || (err instanceof Error ? err.message : `Failed to create ${formData.type}`);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const pageClass = isDark ? 'bg-dark-bg' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50';
  const headingClass = isDark ? 'text-dark-text-primary' : 'text-[#1a1f36]';

  return (
    <div className={`min-h-screen py-12 px-4 transition-colors duration-300 ${pageClass}`}>
      <div className="max-w-3xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => navigate('/admin/dashboard')}
            className={`group flex items-center text-sm font-medium transition-all duration-200 ${isDark ? 'text-dark-text-secondary hover:text-dark-text-primary' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <div className={`p-2 mr-2 rounded-lg border transition-all ${isDark ? 'bg-dark-surface border-dark-border group-hover:border-accent-500/50 group-hover:bg-accent-600/10' : 'bg-white border-slate-200 group-hover:border-blue-300 group-hover:bg-blue-50'}`}>
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            </div>
            Back to Dashboard
          </button>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="flex items-center justify-center space-x-4 mb-4">
            <div className={`h-[2px] w-8 rounded-full ${isDark ? 'bg-accent-500/30' : 'bg-blue-200'}`} />
            <div className={`p-3 rounded-2xl shadow-lg ${isDark ? 'bg-dark-surface text-accent-400 border border-dark-border' : 'bg-white text-blue-600 border border-slate-100'}`}>
              {initialType === 'club' ? <Trophy size={24} /> : <Shield size={24} />}
            </div>
            <div className={`h-[2px] w-8 rounded-full ${isDark ? 'bg-accent-500/30' : 'bg-blue-200'}`} />
          </div>
          <h1 className={`text-4xl font-black tracking-tight mb-2 ${headingClass}`}>
            Initialize {typeLabel}
          </h1>
          <p className={isDark ? 'text-dark-text-secondary' : 'text-slate-500 font-medium'}>
            Deploy a new governance unit to the institution network.
          </p>
        </motion.div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`mb-6 p-4 rounded-xl border flex items-center gap-3 ${isDark ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-700'}`}
          >
            <AlertCircle size={20} />
            <span className="font-semibold">{error}</span>
          </motion.div>
        )}

        {success && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`mb-6 p-4 rounded-xl border flex items-center gap-3 ${isDark ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-green-50 border-green-200 text-green-700'}`}
          >
            <CheckCircle2 size={20} />
            <span className="font-semibold">{typeLabel} successfully initialized! Redirecting...</span>
          </motion.div>
        )}

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`backdrop-blur-md rounded-3xl border overflow-hidden transition-all duration-300 ${isDark ? 'bg-dark-surface/85 border-dark-border/70 shadow-2xl' : 'bg-white/80 border-white/40 shadow-xl shadow-blue-500/5'}`}
        >
          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h3 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${isDark ? 'text-accent-400' : 'text-blue-600'}`}>
                  <Info size={14} /> Basic Information
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-dark-text-muted' : 'text-slate-500'}`}>
                      {typeLabel} Name *
                    </label>
                    <div className="relative">
                      <LayoutGrid className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        name="chapterName"
                        value={formData.chapterName}
                        onChange={handleInputChange}
                        disabled={loading}
                        placeholder={`e.g. AI & Robotics ${typeLabel}`}
                        className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm transition-all outline-none ${isDark ? 'bg-dark-bg border-dark-border focus:border-accent-500 text-dark-text-primary' : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-800'}`}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-dark-text-muted' : 'text-slate-500'}`}>
                      Head Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        name="headName"
                        value={formData.headName}
                        onChange={handleInputChange}
                        disabled={loading}
                        placeholder="e.g. Prof. Alan Turing"
                        className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm transition-all outline-none ${isDark ? 'bg-dark-bg border-dark-border focus:border-accent-500 text-dark-text-primary' : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-800'}`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-dark-text-muted' : 'text-slate-500'}`}>
                      Head Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="email"
                        name="headEmail"
                        value={formData.headEmail}
                        onChange={handleInputChange}
                        disabled={loading}
                        placeholder="head@university.edu"
                        className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm transition-all outline-none ${isDark ? 'bg-dark-bg border-dark-border focus:border-accent-500 text-dark-text-primary' : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-800'}`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${isDark ? 'text-accent-400' : 'text-blue-600'}`}>
                  <CreditCard size={14} /> Financial Configuration
                </h3>

                <div className={`p-6 rounded-2xl border transition-all ${formData.isPaid ? (isDark ? 'bg-accent-500/5 border-accent-500/30 shadow-lg shadow-accent-500/5' : 'bg-blue-50 border-blue-100 shadow-lg shadow-blue-500/5') : (isDark ? 'bg-dark-bg border-dark-border opacity-60' : 'bg-slate-50 border-slate-200 opacity-60')}`}>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className={`font-bold text-sm ${isDark ? 'text-dark-text-primary' : 'text-slate-800'}`}>Paid Membership</p>
                      <p className={`text-[11px] font-medium ${isDark ? 'text-dark-text-secondary' : 'text-slate-500'}`}>Activate Razorpay gateway</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="isPaid"
                        checked={formData.isPaid}
                        onChange={handleInputChange}
                        disabled={loading}
                        className="sr-only peer"
                      />
                      <div className={`w-12 h-6 rounded-full transition-all peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${isDark ? 'bg-dark-border peer-checked:bg-accent-600' : 'bg-slate-300 peer-checked:bg-blue-600'}`}></div>
                    </label>
                  </div>

                  {formData.isPaid && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-2 overflow-hidden"
                    >
                      <label className={`block text-xs font-bold uppercase tracking-wider ${isDark ? 'text-dark-text-muted' : 'text-slate-500'}`}>
                        Registration Fee
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                        <input
                          type="number"
                          name="registrationFee"
                          value={formData.registrationFee || ''}
                          onChange={handleInputChange}
                          disabled={loading}
                          placeholder="0.00"
                          className={`w-full pl-8 pr-4 py-3 border rounded-xl text-sm font-black transition-all outline-none ${isDark ? 'bg-dark-surface border-dark-border focus:border-accent-500 text-dark-text-primary' : 'bg-white border-slate-200 focus:border-blue-500 text-slate-800'}`}
                        />
                      </div>
                      <p className={`text-[10px] italic ${isDark ? 'text-dark-text-secondary' : 'text-slate-500'}`}>
                        Fee will be settled directly to institution account.
                      </p>
                    </motion.div>
                  )}
                </div>

                <div className={`p-4 rounded-xl border text-center ${isDark ? 'bg-dark-bg/50 border-dark-border' : 'bg-slate-50 border-slate-200'}`}>
                   <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-dark-text-muted' : 'text-slate-400'}`}>Projected Access</p>
                   <p className={`text-sm font-bold ${isDark ? 'text-dark-text-primary' : 'text-slate-700'}`}>
                     {formData.isPaid ? `₹${formData.registrationFee} Premium Access` : 'Public Open Access'}
                   </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-6 border-t border-slate-100 dark:border-dark-border">
              <button
                type="button"
                onClick={() => navigate('/admin/dashboard')}
                disabled={loading}
                className={`flex-1 py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${isDark ? 'bg-dark-surface border border-dark-border text-dark-text-secondary hover:text-dark-text-primary hover:bg-dark-card' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                Decline
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`flex-[2] py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl transition-all flex items-center justify-center gap-2 transform hover:scale-[1.01] ${loading ? 'opacity-50 cursor-not-allowed' : ''} ${isDark ? 'bg-accent-600 text-white hover:bg-accent-700 shadow-accent-600/20' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/20'}`}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus size={16} />
                )}
                Initialize {typeLabel}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default CreateChapterWithPayment;
