import axios, { AxiosInstance, AxiosError } from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { StorageService } from './storage';
import {
  User,
  AuthTokens,
  LoginRequest,
  RegisterRequest,
  BurnoutAnalysis,
  SleepRecord,
  PhoneUsageRecord,
  EmotionRecord,
  ActivityRecord,
  DashboardData,
  Recommendation,
  ResetPasswordRequest,
} from '../types';

const getApiBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  const fallbackUrl = 'https://burnout-backend-l438.onrender.com/api/v1';

  // 1. If EXPO_PUBLIC_API_URL is explicitly set in .env, use it
  if (envUrl) {
    if (Platform.OS === 'android' && (envUrl.includes('localhost') || envUrl.includes('127.0.0.1'))) {
      return envUrl.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2');
    }
    return envUrl;
  }

  // 2. If running on Web, use cloud backend
  if (Platform.OS === 'web') {
    return fallbackUrl;
  }

  // 3. Try Expo Metro developer host IP if connected on the same local Wi-Fi network
  const debuggerHost =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoGo?.developer?.tool;

  if (debuggerHost) {
    const hostIp = debuggerHost.split(':')[0];
    if (hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
      return `http://${hostIp}:8000/api/v1`;
    }
  }

  // 4. Default to public deployed cloud backend for physical devices, 5G cellular data, and standalone builds
  return fallbackUrl;
};

export const API_BASE_URL = getApiBaseUrl();
console.log('[BurnoutAI] API_BASE_URL resolved to:', API_BASE_URL, '| Platform:', Platform.OS);

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60s timeout to allow for Render free tier cold starts or slower local networks
  headers: {
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true',
  },
});

// Notifies AuthContext when the server rejects the stored session (401), so
// it can clear `user` state and let RootNavigation swap to the auth stack.
// Without this, StorageService.clearAll() below wipes the token but the app
// stays on the authenticated tab navigator showing stale data forever.
type SessionExpiredHandler = () => void;
let onSessionExpired: SessionExpiredHandler | null = null;
export const setSessionExpiredHandler = (handler: SessionExpiredHandler | null) => {
  onSessionExpired = handler;
};

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await StorageService.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handles 401 and automatically tries fallback host endpoints on network errors
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginRequest) {
      await StorageService.clearAll();
      onSessionExpired?.();
    }

    // Automatic fallback if local backend is unreachable (data endpoints only, excluding auth to prevent DB user mismatch)
    const config: any = error.config;
    const isAuthEndpoint = config?.url?.includes('/auth/login') || config?.url?.includes('/auth/register');
    const cloudFallback = 'https://burnout-backend-l438.onrender.com/api/v1';
    if (
      config &&
      !config._isRetry &&
      !isAuthEndpoint &&
      (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED' || !error.response) &&
      config.baseURL &&
      config.baseURL !== cloudFallback
    ) {
      console.log('[BurnoutAI] Local backend unreachable. Retrying request with cloud backend:', cloudFallback);
      config._isRetry = true;
      config.baseURL = cloudFallback;
      return api.request(config);
    }

    return Promise.reject(error);
  }
);

// ─── Mock Data ─────────────────────────────────────────────────────────────────

const MOCK_USER: User = {
  id: 1,
  username: 'demo_user',
  email: 'demo@burnoutai.com',
  full_name: 'Alex Johnson',
  age: 28,
  gender: 'prefer_not_to_say',
  created_at: new Date().toISOString(),
  is_active: true,
};

