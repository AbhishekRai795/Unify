import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import HeadDashboard from '../components/admin/HeadDashboard';
import ManageChapters from '../components/admin/ManageChapters';
import Registrations from '../components/admin/Registrations';
import CreateEvent from '../components/admin/CreateEvent';
import { ChapterHeadProvider } from '../contexts/ChapterHeadContext';

const HeadPortal: React.FC = () => {
  return (
    <ChapterHeadProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/head/dashboard" replace />} />
        <Route path="/dashboard" element={<HeadDashboard />} />
        <Route path="/chapters" element={<ManageChapters />} />
        <Route path="/registrations" element={<Registrations />} />
        <Route path="/events/create" element={<CreateEvent />} />
        <Route path="*" element={<Navigate to="/head/dashboard" replace />} />
      </Routes>
    </ChapterHeadProvider>
  );
};

export default HeadPortal;
