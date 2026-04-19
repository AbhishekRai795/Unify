import React, { useState, useEffect, useMemo } from 'react';
import { 
  Award, 
  Search, 
  Calendar, 
  User, 
  Download, 
  CheckCircle2, 
  Loader2, 
  ArrowLeft,
  X,
  Eye,
  Filter
} from 'lucide-react';
import { useChapterHead } from '../../contexts/ChapterHeadContext';
import { paymentAPI } from '../../services/paymentApi';
import { chapterHeadAPI } from '../../services/chapterHeadApi';
import CertificateTemplate from './CertificateTemplate';
import html2canvas from 'html2canvas';

interface Event {
  chapterId: string;
  eventId: string;
  title: string;
  description: string;
  startDateTime: string;
  chapterName?: string;
}

interface Registration {
  userId: string;
  studentName: string;
  studentEmail: string;
  paymentStatus: string;
}

const CertificateIssuance: React.FC = () => {
  const { fetchMyEvents } = useChapterHead();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistrationsLoading, setIsRegistrationsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Issuance State
  const [issuingFor, setIssuingFor] = useState<Registration | null>(null);
  const [certType, setCertType] = useState<'participation' | '1st' | '2nd' | '3rd'>('participation');
  const [isIssuing, setIsIssuing] = useState(false);
  const [issuedStatus, setIssuedStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setIsLoading(true);
    try {
      const data = await fetchMyEvents();
      // Only show past events or currently running ones for certificates?
      // Actually, standard practice is to allow it anytime, but usually after start.
      setEvents(data);
    } catch (err) {
      console.error('Failed to load events');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectEvent = async (event: Event) => {
    setSelectedEvent(event);
    setIsRegistrationsLoading(true);
    try {
      const resp = await paymentAPI.getEventRegistrationsForEvent(event.eventId);
      setRegistrations(resp.registrations || []);
    } catch (err) {
      console.error('Error loading registrations');
    } finally {
      setIsRegistrationsLoading(false);
    }
  };

  const handleIssue = async () => {
    if (!selectedEvent || !issuingFor) return;

    setIsIssuing(true);
    try {
      await chapterHeadAPI.issueCertificate({
        eventId: selectedEvent.eventId,
        userId: issuingFor.userId,
        studentName: issuingFor.studentName,
        certificateType: certType,
        eventName: selectedEvent.title,
        chapterName: selectedEvent.chapterName || 'Chapter',
        date: new Date(selectedEvent.startDateTime).toLocaleDateString()
      });

      setIssuedStatus(prev => ({ ...prev, [`${selectedEvent.eventId}-${issuingFor.userId}`]: true }));
      setIssuingFor(null);
      alert('Certificate issued successfully! The student can now download it from their dashboard.');
    } catch (err) {
      alert('Failed to issue certificate');
    } finally {
      setIsIssuing(false);
    }
  };

  const handleDownloadPreview = async () => {
    const certElement = document.getElementById('certificate-to-download');
    if (!certElement) return;

    try {
      const canvas = await html2canvas(certElement, {
        scale: 2, // Higher quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const link = document.createElement('a');
      link.download = `Certificate-${issuingFor?.studentName || 'Student'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Download failed', err);
    }
  };

  const filteredRegistrations = useMemo(() => {
    return registrations.filter(reg => 
      reg.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.studentEmail.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [registrations, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-0 text-left">
          <button
            onClick={() => selectedEvent ? setSelectedEvent(null) : window.location.href = '/head/dashboard'}
            className="group flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 transition-all duration-200"
          >
            <div className="p-2 mr-2 bg-white rounded-lg border border-slate-200 group-hover:border-blue-300 group-hover:bg-blue-50 transition-all">
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            </div>
            {selectedEvent ? 'Back to Events' : 'Back to Dashboard'}
          </button>
      </div>

      <div className="text-center mb-10 mt-4">
        <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">Certificate Issuance</h1>
        <p className="text-slate-600 max-w-2xl mx-auto font-medium">
          {selectedEvent 
            ? `Issuing certificates for "${selectedEvent.title}"` 
            : 'Select an event to start issuing certificates to participants.'}
        </p>
      </div>

      {!selectedEvent ? (
        /* Event Selection Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div 
              key={event.eventId}
              className="group bg-white rounded-3xl shadow-sm border border-gray-100 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
              onClick={() => handleSelectEvent(event)}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <Calendar className="h-6 w-6" />
                </div>
                <Award className="h-6 w-6 text-gray-200 group-hover:text-yellow-500 transition-colors" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2 truncate group-hover:text-blue-600 transition-colors">
                {event.title}
              </h3>
              <p className="text-gray-500 text-sm line-clamp-2 mb-4">
                {event.description}
              </p>
              <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  {new Date(event.startDateTime).toLocaleDateString()}
                </span>
                <span className="text-blue-600 font-bold text-sm flex items-center">
                  Select <ArrowLeft className="h-4 w-4 ml-1 rotate-180" />
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Registration Management */
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden animate-scale-in">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search participants..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-500">
                {filteredRegistrations.length} Participants Found
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white border-b border-gray-100">
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Student</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isRegistrationsLoading ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center">
                      <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : filteredRegistrations.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-gray-500 italic">
                      No participants found for this event.
                    </td>
                  </tr>
                ) : (
                  filteredRegistrations.map((reg) => {
                    const isIssued = issuedStatus[`${selectedEvent.eventId}-${reg.userId}`];
                    return (
                      <tr key={reg.userId} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold mr-3">
                              {reg.studentName.charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-gray-900">{reg.studentName}</div>
                              <div className="text-xs text-gray-500">{reg.studentEmail}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {isIssued ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Issued
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setIssuingFor(reg)}
                            className={`
                              inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold transition-all
                              ${isIssued 
                                ? 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50' 
                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200 active:scale-95'}
                            `}
                          >
                            <Award className="h-4 w-4 mr-2" />
                            {isIssued ? 'Re-issue' : 'Issue Certificate'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Issuance Modal */}
      {issuingFor && selectedEvent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
            onClick={() => !isIssuing && setIssuingFor(null)} 
          />
          <div className="relative bg-white rounded-3xl w-full max-w-7xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in">
            <div className="sticky top-0 bg-white/80 backdrop-blur-md px-8 py-6 border-b border-gray-100 flex justify-between items-center z-10">
              <div>
                <h2 className="text-2xl font-black text-gray-900">Preview Certificate</h2>
                <p className="text-sm text-gray-500 font-medium">Configuring for {issuingFor.studentName}</p>
              </div>
              <button 
                onClick={() => setIssuingFor(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                disabled={isIssuing}
              >
                <X className="h-6 w-6 text-gray-400" />
              </button>
            </div>

            <div className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Configuration Panel */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-widest">
                      Select Achievement Type
                    </label>
                    <div className="grid grid-cols-1 gap-3">
                      {[
                        { id: 'participation', label: 'Participation', icon: User },
                        { id: '1st', label: '1st Position', icon: Award },
                        { id: '2nd', label: '2nd Position', icon: Award },
                        { id: '3rd', label: '3rd Position', icon: Award },
                      ].map((type) => (
                        <button
                          key={type.id}
                          onClick={() => setCertType(type.id as any)}
                          className={`
                            flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left
                            ${certType === type.id 
                              ? 'border-blue-600 bg-blue-50 text-blue-700' 
                              : 'border-gray-100 hover:border-blue-200 text-gray-600'}
                          `}
                        >
                          <type.icon className={`h-5 w-5 ${certType === type.id ? 'text-blue-600' : 'text-gray-400'}`} />
                          <span className="font-bold">{type.label}</span>
                          {certType === type.id && <CheckCircle2 className="h-5 w-5 ml-auto text-blue-600" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-100 space-y-4">
                    <button
                      onClick={handleIssue}
                      disabled={isIssuing}
                      className="w-full flex items-center justify-center gap-3 py-4 bg-green-600 text-white font-black rounded-2xl hover:bg-green-700 shadow-xl shadow-green-200 transition-all disabled:opacity-50 active:scale-[0.98]"
                    >
                      {isIssuing ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Issuing...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-5 w-5" />
                          Confirm & Issue
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleDownloadPreview}
                      className="w-full flex items-center justify-center gap-3 py-4 border-2 border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 transition-all"
                    >
                      <Download className="h-5 w-5" />
                      Download Preview
                    </button>
                  </div>
                </div>

                {/* Certificate Preview Surface */}
                <div className="lg:col-span-2 bg-slate-100 rounded-3xl p-4 md:p-8 flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-200 min-h-[500px]">
                  <div className="scale-[0.5] sm:scale-[0.7] md:scale-[0.85] lg:scale-[1.0] origin-center shadow-2xl">
                    <CertificateTemplate
                      studentName={issuingFor.studentName}
                      eventName={selectedEvent.title}
                      chapterName={selectedEvent.chapterName || 'Chapter'}
                      date={new Date(selectedEvent.startDateTime).toLocaleDateString()}
                      certificateType={certType}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificateIssuance;