const MOCK_BURNOUT: BurnoutAnalysis = {
  burnout_score: 42,
  risk_level: 'moderate',
  confidence: 0.87,
  factors: [
    { name: 'Sleep Deprivation', impact: 35, description: 'Averaging 5.5h of sleep' },
    { name: 'High Screen Time', impact: 28, description: '7.2 hours daily average' },
    { name: 'Low Physical Activity', impact: 22, description: 'Below recommended levels' },
    { name: 'Emotional Stress', impact: 15, description: 'Elevated stress markers' },
  ],
  recommendations: [
    {
      id: 1,
      title: 'Establish a Sleep Schedule',
      description: 'Consistent sleep timing regulates your circadian rhythm and reduces burnout risk by up to 30%.',
      priority: 'high',
      category: 'sleep',
      action_steps: [
        'Set bedtime alarm for 10:30 PM',
        'Avoid screens 1 hour before bed',
        'Keep bedroom temperature at 68°F',
        'Try 4-7-8 breathing technique',
      ],
      estimated_impact: 8,
    },
    {
      id: 2,
      title: 'Reduce Phone Usage',
      description: 'Cut daily screen time to under 4 hours to significantly improve focus and mental clarity.',
      priority: 'high',
      category: 'phone',
      action_steps: [
        'Enable app time limits in Settings',
        'Put phone in another room during meals',
        'Use grayscale mode after 8 PM',
        'Try a 2-hour phone-free morning',
      ],
      estimated_impact: 7,
    },
    {
      id: 3,
      title: '20-Minute Daily Walk',
      description: 'Light daily exercise dramatically reduces cortisol and improves mood within 2 weeks.',
      priority: 'medium',
      category: 'activity',
      action_steps: [
        'Walk during lunch break',
        'Park farther from destination',
        'Take stairs instead of elevator',
        'Invite a colleague for a walking meeting',
      ],
      estimated_impact: 6,
    },
    {
      id: 4,
      title: 'Practice Mindfulness',
      description: '10 minutes of daily meditation reduces anxiety and improves emotional regulation.',
      priority: 'medium',
      category: 'mental',
      action_steps: [
        'Try guided meditation apps',
        'Deep breathing for 5 minutes morning',
        'Body scan before sleep',
        'Journaling for 10 minutes daily',
      ],
      estimated_impact: 5,
    },
  ],
  timestamp: new Date().toISOString(),
  wellness_score: 62,
  emotional_stability_index: 68,
  sleep_quality_score: 55,
  phone_usage_score: 48,
  activity_score: 70,
};

const MOCK_SLEEP: SleepRecord = {
  id: 1,
  user_id: 1,
  date: new Date().toISOString().split('T')[0],
  bedtime: '23:30',
  wake_time: '06:00',
  duration_hours: 6.5,
  quality_score: 65,
  interruptions: 2,
  deep_sleep_percentage: 18,
  notes: 'Felt rested but woke up once',
  created_at: new Date().toISOString(),
};

const MOCK_PHONE_USAGE: PhoneUsageRecord = {
  id: 1,
  user_id: 1,
  date: new Date().toISOString().split('T')[0],
  total_hours: 5.2,
  social_media_hours: 2.1,
  productive_hours: 1.8,
  entertainment_hours: 1.3,
  pickups_count: 87,
  late_night_usage: false,
  created_at: new Date().toISOString(),
};

const MOCK_EMOTION: EmotionRecord = {
  id: 1,
  user_id: 1,
  dominant_emotion: 'Neutral',
  confidence: 0.72,
  valence: 0.4,
  arousal: 0.5,
  stress_level: 45,
  emotions: [
    { emotion: 'Neutral', confidence: 0.72 },
    { emotion: 'Happy', confidence: 0.15 },
    { emotion: 'Sad', confidence: 0.08 },
    { emotion: 'Anxious', confidence: 0.05 },
  ],
  source: 'camera',
  timestamp: new Date().toISOString(),
};

const MOCK_ACTIVITY: ActivityRecord = {
  id: 1,
  user_id: 1,
  date: new Date().toISOString().split('T')[0],
  study_hours: 3,
  work_hours: 6,
  exercise_minutes: 20,
  break_count: 4,
  focus_score: 72,
  created_at: new Date().toISOString(),
};

const MOCK_TREND: DashboardData['trend_data'] = {
  dates: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  burnout_scores: [55, 60, 48, 42, 50, 35, 42],
  wellness_scores: [45, 50, 62, 68, 60, 75, 62],
  sleep_scores: [55, 60, 72, 65, 58, 80, 65],
  emotion_scores: [50, 55, 68, 72, 60, 75, 68],
};

const MOCK_DASHBOARD: DashboardData = {
  burnout_analysis: MOCK_BURNOUT,
  recent_sleep: MOCK_SLEEP,
  recent_phone_usage: MOCK_PHONE_USAGE,
  recent_emotion: MOCK_EMOTION,
  recent_activity: MOCK_ACTIVITY,
  trend_data: MOCK_TREND,
};

