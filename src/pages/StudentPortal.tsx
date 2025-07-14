import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from '../components/student/Dashboard';
import ChaptersList from '../components/student/ChaptersList';
import ChapterRegistration from '../components/student/ChapterRegistration';
import EventsList from '../components/student/EventsList';
import Profile from '../components/student/Profile';

const StudentPortal: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/chapters" element={<ChaptersList />} />
      <Route path="/chapters/:chapterId/register" element={<ChapterRegistration />} />
      <Route path="/events" element={<EventsList />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="*" element={<Navigate to="/student" replace />} />
    </Routes>
  );
};

export default StudentPortal;