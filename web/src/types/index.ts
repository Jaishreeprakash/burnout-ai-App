// ── Aliases kept for backward-compat with existing components ──────────────
export type RiskLevel = string;
export type WellnessScore = WellnessScoreRecord; // alias

// ============ AUTH TYPES ============
export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  age?: number;
  gender?: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface Token {
  access_token: string;
  token_type: string;
  user?: User;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  full_name: string;
  age?: number;
  gender?: string;
}

// ============ BURNOUT TYPES ============
// These match the actual backend schemas/tracking.py ComponentScores
export interface ComponentScores {
  sleep_score: number;
  phone_overuse_score: number;
  typing_distress_score: number;
  activity_score: number;
  emotion_score: number;
}

export interface BurnoutAnalysis {
  burnout_score: number;
  risk_level: string;
  component_scores: ComponentScores;
  analysis_date: string;
  sleep_analysis?: Record<string, unknown> | null;
  phone_analysis?: Record<string, unknown> | null;
  typing_analysis?: Record<string, unknown> | null;
  emotion_analysis?: Record<string, unknown> | null;
  activity_analysis?: Record<string, unknown> | null;
  wellness?: Record<string, unknown> | null;
}

// Burnout history record (GET /burnout/history)
export interface BurnoutHistoryRecord {
  id: number;
  date: string;
  burnout_score: number;
  risk_level: string;
  created_at: string | null;
}

// ============ SLEEP TYPES ============
// Matches backend SleepRecordResponse exactly
export interface SleepRecord {
  id?: number;
  user_id?: number;
  date: string;
  duration_hours: number;
  quality_score: number;      // 0-100
  consistency_score: number;  // 0-100
  bedtime?: string | null;
  wake_time?: string | null;
  created_at?: string;
}

// ============ PHONE USAGE TYPES ============
// Matches backend PhoneUsageResponse
export interface PhoneUsageRecord {
  id?: number;
  user_id?: number;
  date: string;
  screen_time_hours: number;
  app_usage_data?: Record<string, number> | null;
  late_night_usage: boolean;
  pickups_count?: number | null;
  created_at?: string;
}

// ============ TYPING TYPES ============
export interface TypingRecord {
  id?: number;
  user_id?: number;
  date: string;
  avg_speed_wpm: number;
  accuracy_percent: number;
  pause_frequency: number;
  session_duration_minutes: number;
  created_at?: string;
}

// ============ EMOTION TYPES ============
// Matches backend EmotionRecordResponse
export interface EmotionRecord {
  id?: number;
  user_id?: number;
  timestamp: string;
  emotion_type: string;        // 'facial' | 'voice'
  dominant_emotion: string;
  confidence: number;
  emotion_scores?: Record<string, number> | null;
  created_at?: string;
}

// ============ ACTIVITY TYPES ============
// Matches backend ActivityRecordResponse
export interface ActivityRecord {
  id?: number;
  user_id?: number;
  date: string;
  study_hours: number;
  work_hours: number;
  exercise_minutes: number;
  break_count: number;
  focus_score: number;
  created_at?: string;
}

// ============ WELLNESS TYPES ============
// Matches backend WellnessScoreResponse
export interface WellnessScoreRecord {
  id?: number;
  user_id?: number;
  date: string;
  overall_score: number;
  stress_level: number;
  mood_score: number;
  productivity_score: number;
  notes?: string | null;
  created_at?: string;
}

// ============ DASHBOARD TYPES ============
// Matches actual backend DashboardData schema
export interface TrendPoint {
  date: string;
  value: number;
}

export interface BackendDashboardData {
  current_burnout_score: number;
  risk_level: string;
  wellness_score: number;
  sleep_avg_hours: number;
  sleep_quality_avg: number;
  phone_screen_time_avg: number;
  exercise_minutes_avg: number;
  dominant_emotion: string;
  burnout_trend: TrendPoint[];
  sleep_trend: TrendPoint[];
  wellness_trend: TrendPoint[];
  recommendations_count: number;
  last_updated: string;
}

// Trends API response shape (GET /wellness/trends)
export interface TrendsData {
  seven_day: {
    burnout: Array<{ date: string; burnout_score: number; risk_level: string }>;
    sleep: Array<{ date: string; duration_hours: number; quality_score: number }>;
    wellness: Array<{ date: string; overall_score: number; stress_level: number; mood_score: number }>;
    activity: Array<{ date: string; exercise_minutes: number; focus_score: number; work_hours: number }>;
  };
  thirty_day: {
    burnout: Array<{ date: string; burnout_score: number; risk_level: string }>;
    sleep: Array<{ date: string; duration_hours: number; quality_score: number }>;
    wellness: Array<{ date: string; overall_score: number; stress_level: number; mood_score: number }>;
    activity: Array<{ date: string; exercise_minutes: number; focus_score: number; work_hours: number }>;
  };
  prediction: {
    direction?: string;
    predicted_next_week?: number;
    r_squared?: number;
  };
}

// ============ RECOMMENDATION TYPES ============
export type RecommendationCategory = 'sleep' | 'phone' | 'activity' | 'mental' | 'social' | 'nutrition';
export type RecommendationPriority = 'high' | 'medium' | 'low';

export interface Recommendation {
  id?: number;
  title: string;
  description: string;
  category: RecommendationCategory;
  priority: RecommendationPriority;
  action_steps: string[];
  estimated_impact?: string;
  time_to_implement?: string;
  completed?: boolean;
}

// ============ CHART TYPES ============
export interface TrendData {
  date: string;
  value: number;
  label?: string;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
}

export interface MultiLineChartData {
  date: string;
  mood?: number;
  stress?: number;
  productivity?: number;
  energy?: number;
  [key: string]: string | number | undefined;
}

export interface RadarDataPoint {
  subject: string;
  value: number;
  fullMark: number;
}

export interface ComparisonDataPoint {
  name: string;
  before: number;
  after: number;
}

export interface EmotionDistributionItem {
  label: string;
  value: number;
  color: string;
}

// Aggregated dashboard state computed by useDashboard hook
export interface DashboardState {
  // Raw API data
  overview: BackendDashboardData | null;
  burnoutAnalysis: BurnoutAnalysis | null;
  wellnessScore: WellnessScoreRecord | null;
  sleepHistory: SleepRecord[];
  phoneHistory: PhoneUsageRecord[];
  activityHistory: ActivityRecord[];
  emotionHistory: EmotionRecord[];
  recommendations: Recommendation[];
  trends: TrendsData | null;

  // Computed / derived for charts
  sleepSparkline: number[];
  phoneSparkline: number[];
  activitySparkline: number[];
  emotionalChartData: MultiLineChartData[];
  emotionDistribution: EmotionDistributionItem[];
  comparisonData: ComparisonDataPoint[];
  radarData: RadarDataPoint[];
  quickStats: QuickStat[];
}

export interface QuickStat {
  label: string;
  value: string;
  color: string;
  icon: string; // icon name key
}

// ============ API RESPONSE TYPES ============
export interface ApiError {
  detail: string;
  status_code?: number;
}
