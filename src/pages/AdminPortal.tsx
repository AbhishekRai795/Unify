import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminDashboard from '../components/admin/AdminDashboard';
import ManageChapters from '../components/admin/ManageChapters';
import CreateEvent from '../components/admin/CreateEvent';
import Registrations from '../components/admin/Registrations';

const AdminPortal: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<AdminDashboard />} />
      <Route path="/chapters" element={<ManageChapters />} />
      <Route path="/events/create" element={<CreateEvent />} />
      <Route path="/registrations" element={<Registrations />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
};

export default AdminPortal;