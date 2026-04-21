import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const OAuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Finalizing Google connection...');

  useEffect(() => {
    const error = searchParams.get('error');
    const code = searchParams.get('code');

    if (error) {
      setStatus('error');
      setMessage(error === 'access_denied' ? 'Authorization was denied.' : 'An error occurred during connection.');
    } else if (code) {
      // The backend handles the code exchange via the redirect URI
      // We just need to show a success message and redirect
      setStatus('success');
      setMessage('Google account successfully connected!');
      
      const timer = setTimeout(() => {
        navigate('/head/calendar');
      }, 3000);
      
      return () => clearTimeout(timer);
    } else {
      setStatus('error');
      setMessage('Invalid callback parameters.');
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white/80 backdrop-blur-xl p-8 rounded-3xl border border-white/20 shadow-2xl text-center space-y-6"
      >
        {status === 'loading' && (
          <div className="space-y-4">
            <Loader2 className="h-16 w-16 text-indigo-600 animate-spin mx-auto" />
            <h2 className="text-2xl font-bold text-gray-800">Connecting Google</h2>
            <p className="text-gray-500">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Connection Successful</h2>
            <p className="text-gray-600">{message}</p>
            <p className="text-sm text-gray-400">Redirecting to calendar...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="h-12 w-12 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Connection Failed</h2>
            <p className="text-red-600 font-medium">{message}</p>
            <button 
              onClick={() => navigate('/head/calendar')}
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
            >
              Back to Calendar
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default OAuthCallbackPage;
