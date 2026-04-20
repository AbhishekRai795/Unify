import { getAuthHeaders } from './paymentApi';

// Simple wrapper for wallet related API calls
export const getWalletBalance = async () => {
  const response = await fetch(`${import.meta.env.VITE_PAYMENT_API_BASE_URL}/api/wallet/balance`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    throw new Error('Failed to fetch wallet balance');
  }
  const data = await response.json();
  return data.balance ?? 0;
};

export const payWithWallet = async ({ amount, chapterId, eventId }) => {
  // amount is in paise (same as registrationFee)
  const body = {
    amount,
    chapterId,
    eventId
  };
  const response = await fetch(`${import.meta.env.VITE_PAYMENT_API_BASE_URL}/api/wallet/pay`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Wallet payment failed');
  }
  return await response.json();
};

export const getWalletHistory = async () => {
  const response = await fetch(`${import.meta.env.VITE_PAYMENT_API_BASE_URL}/api/wallet/history`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    throw new Error('Failed to fetch wallet history');
  }
  const data = await response.json();
  return data.transactions ?? [];
};
