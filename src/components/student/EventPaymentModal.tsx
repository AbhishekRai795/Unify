import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { paymentAPI } from '../../services/paymentApi';
import { getWalletBalance, payWithWallet } from '../../services/walletApi';
import { X, CheckCircle, AlertCircle, CreditCard, Wallet, ChevronRight } from 'lucide-react';

interface EventPaymentModalProps {
  isOpen: boolean;
  event: any;
  onClose: () => void;
  onPaymentSuccess: (transactionId: string) => void;
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

const RAZORPAY_CHECKOUT_URL = 'https://checkout.razorpay.com/v1/checkout.js';
const CHECKOUT_IMAGE_URL = 'https://upes-unify.co.in/unify-mark.svg';

const loadRazorpayCheckout = (): Promise<void> => {
  if ((window as any).Razorpay) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${RAZORPAY_CHECKOUT_URL}"]`);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Unable to load Razorpay checkout')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = RAZORPAY_CHECKOUT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Unable to load Razorpay checkout'));
    document.body.appendChild(script);
  });
};

export const EventPaymentModal: React.FC<EventPaymentModalProps> = ({
  isOpen,
  event,
  onClose,
  onPaymentSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [paymentMode, setPaymentMode] = useState<'razorpay' | 'wallet' | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && user) {
      const fetchBalance = async () => {
        try {
          const balance = await getWalletBalance();
          setWalletBalance(balance);
        } catch (err) {
          console.error("Failed to fetch wallet balance:", err);
        }
      };
      fetchBalance();
    }
  }, [isOpen, user]);

  if (!isOpen || !event) return null;

  const pointsRequired = Math.ceil(event.registrationFee); // points are 1:1 with fee

  const handleWalletPayment = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await payWithWallet({
        amount: pointsRequired,
        eventId: event.eventId || event.id,
        chapterId: undefined
      });

      if (result.success) {
        onPaymentSuccess(result.transactionId);
        onClose();
      } else {
        throw new Error(result.error || 'Wallet payment failed');
      }
    } catch (err: any) {
      setError(err.message || 'Payment failed');
      setLoading(false);
    }
  };

  const handleRazorpayPayment = async () => {
    try {
      setLoading(true);
      setError(null);

      const orderData = await paymentAPI.createEventOrder({
        eventId: event.eventId || event.id,
        studentName: user?.name || user?.email || 'Student',
        studentEmail: user?.email || ''
      });

      if (!orderData.orderId) {
        throw new Error('Failed to create payment order');
      }

      await loadRazorpayCheckout();

      const options = {
        key: orderData.key_id,
        order_id: orderData.orderId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Unify Events',
        description: `Registration for ${event.title}`,
        image: CHECKOUT_IMAGE_URL,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: '+919999999999'
        },
        readonly: {
          name: true,
          email: true,
          contact: true
        },
        handler: async (response: RazorpayResponse) => {
          await verifyPayment(response, orderData);
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          }
        }
      };

      const razorpay = new (window as any).Razorpay(options);
      
      razorpay.on('payment.failed', function (response: any) {
        setError(`Payment failed: ${response.error.description}`);
        setLoading(false);
      });
      
      razorpay.open();
    } catch (err: any) {
      setError(err.message || 'Payment initiation failed');
      setLoading(false);
    }
  };

  const verifyPayment = async (response: RazorpayResponse, orderData: any) => {
    try {
      setLoading(true);
      const verifyData = await paymentAPI.verifyEventPayment({
        razorpayOrderId: response.razorpay_order_id,
        razorpayPaymentId: response.razorpay_payment_id,
        razorpaySignature: response.razorpay_signature,
        eventId: event.eventId || event.id,
        userId: orderData.registration?.userId || user?.email || '',
        transactionId: orderData.transactionId
      });

      if (verifyData.success) {
        onPaymentSuccess(verifyData.transactionId);
        onClose();
      } else {
        throw new Error(verifyData.error || 'Verification failed');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 p-6 text-white relative">
          <button 
            onClick={onClose}
            disabled={loading}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
          <div className="flex items-center space-x-3 mb-2">
            <CreditCard className="h-6 w-6" />
            <h2 className="text-xl font-bold">Event Registration</h2>
          </div>
          <p className="text-purple-100 text-sm opacity-90">Securely join {event.title}</p>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start space-x-3 text-red-700 animate-in slide-in-from-top-2">
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="space-y-6 mb-8">
            <div className="flex justify-between items-start pb-4 border-b border-gray-100">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Event Fee</p>
                <p className="text-2xl font-black text-gray-900 leading-tight">₹{event.registrationFee}</p>
                <p className="text-sm text-purple-600 font-medium mt-1">by {event.chapterName}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Required Points</p>
                <p className="text-xl font-bold text-orange-600">{pointsRequired} pts</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Select Payment Method</p>
              
              {/* Wallet Option */}
              <button
                onClick={() => setPaymentMode('wallet')}
                disabled={loading || (walletBalance !== null && walletBalance < pointsRequired)}
                className={`w-full group relative flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200 ${
                  paymentMode === 'wallet' 
                    ? 'border-orange-500 bg-orange-50' 
                    : 'border-gray-100 hover:border-orange-200 bg-white'
                } ${(walletBalance !== null && walletBalance < pointsRequired) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg ${paymentMode === 'wallet' ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-600'}`}>
                    <Wallet size={24} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-900">Pay with Wallet</p>
                    <p className="text-xs text-gray-500">
                      Balance: {walletBalance !== null ? `${walletBalance} pts` : 'Loading...'}
                    </p>
                  </div>
                </div>
                {paymentMode === 'wallet' && <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />}
              </button>

              {/* Razorpay Option */}
              <button
                onClick={() => setPaymentMode('razorpay')}
                disabled={loading}
                className={`w-full group relative flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200 ${
                  paymentMode === 'razorpay' 
                    ? 'border-purple-500 bg-purple-50' 
                    : 'border-gray-100 hover:border-purple-200 bg-white'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg ${paymentMode === 'razorpay' ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-600'}`}>
                    <CreditCard size={24} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-900">Razorpay Secured</p>
                    <p className="text-xs text-gray-500">Cards, UPI, Netbanking</p>
                  </div>
                </div>
                {paymentMode === 'razorpay' && <div className="h-2 w-2 rounded-full bg-purple-600 animate-pulse" />}
              </button>
            </div>
          </div>

          <button
            onClick={paymentMode === 'wallet' ? handleWalletPayment : handleRazorpayPayment}
            disabled={loading || !paymentMode}
            className={`w-full py-4 px-6 rounded-xl font-bold text-white transition-all duration-300 shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              paymentMode === 'wallet' 
                ? 'bg-gradient-to-r from-orange-500 to-amber-600 shadow-orange-500/25' 
                : 'bg-gradient-to-r from-purple-600 to-indigo-700 shadow-purple-500/25'
            }`}
          >
            {loading ? (
              <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{paymentMode === 'wallet' ? 'Confirm Points Payment' : 'Pay via Razorpay'}</span>
                <ChevronRight size={18} />
              </>
            )}
          </button>
          
          <p className="mt-4 text-center text-[10px] text-gray-400">
            By clicking Checkout, you agree to our Terms of Service.
            Points payments are non-refundable.
          </p>
        </div>
      </div>
    </div>
  );
};

