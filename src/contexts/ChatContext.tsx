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

  const getOtherParticipantId = (conv: any): string => {
    const me = user?.sub;
    const a = conv?.participantA;
    const b = conv?.participantB;
    const senderId = conv?.senderId;
    const recipientId = conv?.recipientId;

    if (conv?.otherParticipantId) return conv.otherParticipantId;
    if (conv?.otherUserId) return conv.otherUserId;

    if (me) {
      if (a && b) {
        if (a === me && b !== me) return b;
        if (b === me && a !== me) return a;
      }
      if (senderId && recipientId) {
        if (senderId === me && recipientId !== me) return recipientId;
        if (recipientId === me && senderId !== me) return senderId;
      }
      if (recipientId && recipientId !== me) return recipientId;
    }

    return recipientId || a || b || senderId || '';
  };

  const normalizeConversation = (conv: any, fallbackChapterId?: string) => {
    const chapterId = conv?.chapterId || conv?.chapterID || fallbackChapterId || '';
    const otherParticipantId = getOtherParticipantId(conv);

    return {
      ...conv,
      chapterId,
      otherParticipantId,
      otherParticipantName: conv?.otherParticipantName || conv?.recipientName || conv?.senderName || ''
    };
  };

  const getConversationKey = (conv: any): string => {
    const other =
      conv?.otherParticipantId ||
      conv?.otherUserId ||
      conv?.recipientId ||
      conv?.participantA ||
      conv?.participantB;

    // Prefer deterministic participant-based key (chapter-agnostic) so the same pair
    // stays one thread across role/chapter contexts.
    if (other) return `${other}`;

    const idA = conv?.threadId || conv?.conversationId;
    if (idA) return `id:${String(idA)}`;

    return `unknown-user`;
  };

  const conversationTimestamp = (conv: any): number => {
    const val = conv?.lastMessageAt || conv?.timestamp || conv?.updatedAt || conv?.createdAt;
    return val ? new Date(val).getTime() : 0;
  };

  const mergeByConversationKey = (list: any[]): any[] => {
    const map = new Map<string, any>();

    for (const raw of list || []) {
      const conv = normalizeConversation(raw);
      const key = getConversationKey(conv);
      const existing = map.get(key);
      if (!existing) {
        map.set(key, conv);
        continue;
      }

      const prevTs = conversationTimestamp(existing);
      const nextTs = conversationTimestamp(conv);
      const preferred = nextTs >= prevTs ? { ...existing, ...conv } : { ...conv, ...existing };

      // Keep the freshest timestamp and strongest preview data.
      preferred.lastMessageAt = nextTs >= prevTs ? conv.lastMessageAt || conv.timestamp || conv.updatedAt : existing.lastMessageAt || existing.timestamp || existing.updatedAt;
      preferred.lastMessagePreview = (nextTs >= prevTs ? conv.lastMessagePreview : existing.lastMessagePreview) || conv.lastMessagePreview || existing.lastMessagePreview || conv.lastMessage || existing.lastMessage;

      map.set(key, preferred);
    }

    return Array.from(map.values()).sort((a, b) => conversationTimestamp(b) - conversationTimestamp(a));
  };

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

    if (token) {
      const convs = await chatApi.getConversations(undefined, token);
      const merged = (convs || [])
        .map((conv) => normalizeConversation(conv, chapterIds[0]))
        .filter(Boolean)
        .sort((a, b) => {
          const at = a?.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const bt = b?.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return bt - at;
        });

      const uniqueConversations = mergeByConversationKey(merged);

      setConversations((prev) => {
        const prevScoped = (prev || []).map((conv) => normalizeConversation(conv));
        const carryForward = prevScoped.filter((conv) =>
          !uniqueConversations.some((fresh) => getConversationKey(fresh) === getConversationKey(conv))
        );

        return mergeByConversationKey([...uniqueConversations, ...carryForward]);
      });
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
        console.log('   Connected to Direct Message WS');
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
        console.log('  Disconnected from WS');
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
      chatApi.getMessageHistory(activeConversation.chapterId || undefined, activeConversation.recipientId, token)
        .then((history) => {
          setMessages(history);
          // Ensure unread badges drop immediately after opening a thread.
          refreshConversationsRef.current();
        });
    } else {
      setMessages([]);
    }
  }, [activeConversation]);

  const sendMessage = useCallback((text: string) => {
    if (socketRef.current && isConnected && activeConversation && user) {
      const effectiveChapterId = activeConversation.chapterId || activeChapterId || lastChapterIdsRef.current[0];
      if (!effectiveChapterId) return;
      const messagePayload = {
        action: 'sendMessage',
        chapterId: effectiveChapterId,
        recipientId: activeConversation.recipientId,
        userId: user.sub,
        senderName: user.name || user.email,
        senderEmail: user.email,
        message: text,
        type: 'text'
      };
      socketRef.current.send(JSON.stringify(messagePayload));
    }
  }, [isConnected, activeConversation, user, activeChapterId]);

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
