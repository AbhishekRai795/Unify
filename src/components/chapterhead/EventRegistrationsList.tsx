import React, { useEffect, useState } from 'react';
import { useChapterHead } from '../../contexts/ChapterHeadContext';
import { paymentAPI } from '../../services/paymentApi';

const EventRegistrationsList: React.FC<{ eventId: string }> = ({ eventId }) => {
  const { chapters } = useChapterHead();
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRegistrations = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await paymentAPI.getEventRegistrationsForEvent(eventId);
        setRegistrations(res.registrations || []);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch registrations');
      } finally {
        setLoading(false);
      }
    };
    if (eventId) fetchRegistrations();
  }, [eventId]);

  if (loading) return <div>Loading registrations...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!registrations.length) return <div>No registrations for this event.</div>;

  return (
    <div className="mt-4">
      <h3 className="font-bold mb-2">Event Registrations</h3>
      <table className="min-w-full border text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-1">Name</th>
            <th className="border px-2 py-1">Email</th>
            <th className="border px-2 py-1">Status</th>
            <th className="border px-2 py-1">Registered At</th>
          </tr>
        </thead>
        <tbody>
          {registrations.map((reg, idx) => (
            <tr key={idx}>
              <td className="border px-2 py-1">{reg.studentName || reg.userName || reg.userId}</td>
              <td className="border px-2 py-1">{reg.studentEmail || reg.userEmail}</td>
              <td className="border px-2 py-1">{reg.paymentStatus || reg.status}</td>
              <td className="border px-2 py-1">{reg.createdAt ? new Date(reg.createdAt).toLocaleString() : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default EventRegistrationsList;
