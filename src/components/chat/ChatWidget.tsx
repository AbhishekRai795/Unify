import React, { useRef, useEffect } from 'react';
import { MessageSquare, Send, X, User } from 'lucide-react';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const ChatWidget: React.FC = () => {
  const { user } = useAuth();
  const { messages, sendMessage, isConnected, activeConversation, isWidgetOpen, setIsWidgetOpen } = useChat();
  const [inputText, setInputText] = React.useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isWidgetOpen) scrollToBottom();
  }, [messages, isWidgetOpen]);

  if (!activeConversation) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      sendMessage(inputText);
      setInputText('');
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isWidgetOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-accent-500/30 rounded-2xl shadow-2xl w-80 sm:w-96 h-[70vh] max-h-[640px] min-h-[420px] flex flex-col overflow-hidden mb-4"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-accent to-primary p-4 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <div>
                  <h3 className="font-bold text-sm">{activeConversation.recipientName}</h3>
                  <p className="text-[10px] opacity-80">{isConnected ? '● Connected' : '○ Connecting...'}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsWidgetOpen(false)}
                className="hover:bg-white/20 p-1 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-dark-bg/50 custom-scrollbar">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                  <MessageSquare className="h-12 w-12 mb-2" />
                  <p className="text-sm">Start the conversation with {activeConversation.recipientName}</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMe = msg.senderId === user?.sub;
                  return (
                    <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      {!isMe && <span className="text-[10px] text-gray-500 dark:text-dark-text-muted ml-2 mb-1">{msg.senderName}</span>}
                      <div className={`
                        max-w-[80%] p-3 rounded-2xl text-sm shadow-sm whitespace-pre-wrap break-words
                        ${isMe 
                          ? 'bg-accent text-white rounded-tr-none' 
                          : 'bg-white dark:bg-dark-card text-gray-800 dark:text-dark-text-primary border border-gray-100 dark:border-dark-border rounded-tl-none'
                        }
                      `}>
                        {msg.message}
                      </div>
                      <span className="text-[8px] text-gray-400 mt-1 opacity-60">
                        {new Date((msg.timestamp || msg.createdAt) || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 border-t border-gray-100 dark:border-dark-border bg-white dark:bg-dark-surface">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-50 dark:bg-dark-card border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-accent transition-all dark:text-dark-text-primary outline-none"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="bg-accent text-white p-2 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all shadow-md active:scale-95"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatWidget;