const MOCK_SLEEP_LIST: SleepRecord[] = [
  { id: 1, user_id: 1, date: new Date().toISOString().split('T')[0], bedtime: '23:30', wake_time: '07:00', duration_hours: 7.5, quality_score: 82, interruptions: 1, deep_sleep_percentage: 22, notes: 'Great sleep', created_at: new Date().toISOString() },
  { id: 2, user_id: 1, date: new Date(Date.now() - 86400000).toISOString().split('T')[0], bedtime: '23:45', wake_time: '06:30', duration_hours: 6.75, quality_score: 72, interruptions: 2, deep_sleep_percentage: 18, notes: 'Woke up once', created_at: new Date().toISOString() },
  { id: 3, user_id: 1, date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0], bedtime: '00:15', wake_time: '06:15', duration_hours: 6.0, quality_score: 60, interruptions: 3, deep_sleep_percentage: 14, notes: 'Restless', created_at: new Date().toISOString() },
  { id: 4, user_id: 1, date: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0], bedtime: '22:45', wake_time: '07:15', duration_hours: 8.5, quality_score: 90, interruptions: 0, deep_sleep_percentage: 25, notes: 'Deep recovery', created_at: new Date().toISOString() },
  { id: 5, user_id: 1, date: new Date(Date.now() - 86400000 * 4).toISOString().split('T')[0], bedtime: '23:00', wake_time: '06:30', duration_hours: 7.5, quality_score: 78, interruptions: 1, deep_sleep_percentage: 20, notes: 'Normal', created_at: new Date().toISOString() },
  { id: 6, user_id: 1, date: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0], bedtime: '23:15', wake_time: '07:00', duration_hours: 7.75, quality_score: 84, interruptions: 1, deep_sleep_percentage: 21, notes: 'Good rest', created_at: new Date().toISOString() },
  { id: 7, user_id: 1, date: new Date(Date.now() - 86400000 * 6).toISOString().split('T')[0], bedtime: '22:30', wake_time: '06:30', duration_hours: 8.0, quality_score: 88, interruptions: 0, deep_sleep_percentage: 24, notes: 'Solid sleep', created_at: new Date().toISOString() },
];

const MOCK_PHONE_LIST: PhoneUsageRecord[] = [
  { id: 1, user_id: 1, date: new Date().toISOString().split('T')[0], total_hours: 4.2, social_media_hours: 1.8, productive_hours: 2.0, entertainment_hours: 0.4, pickups_count: 65, late_night_usage: false, created_at: new Date().toISOString() },
  { id: 2, user_id: 1, date: new Date(Date.now() - 86400000).toISOString().split('T')[0], total_hours: 5.5, social_media_hours: 2.5, productive_hours: 1.8, entertainment_hours: 1.2, pickups_count: 82, late_night_usage: true, created_at: new Date().toISOString() },
  { id: 3, user_id: 1, date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0], total_hours: 6.8, social_media_hours: 3.2, productive_hours: 1.5, entertainment_hours: 2.1, pickups_count: 98, late_night_usage: true, created_at: new Date().toISOString() },
  { id: 4, user_id: 1, date: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0], total_hours: 3.5, social_media_hours: 1.0, productive_hours: 2.2, entertainment_hours: 0.3, pickups_count: 45, late_night_usage: false, created_at: new Date().toISOString() },
  { id: 5, user_id: 1, date: new Date(Date.now() - 86400000 * 4).toISOString().split('T')[0], total_hours: 4.8, social_media_hours: 2.0, productive_hours: 2.1, entertainment_hours: 0.7, pickups_count: 72, late_night_usage: false, created_at: new Date().toISOString() },
  { id: 6, user_id: 1, date: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0], total_hours: 5.0, social_media_hours: 2.2, productive_hours: 1.9, entertainment_hours: 0.9, pickups_count: 78, late_night_usage: true, created_at: new Date().toISOString() },
  { id: 7, user_id: 1, date: new Date(Date.now() - 86400000 * 6).toISOString().split('T')[0], total_hours: 3.8, social_media_hours: 1.2, productive_hours: 2.4, entertainment_hours: 0.2, pickups_count: 52, late_night_usage: false, created_at: new Date().toISOString() },
];

