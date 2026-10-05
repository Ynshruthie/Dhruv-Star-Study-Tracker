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

export const uploadStudyPhotos = async (hourNumber, files, date, onProgress) => {
  const payload = {
    date,
    files: files.map((file) => ({ name: file.name, type: file.type, size: file.size }))
  };
  const { data: ticket } = await api.post(`/study/slots/${hourNumber}/upload`, payload);
  const paths = [];
  const totalBytes = files.reduce((total, file) => total + file.size, 0);
  let completedBytes = 0;
  onProgress?.(0);

  for (let index = 0; index < files.length; index += 1) {
    const upload = ticket.uploads[index];
    await new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open('PUT', upload.signed_url);
      request.setRequestHeader('apikey', import.meta.env.VITE_SUPABASE_ANON_KEY);
      request.setRequestHeader('Content-Type', files[index].type);
      request.setRequestHeader('x-upsert', 'false');
      request.upload.onprogress = (event) => {
        if (event.lengthComputable && totalBytes > 0) {
          const uploadedBytes = completedBytes + Math.min(event.loaded, files[index].size);
          onProgress?.(Math.min(99, Math.floor((uploadedBytes / totalBytes) * 100)));
        }
      };
      request.onload = () => {
        if (request.status >= 200 && request.status < 300) {
          completedBytes += files[index].size;
          if (totalBytes > 0) {
            onProgress?.(Math.min(99, Math.floor((completedBytes / totalBytes) * 100)));
          }
          resolve();
        } else {
          reject(new Error(request.responseText || 'A photo could not be uploaded.'));
        }
      };
      request.onerror = () => reject(new Error('A photo could not be uploaded.'));
      request.onabort = () => reject(new Error('Photo upload was cancelled.'));
      request.send(files[index]);
    });
    paths.push(upload.path);
  }

  const result = await api.post(`/study/slots/${hourNumber}/upload/complete`, { date, paths });
  onProgress?.(100);
  return result;
};
