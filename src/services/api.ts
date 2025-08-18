// src/services/api.ts
const API_BASE_URL = 'https://y0fr6gasgk.execute-api.ap-south-1.amazonaws.com/dev';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('idToken');
  console.log('JWT Token exists:', !!token);
  if (token) {
    console.log('Token preview:', token.substring(0, 50) + '...');
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

export const studentAPI = {
  // Dashboard
  getDashboard: async () => {
    const response = await fetch(`${API_BASE_URL}/student/dashboard`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Chapters - using consistent endpoint names with backend
  getAvailableChapters: async () => {
    const response = await fetch(`${API_BASE_URL}/get-chapters`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getMyChapters: async () => {
    const response = await fetch(`${API_BASE_URL}/student/my-chapters`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getAllChapters: async () => {
    const response = await fetch(`${API_BASE_URL}/get-chapters`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Chapter Registration - consistent with backend expectations
  registerForChapter: async (chapterName: string, studentData: { name: string; email: string }) => {
    const response = await fetch(`${API_BASE_URL}/register-student`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        studentEmail: studentData.email,
        studentName: studentData.name,
        chapterName: chapterName,
      }),
    });
    return handleResponse(response);
  },

  leaveChapter: async (chapterId: string) => {
    const response = await fetch(`${API_BASE_URL}/student/chapters/${chapterId}/leave`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Registration Requests
  getPendingRegistrations: async () => {
    const response = await fetch(`${API_BASE_URL}/student/pending-registrations`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Profile
  getProfile: async () => {
    const response = await fetch(`${API_BASE_URL}/student/profile`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
};
