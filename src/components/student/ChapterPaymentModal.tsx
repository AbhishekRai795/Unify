// ChapterPaymentModal.tsx
// Modal component to handle Razorpay payment flow for chapter registration
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { paymentAPI } from '../../services/paymentApi';
import { getWalletBalance, payWithWallet } from '../../services/walletApi';
import { Wallet, CreditCard, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';

interface ChapterPaymentModalProps {
  isOpen: boolean;
  chapterId: string;
  chapterName: string;
  registrationFee: number;
  onClose: () => void;
  onPaymentSuccess: (paymentData: PaymentSuccessData) => void;
  onPaymentFailed: (error: string) => void;
}

interface PaymentSuccessData {
  transactionId: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  receiptId?: string;
  receiptUrl?: string;
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

export const ChapterPaymentModal: React.FC<ChapterPaymentModalProps> = ({
  isOpen,
  chapterId,
  chapterName,
  registrationFee,
  onClose,
  onPaymentSuccess,
  onPaymentFailed
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
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

  const pointsRequired = Math.ceil(registrationFee / 100);

  const handleWalletPayment = async () => {
    try {
      setLoading(true);
      setError('');
      
      const result = await payWithWallet({
        amount: pointsRequired,
        chapterId,
        eventId: undefined
      });

      if (result.success) {
        onPaymentSuccess({
          transactionId: result.transactionId
        });
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
      setError('');

      // Step 1: Create Razorpay order via paymentAPI service (uses VITE_PAYMENT_API_BASE_URL)
      const orderData = await paymentAPI.createRazorpayOrder(chapterId);

      if (!orderData.orderId) {
        throw new Error('Failed to create payment order');
      }

      await loadRazorpayCheckout();

      // Step 2: Initialize Razorpay payment
      const options = {
        key: orderData.keyId,
        order_id: orderData.orderId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Unify - Chapter Registration',
        description: `Registration fee for ${chapterName}`,
        image: CHECKOUT_IMAGE_URL,
        prefill: {
          name: orderData.studentName || user?.name || '',
          email: orderData.studentEmail || user?.email || '',
          contact: '+919999999999'
        },
        readonly: {
          name: true,
          email: true,
          contact: true
        },
        notes: orderData.notes,
        handler: async (response: RazorpayResponse) => {
          await verifyPayment(response, orderData);
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setError('Payment cancelled');
          }
        }
      };

      const razorpay = new (window as any).Razorpay(options);
      
      razorpay.on('payment.failed', function (response: any) {
        console.error('Payment failed details:', JSON.stringify(response.error, null, 2));
        setLoading(false);
        setError(`Payment declined: ${response.error?.description || 'Please try again'}`);
      });
      
      razorpay.open();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Payment failed';
      setError(errorMsg);
      onPaymentFailed(errorMsg);
      setLoading(false);
    }
  };

  const verifyPayment = async (
    response: RazorpayResponse,
    orderData: any
  ) => {
    try {
      setLoading(true);

      const verifyData = await paymentAPI.verifyPayment({
        razorpayOrderId: response.razorpay_order_id,
        razorpayPaymentId: response.razorpay_payment_id,
        razorpaySignature: response.razorpay_signature,
        transactionId: orderData.transactionId,
        chapterId,
        chapterName
      });

      if (!verifyData.success) {
        throw new Error(verifyData.error || 'Payment verification failed');
      }

      const registrationData = await paymentAPI.completePaymentRegistration({
        transactionId: orderData.transactionId,
        chapterId,
        razorpayPaymentId: response.razorpay_payment_id
      });

      if (!registrationData.success) {
        throw new Error(registrationData.error || 'Failed to complete registration');
      }

      onPaymentSuccess({
        transactionId: orderData.transactionId,
        razorpayPaymentId: response.razorpay_payment_id,
        razorpayOrderId: response.razorpay_order_id,
        receiptId: verifyData.receiptId,
        receiptUrl: verifyData.receiptUrl
      });

      onClose();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Payment verification failed';
      setError(errorMsg);
      onPaymentFailed(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white relative">
          <button 
            onClick={onClose}
            disabled={loading}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <ChevronRight className="rotate-90" />
          </button>
          <div className="flex items-center space-x-3 mb-2">
            <CheckCircle2 className="h-6 w-6" />
            <h2 className="text-xl font-bold">Complete Registration</h2>
          </div>
          <p className="text-blue-100 text-sm opacity-90">Securely join {chapterName}</p>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start space-x-3 text-red-700 animate-in slide-in-from-top-2">
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="space-y-6 mb-8">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Registration Fee</p>
                <p className="text-3xl font-black text-gray-900">₹{registrationFee / 100}</p>
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
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-100 hover:border-blue-200 bg-white'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg ${paymentMode === 'razorpay' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'}`}>
                    <CreditCard size={24} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-900">Razorpay Secured</p>
                    <p className="text-xs text-gray-500">Cards, UPI, Netbanking</p>
                  </div>
                </div>
                {paymentMode === 'razorpay' && <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />}
              </button>
            </div>
          </div>

          <button
            onClick={paymentMode === 'wallet' ? handleWalletPayment : handleRazorpayPayment}
            disabled={loading || !paymentMode}
            className={`w-full py-4 px-6 rounded-xl font-bold text-white transition-all duration-300 shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              paymentMode === 'wallet' 
                ? 'bg-gradient-to-r from-orange-500 to-amber-600 shadow-orange-500/25' 
                : 'bg-gradient-to-r from-blue-600 to-indigo-700 shadow-blue-500/25'
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
            By proceeding, you agree to the Membership Terms. 
            Points payments are non-refundable.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChapterPaymentModal;

