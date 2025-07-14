export interface Event {
  id: string;
  title: string;
  description: string;
  chapterId: string;
  chapterName: string;
  adminId: string;
  eventType: 'workshop' | 'seminar' | 'competition' | 'meeting' | 'social';
  startDateTime: string;
  endDateTime: string;
  location: string;
  isOnline: boolean;
  meetingLink?: string;
  maxAttendees?: number;
  currentAttendees: number;
  registrationRequired: boolean;
  registrationDeadline?: string;
  tags: string[];
  imageUrl?: string;
  isLive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EventRegistration {
  id: string;
  studentId: string;
  eventId: string;
  registeredAt: string;
  attended?: boolean;
}