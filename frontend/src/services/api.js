import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const complaintsApi = {
  getAll: (params) => apiClient.get('/complaints/', { params }),
  getOne: (id) => apiClient.get(`/complaints/${id}`),
  create: (data) => apiClient.post('/complaints/', data),
  delete: (id) => apiClient.delete(`/complaints/${id}`),
  checkDuplicate: (data) => apiClient.post('/complaints/check-duplicate', data),
};

export const aiApi = {
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/ai/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  extract: (text) => apiClient.post('/ai/extract', { text }),
  chat: (data) => apiClient.post('/ai/chat', data),
};

export default apiClient;
