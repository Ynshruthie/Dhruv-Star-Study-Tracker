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
