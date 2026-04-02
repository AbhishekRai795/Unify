import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { ChatMessage, chatApi } from '../services/chatApi';

interface ActiveConversation {
  chapterId: string;
  recipientId: string;
  recipientName: string;
}

interface ChatContextType {
  messages: ChatMessage[];
  sendMessage: (text: string) => void;
  isConnected: boolean;
  activeConversation: ActiveConversation | null;
  setActiveConversation: (conv: ActiveConversation | null) => void;
  conversations: any[];
  refreshConversations: (chapterId?: string | string[]) => Promise<void>;
  setActiveChapterId: (chapterId: string | null) => void;
  isWidgetOpen: boolean;
  setIsWidgetOpen: (open: boolean) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [activeConversation, setActiveConversation] = useState<ActiveConversation | null>(null);
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const refreshConversationsRef = useRef<(chapterId?: string | string[]) => Promise<void>>(async () => {});
  const lastChapterIdsRef = useRef<string[]>([]);

  const refreshConversations = useCallback(async (chapterId?: string | string[]) => {
    const token = localStorage.getItem('idToken');
    const explicitChapterIds = Array.isArray(chapterId)
      ? chapterId.filter(Boolean)
      : (chapterId ? [chapterId] : []);
    const chapterIds = explicitChapterIds.length > 0
      ? explicitChapterIds
      : (lastChapterIdsRef.current.length > 0
          ? lastChapterIdsRef.current
          : [activeChapterId].filter(Boolean) as string[]);

    if (chapterIds.length > 0) {
      lastChapterIdsRef.current = chapterIds;
    }

    if (token && chapterIds.length > 0) {
      const results = await Promise.all(
        chapterIds.map((cid) => chatApi.getConversations(cid, token))
      );

      const merged = results
        .flat()
        .filter(Boolean)
        .sort((a, b) => {
          const at = a?.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const bt = b?.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return bt - at;
        });

      const uniqueConversations = Array.from(
        new Map(merged.map((conv) => [conv.threadId || conv.conversationId, conv])).values()
      );

      setConversations(uniqueConversations);
    } else {
      setConversations([]);
    }
  }, [activeChapterId]);

  useEffect(() => {
    refreshConversationsRef.current = refreshConversations;
  }, [refreshConversations]);

  // Poll as a fallback in case WS delivery is missed/interrupted.
  useEffect(() => {
    if (!user?.sub) return;

    const intervalId = window.setInterval(() => {
      refreshConversationsRef.current();
    }, 10000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [user?.sub]);

  // Connect to WS globally for the user, not per conversation
  useEffect(() => {
    if (user && user.sub) {
      if (socketRef.current && socketRef.current.readyState < WebSocket.CLOSING) {
        socketRef.current.close();
      }
      const wsUrl = chatApi.getWSUrl(user.sub);
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('✅ Connected to Direct Message WS');
        setIsConnected(true);
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.action === 'receiveMessage') {
          const newMsg = data.message;
          // Append if it belongs to active conversation
          setMessages(prev => {
            // Check if it's currently relevant
            // It could be from the other person we're talking to, or our own echo
            return [...prev, newMsg];
          });
          refreshConversationsRef.current();
        }
      };

      socket.onclose = () => {
        console.log('❌ Disconnected from WS');
        setIsConnected(false);
      };

      socketRef.current = socket;
    }
    return () => {
      if (socketRef.current && socketRef.current.readyState < WebSocket.CLOSING) {
        socketRef.current.close();
      }
    };
  }, [user?.sub]);

  // Fetch history when active conversation changes
  useEffect(() => {
    const token = localStorage.getItem('idToken');
    if (activeConversation && token) {
      chatApi.getMessageHistory(activeConversation.chapterId, activeConversation.recipientId, token)
        .then(setMessages);
    } else {
      setMessages([]);
    }
  }, [activeConversation]);

  const sendMessage = useCallback((text: string) => {
    if (socketRef.current && isConnected && activeConversation && user) {
      const messagePayload = {
        action: 'sendMessage',
        chapterId: activeConversation.chapterId,
        recipientId: activeConversation.recipientId,
        userId: user.sub,
        senderName: user.name || user.email,
        senderEmail: user.email,
        message: text,
        type: 'text'
      };
      socketRef.current.send(JSON.stringify(messagePayload));
    }
  }, [isConnected, activeConversation, user]);

  return (
    <ChatContext.Provider value={{ 
      messages, 
      sendMessage, 
      isConnected, 
      activeConversation, 
      setActiveConversation,
      conversations,
      refreshConversations,
      setActiveChapterId,
      isWidgetOpen,
      setIsWidgetOpen
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
