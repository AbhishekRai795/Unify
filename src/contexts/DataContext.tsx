import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Chapter, ChapterRegistration } from '../types/chapter';
import { Event, EventRegistration } from '../types/event';

interface DataContextType {
  chapters: Chapter[];
  events: Event[];
  chapterRegistrations: ChapterRegistration[];
  eventRegistrations: EventRegistration[];
  isLoading: boolean;
  fetchChapters: () => Promise<void>;
  fetchEvents: () => Promise<void>;
  registerForChapter: (chapterId: string, formData?: any) => Promise<boolean>;
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
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [chapterRegistrations, setChapterRegistrations] = useState<ChapterRegistration[]>([]);
  const [eventRegistrations, setEventRegistrations] = useState<EventRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Mock data initialization
  useEffect(() => {
    const mockChapters: Chapter[] = [
      {
        id: '1',
        name: 'Tech Innovators',
        description: 'A community for technology enthusiasts and innovators.',
        category: 'Technology',
        adminId: 'admin1',
        adminName: 'Dr. Smith',
        isRegistrationOpen: true,
        memberCount: 45,
        maxMembers: 100,
        requirements: ['Basic programming knowledge', 'Interest in emerging technologies'],
        benefits: ['Access to tech workshops', 'Networking opportunities', 'Mentorship programs'],
        meetingSchedule: 'Every Wednesday 6:00 PM',
        contactEmail: 'tech@unify.edu',
        imageUrl: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=500',
        tags: ['programming', 'innovation', 'technology'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-15T00:00:00Z'
      },
      {
        id: '2',
        name: 'Creative Arts Society',
        description: 'Explore and express your creativity through various art forms.',
        category: 'Arts',
        adminId: 'admin2',
        adminName: 'Prof. Johnson',
        isRegistrationOpen: false,
        memberCount: 32,
        maxMembers: 50,
        requirements: ['Portfolio submission', 'Creative mindset'],
        benefits: ['Art exhibitions', 'Studio access', 'Creative collaborations'],
        meetingSchedule: 'Every Friday 4:00 PM',
        contactEmail: 'arts@unify.edu',
        imageUrl: 'https://images.pexels.com/photos/1193743/pexels-photo-1193743.jpeg?auto=compress&cs=tinysrgb&w=500',
        tags: ['art', 'creativity', 'expression'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-10T00:00:00Z'
      },
      {
        id: '3',
        name: 'Business Leaders Club',
        description: 'Develop leadership skills and business acumen.',
        category: 'Business',
        adminId: 'admin3',
        adminName: 'Dr. Williams',
        isRegistrationOpen: true,
        memberCount: 28,
        maxMembers: 40,
        requirements: ['Interest in business', 'Leadership potential'],
        benefits: ['Industry connections', 'Case study competitions', 'Leadership training'],
        meetingSchedule: 'Every Tuesday 7:00 PM',
        contactEmail: 'business@unify.edu',
        imageUrl: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=500',
        tags: ['business', 'leadership', 'networking'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-12T00:00:00Z'
      }
    ];

    const mockEvents: Event[] = [
      {
        id: '1',
        title: 'AI Workshop: Future of Technology',
        description: 'Learn about the latest developments in artificial intelligence and machine learning.',
        chapterId: '1',
        chapterName: 'Tech Innovators',
        adminId: 'admin1',
        eventType: 'workshop',
        startDateTime: '2024-02-15T18:00:00Z',
        endDateTime: '2024-02-15T20:00:00Z',
        location: 'Tech Lab A',
        isOnline: false,
        maxAttendees: 50,
        currentAttendees: 23,
        registrationRequired: true,
        registrationDeadline: '2024-02-14T23:59:59Z',
        tags: ['AI', 'machine learning', 'technology'],
        imageUrl: 'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=500',
        isLive: true,
        createdAt: '2024-01-20T00:00:00Z',
        updatedAt: '2024-01-25T00:00:00Z'
      },
      {
        id: '2',
        title: 'Art Exhibition Opening',
        description: 'Showcase of student artwork and creative projects.',
        chapterId: '2',
        chapterName: 'Creative Arts Society',
        adminId: 'admin2',
        eventType: 'social',
        startDateTime: '2024-02-20T17:00:00Z',
        endDateTime: '2024-02-20T21:00:00Z',
        location: 'Art Gallery',
        isOnline: false,
        maxAttendees: 100,
        currentAttendees: 67,
        registrationRequired: false,
        tags: ['art', 'exhibition', 'creativity'],
        imageUrl: 'https://images.pexels.com/photos/1839919/pexels-photo-1839919.jpeg?auto=compress&cs=tinysrgb&w=500',
        isLive: true,
        createdAt: '2024-01-18T00:00:00Z',
        updatedAt: '2024-01-22T00:00:00Z'
      }
    ];

    setChapters(mockChapters);
    setEvents(mockEvents);
  }, []);

  const fetchChapters = async () => {
    setIsLoading(true);
    try {
      // Mock API call - replace with actual Lambda function call
      await new Promise(resolve => setTimeout(resolve, 1000));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      // Mock API call - replace with actual Lambda function call
      await new Promise(resolve => setTimeout(resolve, 1000));
    } finally {
      setIsLoading(false);
    }
  };

  const registerForChapter = async (chapterId: string, formData?: any): Promise<boolean> => {
    try {
      // Mock registration - replace with actual API call
      const newRegistration: ChapterRegistration = {
        id: Math.random().toString(36).substr(2, 9),
        studentId: 'current-student-id',
        chapterId,
        status: 'pending',
        appliedAt: new Date().toISOString(),
        notes: formData ? JSON.stringify(formData) : undefined
      };
      setChapterRegistrations(prev => [...prev, newRegistration]);
      return true;
    } catch (error) {
      console.error('Chapter registration error:', error);
      return false;
    }
  };

  const registerForEvent = async (eventId: string): Promise<boolean> => {
    try {
      // Mock registration - replace with actual API call
      const newRegistration: EventRegistration = {
        id: Math.random().toString(36).substr(2, 9),
        studentId: 'current-student-id',
        eventId,
        registeredAt: new Date().toISOString()
      };
      setEventRegistrations(prev => [...prev, newRegistration]);
      return true;
    } catch (error) {
      console.error('Event registration error:', error);
      return false;
    }
  };

  const updateChapterRegistration = async (chapterId: string, isOpen: boolean): Promise<boolean> => {
    try {
      setChapters(prev => prev.map(chapter => 
        chapter.id === chapterId 
          ? { ...chapter, isRegistrationOpen: isOpen, updatedAt: new Date().toISOString() }
          : chapter
      ));
      return true;
    } catch (error) {
      console.error('Update chapter registration error:', error);
      return false;
    }
  };

  const createEvent = async (eventData: Partial<Event>): Promise<boolean> => {
    try {
      const newEvent: Event = {
        id: Math.random().toString(36).substr(2, 9),
        title: eventData.title || '',
        description: eventData.description || '',
        chapterId: eventData.chapterId || '',
        chapterName: eventData.chapterName || '',
        adminId: 'current-admin-id',
        eventType: eventData.eventType || 'workshop',
        startDateTime: eventData.startDateTime || new Date().toISOString(),
        endDateTime: eventData.endDateTime || new Date().toISOString(),
        location: eventData.location || '',
        isOnline: eventData.isOnline || false,
        meetingLink: eventData.meetingLink,
        maxAttendees: eventData.maxAttendees,
        currentAttendees: 0,
        registrationRequired: eventData.registrationRequired || false,
        registrationDeadline: eventData.registrationDeadline,
        tags: eventData.tags || [],
        imageUrl: eventData.imageUrl,
        isLive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setEvents(prev => [...prev, newEvent]);
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
    isLoading,
    fetchChapters,
    fetchEvents,
    registerForChapter,
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