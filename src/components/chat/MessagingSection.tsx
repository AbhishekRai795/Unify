import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Search, Send, User, Wifi, WifiOff } from 'lucide-react';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

interface MessagingSectionProps {
  title: string;
  subtitle: string;
  chapterIds: string[];
  backPath: string;
}

const MessagingSection: React.FC<MessagingSectionProps> = ({
  title,
  subtitle,
  chapterIds,
  backPath
}) => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const {
    conversations,
    messages,
    isConnected,
    activeConversation,
    setActiveConversation,
    refreshConversations,
    setActiveChapterId,
    sendMessage,
    setIsWidgetOpen
  } = useChat();
  const [searchTerm, setSearchTerm] = useState('');
  const [inputText, setInputText] = useState('');
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsWidgetOpen(false);
  }, [setIsWidgetOpen]);

  useEffect(() => {
    if (chapterIds.length === 0) return;
    setActiveChapterId(chapterIds[0]);
    refreshConversations(chapterIds);
  }, [chapterIds, setActiveChapterId, refreshConversations]);

  useEffect(() => {
    if (!activeConversation) return;
    const el = messagesContainerRef.current;
    if (!el) return;
    // Scroll only inside the chat pane, never the whole page.
    el.scrollTop = el.scrollHeight;
  }, [messages.length, activeConversation?.recipientId]);

  const filteredConversations = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return conversations || [];

    return (conversations || []).filter((conv: any) => {
      const recipientLabel = (conv.otherParticipantName || conv.recipientName || conv.otherParticipantId || '').toLowerCase();
      const preview = (conv.lastMessagePreview || conv.lastMessage || '').toLowerCase();
      return recipientLabel.includes(query) || preview.includes(query);
    });
  }, [conversations, searchTerm]);

  const handleSelectConversation = (conv: any) => {
    const recipientId = conv.otherParticipantId || conv.recipientId || conv.participantA || conv.participantB;
    const recipientLabel = conv.otherParticipantName || conv.recipientName || recipientId || 'User';
    if (!recipientId || !conv.chapterId) return;

    setActiveConversation({
      chapterId: conv.chapterId,
      recipientId,
      recipientName: recipientLabel
    });
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text) return;
    sendMessage(text);
    setInputText('');
  };

  return (
    <div className={isDark ? 'aurora-bg' : ''}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <Link
            to={backPath}
            className={`
              group flex items-center text-sm font-medium transition-all duration-200
              ${isDark ? 'text-dark-text-secondary hover:text-accent-300' : 'text-slate-600 hover:text-slate-900'}
            `}
          >
            <div className={`
              p-2 mr-2 rounded-lg border transition-all
              ${isDark 
                ? 'bg-dark-surface/40 border-accent-500/20 group-hover:border-accent-400 group-hover:bg-accent-500/10' 
                : 'bg-white border-slate-200 group-hover:border-blue-300 group-hover:bg-blue-50'
              }
            `}>
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            </div>
            Back to Dashboard
          </Link>
        </div>

        <div className="text-center mb-10">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <div className={`h-[2px] w-12 rounded-full ${isDark ? 'bg-accent-500/30' : 'bg-blue-200'}`} />
            <div className={`w-2 h-2 rounded-full ${isDark ? 'bg-accent-400' : 'bg-blue-500'}`} />
            <div className={`h-[2px] w-12 rounded-full ${isDark ? 'bg-accent-500/30' : 'bg-blue-200'}`} />
          </div>
          <h1 className={`
            text-4xl font-bold mb-4 transition-all duration-300 tracking-tight
            ${isDark 
              ? 'text-dark-text-primary' 
              : 'text-[#1a1f36]'
            }
          `}>
            {title}
          </h1>
          <p className={`
            text-lg font-normal max-w-2xl mx-auto transition-colors duration-300
            ${isDark ? 'text-dark-text-secondary' : 'text-slate-500'}
          `}>
            {subtitle}
          </p>
        </div>

        <div className="rounded-2xl border border-white/30 dark:border-dark-border/50 shadow-xl overflow-hidden bg-white/70 dark:bg-dark-surface/60 backdrop-blur-md h-[calc(100vh-240px)] min-h-[620px]">
          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] h-full min-h-0">
            <aside className="border-r border-gray-200/70 dark:border-dark-border/50 h-full min-h-0 flex flex-col">
              <div className="p-4 pt-5 border-b border-gray-200/70 dark:border-dark-border/50 bg-gradient-to-r from-accent/10 to-primary/10 shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">Conversations</h2>
                    <p className="text-xs text-gray-600 dark:text-dark-text-secondary">
                      {(conversations || []).length} active threads
                    </p>
                  </div>
                  <button
                    onClick={() => refreshConversations(chapterIds)}
                    className="text-xs px-3 py-1 rounded-lg border border-gray-200 dark:border-dark-border text-gray-600 dark:text-dark-text-secondary hover:text-accent hover:border-accent transition-colors"
                  >
                    Refresh
                  </button>
                </div>
                <div className="relative mt-3">
                  <Search className="h-4 w-4 text-gray-400 dark:text-dark-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search chats..."
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-dark-border bg-white/90 dark:bg-dark-card text-gray-900 dark:text-dark-text-primary outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 space-y-2">
                {filteredConversations.length > 0 ? (
                  filteredConversations.map((conv: any, index: number) => {
                    const conversationKey = conv.threadId || conv.conversationId || `${conv.chapterId}-${conv.otherParticipantId || index}`;
                    const recipientId = conv.otherParticipantId || conv.recipientId || conv.participantA || conv.participantB;
                    const recipientLabel = conv.otherParticipantName || conv.recipientName || recipientId || 'User';
                    const preview = conv.lastMessagePreview || conv.lastMessage || 'No messages yet';
                    const isSelected = activeConversation?.recipientId === recipientId && activeConversation?.chapterId === conv.chapterId;

                    return (
                      <button
                        key={conversationKey}
                        onClick={() => handleSelectConversation(conv)}
                        className={`
                          w-full text-left p-3 rounded-xl border transition-all
                          ${isSelected
                            ? 'bg-accent/10 border-accent/40'
                            : 'bg-white/70 dark:bg-dark-card/40 border-gray-100 dark:border-dark-border/40 hover:border-accent/30 hover:bg-accent/5'
                          }
                        `}
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-accent to-primary text-white flex items-center justify-center font-semibold text-sm">
                            {recipientLabel?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold text-sm text-gray-900 dark:text-dark-text-primary truncate">{recipientLabel}</p>
                              {conv.unreadCount > 0 && (
                                <span className="min-w-5 h-5 px-1.5 rounded-full bg-green-500 text-white text-[10px] font-bold inline-flex items-center justify-center">
                                  {conv.unreadCount}
                                </span>
                              )}
                            </div>
                            <p className={`text-xs mt-1 truncate ${conv.unreadCount > 0 ? 'text-gray-900 dark:text-dark-text-primary font-semibold' : 'text-gray-500 dark:text-dark-text-muted'}`}>
                              {preview}
                            </p>
                            <p className="text-[10px] text-gray-400 dark:text-dark-text-muted mt-1">
                              {conv.lastMessageAt
                                ? new Date(conv.lastMessageAt).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                                : 'recent'}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center px-4">
                    <MessageSquare className="h-12 w-12 text-gray-300 dark:text-dark-text-muted mb-2" />
                    <p className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">No conversations found</p>
                    <p className="text-xs text-gray-500 dark:text-dark-text-muted mt-1">Start from Registrations or wait for new messages.</p>
                  </div>
                )}
              </div>
            </aside>

            <section className="h-full min-h-0 flex flex-col">
              <div className="p-4 border-b border-gray-200/70 dark:border-dark-border/50 bg-white/70 dark:bg-dark-surface/70 shrink-0">
                {activeConversation ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-accent to-primary text-white flex items-center justify-center">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary">{activeConversation.recipientName}</h3>
                        <p className="text-xs text-gray-500 dark:text-dark-text-muted">
                          {isConnected ? 'Online messaging' : 'Connecting...'}
                        </p>
                      </div>
                    </div>
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${isConnected ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                      {isConnected ? 'Connected' : 'Offline'}
                    </div>
                  </div>
                ) : (
                  <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary">Select a conversation</h3>
                )}
              </div>

              <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 bg-gray-50/70 dark:bg-dark-bg/60">
                {!activeConversation ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <MessageSquare className="h-14 w-14 text-gray-300 dark:text-dark-text-muted mb-3" />
                    <p className="font-semibold text-gray-700 dark:text-dark-text-secondary">Your messages will appear here</p>
                    <p className="text-sm text-gray-500 dark:text-dark-text-muted mt-1">Choose a chat from the left panel to begin.</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <MessageSquare className="h-14 w-14 text-gray-300 dark:text-dark-text-muted mb-3" />
                    <p className="font-semibold text-gray-700 dark:text-dark-text-secondary">No messages yet</p>
                    <p className="text-sm text-gray-500 dark:text-dark-text-muted mt-1">Send the first message to start this conversation.</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMe = msg.senderId === user?.sub;
                    return (
                      <div key={`${msg.messageId || idx}-${msg.timestamp || msg.createdAt || idx}`} className={`mb-3 flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`
                            max-w-[80%] px-3 py-2 rounded-2xl text-sm shadow-sm whitespace-pre-wrap break-words
                            ${isMe
                              ? 'bg-accent text-white rounded-br-md'
                              : 'bg-white dark:bg-dark-card text-gray-800 dark:text-dark-text-primary border border-gray-100 dark:border-dark-border rounded-bl-md'
                            }
                          `}
                        >
                          <p>{msg.message}</p>
                          <p className={`text-[10px] mt-1 ${isMe ? 'text-white/80' : 'text-gray-400 dark:text-dark-text-muted'}`}>
                            {new Date((msg.timestamp || msg.createdAt) || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={handleSend} className="p-4 border-t border-gray-200/70 dark:border-dark-border/50 bg-white/80 dark:bg-dark-surface/80 shrink-0">
                <div className="flex items-center gap-2">
                  <input
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={activeConversation ? 'Type a message' : 'Select a conversation to start messaging'}
                    disabled={!activeConversation}
                    className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-dark-text-primary outline-none focus:ring-2 focus:ring-accent disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={!activeConversation || !inputText.trim()}
                    className="h-10 w-10 rounded-xl bg-accent text-white inline-flex items-center justify-center hover:opacity-90 disabled:opacity-50 transition-opacity"
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagingSection;
