import React, { useState, useEffect } from 'react';
import { useChapterHead } from '../../contexts/ChapterHeadContext';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Edit2, 
  Trash2, 
  ChevronRight, 
  AlertCircle,
  Search,
  Filter,
  ArrowLeft,
  DollarSign,
  CheckCircle2,
  XCircle,
  Loader2,
  Tag,
  Download
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { paymentAPI } from '../../services/paymentApi';

interface Event {
  chapterId: string;
  eventId: string;
  title: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  location: string;
  isPaid: boolean;
  registrationFee: number;
  currentAttendees: number;
  maxAttendees: number;
  isLive: boolean;
}

interface EventRegistration {
  userId: string;
  studentName: string;
  studentEmail: string;
  paymentStatus: string;
  joinedAt?: string;
}

const ManageEvents: React.FC = () => {
  const { fetchMyEvents, updateEvent, deleteEvent } = useChapterHead();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'live' | 'draft'>('all');
  
  // Edit State
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedEventForRegistrations, setSelectedEventForRegistrations] = useState<Event | null>(null);
  const [eventRegistrations, setEventRegistrations] = useState<EventRegistration[]>([]);
  const [isLoadingRegistrations, setIsLoadingRegistrations] = useState(false);
  const [registrationsError, setRegistrationsError] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setIsLoading(true);
    try {
      const data = await fetchMyEvents();
      setEvents(data);
    } catch (err) {
      setError('Failed to load events. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;

    setIsUpdating(true);
    try {
      const success = await updateEvent(editingEvent.chapterId, editingEvent.eventId, editingEvent);
      if (success) {
        setEditingEvent(null);
        await loadEvents();
      }
    } catch (err) {
      setError('Failed to update event.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (chapterId: string, eventId: string) => {
    if (!window.confirm('Are you sure you want to delete this event? This will mark it as not live.')) return;

    try {
      const success = await deleteEvent(chapterId, eventId);
      if (success) {
        await loadEvents();
      }
    } catch (err) {
      setError('Failed to delete event.');
    }
  };

  const handleViewRegistrations = async (eventItem: Event) => {
    setSelectedEventForRegistrations(eventItem);
    setIsLoadingRegistrations(true);
    setRegistrationsError(null);
    setEventRegistrations([]);
    try {
      const res = await paymentAPI.getEventRegistrationsForEvent(eventItem.eventId);
      setEventRegistrations(res.registrations || []);
    } catch (err: any) {
      setRegistrationsError(err?.message || 'Failed to load event registrations');
    } finally {
      setIsLoadingRegistrations(false);
    }
  };

  const escapeCsvCell = (value: unknown) => {
    const str = String(value ?? '');
    if (str.includes('"') || str.includes(',') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const handleExportRegistrationsCsv = () => {
    if (!selectedEventForRegistrations || eventRegistrations.length === 0) return;

    const rows = [
      ['Event Title', selectedEventForRegistrations.title],
      ['Event ID', selectedEventForRegistrations.eventId],
      [],
      ['Student Name', 'Email', 'Status', 'Joined At', 'User ID'],
      ...eventRegistrations.map((reg) => ([
        reg.studentName || '',
        reg.studentEmail || '',
        reg.paymentStatus || 'REGISTERED',
        reg.joinedAt ? new Date(reg.joinedAt).toLocaleString() : '',
        reg.userId || ''
      ]))
    ];

    const csvContent = rows
      .map((row) => row.map((cell) => escapeCsvCell(cell)).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `event-registrations-${selectedEventForRegistrations.eventId}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || 
                         (filterType === 'live' && event.isLive) || 
                         (filterType === 'draft' && !event.isLive);
    return matchesSearch && matchesFilter;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <Link to="/head/dashboard" className="flex items-center text-indigo-600 hover:text-indigo-700 mb-2 group">
            <ArrowLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Manage Events</h1>
          <p className="mt-1 text-gray-500">View, edit, and manage your chapter's events</p>
        </div>
        <Link
          to="/head/events/create"
          className="mt-4 md:mt-0 inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-lg text-white bg-indigo-600 hover:bg-indigo-700 transform hover:scale-105 transition-all duration-200"
        >
          Create New Event
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 rounded-xl border border-red-100 flex items-center text-red-700 animate-shake">
          <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-8 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search events..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          <Filter className="h-5 w-5 text-gray-400 mr-1" />
          {(['all', 'live', 'draft'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                filterType === type
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 px-6">
          <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900">No events found</h3>
          <p className="text-gray-500 mt-2 max-w-sm mx-auto">
            {searchTerm || filterType !== 'all' 
              ? "We couldn't find any events matching your criteria."
              : "You haven't created any events yet. Start by creating your first event!"}
          </p>
          {(searchTerm || filterType !== 'all') && (
            <button 
              onClick={() => {setSearchTerm(''); setFilterType('all');}}
              className="mt-4 text-indigo-600 font-medium hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <div 
              key={event.eventId}
              className="group bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
            >
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    event.isLive 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {event.isLive ? 'Live' : 'Draft'}
                  </span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setEditingEvent(event)}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                      title="Edit Event"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(event.chapterId, event.eventId)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                      title="Delete Event"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => {
                        const msg = window.prompt("Enter announcement for students:");
                        if (msg) {
                          updateEvent(event.chapterId, event.eventId, { announcement: msg })
                            .then(() => alert("Announcement sent!"))
                            .catch(() => alert("Failed to send announcement."));
                        }
                      }}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-colors"
                      title="Post Announcement"
                    >
                      <Tag className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2 truncate group-hover:text-indigo-600 transition-colors">
                  {event.title}
                </h3>
                
                <p className="text-gray-500 text-sm line-clamp-2 mb-6 h-10">
                  {event.description}
                </p>

                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center mr-3">
                      <Calendar className="h-4 w-4 text-indigo-600" />
                    </div>
                    {new Date(event.startDateTime).toLocaleDateString()}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center mr-3">
                      <MapPin className="h-4 w-4 text-indigo-600" />
                    </div>
                    <span className="truncate">{event.location}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center mr-3">
                      <Users className="h-4 w-4 text-indigo-600" />
                    </div>
                    {event.currentAttendees || 0} / {event.maxAttendees || '∞'} Attendees
                  </div>
                  <div className="flex items-center text-sm font-bold">
                    <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center mr-3">
                      <DollarSign className="h-4 w-4 text-green-600" />
                    </div>
                    <span className={event.isPaid ? 'text-green-600' : 'text-indigo-600'}>
                      {event.isPaid ? `₹${event.registrationFee}` : 'FREE'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  ID: {event.eventId.substring(0, 8)}...
                </span>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleViewRegistrations(event)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    View Registrations
                  </button>
                  <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedEventForRegistrations && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            onClick={() => setSelectedEventForRegistrations(null)}
          />
          <div className="relative bg-white rounded-3xl w-full max-w-3xl max-h-[85vh] overflow-y-auto shadow-2xl animate-scale-in">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Event Registrations</h2>
                <p className="text-sm text-gray-500">{selectedEventForRegistrations.title}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportRegistrationsCsv}
                  disabled={isLoadingRegistrations || eventRegistrations.length === 0}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
                <button
                  onClick={() => setSelectedEventForRegistrations(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <XCircle className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {isLoadingRegistrations ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 text-indigo-600 animate-spin" />
                </div>
              ) : registrationsError ? (
                <div className="text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">{registrationsError}</div>
              ) : eventRegistrations.length === 0 ? (
                <div className="text-center py-10 text-gray-500">No registrations for this event yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Student</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Email</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eventRegistrations.map((reg, idx) => (
                        <tr key={`${reg.userId}-${idx}`} className="border-b border-gray-100">
                          <td className="px-4 py-3 text-gray-900">{reg.studentName || reg.userId}</td>
                          <td className="px-4 py-3 text-gray-700">{reg.studentEmail || '-'}</td>
                          <td className="px-4 py-3 text-gray-700">{reg.paymentStatus || 'REGISTERED'}</td>
                          <td className="px-4 py-3 text-gray-700">
                            {reg.joinedAt ? new Date(reg.joinedAt).toLocaleString() : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            onClick={() => !isUpdating && setEditingEvent(null)}
          />
          <div className="relative bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in">
            <div className="sticky top-0 bg-white px-8 py-6 border-b border-gray-100 flex justify-between items-center z-10">
              <h2 className="text-2xl font-bold text-gray-900">Edit Event</h2>
              <button 
                onClick={() => setEditingEvent(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                disabled={isUpdating}
              >
                <XCircle className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            
            <form onSubmit={handleUpdate} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Event Title</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                    value={editingEvent.title || ''}
                    onChange={(e) => setEditingEvent({...editingEvent, title: e.target.value})}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                  <textarea
                    rows={4}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all resize-none"
                    value={editingEvent.description || ''}
                    onChange={(e) => setEditingEvent({...editingEvent, description: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Location</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                    value={editingEvent.location || ''}
                    onChange={(e) => setEditingEvent({...editingEvent, location: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Max Attendees</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                    value={editingEvent.maxAttendees || ''}
                    onChange={(e) => setEditingEvent({...editingEvent, maxAttendees: e.target.value ? parseInt(e.target.value) : 0})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                    value={(editingEvent.startDateTime || '').substring(0, 16)}
                    onChange={(e) => setEditingEvent({...editingEvent, startDateTime: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">End Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                    value={(editingEvent.endDateTime || '').substring(0, 16)}
                    onChange={(e) => setEditingEvent({...editingEvent, endDateTime: e.target.value})}
                  />
                </div>

                <div>
                  <label className="flex items-center text-sm font-semibold text-gray-700 mb-4 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mr-3"
                      checked={!!editingEvent.isPaid}
                      onChange={(e) => setEditingEvent({...editingEvent, isPaid: e.target.checked})}
                    />
                    Paid Event?
                  </label>
                </div>

                {editingEvent.isPaid && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Registration Fee (₹)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="number"
                        required
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                        value={editingEvent.registrationFee || 0}
                        onChange={(e) => setEditingEvent({...editingEvent, registrationFee: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="flex items-center text-sm font-semibold text-gray-700 cursor-pointer p-4 bg-indigo-50 rounded-2xl border border-indigo-100 hover:bg-indigo-100 transition-colors">
                    <input
                      type="checkbox"
                      className="w-6 h-6 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mr-3"
                      checked={editingEvent.isLive}
                      onChange={(e) => setEditingEvent({...editingEvent, isLive: e.target.checked})}
                    />
                    <div>
                      <p className="text-indigo-900 font-bold text-base">Make Event Live</p>
                      <p className="text-indigo-700 text-sm">Visible to students on the dashboard</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="pt-6 flex gap-4">
                <button
                  type="button"
                  onClick={() => setEditingEvent(null)}
                  className="flex-1 px-6 py-4 border border-gray-200 text-gray-700 font-bold rounded-2xl hover:bg-gray-50 transition-all"
                  disabled={isUpdating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-3 px-12 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transform hover:scale-[1.02] transition-all flex items-center justify-center disabled:opacity-50"
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageEvents;
