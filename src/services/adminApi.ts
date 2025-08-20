// src/services/adminApi.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://y0fr6gasgk.execute-api.ap-south-1.amazonaws.com/dev';

async function getAuthHeaders() {
  // Use the same token storage method as your AuthContext
  const token = localStorage.getItem('idToken');
  if (!token) {
    throw new Error('No authentication token found. Please sign in.');
  }
  
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

// Debug function to help troubleshoot token issues
async function debugToken() {
  const token = localStorage.getItem('idToken');
  if (token) {
    try {
      // Decode the JWT to see what's inside
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('JWT Token Payload:', payload);
      console.log('Cognito Groups:', payload['cognito:groups']);
      console.log('Token Expiry:', new Date(payload.exp * 1000));
      console.log('Current Time:', new Date());
      console.log('Token Valid:', new Date() < new Date(payload.exp * 1000));
    } catch (error) {
      console.error('Error decoding token:', error);
    }
  } else {
    console.log('No token found in localStorage');
  }
}

export const adminApi = {
  async createChapter(payload: { chapterName: string; headEmail?: string; headName?: string }) {
    console.log('Creating chapter with payload:', payload);
    
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/admin/chapters`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      console.log('Create chapter response status:', res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Create chapter error response:', errorText);
        
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: `Create chapter failed with status ${res.status}`, details: errorText };
        }
        
        throw error;
      }

      const result = await res.json();
      console.log('Create chapter success:', result);
      return result;
      
    } catch (error) {
      console.error('Create chapter error:', error);
      throw error;
    }
  },

  async listChapters(params?: { limit?: number; lastEvaluatedKey?: string }) {
    await debugToken();
    
    try {
      const headers = await getAuthHeaders();
      const qs = new URLSearchParams();
      if (params?.limit) qs.set('limit', String(params.limit));
      if (params?.lastEvaluatedKey) qs.set('lastEvaluatedKey', params.lastEvaluatedKey);
      
      const url = `${API_BASE_URL}/admin/chapters${qs.toString() ? `?${qs}` : ''}`;
      console.log('Fetching chapters from:', url);
      
      const res = await fetch(url, { method: 'GET', headers });
      
      console.log('List chapters response status:', res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('List chapters error response:', errorText);
        
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: `List chapters failed with status ${res.status}`, details: errorText };
        }
        
        throw error;
      }

      const result = await res.json();
      console.log('List chapters success:', result);
      return result;
      
    } catch (error) {
      console.error('List chapters error:', error);
      throw error;
    }
  },

  async getChapter(chapterId: string) {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/admin/chapters/${chapterId}`, { 
        method: 'GET', 
        headers 
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: `Get chapter failed with status ${res.status}`, details: errorText };
        }
        throw error;
      }
      
      return res.json();
    } catch (error) {
      console.error('Get chapter error:', error);
      throw error;
    }
  },

  async updateChapter(chapterId: string, payload: any) {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/admin/chapters/${chapterId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: `Update chapter failed with status ${res.status}`, details: errorText };
        }
        throw error;
      }
      
      return res.json();
    } catch (error) {
      console.error('Update chapter error:', error);
      throw error;
    }
  },

  async deleteChapter(chapterId: string) {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/admin/chapters/${chapterId}`, {
        method: 'DELETE',
        headers
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: `Delete chapter failed with status ${res.status}`, details: errorText };
        }
        throw error;
      }
      
      return res.json();
    } catch (error) {
      console.error('Delete chapter error:', error);
      throw error;
    }
  },

  async assignChapterHead(payload: { email: string; chapterId: string; headName?: string }) {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/admin/chapter-heads`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: `Assign head failed with status ${res.status}`, details: errorText };
        }
        throw error;
      }
      
      return res.json();
    } catch (error) {
      console.error('Assign head error:', error);
      throw error;
    }
  },

  async listChapterHeads() {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/admin/chapter-heads`, { 
        method: 'GET', 
        headers 
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: `List heads failed with status ${res.status}`, details: errorText };
        }
        throw error;
      }
      
      return res.json();
    } catch (error) {
      console.error('List heads error:', error);
      throw error;
    }
  },

  async removeChapterHead(email: string) {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/admin/chapter-heads/${encodeURIComponent(email)}`, {
        method: 'DELETE',
        headers
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: `Remove head failed with status ${res.status}`, details: errorText };
        }
        throw error;
      }
      
      return res.json();
    } catch (error) {
      console.error('Remove head error:', error);
      throw error;
    }
  }
};