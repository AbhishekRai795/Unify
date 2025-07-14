export interface Student {
  id: string;
  name: string;
  sapId: string;
  year: number;
  email: string;
  registeredChapters: string[];
  createdAt: string;
}

export interface Admin {
  id: string;
  name: string;
  email: string;
  chapterId?: string;
  permissions: string[];
  createdAt: string;
}

export type UserRole = 'student' | 'admin';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  student?: Student;
  admin?: Admin;
}