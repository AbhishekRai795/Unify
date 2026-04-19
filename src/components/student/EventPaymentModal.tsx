// src/components/student/EventPaymentModal.tsx
// Modal component to handle Razorpay payment flow for event registration
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { paymentAPI } from '../../services/paymentApi';
import { X, CheckCircle, AlertCircle, CreditCard } from 'lucide-react';

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
  const { user } = useAuth();

  if (!isOpen || !event) return null;

  const handlePayment = async () => {
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

      // Step 2: Initialize Razorpay payment
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
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
          <div className="flex items-center space-x-3 mb-2">
            <CreditCard className="h-6 w-6" />
            <h2 className="text-xl font-bold">Event Registration</h2>
          </div>
          <p className="text-blue-100 text-sm opacity-90">Secure payment via Razorpay</p>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start space-x-3 text-red-700 animate-in slide-in-from-top-2">
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="space-y-4 mb-8">
            <div className="flex justify-between items-start pb-4 border-b border-gray-100">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Event</p>
                <p className="text-lg font-bold text-gray-900 leading-tight">{event.title}</p>
                <p className="text-sm text-blue-600 font-medium">by {event.chapterName}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Fee</p>
                <p className="text-2xl font-black text-gray-900">₹{event.registrationFee}</p>
              </div>
            </div>

            <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100/50">
              <div className="flex items-center space-x-2 text-blue-800 font-semibold mb-1 uppercase tracking-wide text-[10px]">
                <CheckCircle className="h-3 w-3" />
                <span>What's included</span>
              </div>
              <ul className="text-xs text-gray-600 space-y-1 ml-5 list-disc">
                <li>Gauranteed entry to the event</li>
                <li>Digital certificate of participation</li>
                <li>Networking opportunities with attendees</li>
              </ul>
            </div>
          </div>

          <button
            onClick={handlePayment}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {loading ? (
              <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Secure Checkout</span>
                <X size={16} className="rotate-45 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
          
          <p className="mt-4 text-center text-[10px] text-gray-400">
            By clicking Checkout, you agree to our Terms of Service.
            Payments are processed securely through Razorpay.
          </p>
        </div>
      </div>
    </div>
  );
};
