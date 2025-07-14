export interface Chapter {
  id: string;
  name: string;
  description: string;
  category: string;
  adminId: string;
  adminName: string;
  isRegistrationOpen: boolean;
  memberCount: number;
  maxMembers?: number;
  requirements: string[];
  benefits: string[];
  meetingSchedule: string;
  contactEmail: string;
  imageUrl?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ChapterRegistration {
  id: string;
  studentId: string;
  chapterId: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: string;
  approvedAt?: string;
  notes?: string;
}