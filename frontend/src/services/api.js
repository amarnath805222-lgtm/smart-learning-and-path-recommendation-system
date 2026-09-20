import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// Add auth token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

// ─── AUTH ─────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// ─── STUDENT ──────────────────────────────────
export const studentAPI = {
  getProfile: () => api.get('/student/profile'),
  updateProfile: (data) => api.put('/student/profile', data),
};

// ─── ASSESSMENT ───────────────────────────────
export const assessmentAPI = {
  start: (data) => api.post('/assessment/start', data || {}),
  submit: (data) => api.post('/assessment/submit', data),
};

// ─── LEARNING PATH ────────────────────────────
export const learningPathAPI = {
  generate: () => api.post('/learning-path/generate'),
  get: () => api.get('/learning-path'),
  getProgressModel: () => api.get('/learning-path/progress-model'),
  updateProgress: (data) => api.put('/learning-path/progress', data),
  getTopicContent: (itemId) => api.get(`/learning-path/items/${itemId}/content`),
  markStudyComplete: (itemId) => api.post(`/learning-path/items/${itemId}/study-complete`),
  getItemQuiz: (itemId) => api.get(`/learning-path/items/${itemId}/quiz`),
  getRemedial: (itemId) => api.get(`/learning-path/items/${itemId}/remedial`),
};

// ─── QUIZ ─────────────────────────────────────
export const quizAPI = {
  generate: (data) => api.post('/quiz/generate', data),
  submit: (data) => api.post('/quiz/submit', data),
  history: () => api.get('/quiz/history'),
};

// ─── AI ───────────────────────────────────────
export const aiAPI = {
  chat: (data) => api.post('/ai/chat', data),
  recommendations: () => api.get('/ai/recommendations'),
  skillGap: () => api.get('/ai/skill-gap'),
};

// ─── ANALYTICS ────────────────────────────────
export const analyticsAPI = {
  get: () => api.get('/analytics'),
};

// ─── ADMIN ────────────────────────────────────
export const adminAPI = {
  students: () => api.get('/admin/students'),
  skills: () => api.get('/admin/skills'),
  createSkill: (data) => api.post('/admin/skills', data),
  analytics: () => api.get('/admin/analytics'),
};

export default api;