const MOCK_ACTIVITY_LIST: ActivityRecord[] = [
  { id: 1, user_id: 1, date: new Date().toISOString().split('T')[0], study_hours: 3.5, work_hours: 6.0, exercise_minutes: 30, break_count: 4, focus_score: 78, created_at: new Date().toISOString() },
  { id: 2, user_id: 1, date: new Date(Date.now() - 86400000).toISOString().split('T')[0], study_hours: 4.0, work_hours: 7.0, exercise_minutes: 20, break_count: 3, focus_score: 70, created_at: new Date().toISOString() },
  { id: 3, user_id: 1, date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0], study_hours: 2.0, work_hours: 8.0, exercise_minutes: 0, break_count: 1, focus_score: 55, created_at: new Date().toISOString() },
  { id: 4, user_id: 1, date: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0], study_hours: 5.0, work_hours: 5.0, exercise_minutes: 45, break_count: 5, focus_score: 85, created_at: new Date().toISOString() },
  { id: 5, user_id: 1, date: new Date(Date.now() - 86400000 * 4).toISOString().split('T')[0], study_hours: 3.0, work_hours: 6.5, exercise_minutes: 15, break_count: 2, focus_score: 62, created_at: new Date().toISOString() },
  { id: 6, user_id: 1, date: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0], study_hours: 4.5, work_hours: 4.5, exercise_minutes: 30, break_count: 4, focus_score: 80, created_at: new Date().toISOString() },
  { id: 7, user_id: 1, date: new Date(Date.now() - 86400000 * 6).toISOString().split('T')[0], study_hours: 3.0, work_hours: 7.0, exercise_minutes: 25, break_count: 3, focus_score: 74, created_at: new Date().toISOString() },
];

/** Exported so useDashboard can use it as an offline fallback. */
export { MOCK_DASHBOARD };

// The fixed token demoLogin() (AuthContext.tsx) stores — used here to detect
// Demo Mode so requests are served from the mock data above instead of
// hitting the real API with a token the server will always reject.
export const DEMO_TOKEN = 'demo_token_xyz';
const isDemoSession = async (): Promise<boolean> => {
  const token = await StorageService.getToken();
  return token === DEMO_TOKEN;
};

// ─── Auth API ───────────────────────────────────────────────────────────────────

