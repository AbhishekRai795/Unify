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

  // Fetch message history between two users for a specific chapter
  async getMessageHistory(chapterId: string, otherUserId: string, token: string): Promise<ChatMessage[]> {
    try {
      if (!token) return [];
      const response = await axios.get(`${API_BASE_URL}/api/chat/messages`, {
        params: { chapterId, otherUserId },
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

  // Get active chat threads/conversations for the current user in a specific chapter
  async getConversations(chapterId: string, token: string): Promise<any[]> {
    try {
      if (!token || !chapterId) return [];
      const response = await axios.get(`${API_BASE_URL}/api/chat/conversations`, {
        params: { chapterId },
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
