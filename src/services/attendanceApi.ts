import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_PAYMENT_API_BASE_URL || 'https://s9t1485z29.execute-api.ap-south-1.amazonaws.com/dev';

const getAuthHeaders = () => {
  const token = localStorage.getItem('idToken');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export const attendanceAPI = {
  // Generate Token (Chapter Head)
  generateToken: async (meetingId?: string, location?: { lat: number; lng: number }, useLocation: boolean = false, eventId?: string) => {
    const headers = getAuthHeaders();
    const response = await axios.post(`${API_BASE_URL}/api/attendance/token`, {
      meetingId,
      eventId,
      location,
      useLocation
    }, { headers });
    return response.data;
  },

  // Mark Attendance (Student)
  markAttendance: async (token: string, location?: { lat: number; lng: number }, deviceId: string = '') => {
    const headers = getAuthHeaders();
    const response = await axios.post(`${API_BASE_URL}/api/attendance/mark`, {
      token,
      location,
      deviceId
    }, { headers });
    return response.data;
  },

  // Get Meeting Attendance (Chapter Head)
  getMeetingAttendance: async (meetingId: string) => {
    const headers = getAuthHeaders();
    const response = await axios.get(`${API_BASE_URL}/api/attendance/meeting/${encodeURIComponent(meetingId)}`, { headers });
    return response.data;
  },

  // Manual Delete (Chapter Head)
  removeAttendance: async (sessionId: string, userId: string) => {
    const isEvent = sessionId.startsWith('EVENT#');
    const path = isEvent ? `event/${encodeURIComponent(sessionId)}` : `meeting/${encodeURIComponent(sessionId)}`;
    const headers = getAuthHeaders();
    const response = await axios.delete(`${API_BASE_URL}/api/attendance/${path}/user/${userId}`, { headers });
    return response.data;
  },

  // Manual Add (Chapter Head)
  markManually: async (sessionId: string, userId: string) => {
    const isEvent = sessionId.startsWith('EVENT#');
    const path = isEvent ? `event/${encodeURIComponent(sessionId)}` : `meeting/${encodeURIComponent(sessionId)}`;
    const headers = getAuthHeaders();
    const response = await axios.put(`${API_BASE_URL}/api/attendance/${path}/user/${userId}`, {}, { headers });
    return response.data;
  },

  // Get Stats (Student)
  getStats: async () => {
    const headers = getAuthHeaders();
    const response = await axios.get(`${API_BASE_URL}/api/attendance/stats`, { headers });
    return response.data;
  },

  // Get Event Attendance (Chapter Head)
  getEventAttendance: async (eventId: string) => {
    const headers = getAuthHeaders();
    const response = await axios.get(`${API_BASE_URL}/api/attendance/event/${encodeURIComponent(eventId)}`, { headers });
    return response.data;
  },

  // List Recent Meetings (Chapter Head)
  listMeetings: async () => {
    const headers = getAuthHeaders();
    const response = await axios.get(`${API_BASE_URL}/api/attendance/meetings`, { headers });
    return response.data;
  },

  // Quick Start Attendance (Chapter Head)
  quickStart: async (data: { title: string, eventId?: string, chapterId: string }) => {
    const headers = getAuthHeaders();
    const response = await axios.post(`${API_BASE_URL}/api/attendance/quick-start`, data, { headers });
    return response.data;
  },

  // Delete Meeting (Chapter Head)
  deleteMeeting: async (meetingId: string) => {
    const headers = getAuthHeaders();
    await axios.delete(`${API_BASE_URL}/api/attendance/meeting/${meetingId}`, { headers });
  }
};
