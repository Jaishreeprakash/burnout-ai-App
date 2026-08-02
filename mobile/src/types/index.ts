export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  age?: number;
  gender?: string;
  created_at: string;
  is_active: boolean;
}

export interface AuthTokens {
  access_token: string;
  token_type: string;
  user: User;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  full_name: string;
  age?: number;
  gender?: string;
}

export interface ResetPasswordRequest {
  email: string;
  new_password: string;
}

export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

export interface BurnoutAnalysis {
  burnout_score: number;
  risk_level: RiskLevel;
  confidence: number;
  factors: BurnoutFactor[];
  recommendations: Recommendation[];
  timestamp: string;
  wellness_score: number;
  emotional_stability_index: number;
  sleep_quality_score: number;
  phone_usage_score: number;
  activity_score: number;
}

export interface BurnoutFactor {
  name: string;
  impact: number;
  description: string;
}

export interface Recommendation {
  id: number;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'sleep' | 'phone' | 'activity' | 'mental' | 'general';
  action_steps: string[];
  estimated_impact: number;
}

export interface SleepRecord {
  id: number;
  user_id: number;
  date: string;
  bedtime: string;
  wake_time: string;
  duration_hours: number;
  quality_score: number;
  interruptions: number;
  deep_sleep_percentage: number;
  notes?: string;
  created_at: string;
}

export interface PhoneUsageRecord {
  id: number;
  user_id: number;
  date: string;
  total_hours: number;
  social_media_hours: number;
  productive_hours: number;
  entertainment_hours: number;
  pickups_count: number;
  late_night_usage: boolean;
  created_at: string;
}

export interface EmotionRecord {
  id: number;
  user_id: number;
  dominant_emotion: string;
  confidence: number;
  valence: number;
  arousal: number;
  stress_level: number;
  emotions: EmotionDetail[];
  source: 'camera' | 'manual' | 'voice';
  notes?: string;
  timestamp: string;
}

export interface EmotionDetail {
  emotion: string;
  confidence: number;
}

export interface ActivityRecord {
  id: number;
  user_id: number;
  date: string;
  study_hours: number;
  work_hours: number;
  exercise_minutes: number;
  break_count: number;
  focus_score: number;
  notes?: string;
  created_at: string;
}

export interface DashboardData {
  burnout_analysis: BurnoutAnalysis;
  recent_sleep: SleepRecord | null;
  recent_phone_usage: PhoneUsageRecord | null;
  recent_emotion: EmotionRecord | null;
  recent_activity: ActivityRecord | null;
  trend_data: TrendData;
}

export interface TrendData {
  dates: string[];
  burnout_scores: number[];
  wellness_scores: number[];
  sleep_scores: number[];
  emotion_scores: number[];
}

export interface ApiError {
  detail: string;
  status_code?: number;
}
