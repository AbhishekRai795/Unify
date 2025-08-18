// src/services/chapterHeadApi.ts
const API_BASE_URL = 'https://y0fr6gasgk.execute-api.ap-south-1.amazonaws.com/dev';

// Helper function to get auth headers
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

// Helper function to handle API responses
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }
  return response.json();
};

export const chapterHeadAPI = {
  // Get chapter head profile and managed chapters
  getProfile: async (email?: string) => {
    // The backend expects email and/or chapterName in the request body
    const body: any = {};
    if (email) {
      body.email = email;
    }
    
    const response = await fetch(`${API_BASE_URL}/chapterhead-profile`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  },

  // Get chapter details for the head
  getMyChapters: async () => {
    const response = await fetch(`${API_BASE_URL}/chapterhead/my-chapters`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Get registrations for managed chapters
  getChapterRegistrations: async (chapterId?: string) => {
    const url = chapterId 
      ? `${API_BASE_URL}/chapterhead/registrations/${chapterId}`
      : `${API_BASE_URL}/chapterhead/registrations`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Toggle chapter registration status
  toggleChapterRegistration: async (chapterId: string, isOpen: boolean) => {
    const response = await fetch(`${API_BASE_URL}/chapterhead/toggle-registration`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        chapterId,
        status: isOpen ? 'open' : 'closed'
      }),
    });
    return handleResponse(response);
  },

  // Approve/Reject registration request
  updateRegistrationStatus: async (registrationId: string, status: 'approved' | 'rejected', notes?: string) => {
    const response = await fetch(`${API_BASE_URL}/chapterhead/registration/${registrationId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        status,
        notes
      }),
    });
    return handleResponse(response);
  },

  // Get dashboard statistics
  getDashboardStats: async () => {
    const response = await fetch(`${API_BASE_URL}/chapterhead/dashboard`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Get recent activities
  getRecentActivities: async (limit: number = 10) => {
    const response = await fetch(`${API_BASE_URL}/chapterhead/activities?limit=${limit}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Create event for chapter
  createEvent: async (eventData: {
    title: string;
    description: string;
    chapterId: string;
    eventType: string;
    startDateTime: string;
    endDateTime: string;
    location: string;
    isOnline: boolean;
    meetingLink?: string;
    maxAttendees?: number;
    registrationRequired: boolean;
    registrationDeadline?: string;
  }) => {
    const response = await fetch(`${API_BASE_URL}/chapterhead/events`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(eventData),
    });
    return handleResponse(response);
  },

  // Get events for managed chapters
  getMyEvents: async () => {
    const response = await fetch(`${API_BASE_URL}/chapterhead/events`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Kick student from chapter
  kickStudent: async (studentEmail: string, reason?: string) => {
    const response = await fetch(`${API_BASE_URL}/chapterhead/kick-student`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({ studentEmail, reason }),
    });
    return handleResponse(response);
  },

  // Check if user is member of chapter
  checkMembership: async (userId?: string, email?: string) => {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (email) params.append('email', email);
    
    const response = await fetch(`${API_BASE_URL}/chapterhead/check-membership?${params.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  }
};
