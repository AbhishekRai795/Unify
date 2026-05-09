import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { chatbotApi } from '../../services/chatbotApi';

interface Message {
  id: string;
  sender: 'bot' | 'user';
  text: string;
}

export const ChatBotWidget: React.FC = () => {
  const { isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'bot',
      text: "Hi there! I'm your AI Advisor. Ask me for chapter or club recommendations based on your interests!"
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userText = inputMessage.trim();
    setInputMessage('');
    
    // Add user message
    const userMsgId = Date.now().toString();
    setMessages(prev => [...prev, { id: userMsgId, sender: 'user', text: userText }]);
    
    setIsLoading(true);
    
    try {
      const { reply, interestUpdate } = await chatbotApi.askQuestion(userText);
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'bot', text: reply }]);
      if (interestUpdate?.updated) {
        window.dispatchEvent(new CustomEvent('unify-interests-updated', { detail: interestUpdate }));
      }
    } catch (error) {
      console.error("ChatBot error:", error);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        sender: 'bot', 
        text: "I'm sorry, I'm having trouble connecting to the server right now. Please try again later." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Safe markdown-ish rendering for bold text
  const renderMessageText = (text: string) => {
    // Basic replacement of **text** with bold tags and newlines with <br/>
    const formattedText = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br />');
      
    return <span dangerouslySetInnerHTML={{ __html: formattedText }} />;
  };

  return (
    <>
      {/* Floating Action Button (Bottom Left) */}
      <motion.div
        className="fixed bottom-6 left-6 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <AnimatePresence>
          {!isOpen && (
            <motion.button
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              onClick={() => setIsOpen(true)}
              className={`p-4 rounded-full shadow-2xl flex items-center justify-center transition-all transform hover:scale-110 ${
                isDark 
                  ? 'bg-accent-600 text-white hover:bg-accent-500 shadow-accent-600/30' 
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/30'
              }`}
            >
              <MessageSquare size={24} />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.2 } }}
            className={`fixed bottom-24 left-6 z-50 w-[350px] sm:w-[400px] h-[500px] max-h-[80vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden border ${
              isDark 
                ? 'bg-dark-surface border-dark-border shadow-black/50' 
                : 'bg-white border-slate-200 shadow-xl'
            }`}
          >
            {/* Header */}
            <div className={`px-4 py-3 flex justify-between items-center border-b ${
              isDark 
                ? 'bg-dark-bg border-dark-border' 
                : 'bg-slate-50 border-slate-100'
            }`}>
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${isDark ? 'bg-accent-500/20 text-accent-400' : 'bg-blue-100 text-blue-600'}`}>
                  <Bot size={18} />
                </div>
                <div>
                  <h3 className={`font-bold text-sm ${isDark ? 'text-dark-text-primary' : 'text-slate-800'}`}>
                    Unify AI Advisor
                  </h3>
                  <p className={`text-[10px] ${isDark ? 'text-accent-400' : 'text-blue-500'}`}>
                    Powered by Gemini RAG
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className={`p-1.5 rounded-md transition-colors ${
                  isDark ? 'text-dark-text-secondary hover:bg-dark-card' : 'text-slate-400 hover:bg-slate-200'
                }`}
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages Area */}
            <div className={`flex-1 p-4 overflow-y-auto custom-scrollbar flex flex-col gap-4 ${
              isDark ? 'bg-dark-bg/50' : 'bg-slate-50'
            }`}>
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-2 max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 ${
                      msg.sender === 'user' 
                        ? (isDark ? 'bg-dark-card border border-dark-border text-dark-text-secondary' : 'bg-white border border-slate-200 text-slate-500')
                        : (isDark ? 'bg-accent-600 text-white' : 'bg-blue-600 text-white')
                    }`}>
                      {msg.sender === 'user' ? <User size={14} /> : <Bot size={14} />}
                    </div>
                    
                    <div className={`p-3 rounded-2xl text-sm ${
                      msg.sender === 'user'
                        ? (isDark 
                            ? 'bg-dark-card border border-dark-border text-dark-text-primary rounded-tr-sm' 
                            : 'bg-white border border-slate-200 text-slate-800 rounded-tr-sm shadow-sm')
                        : (isDark 
                            ? 'bg-accent-500/10 border border-accent-500/20 text-dark-text-primary rounded-tl-sm' 
                            : 'bg-blue-50 border border-blue-100 text-slate-800 rounded-tl-sm')
                    }`}>
                      {renderMessageText(msg.text)}
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-2 max-w-[85%]">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 ${
                      isDark ? 'bg-accent-600 text-white' : 'bg-blue-600 text-white'
                    }`}>
                      <Bot size={14} />
                    </div>
                    <div className={`p-4 rounded-2xl rounded-tl-sm flex items-center gap-2 ${
                      isDark ? 'bg-accent-500/10 border border-accent-500/20' : 'bg-blue-50 border border-blue-100'
                    }`}>
                      <Loader2 size={16} className={`animate-spin ${isDark ? 'text-accent-400' : 'text-blue-500'}`} />
                      <span className={`text-xs font-medium ${isDark ? 'text-dark-text-secondary' : 'text-slate-500'}`}>
                        Thinking...
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className={`p-3 border-t ${
              isDark ? 'bg-dark-surface border-dark-border' : 'bg-white border-slate-100'
            }`}>
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask about clubs, chapters..."
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm transition-colors outline-none border ${
                    isDark 
                      ? 'bg-dark-bg border-dark-border text-dark-text-primary focus:border-accent-500 placeholder-dark-text-muted' 
                      : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500 placeholder-slate-400'
                  }`}
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading}
                  className={`p-2.5 rounded-xl flex items-center justify-center transition-colors ${
                    !inputMessage.trim() || isLoading
                      ? (isDark ? 'bg-dark-card text-dark-text-muted' : 'bg-slate-100 text-slate-400')
                      : (isDark ? 'bg-accent-600 text-white hover:bg-accent-500' : 'bg-blue-600 text-white hover:bg-blue-700')
                  }`}
                >
                  <Send size={18} className={inputMessage.trim() && !isLoading ? 'transform translate-x-0.5 -translate-y-0.5' : ''} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
