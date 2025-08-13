import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Chapter, ChapterRegistration } from '../types/chapter';
import { Event, EventRegistration } from '../types/event';
import { studentAPI } from '../services/api';
import { useAuth } from './AuthContext';

interface DataContextType {
  chapters: Chapter[];
  events: Event[];
  chapterRegistrations: ChapterRegistration[];
  eventRegistrations: EventRegistration[];
  myChapters: any[];
  dashboardData: any;
  isLoading: boolean;
  error: string | null;
  fetchChapters: () => Promise<void>;
  fetchEvents: () => Promise<void>;
  fetchMyChapters: () => Promise<void>;
  fetchDashboard: () => Promise<void>;
  registerForChapter: (chapterId: string, formData?: any) => Promise<boolean>;
  leaveChapter: (chapterId: string) => Promise<boolean>;
  registerForEvent: (eventId: string) => Promise<boolean>;
  updateChapterRegistration: (chapterId: string, isOpen: boolean) => Promise<boolean>;
  createEvent: (eventData: Partial<Event>) => Promise<boolean>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [chapterRegistrations, setChapterRegistrations] = useState<ChapterRegistration[]>([]);
  const [eventRegistrations, setEventRegistrations] = useState<EventRegistration[]>([]);
  const [myChapters, setMyChapters] = useState<any[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-fetch data when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user?.activeRole === 'student') {
      fetchChapters();
      fetchMyChapters();
      fetchDashboard();
    }
  }, [isAuthenticated, user?.activeRole]);

  const fetchChapters = async () => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await studentAPI.getAllChapters();
      setChapters(response.chapters || []);
    } catch (error) {
      console.error('Error fetching chapters:', error);
      setError('Failed to fetch chapters');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMyChapters = async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await studentAPI.getMyChapters();
      setMyChapters(response.chapters || []);
    } catch (error) {
      console.error('Error fetching my chapters:', error);
    }
  };

  const fetchDashboard = async () => {
    if (!isAuthenticated) return;
    
    try {
      const data = await studentAPI.getDashboard();
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    }
  };

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      // Placeholder for events API - add when you implement events
      await new Promise(resolve => setTimeout(resolve, 1000));
    } finally {
      setIsLoading(false);
    }
  };

  const registerForChapter = async (chapterId: string, formData?: any): Promise<boolean> => {
    if (!user) return false;
    
    try {
      await studentAPI.registerForChapter(chapterId, {
        name: user.name,
        email: user.email
      });
      
      // Refresh data after successful registration
      await fetchMyChapters();
      await fetchDashboard();
      return true;
    } catch (error) {
      console.error('Chapter registration error:', error);
      setError('Failed to register for chapter');
      return false;
    }
  };

  const leaveChapter = async (chapterId: string): Promise<boolean> => {
    try {
      await studentAPI.leaveChapter(chapterId);
      
      // Refresh data after leaving
      await fetchMyChapters();
      await fetchDashboard();
      return true;
    } catch (error) {
      console.error('Leave chapter error:', error);
      setError('Failed to leave chapter');
      return false;
    }
  };

  const registerForEvent = async (eventId: string): Promise<boolean> => {
    try {
      // Placeholder for event registration
      return true;
    } catch (error) {
      console.error('Event registration error:', error);
      return false;
    }
  };

  const updateChapterRegistration = async (chapterId: string, isOpen: boolean): Promise<boolean> => {
    try {
      // This would be handled by admin APIs
      return true;
    } catch (error) {
      console.error('Update chapter registration error:', error);
      return false;
    }
  };

  const createEvent = async (eventData: Partial<Event>): Promise<boolean> => {
    try {
      // Placeholder for event creation
      return true;
    } catch (error) {
      console.error('Create event error:', error);
      return false;
    }
  };

  const value: DataContextType = {
    chapters,
    events,
    chapterRegistrations,
    eventRegistrations,
    myChapters,
    dashboardData,
    isLoading,
    error,
    fetchChapters,
    fetchEvents,
    fetchMyChapters,
    fetchDashboard,
    registerForChapter,
    leaveChapter,
    registerForEvent,
    updateChapterRegistration,
    createEvent
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};
