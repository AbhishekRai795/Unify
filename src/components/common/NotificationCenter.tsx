import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Clock, ExternalLink, AlertCircle, Loader2, Video } from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';
import { googleMeetAPI } from '../../services/googleMeetApi';
import { useTheme } from '../../contexts/ThemeContext';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  notificationId: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

const NotificationCenter: React.FC = () => {
  const { isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await googleMeetAPI.getNotifications();
      const fetchedNotifications = (response.notifications || [])
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setNotifications(fetchedNotifications);
      setUnreadCount(fetchedNotifications.filter((n: Notification) => !n.isRead).length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Smart Polling Logic
  useEffect(() => {
    fetchNotifications();
    
    let interval: any;
    const startPolling = () => {
      const isVisible = document.visibilityState === 'visible';
      const delay = isVisible ? 30000 : 300000; // 30s vs 5m
      
      if (interval) clearInterval(interval);
      interval = setInterval(fetchNotifications, delay);
    };

    const handleVisibilityChange = () => {
      startPolling();
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await googleMeetAPI.markNotificationRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n.notificationId === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n.notificationId);
    if (unreadIds.length === 0) return;

    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      
      // We try the "all" endpoint first, but if it fails (CORS/Route issue), 
      // we fallback to individual updates to ensure it works.
      try {
        await googleMeetAPI.markAllNotificationsRead();
      } catch (e) {
        console.warn('Bulk mark all failed, falling back to individual updates:', e);
        await Promise.all(unreadIds.map(id => googleMeetAPI.markNotificationRead(id)));
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      fetchNotifications();
    }
  };

  const handleBellClick = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      fetchNotifications();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <button
        onClick={handleBellClick}
        className={`
          relative p-2 rounded-xl transition-all duration-300 shadow-sm
          ${isDark 
            ? 'bg-dark-card/80 border-dark-border text-dark-text-secondary hover:text-accent-400 hover:bg-dark-surface' 
            : 'bg-white border-gray-200 text-gray-600 hover:text-blue-600 hover:shadow-md'
          }
          backdrop-blur-md border
        `}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-lg animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className={`
              absolute right-0 mt-3 w-80 md:w-96 rounded-2xl shadow-2xl border overflow-hidden z-50
              ${isDark 
                ? 'bg-dark-surface/95 border-dark-border' 
                : 'bg-white/95 border-gray-200'
              }
              backdrop-blur-xl
            `}
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-bold text-lg text-gray-800 dark:text-dark-text-primary">Notifications</h3>
              <button 
                onClick={handleMarkAllRead}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-accent-400 dark:hover:text-accent-300"
              >
                Mark all as read
              </button>
            </div>

            {/* List */}
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
              {isLoading && notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Loading your alerts...</p>
                </div>
              ) : notifications.length > 0 ? (
                <div className="divide-y divide-white/5">
                  {notifications.map((notification) => (
                    <div 
                      key={notification.notificationId}
                      className={`
                        p-4 transition-colors relative group
                        ${notification.isRead ? 'opacity-60' : 'bg-indigo-50/10 dark:bg-accent-500/5'}
                        hover:bg-gray-50 dark:hover:bg-white/5
                      `}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`
                          mt-1 p-2 rounded-lg 
                          ${notification.type === 'meeting' ? 'bg-indigo-100 text-indigo-600' : 'bg-blue-100 text-blue-600'}
                        `}>
                          {notification.type === 'meeting' ? <Video className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold truncate ${isDark ? 'text-dark-text-primary' : 'text-gray-900'}`}>
                            {notification.title}
                          </p>
                          <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-dark-text-secondary' : 'text-gray-600'}`}>
                            {notification.message}
                          </p>
                          <div className="flex items-center space-x-2 mt-2">
                            <Clock className="h-3 w-3 text-gray-400" />
                            <span className="text-[10px] text-gray-400">
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="absolute top-4 right-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notification.isRead && (
                          <button 
                            onClick={() => handleMarkAsRead(notification.notificationId)}
                            className="p-1 bg-white dark:bg-dark-card rounded-md shadow-sm border border-gray-100 dark:border-dark-border text-green-600 hover:bg-green-50"
                            title="Mark as read"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                        )}
                        {notification.link && (
                          <a 
                            href={notification.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 bg-white dark:bg-dark-card rounded-md shadow-sm border border-gray-100 dark:border-dark-border text-indigo-600 hover:bg-indigo-50"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <Bell className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium whitespace-nowrap">You're all caught up!</p>
                  <p className="text-xs text-gray-400 mt-1">No new notifications</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 text-center border-t border-white/10">
              <button 
                onClick={() => setIsOpen(false)}
                className="text-xs text-gray-500 hover:text-indigo-600 font-medium"
              >
                Close Center
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationCenter;
