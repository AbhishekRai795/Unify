import React, { useState, useEffect } from 'react';
import { useChapterHead } from '../../contexts/ChapterHeadContext';
import { chapterHeadAPI } from '../../services/chapterHeadApi';
import { Filter, Search, Calendar, Mail, CheckCircle, XCircle, Clock, AlertCircle, RefreshCw, MessageSquare, Download, User, Hash, UserMinus } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import Modal from '../common/Modal';
import Loader from '../common/Loader';

const Registrations: React.FC = () => {
  const { 
    registrations, 
    updateRegistrationStatus, 
    fetchRegistrations, 
    isLoading, 
    error, 
    refreshData 
  } = useChapterHead();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'kicked' | 'left'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'status'>('date');
  const [selectedRegistration, setSelectedRegistration] = useState<string | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'kick'>('approve');
  const [actionNotes, setActionNotes] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const handleStatusUpdate = async (registrationId: string, newStatus: 'approved' | 'rejected') => {
    setProcessingAction(true);
    try {
      const success = await updateRegistrationStatus(registrationId, newStatus, actionNotes);
      if (success) {
        setNotification({
          type: 'success',
          message: `Registration ${newStatus} successfully`
        });
        setShowActionModal(false);
        setActionNotes('');
        setTimeout(() => setNotification(null), 3000);
      } else {
        setNotification({
          type: 'error',
          message: 'Failed to update registration status'
        });
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (error) {
      setNotification({
        type: 'error',
        message: 'An error occurred while updating'
      });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setProcessingAction(false);
    }
  };

  const handleKickStudent = async (studentEmail: string) => {
    setProcessingAction(true);
    try {
      await chapterHeadAPI.kickStudent(studentEmail, actionNotes);
      setNotification({
        type: 'success',
        message: 'Student removed from chapter successfully'
      });
      setShowActionModal(false);
      setActionNotes('');
      // Refresh registrations to update the UI
      fetchRegistrations();
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      setNotification({
        type: 'error',
        message: 'Failed to remove student from chapter'
      });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setProcessingAction(false);
    }
  };

  const openActionModal = (registrationId: string, action: 'approve' | 'reject' | 'kick') => {
    setSelectedRegistration(registrationId);
    setActionType(action);
    setShowActionModal(true);
  };

  const filteredRegistrations = registrations.filter(reg => {
    const matchesSearch = reg.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reg.studentEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reg.chapterName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || reg.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const sortedRegistrations = [...filteredRegistrations].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.studentName.localeCompare(b.studentName);
      case 'status':
        return a.status.localeCompare(b.status);
      case 'date':
      default:
        return new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime();
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'kicked':
        return <UserMinus className="h-4 w-4 text-red-600" />;
      case 'left':
        return <UserMinus className="h-4 w-4 text-gray-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-600 bg-green-50';
      case 'rejected':
        return 'text-red-600 bg-red-50';
      case 'kicked':
        return 'text-red-600 bg-red-50';
      case 'left':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-yellow-600 bg-yellow-50';
    }
  };  const handleExport = () => {
    const csvContent = [
      ['Student Name', 'Email', 'SAP ID', 'Year', 'Chapter', 'Status', 'Applied Date', 'Notes'],
      ...sortedRegistrations.map(reg => [
        reg.studentName || '',
        reg.studentEmail || '',
        reg.sapId || '',
        reg.year || '',
        reg.chapterName || '',
        reg.status,
        new Date(reg.appliedAt).toLocaleDateString(),
        reg.notes || ''
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registrations-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading && registrations.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Registrations</h1>
              <p className="text-gray-600">
                View and manage student chapter registrations.
              </p>
            </div>
            <button
              onClick={handleExport}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Notification */}
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`mb-6 p-4 rounded-lg flex items-center ${
              notification.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle className="h-5 w-5 mr-2" />
            ) : (
              <AlertCircle className="h-5 w-5 mr-2" />
            )}
            {notification.message}
          </motion.div>
        )}

        {/* Error Display */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
                <p className="text-red-800">{error}</p>
              </div>
              <button
                onClick={refreshData}
                className="ml-3 text-red-600 hover:text-red-700"
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </motion.div>
        )}

        {/* Filters */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-md rounded-xl p-6 border border-white/20 mb-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'approved' | 'rejected' | 'kicked' | 'left')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="kicked">Kicked</option>
              <option value="left">Left</option>
            </select>

            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'status')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="date">Sort by Date</option>
              <option value="name">Sort by Name</option>
              <option value="status">Sort by Status</option>
            </select>

            {/* Results Count */}
            <div className="flex items-center text-sm text-gray-600">
              <Filter className="h-4 w-4 mr-2" />
              <span>{sortedRegistrations.length} registrations</span>
            </div>
          </div>
        </motion.div>

        {/* Registrations Table */}
        <div className="bg-white/80 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chapter
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applied Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedRegistrations.map((registration, index) => (
                  <motion.tr 
                    key={registration.registrationId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50/50 transition-colors duration-200"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mr-3">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {registration.studentName}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {registration.studentEmail}
                          </div>
                          {registration.sapId && (
                            <div className="text-sm text-gray-500 flex items-center">
                              <Hash className="h-3 w-3 mr-1" />
                              {registration.sapId}
                            </div>
                          )}
                          {registration.year && (
                            <div className="text-xs text-gray-400">
                              Year: {registration.year}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {registration.chapterName}
                      </div>
                      <div className="text-xs text-gray-500">
                        ID: {registration.chapterId}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {getStatusIcon(registration.status)}
                        <span className={`ml-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(registration.status)}`}>
                          {registration.status.charAt(0).toUpperCase() + registration.status.slice(1)}
                        </span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                        {new Date(registration.appliedAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(registration.appliedAt), { addSuffix: true })}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {registration.status === 'pending' && (
                          <>
                            <button 
                              onClick={() => openActionModal(registration.registrationId, 'approve')}
                              className="text-green-600 hover:text-green-700 text-sm font-medium transition-colors duration-200"
                              disabled={processingAction}
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => openActionModal(registration.registrationId, 'reject')}
                              className="text-red-600 hover:text-red-700 text-sm font-medium transition-colors duration-200"
                              disabled={processingAction}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {registration.status === 'approved' && (
                          <>
                            <span className="text-green-600 text-sm flex items-center">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approved
                            </span>
                            <button 
                              onClick={() => openActionModal(registration.registrationId, 'kick')}
                              className="text-red-600 hover:text-red-700 text-sm font-medium transition-colors duration-200 flex items-center"
                              disabled={processingAction}
                              title="Remove student from chapter"
                            >
                              <UserMinus className="h-4 w-4 mr-1" />
                              Remove
                            </button>
                          </>
                        )}
                        {registration.status === 'rejected' && (
                          <span className="text-red-600 text-sm flex items-center">
                            <XCircle className="h-4 w-4 mr-1" />
                            Rejected
                          </span>
                        )}
                        {registration.notes && (
                          <button
                            onClick={() => alert(registration.notes)}
                            className="text-blue-600 hover:text-blue-700 text-sm"
                            title="View notes"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {sortedRegistrations.length === 0 && (
            <div className="text-center py-12">
              <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No registrations found</h3>
              <p className="text-gray-600">
                No student registrations match your current filters.
              </p>
            </div>
          )}
        </div>

        {/* Action Modal */}
        <Modal
          isOpen={showActionModal}
          onClose={() => {
            setShowActionModal(false);
            setActionNotes('');
            setSelectedRegistration(null);
          }}
          title={`${actionType === 'approve' ? 'Approve' : actionType === 'reject' ? 'Reject' : 'Remove Student from'} Registration`}
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              Are you sure you want to {actionType === 'kick' ? 'remove this student from the chapter' : `${actionType} this registration`}? 
              {actionType === 'approve' 
                ? ' The student will receive access to the chapter.' 
                : actionType === 'reject'
                  ? ' The student will be notified of the rejection.'
                  : ' The student will be removed from the chapter and their status will be updated.'
              }
            </p>

            <div>
              <label htmlFor="actionNotes" className="block text-sm font-medium text-gray-700 mb-2">
                Notes (optional)
              </label>
              <textarea
                id="actionNotes"
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={actionType === 'approve' 
                  ? "Welcome message or additional instructions..."
                  : actionType === 'reject'
                    ? "Reason for rejection or feedback..."
                    : "Reason for removal..."}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => {
                  setShowActionModal(false);
                  setActionNotes('');
                  setSelectedRegistration(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                disabled={processingAction}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedRegistration) {
                    if (actionType === 'kick') {
                      const registration = registrations.find(r => r.registrationId === selectedRegistration);
                      if (registration) {
                        handleKickStudent(registration.studentEmail);
                      }
                    } else {
                      const status = actionType === 'approve' ? 'approved' : 'rejected';
                      handleStatusUpdate(selectedRegistration, status);
                    }
                  }
                }}
                disabled={processingAction}
                className={`px-4 py-2 text-white rounded-lg transition-colors duration-200 flex items-center ${
                  actionType === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                } ${processingAction ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {processingAction && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                {actionType === 'approve' ? 'Approve' : actionType === 'reject' ? 'Reject' : 'Remove Student'}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default Registrations;