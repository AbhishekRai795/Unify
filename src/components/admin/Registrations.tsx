import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useChapterHead } from '../../contexts/ChapterHeadContext';
import { useChat } from '../../contexts/ChatContext';
import { chapterHeadAPI } from '../../services/chapterHeadApi';
import { Filter, Search, Calendar, Mail, CheckCircle, XCircle, Clock, AlertCircle, RefreshCw, MessageSquare, Download, User, Hash, UserMinus, ArrowLeft, Layers } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import Modal from '../common/Modal';
import Loader from '../common/Loader';
import { useTheme } from '../../contexts/ThemeContext';

const Registrations: React.FC = () => {
  const { isDark } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const { 
    registrations: chapterRegistrations, 
    updateRegistrationStatus, 
    fetchRegistrations, 
    isLoading: isChapterLoading, 
    error: chapterError, 
    refreshData 
  } = useChapterHead();
  const { setActiveConversation, setIsWidgetOpen, refreshConversations } = useChat();
  
  // Consolidation State - Persisted via Search Params
  const viewMode = (searchParams.get('type') as 'chapters' | 'events') || 'chapters';
  const setViewMode = (mode: 'chapters' | 'events') => setSearchParams({ type: mode }, { replace: true });

  const [eventRegistrations, setEventRegistrations] = useState<any[]>([]);
  const [isEventLoading, setIsEventLoading] = useState(false);
  const [eventError, setEventError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'kicked' | 'left' | 'removed'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'status' | 'event'>('date');
  const [selectedRegistration, setSelectedRegistration] = useState<any>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'kick' | 'remove'>('approve');
  const [actionNotes, setActionNotes] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fetchEventRegistrations = async () => {
    setIsEventLoading(true);
    try {
      const data = await chapterHeadAPI.getEventRegistrations();
      setEventRegistrations(data.registrations || []);
      setEventError(null);
    } catch (err: any) {
      setEventError(err.message || 'Failed to fetch event registrations');
    } finally {
      setIsEventLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'chapters') {
      fetchRegistrations();
    } else {
      fetchEventRegistrations();
    }
  }, [viewMode]);

  const handleStatusUpdate = async (registrationId: string, newStatus: 'approved' | 'rejected' | 'removed') => {
    setProcessingAction(true);
    try {
      if (viewMode === 'chapters') {
        const success = await updateRegistrationStatus(registrationId, newStatus as any, actionNotes);
        if (success) {
          setNotification({ type: 'success', message: `Registration ${newStatus} successfully` });
          setShowActionModal(false);
          setActionNotes('');
        } else {
          setNotification({ type: 'error', message: 'Failed to update registration status' });
        }
      } else {
        await chapterHeadAPI.updateEventRegistrationStatus(registrationId, newStatus, actionNotes);
        setNotification({ type: 'success', message: `Event registration ${newStatus} successfully` });
        setShowActionModal(false);
        setActionNotes('');
        fetchEventRegistrations(); // Refresh list
      }
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      setNotification({ type: 'error', message: error.message || 'An error occurred while updating' });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setProcessingAction(false);
    }
  };

  const handleKickStudent = async (studentEmail: string) => {
    setProcessingAction(true);
    try {
      await chapterHeadAPI.kickStudent(studentEmail, actionNotes);
      setNotification({ type: 'success', message: 'Student removed from chapter successfully' });
      setShowActionModal(false);
      setActionNotes('');
      fetchRegistrations();
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      setNotification({ type: 'error', message: error.message || 'Failed to remove student from chapter' });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setProcessingAction(false);
    }
  };

  const openActionModal = (registration: any, action: 'approve' | 'reject' | 'kick' | 'remove') => {
    setSelectedRegistration(registration);
    setActionType(action);
    setShowActionModal(true);
  };

  const startChatWithStudent = async (registration: any) => {
    const recipientId = registration.userId || registration.studentEmail;
    if (!recipientId || !registration.chapterId) return;

    setActiveConversation({
      chapterId: registration.chapterId,
      recipientId,
      recipientName: registration.studentName || 'Student'
    });
    setIsWidgetOpen(true);
    await refreshConversations(registration.chapterId);
  };

  const currentData = viewMode === 'chapters' ? chapterRegistrations : eventRegistrations;
  const currentLoading = viewMode === 'chapters' ? isChapterLoading : isEventLoading;
  const currentError = viewMode === 'chapters' ? chapterError : eventError;

  const filteredRegistrations = currentData.filter(reg => {
    const matchesSearch = 
      reg.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.studentEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (reg.chapterName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (reg.eventTitle || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || reg.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const sortedRegistrations = [...filteredRegistrations].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.studentName.localeCompare(b.studentName);
      case 'status':
        return a.status.localeCompare(b.status);
      case 'event':
        return (a.eventTitle || '').localeCompare(b.eventTitle || '');
      case 'date':
      default:
        return new Date(b.appliedAt || b.createdAt).getTime() - new Date(a.appliedAt || a.createdAt).getTime();
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'kicked':
      case 'removed':
        return <UserMinus className="h-4 w-4 text-orange-600" />;
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
      case 'removed':
        return 'text-orange-600 bg-orange-50';
      case 'left':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-yellow-600 bg-yellow-50';
    }
  };

  const handleExport = () => {
    const headers = viewMode === 'chapters' 
      ? ['Student Name', 'Email', 'SAP ID', 'Year', 'Chapter', 'Status', 'Applied Date', 'Notes']
      : ['Student Name', 'Email', 'Event Title', 'Status', 'Applied Date', 'Notes'];

    const rows = sortedRegistrations.map(reg => viewMode === 'chapters' 
      ? [
          reg.studentName || '',
          reg.studentEmail || '',
          reg.sapId || '',
          reg.year || '',
          reg.chapterName || '',
          reg.status,
          new Date(reg.appliedAt).toLocaleDateString(),
          reg.notes || ''
        ]
      : [
          reg.studentName || '',
          reg.studentEmail || '',
          reg.eventTitle || '',
          reg.status,
          new Date(reg.appliedAt || reg.createdAt).toLocaleDateString(),
          reg.notes || ''
        ]
    );

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${viewMode}-registrations-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (currentLoading && currentData.length === 0) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-dark-bg' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'}`}>
        <Loader />
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-dark-bg' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'}`}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <div className="mb-6">
          <button
            onClick={() => window.location.href = '/head/dashboard'}
            className={`group flex items-center text-sm font-medium transition-all duration-200 ${isDark ? 'text-dark-text-secondary hover:text-dark-text-primary' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <div className={`p-2 mr-2 rounded-lg border transition-all ${isDark ? 'bg-dark-surface border-dark-border group-hover:border-accent-500/50 group-hover:bg-accent-600/10' : 'bg-white border-slate-200 group-hover:border-blue-300 group-hover:bg-blue-50'}`}>
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            </div>
            Back to Dashboard
          </button>
        </div>

        {/* Header */}
        <motion.div 
          key={viewMode}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="flex items-center justify-center space-x-4 mb-4">
            <div className={`h-[2px] w-12 rounded-full ${isDark ? 'bg-accent-500/30' : 'bg-blue-200'}`} />
            <div className={`w-2 h-2 rounded-full ${isDark ? 'bg-accent-400' : 'bg-blue-500'}`} />
            <div className={`h-[2px] w-12 rounded-full ${isDark ? 'bg-accent-500/30' : 'bg-blue-200'}`} />
          </div>
          <h1 className={`
            text-4xl font-bold mb-4 transition-all duration-300 tracking-tight
            ${isDark 
              ? 'text-dark-text-primary' 
              : 'text-[#1a1f36]'
            }
          `}>
            {viewMode === 'chapters' ? 'Student Registrations' : 'Event Registrations'}
          </h1>
          <p className={`
            text-lg max-w-2xl mx-auto transition-colors duration-300 font-normal
            ${isDark ? 'text-dark-text-secondary' : 'text-slate-500'}
          `}>
            {viewMode === 'chapters' 
              ? 'View and manage registrations for your communities (chapters and clubs).' 
              : 'View and manage student entries for specific community events.'}
          </p>
        </motion.div>

        {/* Notification */}
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-lg flex items-center ${
              notification.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle className="h-5 w-5 mr-2" /> : <AlertCircle className="h-5 w-5 mr-2" />}
            {notification.message}
          </motion.div>
        )}

        {/* Error Display */}
        {currentError && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
                <p className="text-red-800">{currentError}</p>
              </div>
              <button
                onClick={viewMode === 'chapters' ? refreshData : fetchEventRegistrations}
                className="ml-3 text-red-600 hover:text-red-700"
                disabled={currentLoading}
              >
                <RefreshCw className={`h-4 w-4 ${currentLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </motion.div>
        )}

        {/* Filters */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`backdrop-blur-md rounded-xl p-6 border mb-8 transition-colors duration-300 ${isDark ? 'bg-dark-surface/85 border-dark-border/70' : 'bg-white/80 border-white/20'}`}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-center">
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
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="kicked">Kicked</option>
              <option value="left">Left</option>
              {viewMode === 'events' && <option value="removed">Removed</option>}
            </select>

            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="date">Sort by Date</option>
              <option value="name">Sort by Name</option>
              <option value="status">Sort by Status</option>
            </select>

            {/* Results Count */}
            <div className="flex items-center text-sm text-gray-600 bg-gray-50/50 px-4 py-2 rounded-lg border border-gray-100 h-full">
              <Filter className="h-4 w-4 mr-2 text-blue-500" />
              <span className="font-medium">{sortedRegistrations.length} found</span>
            </div>

            {/* View Mode Switcher - REPLACED DROPDOWN WITH TOGGLE */}
            <div className={`
              lg:col-span-1 p-1 rounded-xl border backdrop-blur-sm flex items-center gap-1
              ${isDark ? 'bg-dark-bg/40 border-dark-border/50' : 'bg-slate-50/50 border-slate-200/50'}
            `}>
              {(['chapters', 'events'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`
                    flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300
                    ${viewMode === mode
                      ? (isDark 
                          ? 'bg-dark-surface text-accent-400 shadow-lg border border-accent-500/30' 
                          : 'bg-white text-blue-600 shadow-md border border-blue-100'
                        )
                      : (isDark 
                          ? 'text-dark-text-muted hover:text-dark-text-secondary' 
                          : 'text-slate-400 hover:text-slate-500'
                        )
                    }
                  `}
                >
                  <Layers size={12} className={viewMode === mode ? 'animate-pulse text-current' : 'text-current'} />
                  {mode}
                </button>
              ))}
            </div>

            {/* Export Action */}
            <button
              onClick={handleExport}
              className="flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-[1.02] text-sm font-bold w-full h-full"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </motion.div>

        {/* Table */}
        <div className="bg-white/80 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {viewMode === 'chapters' ? 'Community' : 'Event'}
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
                          <div className={`text-sm font-medium ${isDark ? 'text-dark-text-primary' : 'text-gray-900'}`}>
                            {registration.studentName}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {registration.studentEmail}
                          </div>
                          {viewMode === 'chapters' && (
                            <div className="flex items-center space-x-4">
                              {registration.year && <div className="text-xs text-gray-400">Year: {registration.year}</div>}
                              {registration.sapId && (
                                <div className="text-xs text-gray-400 flex items-center">
                                  <Hash className="h-3 w-3 mr-1" />
                                  SAP: {registration.sapId}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className={`text-sm font-medium ${isDark ? 'text-dark-text-primary' : 'text-gray-900'}`}>
                        {viewMode === 'chapters' ? registration.chapterName : (registration.eventTitle || 'Untitled Event')}
                      </div>
                      <div className="text-xs text-gray-500">
                        ID: {(viewMode === 'chapters' ? registration.chapterId : registration.eventId)?.substring(0, 8)}
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
                    
                    <td className="px-6 py-4 text-sm">
                      <div className={`flex items-center ${isDark ? 'text-dark-text-primary' : 'text-gray-900'}`}>
                        <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                        {new Date(registration.appliedAt || registration.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(registration.appliedAt || registration.createdAt), { addSuffix: true })}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => startChatWithStudent(registration)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors duration-200 flex items-center"
                          title="Chat with Student"
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Chat
                        </button>
                        {registration.status === 'pending' ? (
                          <>
                            <button 
                              onClick={() => openActionModal(registration, 'approve')}
                              className="text-green-600 hover:text-green-700 text-sm font-medium"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => openActionModal(registration, 'reject')}
                              className="text-red-600 hover:text-red-700 text-sm font-medium"
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          registration.status === 'approved' && (
                            <button 
                              onClick={() => openActionModal(registration, viewMode === 'chapters' ? 'kick' : 'remove')}
                              className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center"
                            >
                              <UserMinus className="h-4 w-4 mr-1" />
                              {viewMode === 'chapters' ? 'Remove' : 'Remove'}
                            </button>
                          )
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
              <Layers className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No registrations found</h3>
              <p className="text-gray-600">No results match your current filters.</p>
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
          title={`${actionType.charAt(0).toUpperCase() + actionType.slice(1)} Registration`}
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              Are you sure you want to {actionType === 'kick' || actionType === 'remove' ? 'remove this entry' : actionType}? 
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Reason or instructions..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => { setShowActionModal(false); setActionNotes(''); }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedRegistration) {
                     if (actionType === 'kick') {
                        handleKickStudent(selectedRegistration.studentEmail);
                     } else {
                        handleStatusUpdate(selectedRegistration.registrationId, actionType as any);
                     }
                  }
                }}
                className={`px-4 py-2 text-white rounded-lg transition-colors ${
                  actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
                disabled={processingAction}
              >
                {processingAction ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default Registrations;
