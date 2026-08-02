import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  Token,
  LoginCredentials,
  RegisterData,
  User,
  SleepRecord,
  PhoneUsageRecord,
  TypingRecord,
  EmotionRecord,
  ActivityRecord,
  BurnoutAnalysis,
  BurnoutHistoryRecord,
  WellnessScoreRecord,
  BackendDashboardData,
  TrendsData,
  Recommendation,
} from '../types';

// VITE_API_URL lets a deployed build (e.g. GitHub Pages, which can't host
// this app's own FastAPI backend) point at a real external backend instead
// of assuming one is running on the same host at :8000. Local dev is
// unaffected since the env var isn't set there.
const API_BASE_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000/api/v1`;

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// Inject token on every request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 — clear stale token and redirect to login.
// We check the pathname so we don't get into a redirect loop on the login page itself.
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ============ AUTH ============
export const authAPI = {
  login: async (credentials: LoginCredentials): Promise<Token> => {
    const formData = new FormData();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);
    const res = await apiClient.post<Token>('/auth/login', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  register: async (data: RegisterData): Promise<Token> => {
    const res = await apiClient.post<Token>('/auth/register', data);
    return res.data;
  },

  getMe: async (): Promise<User> => {
    const res = await apiClient.get<User>('/auth/me');
    return res.data;
  },
};

// ============ SLEEP ============
export const sleepAPI = {
  logSleep: async (data: Omit<SleepRecord, 'id' | 'user_id' | 'created_at'>): Promise<SleepRecord> => {
    const res = await apiClient.post<SleepRecord>('/tracking/sleep', data);
    return res.data;
  },

  getHistory: async (): Promise<SleepRecord[]> => {
    const res = await apiClient.get<SleepRecord[]>('/tracking/sleep');
    return res.data;
  },
};

// ============ PHONE USAGE ============
export const phoneAPI = {
  logPhoneUsage: async (data: Omit<PhoneUsageRecord, 'id' | 'user_id' | 'created_at'>): Promise<PhoneUsageRecord> => {
    const res = await apiClient.post<PhoneUsageRecord>('/tracking/phone-usage', data);
    return res.data;
  },

  getHistory: async (): Promise<PhoneUsageRecord[]> => {
    const res = await apiClient.get<PhoneUsageRecord[]>('/tracking/phone-usage');
    return res.data;
  },
};

// ============ TYPING ============
export const typingAPI = {
  logTyping: async (data: Omit<TypingRecord, 'id' | 'user_id' | 'created_at'>): Promise<TypingRecord> => {
    const res = await apiClient.post<TypingRecord>('/tracking/typing', data);
    return res.data;
  },

  getHistory: async (): Promise<TypingRecord[]> => {
    const res = await apiClient.get<TypingRecord[]>('/tracking/typing');
    return res.data;
  },
};

// ============ EMOTION ============
export const emotionAPI = {
  logEmotion: async (data: Partial<EmotionRecord>): Promise<EmotionRecord> => {
    const res = await apiClient.post<EmotionRecord>('/tracking/emotion', data);
    return res.data;
  },

  getHistory: async (): Promise<EmotionRecord[]> => {
    const res = await apiClient.get<EmotionRecord[]>('/tracking/emotion');
    return res.data;
  },
};

// ============ ACTIVITY ============
export const activityAPI = {
  logActivity: async (data: Omit<ActivityRecord, 'id' | 'user_id' | 'created_at'>): Promise<ActivityRecord> => {
    const res = await apiClient.post<ActivityRecord>('/tracking/activity', data);
    return res.data;
  },

  getHistory: async (): Promise<ActivityRecord[]> => {
    const res = await apiClient.get<ActivityRecord[]>('/tracking/activity');
    return res.data;
  },
};

// ============ BURNOUT ============
export const burnoutAPI = {
  getAnalysis: async (): Promise<BurnoutAnalysis> => {
    const res = await apiClient.get<BurnoutAnalysis>('/burnout/analysis');
    return res.data;
  },

  getHistory: async (): Promise<BurnoutHistoryRecord[]> => {
    const res = await apiClient.get<BurnoutHistoryRecord[]>('/burnout/history');
    return res.data;
  },

  triggerAssess: async (): Promise<BurnoutAnalysis> => {
    const res = await apiClient.post<BurnoutAnalysis>('/burnout/assess');
    return res.data;
  },
};

// ============ WELLNESS ============
export const wellnessAPI = {
  getDashboard: async (): Promise<BackendDashboardData> => {
    const res = await apiClient.get<BackendDashboardData>('/wellness/dashboard');
    return res.data;
  },

  getScore: async (): Promise<WellnessScoreRecord> => {
    const res = await apiClient.get<WellnessScoreRecord>('/wellness/score');
    return res.data;
  },

  getTrends: async (): Promise<TrendsData> => {
    const res = await apiClient.get<TrendsData>('/wellness/trends');
    return res.data;
  },
};

// ============ RECOMMENDATIONS ============
export const recommendationsAPI = {
  getAll: async (): Promise<Recommendation[]> => {
    const res = await apiClient.get('/recommendations/');
    // Backend wraps: { recommendations: [...], burnout_score, ... }
    const body = res.data;
    return Array.isArray(body) ? body : (body?.recommendations ?? []);
  },

  getQuick: async (): Promise<Recommendation[]> => {
    const res = await apiClient.get('/recommendations/quick');
    const body = res.data;
    return Array.isArray(body) ? body : (body?.tips ?? body?.recommendations ?? []);
  },
};

export default apiClient;
