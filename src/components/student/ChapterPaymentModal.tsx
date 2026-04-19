// ChapterPaymentModal.tsx
// Modal component to handle Razorpay payment flow for chapter registration
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { paymentAPI } from '../../services/paymentApi';

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
  razorpayPaymentId: string;
  razorpayOrderId: string;
  receiptId: string;
  receiptUrl: string;
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
  const { user } = useAuth();



  const handlePayment = async () => {
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
          contact: '+919999999999' // Razorpay recommends country-code formatted phone numbers.
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

      // Initialize Razorpay
      const razorpay = new (window as any).Razorpay(options);
      
      razorpay.on('payment.failed', function (response: any) {
        console.error('Payment failed details:', JSON.stringify(response.error, null, 2));
        setLoading(false);
        setError(`Payment declined: ${response.error?.description || 'Please try again'} (Reason: ${response.error?.reason || 'Unknown'})`);
        // Optional: you can choose not to call onPaymentFailed here if you want to let the user retry in the modal
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

      // Step 3: Verify payment signature via paymentAPI service
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

      // Step 4: Complete registration via paymentAPI service
      const registrationData = await paymentAPI.completePaymentRegistration({
        transactionId: orderData.transactionId,
        chapterId,
        razorpayPaymentId: response.razorpay_payment_id
      });

      if (!registrationData.success) {
        throw new Error(registrationData.error || 'Failed to complete registration');
      }

      // Success!
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Payment Required</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none disabled:opacity-50"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="mb-4">
              <p className="text-gray-600 text-sm mb-1">Chapter</p>
              <p className="text-lg font-semibold text-gray-800">{chapterName}</p>
            </div>

            <div className="border-t border-gray-300 pt-4">
              <p className="text-gray-600 text-sm mb-1">Registration Fee</p>
              <p className="text-3xl font-bold text-blue-600">₹{registrationFee / 100}</p>
            </div>

            <div className="mt-4 bg-blue-50 border border-blue-200 rounded p-3">
              <p className="text-xs text-gray-600">
                <span className="font-semibold">Note:</span> Once payment is complete, you will be automatically registered for this chapter.
              </p>
            </div>
          </div>

        <button
          onClick={handlePayment}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded transition duration-200 flex items-center justify-center"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            'Pay Now'
          )}
        </button>

        <button
          onClick={onClose}
          disabled={loading}
          className="w-full mt-3 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 text-gray-800 font-semibold py-2 px-4 rounded transition duration-200"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default ChapterPaymentModal;
