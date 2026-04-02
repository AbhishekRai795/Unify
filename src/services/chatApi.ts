// chatApi.ts
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_PAYMENT_API_BASE_URL || 'https://s9t1485z29.execute-api.ap-south-1.amazonaws.com/dev';
const WS_URL = import.meta.env.VITE_CHAT_WS_URL || 'wss://6ayj45jfui.execute-api.ap-south-1.amazonaws.com/dev';

export interface ChatMessage {
  threadId: string;
  timestamp: string;
  messageId: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  chapterId: string;
  message: string;
  messageType: 'text' | 'announcement';
  createdAt?: string;
}

export const chatApi = {
  buildAuthHeader(token: string): string {
    if (!token) return "";
    return token.startsWith("Bearer ") ? token : `Bearer ${token}`;
  },

  // Fetch message history between two users. chapterId is optional for backward compatibility.
  async getMessageHistory(chapterId: string | undefined, otherUserId: string, token: string): Promise<ChatMessage[]> {
    try {
      if (!token) return [];
      const params: any = { otherUserId };
      if (chapterId) params.chapterId = chapterId;
      const response = await axios.get(`${API_BASE_URL}/api/chat/messages`, {
        params,
        headers: {
          Authorization: this.buildAuthHeader(token)
        }
      });
      return response.data.messages || [];
    } catch (error) {
      console.warn("Failed to fetch chat history, starting with empty:", error);
      return [];
    }
  },

  // Get active chat threads/conversations for the current user.
  // chapterId is optional; when omitted backend returns all participant threads.
  async getConversations(chapterId: string | undefined, token: string): Promise<any[]> {
    try {
      if (!token) return [];
      const params: any = {};
      if (chapterId) params.chapterId = chapterId;
      const response = await axios.get(`${API_BASE_URL}/api/chat/conversations`, {
        params,
        headers: {
          Authorization: this.buildAuthHeader(token)
        }
      });
      return response.data.conversations || [];
    } catch (error) {
      console.warn("Failed to fetch conversations:", error);
      return [];
    }
  },

  getWSUrl(userId: string): string {
    return `${WS_URL}?userId=${encodeURIComponent(userId)}`;
  }
};
