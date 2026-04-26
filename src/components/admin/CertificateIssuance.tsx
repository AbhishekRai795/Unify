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
  X
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
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

type CertificateType = 'participation' | '1st' | '2nd' | '3rd';

const CertificateIssuance: React.FC = () => {
  const { eventId: urlEventId } = useParams();
  const navigate = useNavigate();
  const { fetchMyEvents, chapters } = useChapterHead();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistrationsLoading, setIsRegistrationsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Issuance State
  const [issuingFor, setIssuingFor] = useState<Registration | null>(null);
  const [certType, setCertType] = useState<CertificateType>('participation');
  const [isIssuing, setIsIssuing] = useState(false);
  const [issuedStatus, setIssuedStatus] = useState<Record<string, any>>({});
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (chapters && chapters.length > 0) {
      loadEvents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapters]); // Run only once chapters have populated

  const loadEvents = async () => {
    setIsLoading(true);
    try {
      const data = await fetchMyEvents();
      setEvents(data);
      if (urlEventId) {
        const decodedId = decodeURIComponent(urlEventId);
        const eventMatch = data.find((e: Event) => e.eventId === urlEventId || e.eventId === decodedId);
        if (eventMatch) {
          handleSelectEvent(eventMatch, true);
        }
      }
    } catch (err) {
      console.error('Failed to load events');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectEvent = async (event: Event, isInitialLoad: boolean = false) => {
    setSelectedEvent(event);
    if (!isInitialLoad) {
      navigate(`/head/certificates/${encodeURIComponent(event.eventId)}`, { replace: true });
    }
    setIsRegistrationsLoading(true);
    setSelectedUserIds(new Set());
    try {
      const [registrationsResp, certificatesResp] = await Promise.all([
        paymentAPI.getEventRegistrationsForEvent(event.eventId),
        chapterHeadAPI.getEventCertificates(event.eventId).catch(() => ({ certificates: [] }))
      ]);

      setRegistrations(registrationsResp.registrations || []);
      setIssuedStatus((certificatesResp.certificates || []).reduce((acc: Record<string, any>, cert: any) => {
        if (cert.eventId && cert.userId) acc[`${cert.eventId}-${cert.userId}`] = cert;
        return acc;
      }, {}));
    } catch (err) {
      console.error('Error loading registrations');
    } finally {
      setIsRegistrationsLoading(false);
    }
  };

  const currentChapter = useMemo(() => {
    if (!selectedEvent || !chapters) return null;
    return chapters.find(c => c.chapterId === selectedEvent.chapterId);
  }, [selectedEvent, chapters]);

  const handleIssue = async () => {
    if (!selectedEvent || !issuingFor) return;

    setIsIssuing(true);
    try {
      await chapterHeadAPI.issueCertificate({
        eventId: selectedEvent.eventId,
        userId: issuingFor.userId,
        studentName: issuingFor.studentName,
        studentEmail: issuingFor.studentEmail,
        certificateType: certType,
        eventName: selectedEvent.title,
        chapterName: selectedEvent.chapterName || currentChapter?.chapterName || 'Community',
        headName: currentChapter?.headName || 'Head',
        date: new Date().toLocaleDateString('en-GB')
      });

      setIssuedStatus(prev => ({ 
        ...prev, 
        [`${selectedEvent.eventId}-${issuingFor.userId}`]: { 
          certificateType: certType,
          studentName: issuingFor.studentName,
          eventId: selectedEvent.eventId,
          userId: issuingFor.userId
        } 
      }));
      setIssuingFor(null);
      alert('Certificate issued successfully! The student can now download it from their dashboard.');
    } catch (err) {
      alert('Failed to issue certificate');
    } finally {
      setIsIssuing(false);
    }
  };

  const buildCertificatePayload = (reg: Registration) => {
    if (!selectedEvent) return null;

    return {
      eventId: selectedEvent.eventId,
      userId: reg.userId,
      studentName: reg.studentName,
      studentEmail: reg.studentEmail,
      certificateType: certType,
      eventName: selectedEvent.title,
      chapterName: selectedEvent.chapterName || currentChapter?.chapterName || 'Community',
      headName: currentChapter?.headName || 'Head',
      date: new Date().toLocaleDateString('en-GB')
    };
  };

  const selectedRegistrations = useMemo(
    () => registrations.filter((reg) => selectedUserIds.has(reg.userId)),
    [registrations, selectedUserIds]
  );

  const handleBulkIssue = async () => {
    if (!selectedEvent || selectedRegistrations.length === 0) return;

    setIsIssuing(true);
    try {
      const certificates = selectedRegistrations
        .map(buildCertificatePayload)
        .filter(Boolean) as Array<{
          eventId: string;
          userId: string;
          studentName: string;
          studentEmail?: string;
          certificateType: CertificateType;
          eventName: string;
          chapterName: string;
          date: string;
        }>;

      await chapterHeadAPI.issueCertificates(certificates);

      setIssuedStatus(prev => {
        const next = { ...prev };
        for (const reg of selectedRegistrations) {
          next[`${selectedEvent.eventId}-${reg.userId}`] = {
            certificateType: certType,
            studentName: reg.studentName,
            eventId: selectedEvent.eventId,
            userId: reg.userId
          };
        }
        return next;
      });
      setSelectedUserIds(new Set());
      alert(`Issued ${certificates.length} certificate${certificates.length === 1 ? '' : 's'} successfully.`);
    } catch (err) {
      alert('Failed to issue selected certificates');
    } finally {
      setIsIssuing(false);
    }
  };

  const handleDownloadPreview = async () => {
    const certElement = document.getElementById('certificate-to-download');
    if (!certElement) return;

    // Create a temporal container for high-fidelity capture
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.zIndex = '-1';
    document.body.appendChild(container);

    // Clone the element and remove viewport-specific scaling transforms
    const clone = certElement.cloneNode(true) as HTMLElement;
    clone.style.transform = 'none';
    clone.style.position = 'relative';
    clone.style.margin = '0';
    container.appendChild(clone);

    try {
      const canvas = await html2canvas(clone, {
        scale: 2, // Higher quality
        useCORS: true,
        logging: false,
        backgroundColor: null,
        width: 960,
        height: 540
      });
      
      const link = document.createElement('a');
      link.download = `Certificate-${issuingFor?.studentName || 'Student'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Download failed', err);
    } finally {
      document.body.removeChild(container);
    }
  };

  const filteredRegistrations = useMemo(() => {
    return registrations.filter(reg => 
      reg.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.studentEmail.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [registrations, searchTerm]);

  const filteredUserIds = useMemo(
    () => filteredRegistrations.map((reg) => reg.userId).filter(Boolean),
    [filteredRegistrations]
  );
  const allFilteredSelected = filteredUserIds.length > 0 && filteredUserIds.every((userId) => selectedUserIds.has(userId));
  const someFilteredSelected = filteredUserIds.some((userId) => selectedUserIds.has(userId));

  const toggleSelectAllFiltered = () => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredUserIds.forEach((userId) => next.delete(userId));
      } else {
        filteredUserIds.forEach((userId) => next.add(userId));
      }
      return next;
    });
  };

  const toggleSelectedUser = (userId: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

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
            onClick={() => {
              if (selectedEvent) {
                setSelectedEvent(null);
                navigate('/head/certificates', { replace: true });
              } else {
                navigate('/head/dashboard');
              }
            }}
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
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <select
                value={certType}
                onChange={(e) => setCertType(e.target.value as CertificateType)}
                className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                disabled={isIssuing}
              >
                <option value="participation">Participation</option>
                <option value="1st">1st Position</option>
                <option value="2nd">2nd Position</option>
                <option value="3rd">3rd Position</option>
              </select>
              <button
                onClick={handleBulkIssue}
                disabled={isIssuing || selectedRegistrations.length === 0}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-black rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isIssuing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
                Issue Selected ({selectedRegistrations.length})
              </button>
              <span className="text-sm font-medium text-gray-500">
                {filteredRegistrations.length} Participants Found
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white border-b border-gray-100">
                  <th className="px-6 py-4 text-left w-12">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = !allFilteredSelected && someFilteredSelected;
                      }}
                      onChange={toggleSelectAllFiltered}
                      disabled={filteredUserIds.length === 0 || isIssuing}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      aria-label="Select all visible participants"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Student</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Achievement Type</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isRegistrationsLoading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : filteredRegistrations.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500 italic">
                      No participants found for this event.
                    </td>
                  </tr>
                ) : (
                  filteredRegistrations.map((reg) => {
                    const isIssued = issuedStatus[`${selectedEvent.eventId}-${reg.userId}`];
                    return (
                      <tr key={reg.userId} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedUserIds.has(reg.userId)}
                            onChange={() => toggleSelectedUser(reg.userId)}
                            disabled={isIssuing}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            aria-label={`Select ${reg.studentName}`}
                          />
                        </td>
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
                          {isIssued?.certificateType ? (
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              isIssued.certificateType === '1st' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                              isIssued.certificateType === '2nd' ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                              isIssued.certificateType === '3rd' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                              'bg-blue-50 text-blue-700 border border-blue-100'
                            }`}>
                              {isIssued.certificateType === 'participation' ? 'Participation' : `${isIssued.certificateType} Position`}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Not Assigned</span>
                          )}
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
          <div className="relative bg-white rounded-3xl w-full max-w-6xl shadow-2xl animate-scale-in">
            <div className="sticky top-0 bg-white/80 backdrop-blur-md px-6 py-4 border-b border-gray-100 flex justify-between items-center z-10 rounded-t-3xl">
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

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                <div className="lg:col-span-2 bg-slate-100 rounded-2xl overflow-hidden border-2 border-dashed border-slate-200 relative aspect-video w-full flex items-center justify-center">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-[0.35] sm:scale-[0.45] md:scale-[0.6] lg:scale-[0.75] origin-center shadow-2xl transition-transform">
                    <CertificateTemplate
                      studentName={issuingFor.studentName}
                      eventName={selectedEvent.title}
                      chapterName={selectedEvent.chapterName || currentChapter?.chapterName || 'Community'}
                      headName={currentChapter?.headName || 'Head'}
                      date={new Date().toLocaleDateString('en-GB')}
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
