import React, { useState } from 'react';
import { Search, Filter, Download, User, Mail, Calendar, Hash } from 'lucide-react';
import { useData } from '../../contexts/DataContext';

const Registrations: React.FC = () => {
  const { chapters, chapterRegistrations } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Mock student data for registrations
  const mockStudents = [
    { id: '1', name: 'John Doe', email: 'john@example.com', sapId: 'SAP123456', year: 2024 },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', sapId: 'SAP789012', year: 2023 },
    { id: '3', name: 'Mike Johnson', email: 'mike@example.com', sapId: 'SAP345678', year: 2024 },
  ];

  // Mock registrations with student data
  const mockRegistrations = [
    {
      id: '1',
      studentId: '1',
      chapterId: '1',
      status: 'approved' as const,
      appliedAt: '2024-01-15T10:00:00Z',
      approvedAt: '2024-01-16T14:30:00Z'
    },
    {
      id: '2',
      studentId: '2',
      chapterId: '1',
      status: 'pending' as const,
      appliedAt: '2024-01-20T09:15:00Z'
    },
    {
      id: '3',
      studentId: '3',
      chapterId: '2',
      status: 'approved' as const,
      appliedAt: '2024-01-18T16:45:00Z',
      approvedAt: '2024-01-19T11:20:00Z'
    }
  ];

  const registrationsWithDetails = mockRegistrations.map(reg => {
    const student = mockStudents.find(s => s.id === reg.studentId);
    const chapter = chapters.find(c => c.id === reg.chapterId);
    return {
      ...reg,
      student,
      chapter
    };
  });

  const filteredRegistrations = registrationsWithDetails.filter(reg => {
    const matchesSearch = reg.student?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reg.student?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reg.student?.sapId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reg.chapter?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesChapter = selectedChapter === 'all' || reg.chapterId === selectedChapter;
    const matchesStatus = selectedStatus === 'all' || reg.status === selectedStatus;

    return matchesSearch && matchesChapter && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleExport = () => {
    // Mock export functionality
    const csvContent = [
      ['Student Name', 'Email', 'SAP ID', 'Chapter', 'Status', 'Applied Date'],
      ...filteredRegistrations.map(reg => [
        reg.student?.name || '',
        reg.student?.email || '',
        reg.student?.sapId || '',
        reg.chapter?.name || '',
        reg.status,
        new Date(reg.appliedAt).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'registrations.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

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

        {/* Filters */}
        <div className="bg-white/80 backdrop-blur-md rounded-xl p-6 border border-white/20 mb-8">
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

            {/* Chapter Filter */}
            <select
              value={selectedChapter}
              onChange={(e) => setSelectedChapter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Chapters</option>
              {chapters.map(chapter => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            {/* Results Count */}
            <div className="flex items-center text-sm text-gray-600">
              <Filter className="h-4 w-4 mr-2" />
              <span>{filteredRegistrations.length} registrations</span>
            </div>
          </div>
        </div>

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
                {filteredRegistrations.map((registration) => (
                  <tr key={registration.id} className="hover:bg-gray-50/50 transition-colors duration-200">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mr-3">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {registration.student?.name}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {registration.student?.email}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Hash className="h-3 w-3 mr-1" />
                            {registration.student?.sapId}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {registration.chapter?.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {registration.chapter?.category}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(registration.status)}`}>
                        {registration.status.charAt(0).toUpperCase() + registration.status.slice(1)}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                        {new Date(registration.appliedAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(registration.appliedAt).toLocaleTimeString()}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {registration.status === 'pending' && (
                          <>
                            <button className="text-green-600 hover:text-green-700 text-sm font-medium">
                              Approve
                            </button>
                            <button className="text-red-600 hover:text-red-700 text-sm font-medium">
                              Reject
                            </button>
                          </>
                        )}
                        {registration.status === 'approved' && (
                          <span className="text-green-600 text-sm">
                            Approved {registration.approvedAt && `on ${new Date(registration.approvedAt).toLocaleDateString()}`}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredRegistrations.length === 0 && (
            <div className="text-center py-12">
              <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No registrations found</h3>
              <p className="text-gray-600">
                No student registrations match your current filters.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Registrations;