export const authApi = {
  async login(credentials: LoginRequest): Promise<AuthTokens> {
    const payload = `username=${encodeURIComponent(credentials.username)}&password=${encodeURIComponent(credentials.password)}`;
    const response = await api.post<AuthTokens>('/auth/login', payload, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return response.data;
  },

  async register(data: RegisterRequest): Promise<AuthTokens> {
    const response = await api.post<AuthTokens>('/auth/register', data);
    return response.data;
  },

  async getCurrentUser(): Promise<User> {
    if (await isDemoSession()) return MOCK_USER;
    const response = await api.get<User>('/auth/me');
    return response.data;
  },

  async updateProfile(data: { full_name?: string; age?: number; gender?: string }): Promise<User> {
    if (await isDemoSession()) return { ...MOCK_USER, ...data };
    const response = await api.put<User>('/auth/me', data);
    return response.data;
  },

  async resetPassword(data: ResetPasswordRequest): Promise<{ status: string; message: string }> {
    const response = await api.post<{ status: string; message: string }>('/auth/reset-password', data);
    return response.data;
  },
};

// ─── Dashboard API ──────────────────────────────────────────────────────────────

export const dashboardApi = {
  async getDashboard(): Promise<DashboardData> {
    if (await isDemoSession()) return MOCK_DASHBOARD;
    const response = await api.get<any>('/wellness/dashboard');
    const data = response.data;
    if (data.recent_phone_usage) {
      data.recent_phone_usage = {
        id: data.recent_phone_usage.id,
        user_id: data.recent_phone_usage.user_id,
        date: data.recent_phone_usage.date,
        total_hours: data.recent_phone_usage.screen_time_hours || 0,
        social_media_hours: data.recent_phone_usage.app_usage_data?.social_media_hours || 0,
        productive_hours: data.recent_phone_usage.app_usage_data?.productive_hours || 0,
        entertainment_hours: data.recent_phone_usage.app_usage_data?.entertainment_hours || 0,
        pickups_count: data.recent_phone_usage.pickups_count || 0,
        late_night_usage: data.recent_phone_usage.late_night_usage || false,
        created_at: data.recent_phone_usage.created_at,
      };
    }
    return data;
  },

  async getBurnoutAnalysis(): Promise<BurnoutAnalysis> {
    if (await isDemoSession()) return MOCK_BURNOUT;
    const response = await api.get<BurnoutAnalysis>('/burnout/analysis');
    return response.data;
  },
};

// ─── Sleep API ──────────────────────────────────────────────────────────────────

export const sleepApi = {
  async getSleepRecords(days = 7): Promise<SleepRecord[]> {
    if (await isDemoSession()) return MOCK_SLEEP_LIST;
    try {
      const response = await api.get<SleepRecord[]>(`/tracking/sleep?days=${days}`);
      return response.data ?? [];
    } catch {
      return [];
    }
  },

  async logSleep(data: Partial<SleepRecord>): Promise<SleepRecord> {
    if (await isDemoSession()) return { ...MOCK_SLEEP, ...data, id: Date.now() };
    const response = await api.post<SleepRecord>('/tracking/sleep', data);
    return response.data;
  },
};

// ─── Phone Usage API ────────────────────────────────────────────────────────────

export const phoneApi = {
  async getPhoneUsageRecords(days = 7): Promise<PhoneUsageRecord[]> {
    if (await isDemoSession()) return MOCK_PHONE_LIST;
    try {
      const response = await api.get<any[]>(`/tracking/phone-usage?days=${days}`);
      const mapped = (response.data || []).map((r) => ({
        id: r.id,
        user_id: r.user_id,
        date: r.date,
        total_hours: r.screen_time_hours || 0,
        social_media_hours: r.app_usage_data?.social_media_hours || 0,
        productive_hours: r.app_usage_data?.productive_hours || 0,
        entertainment_hours: r.app_usage_data?.entertainment_hours || 0,
        pickups_count: r.pickups_count || 0,
        late_night_usage: r.late_night_usage || false,
        created_at: r.created_at,
      }));
      return mapped;
    } catch {
      return [];
    }
  },

  async logPhoneUsage(data: Partial<PhoneUsageRecord>): Promise<PhoneUsageRecord> {
    if (await isDemoSession()) return { ...MOCK_PHONE_USAGE, ...data, id: Date.now() };
    const payload = {
      date: data.date,
      screen_time_hours: data.total_hours,
      pickups_count: data.pickups_count,
      late_night_usage: data.late_night_usage,
      app_usage_data: {
        social_media_hours: data.social_media_hours || 0,
        productive_hours: data.productive_hours || 0,
        entertainment_hours: data.entertainment_hours || 0,
      },
    };
    const response = await api.post<any>('/tracking/phone-usage', payload);
    const r = response.data;
    return {
      id: r.id,
      user_id: r.user_id,
      date: r.date,
      total_hours: r.screen_time_hours || 0,
      social_media_hours: r.app_usage_data?.social_media_hours || 0,
      productive_hours: r.app_usage_data?.productive_hours || 0,
      entertainment_hours: r.app_usage_data?.entertainment_hours || 0,
      pickups_count: r.pickups_count || 0,
      late_night_usage: r.late_night_usage || false,
      created_at: r.created_at,
    };
  },
};

// ─── Emotion API ────────────────────────────────────────────────────────────────

export const emotionApi = {
  async getEmotionRecords(days = 7): Promise<EmotionRecord[]> {
    if (await isDemoSession()) return [MOCK_EMOTION];
    try {
      const response = await api.get<EmotionRecord[]>(`/tracking/emotion?days=${days}`);
      return response.data ?? [];
    } catch {
      return [];
    }
  },

  async logEmotion(data: Partial<EmotionRecord>): Promise<EmotionRecord> {
    if (await isDemoSession()) return { ...MOCK_EMOTION, ...data, id: Date.now() };
    const response = await api.post<EmotionRecord>('/tracking/emotion', data);
    return response.data;
  },

  async analyzeCamera(imageBase64: string): Promise<EmotionRecord> {
    const generateDynamicRecord = (): EmotionRecord => {
      const possible = ['Happy', 'Neutral', 'Calm', 'Surprised', 'Anxious', 'Sad', 'Angry'];
      const dominant = possible[Math.floor(Math.random() * possible.length)];
      const conf = Math.round((0.78 + Math.random() * 0.18) * 100) / 100;
      const rem = Math.round((1.0 - conf) * 100) / 100;

      const emotions = [{ emotion: dominant, confidence: conf }];
      const others = possible.filter((e) => e !== dominant);
      let left = rem;
      for (let i = 0; i < others.length; i++) {
        if (i === others.length - 1) {
          emotions.push({ emotion: others[i], confidence: Math.max(0.01, Math.round(left * 100) / 100) });
        } else {
          const share = Math.round((Math.random() * (left / 2)) * 100) / 100;
          emotions.push({ emotion: others[i], confidence: Math.max(0.01, share) });
          left -= share;
        }
      }

      return {
        id: Date.now(),
        user_id: 1,
        dominant_emotion: dominant,
        confidence: conf,
        valence: dominant === 'Happy' || dominant === 'Calm' ? 0.8 : dominant === 'Neutral' ? 0.5 : 0.2,
        arousal: dominant === 'Anxious' || dominant === 'Angry' || dominant === 'Surprised' ? 0.8 : 0.4,
        stress_level: dominant === 'Anxious' || dominant === 'Angry' ? 75 : dominant === 'Sad' ? 60 : 25,
        emotions: emotions.sort((a, b) => b.confidence - a.confidence),
        source: 'camera',
        timestamp: new Date().toISOString(),
      };
    };

    if (await isDemoSession()) {
      return generateDynamicRecord();
    }
    try {
      const response = await api.post<any>('/tracking/emotion/analyze-camera', {
        image: imageBase64,
      });
      const r = response.data;
      const rawScores = typeof r.emotion_scores === 'string' ? JSON.parse(r.emotion_scores) : r.emotion_scores;
      const emotionsList = rawScores
        ? Object.entries(rawScores).map(([emotion, confidence]) => ({ emotion, confidence: Number(confidence) }))
        : [{ emotion: r.dominant_emotion || 'Neutral', confidence: r.confidence || 0.85 }];

      return {
        id: r.id || Date.now(),
        user_id: r.user_id || 1,
        dominant_emotion: r.dominant_emotion || 'Neutral',
        confidence: r.confidence || 0.85,
        valence: 0.5,
        arousal: 0.5,
        stress_level: 40,
        emotions: emotionsList.sort((a, b) => b.confidence - a.confidence),
        source: 'camera',
        timestamp: r.timestamp || new Date().toISOString(),
      };
    } catch {
      return generateDynamicRecord();
    }
  },
};

// ─── Activity API ───────────────────────────────────────────────────────────────

export const activityApi = {
  async getActivityRecords(days = 7): Promise<ActivityRecord[]> {
    if (await isDemoSession()) return [MOCK_ACTIVITY];
    try {
      const response = await api.get<ActivityRecord[]>(`/tracking/activity?days=${days}`);
      return response.data;
    } catch {
      return [];
    }
  },

  async logActivity(data: Partial<ActivityRecord>): Promise<ActivityRecord> {
    if (await isDemoSession()) return { ...MOCK_ACTIVITY, ...data, id: Date.now() };
    const response = await api.post<ActivityRecord>('/tracking/activity', data);
    return response.data;
  },
};

// ─── Recommendations API ────────────────────────────────────────────────────────

export const recommendationsApi = {
  async getRecommendations(): Promise<Recommendation[]> {
    if (await isDemoSession()) return MOCK_BURNOUT.recommendations;
    try {
      const response = await api.get<Recommendation[]>('/recommendations');
      return response.data;
    } catch {
      return [];
    }
  },
};

// ─── Chat API ───────────────────────────────────────────────────────────────────

export interface ChatResponse {
  reply: string;
  burnout_score: number;
  risk_level: string;
  ai_source: 'gpt' | 'smart-engine' | 'offline';
  timestamp: string;
}

export const chatApi = {
  async sendMessage(
    message: string,
    history: { role: string; content: string }[]
  ): Promise<ChatResponse> {
    const response = await api.post<ChatResponse>('/chat', { message, history });
    return response.data;
  },
};

export default api;
