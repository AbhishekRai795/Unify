// src/services/googleMeetApi.ts
const PAYMENT_API_BASE_URL = import.meta.env.VITE_PAYMENT_API_BASE_URL || 'https://s9t1485z29.execute-api.ap-south-1.amazonaws.com/dev';

const getAuthHeaders = () => {
  const token = localStorage.getItem('idToken');
  if (!token) {
    throw new Error('No authentication token found. Please sign in.');
  }
  
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(errorData.message || `HTTP ${response.status}`);
  }
  return response.json();
};

export const googleMeetAPI = {
  // OAuth
  initOAuth: async () => {
    const response = await fetch(`${PAYMENT_API_BASE_URL}/api/google/oauth/init`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Meetings
  createMeeting: async (data: {
    chapterId: string;
    eventId?: string;
    title: string;
    description: string;
    startDateTime: string;
    endDateTime: string;
    sendInvites: boolean;
  }) => {
    const response = await fetch(`${PAYMENT_API_BASE_URL}/api/chapterhead/meetings`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  listMeetings: async (chapterId: string) => {
    const response = await fetch(`${PAYMENT_API_BASE_URL}/api/chapters/${chapterId}/meetings`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  updateMeeting: async (chapterId: string, meetingId: string, data: any) => {
    const response = await fetch(`${PAYMENT_API_BASE_URL}/api/chapters/${chapterId}/meetings/${meetingId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  deleteMeeting: async (chapterId: string, meetingId: string) => {
    const response = await fetch(`${PAYMENT_API_BASE_URL}/api/chapters/${chapterId}/meetings/${meetingId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Notifications
  getNotifications: async () => {
    const response = await fetch(`${PAYMENT_API_BASE_URL}/api/notifications`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  markNotificationRead: async (notificationId: string) => {
    const response = await fetch(`${PAYMENT_API_BASE_URL}/api/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
  
  markAllNotificationsRead: async () => {
    const response = await fetch(`${PAYMENT_API_BASE_URL}/api/notifications/all/read`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  }
};

