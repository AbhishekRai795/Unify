import React, { useEffect } from 'react';
import { MessageSquare, Clock, User } from 'lucide-react';
import { useChat } from '../../contexts/ChatContext';
import { motion } from 'framer-motion';

const ConversationsList: React.FC = () => {
  const { conversations, refreshConversations, setActiveConversation, setIsWidgetOpen } = useChat();
  const totalUnread = (conversations || []).reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);

  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  if (!conversations || conversations.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-md rounded-xl p-6 border border-white/20 text-center">
        <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Recent Messages</h2>
        <p className="text-gray-500 text-sm">No ongoing conversations right now.</p>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Recent Messages</h2>
        <div className="flex items-center gap-2">
          {totalUnread > 0 && (
            <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full font-semibold">
              {totalUnread} Unread
            </span>
          )}
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
            {conversations.length} Active
          </span>
        </div>
      </div>
      
      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {conversations.map((conv, index) => {
          const conversationKey = conv.threadId || conv.conversationId || `${conv.chapterId}-${conv.otherParticipantId || index}`;
          const recipientId = conv.otherParticipantId || conv.recipientId || conv.participantA || conv.participantB;
          const recipientLabel = conv.otherParticipantName || conv.recipientName || recipientId || 'Student';
          const preview = conv.lastMessagePreview || conv.lastMessage || "No preview available";
          
          return (
            <motion.div
              key={conversationKey}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => {
                if (!recipientId) return;
                setActiveConversation({
                  chapterId: conv.chapterId,
                  recipientId,
                  recipientName: recipientLabel
                });
                setIsWidgetOpen(true);
              }}
              className="flex items-start p-4 bg-gray-50/80 hover:bg-white border text-left border-gray-100 rounded-xl cursor-pointer transition-all shadow-sm hover:shadow active:scale-95 group"
            >
              <div className="p-2 bg-accent/10 rounded-full mr-4 group-hover:bg-accent/20 transition-colors">
                <User className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="font-semibold text-gray-900 text-sm truncate">
                    {recipientLabel}
                  </h4>
                  <div className="flex items-center gap-2">
                    {conv.unreadCount > 0 && (
                      <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                        {conv.unreadCount}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400 flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleDateString() : 'Recent'}
                    </span>
                  </div>
                </div>
                <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-gray-900 font-semibold' : 'text-gray-600 opacity-80'}`}>
                  {preview}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default ConversationsList;
