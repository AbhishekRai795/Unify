// src/services/paymentApi.ts
// Payment service for Razorpay integration
// Uses VITE_PAYMENT_API_BASE_URL for the new payment stack (separate from existing backend).
// Falls back to VITE_API_BASE_URL if not set.

const PAYMENT_API_BASE_URL =
  import.meta.env.VITE_PAYMENT_API_BASE_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'https://y0fr6gasgk.execute-api.ap-south-1.amazonaws.com/dev';

const getAuthHeaders = () => {
  const token = localStorage.getItem('idToken');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorText = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { error: errorText || 'Unknown error' };
    }
    throw new Error(errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }
  
  return await response.json();
};

export const paymentAPI = {
  // Get chapter fees (public — no auth required)
  getChapterFees: async (chapterId: string) => {
    try {
      const response = await fetch(`${PAYMENT_API_BASE_URL}/api/chapters/${chapterId}/fees`, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        return await handleResponse(response);
      }
    } catch (err) {
      console.log('API call failed, defaulting to free chapter:', err);
    }
    
    // Default to free chapter if API is unavailable
    return {
      feeInfo: {
        chapterId,
        isPaid: false,
        registrationFee: 0,
        displayFee: 'Free'
      }
    };
  },

  // Create Razorpay order (requires student JWT)
  createRazorpayOrder: async (chapterId: string) => {
    const response = await fetch(`${PAYMENT_API_BASE_URL}/api/payments/create-order`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ chapterId })
    });
    return handleResponse(response);
  },

  // Verify payment signature (public — signed by Razorpay)
  verifyPayment: async (data: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    transactionId: string;
    chapterId: string;
    chapterName: string;
  }) => {
    const response = await fetch(`${PAYMENT_API_BASE_URL}/api/payments/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  // Complete payment registration (requires student JWT)
  completePaymentRegistration: async (data: {
    transactionId: string;
    chapterId: string;
    razorpayPaymentId: string;
  }) => {
    const response = await fetch(`${PAYMENT_API_BASE_URL}/api/payments/complete-registration`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  // Get user payment history (requires student JWT)
  getPaymentHistory: async () => {
    const response = await fetch(`${PAYMENT_API_BASE_URL}/api/payments/details?type=user`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // Get specific payment transaction details (requires student JWT)
  getPaymentDetails: async (chapterId: string, transactionId: string) => {
    const response = await fetch(`${PAYMENT_API_BASE_URL}/api/payments/details?type=transaction&chapterId=${chapterId}&transactionId=${transactionId}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // Get chapter payment statistics — admin use (requires admin JWT)
  getChapterPaymentStats: async (chapterId: string) => {
    const response = await fetch(`${PAYMENT_API_BASE_URL}/api/payments/details?type=chapter&chapterId=${chapterId}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // Create chapter with payment configuration (requires admin JWT)
  // Calls the NEW payment Lambda (not the old createChapter Lambda)
  createChapterWithPayment: async (data: {
    chapterName: string;
    headEmail?: string;
    headName?: string;
    isPaid: boolean;
    registrationFee?: number;
  }) => {
    const response = await fetch(`${PAYMENT_API_BASE_URL}/api/chapters/create-with-payment`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  // Update existing chapter payment configuration (requires admin JWT)
  updateChapterPaymentConfig: async (chapterId: string, data: {
    isPaid: boolean;
    registrationFee: number;
  }) => {
    const response = await fetch(`${PAYMENT_API_BASE_URL}/api/chapters/${chapterId}/payment-config`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },
  
  // Events
  listEvents: async () => {
    const response = await fetch(`${PAYMENT_API_BASE_URL}/api/events`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    return handleResponse(response);
  },

  joinFreeEvent: async (data: { eventId: string, studentName: string, studentEmail: string, chapterId: string }) => {
    const response = await fetch(`${PAYMENT_API_BASE_URL}/api/events/join`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  createEventOrder: async (data: { eventId: string, studentName: string, studentEmail: string }) => {
    const response = await fetch(`${PAYMENT_API_BASE_URL}/api/events/create-order`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  verifyEventPayment: async (data: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    eventId: string;
    userId: string;
    transactionId: string;
  }) => {
    const response = await fetch(`${PAYMENT_API_BASE_URL}/api/events/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  getMyEventRegistrations: async () => {
    const response = await fetch(`${PAYMENT_API_BASE_URL}/api/events/my-registrations`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
    ,
    // For chapter heads: get all registrations for a given event
  getEventRegistrationsForEvent: async (eventId: string) => {
      const response = await fetch(`${PAYMENT_API_BASE_URL}/api/events/registrations?eventId=${encodeURIComponent(eventId)}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },

  // Admin: chapter-level event payment transparency
  getAdminPaymentTransparency: async (chapterId: string, includeRazorpay: boolean = true) => {
    const response = await fetch(
      `${PAYMENT_API_BASE_URL}/api/admin/payments/transparency?chapterId=${encodeURIComponent(chapterId)}&includeRazorpay=${includeRazorpay ? 'true' : 'false'}`,
      {
        method: 'GET',
        headers: getAuthHeaders()
      }
    );
    return handleResponse(response);
  }
};

export default paymentAPI;
