import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import HeadDashboard from '../components/admin/HeadDashboard';
import ManageChapters from '../components/admin/ManageChapters';
import EditChapter from '../components/admin/EditChapter';
import EditChapterProfile from '../components/admin/EditChapterProfile';
import Registrations from '../components/admin/Registrations';
import CreateEvent from '../components/admin/CreateEvent';
import { ChapterHeadProvider } from '../contexts/ChapterHeadContext';
import HeadMessaging from './HeadMessaging';

import ManageEvents from '../components/admin/ManageEvents';
import EditEventProfile from '../components/admin/EditEventProfile';
import PaymentStatsPage from './PaymentStatsPage';
import CertificateIssuance from '../components/admin/CertificateIssuance';
import ChapterCalendarPage from './ChapterCalendarPage';
import HeadAttendance from './attendance/HeadAttendance';
import AttendanceSelectionPage from './attendance/AttendanceSelectionPage';

const HeadPortal: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/head/dashboard" replace />} />
      <Route path="/dashboard" element={<HeadDashboard />} />
      <Route path="/chapters" element={<ManageChapters />} />
      <Route path="/chapters/edit/:chapterId" element={<EditChapter />} />
      <Route path="/chapters/profile/:chapterId" element={<EditChapterProfile />} />
      <Route path="/registrations" element={<Registrations />} />
      <Route path="/events/create" element={<CreateEvent />} />
      <Route path="/events/manage" element={<ManageEvents />} />
      <Route path="/events/profile/:eventId" element={<EditEventProfile />} />
      <Route path="/messages" element={<HeadMessaging />} />
      <Route path="/chapter/:chapterId/stats" element={<PaymentStatsPage />} />
      <Route path="certificates" element={<CertificateIssuance />} />
      <Route path="certificates/:eventId" element={<CertificateIssuance />} />
      <Route path="/calendar" element={<ChapterCalendarPage />} />
      <Route path="/attendance/select" element={<AttendanceSelectionPage />} />
      <Route path="/attendance/:meetingId" element={<HeadAttendance />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
};


export default HeadPortal;
