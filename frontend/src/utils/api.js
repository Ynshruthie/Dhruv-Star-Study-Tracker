import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to attach Auth token and Simulated Time header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dhruv_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const simTime = localStorage.getItem('dhruv_simulated_time');
  if (simTime) {
    config.headers['x-simulated-time'] = simTime;
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;

export const uploadStudyPhotos = async (hourNumber, files, date) => {
  const payload = {
    date,
    files: files.map((file) => ({ name: file.name, type: file.type, size: file.size }))
  };
  const { data: ticket } = await api.post(`/study/slots/${hourNumber}/upload`, payload);
  const paths = [];

  for (let index = 0; index < files.length; index += 1) {
    const upload = ticket.uploads[index];
    const response = await fetch(upload.signed_url, {
      method: 'PUT',
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': files[index].type,
        'x-upsert': 'false'
      },
      body: files[index]
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || 'A photo could not be uploaded.');
    }
    paths.push(upload.path);
  }

  return api.post(`/study/slots/${hourNumber}/upload/complete`, { date, paths });
};
