import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from '../components/student/Dashboard';
import ChaptersList from '../components/student/ChaptersList';
import ChapterRegistration from '../components/student/ChapterRegistration';
import EventsList from '../components/student/EventsList';
import Profile from '../components/student/Profile';
import PaymentHistory from '../components/student/PaymentHistory';
import StudentMessaging from './StudentMessaging';
import ChapterPublicProfile from './ChapterPublicProfile';
import EventPublicProfile from './EventPublicProfile';

const StudentPortal: React.FC = () => {
  return (
    <Routes>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="chapters" element={<ChaptersList />} />
      <Route path="chapters/:chapterId/about" element={<ChapterPublicProfile />} />
      <Route path="chapters/:chapterId/register" element={<ChapterRegistration />} />
      <Route path="events" element={<EventsList />} />
      <Route path="events/:eventId/about" element={<EventPublicProfile />} />
      <Route path="profile" element={<Profile />} />
      <Route path="payments/history" element={<PaymentHistory />} />
      <Route path="messages" element={<StudentMessaging />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
};

export default StudentPortal;
