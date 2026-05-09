// src/services/chatbotApi.ts
const PAYMENT_API_BASE_URL =
  import.meta.env.VITE_PAYMENT_API_BASE_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'https://y0fr6gasgk.execute-api.ap-south-1.amazonaws.com/dev';

export const chatbotApi = {
  async askQuestion(message: string) {
    const token = localStorage.getItem('idToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${PAYMENT_API_BASE_URL}/api/chatbot`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`ChatBot Error: ${errText}`);
    }

    const data = await response.json();
    return {
      reply: data.reply || '',
      interestUpdate: data.interestUpdate || null
    };
  }
};
