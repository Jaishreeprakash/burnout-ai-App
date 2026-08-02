import { useState, useEffect, useCallback } from 'react';
import {
  DashboardState,
  SleepRecord,
  PhoneUsageRecord,
  ActivityRecord,
  EmotionRecord,
  BurnoutHistoryRecord,
  MultiLineChartData,
  EmotionDistributionItem,
  ComparisonDataPoint,
  RadarDataPoint,
  QuickStat,
  Recommendation,
} from '../types';
import {
  wellnessAPI,
  burnoutAPI,
  sleepAPI,
  phoneAPI,
  activityAPI,
  emotionAPI,
  recommendationsAPI,
} from '../services/api';

// ── Emotion colours ──────────────────────────────────────────────────────────
const EMOTION_COLORS: Record<string, string> = {
  happy:    '#22c55e',
  calm:     '#06b6d4',
  content:  '#10b981',
  neutral:  '#6366f1',
  sad:      '#94a3b8',
  anxious:  '#f59e0b',
  stressed: '#f97316',
  angry:    '#ef4444',
  fearful:  '#a855f7',
  disgusted:'#78716c',
  surprised:'#3b82f6',
};

const POSITIVE_EMOTIONS = new Set(['happy', 'calm', 'content', 'surprised']);
const HIGH_AROUSAL = new Set(['happy', 'angry', 'anxious', 'stressed', 'surprised', 'fearful']);

// ── Utility helpers ──────────────────────────────────────────────────────────
function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function sortByDate<T extends { date: string }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => a.date.localeCompare(b.date));
}

function last7<T extends { date: string }>(arr: T[]): T[] {
  const sorted = sortByDate(arr);
  return sorted.slice(-7);
}

// ── Sparkline extractor ──────────────────────────────────────────────────────
function sleepSparkline(records: SleepRecord[]): number[] {
  return last7(records).map((r) => r.duration_hours);
}

function phoneSparkline(records: PhoneUsageRecord[]): number[] {
  return last7(records).map((r) => Math.round(r.screen_time_hours * 60));
}

function activitySparkline(records: ActivityRecord[]): number[] {
  return last7(records).map((r) => r.exercise_minutes);
}

// ── Emotional chart data from trends API ────────────────────────────────────
function buildEmotionalChart(
  wellnessTrend: Array<{ date: string; overall_score: number; stress_level: number; mood_score: number }>,
  activityTrend: Array<{ date: string; exercise_minutes: number; focus_score: number; work_hours: number }>,
): MultiLineChartData[] {
  const activityByDate = new Map(activityTrend.map((a) => [a.date, a]));

  return wellnessTrend.map((w) => {
    const act = activityByDate.get(w.date);
    // Energy is derived from mood and exercise minutes
    const exercise = act ? act.exercise_minutes : 0;
    const energy = Math.min(100, Math.round(w.mood_score * 0.7 + (exercise / 60) * 30));
    const shortDate = new Date(w.date).toLocaleDateString('en', { weekday: 'short' });
    return {
      date: shortDate,
      mood: Math.round(w.mood_score),
      stress: Math.round(w.stress_level),
      productivity: act ? Math.round(act.focus_score) : Math.round(w.mood_score * 0.85),
      energy,
    };
  });
}

// ── Emotion distribution from history ───────────────────────────────────────
function buildEmotionDistribution(records: EmotionRecord[]): EmotionDistributionItem[] {
  if (!records.length) return [];
  const counts: Record<string, number> = {};
  records.forEach((r) => {
    counts[r.dominant_emotion] = (counts[r.dominant_emotion] || 0) + 1;
  });
  const total = records.length;
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([emotion, count]) => ({
      label: emotion.charAt(0).toUpperCase() + emotion.slice(1),
      value: Math.round((count / total) * 100),
      color: EMOTION_COLORS[emotion] || '#6366f1',
    }));
}

// ── Valence & arousal ────────────────────────────────────────────────────────
function buildValenceArousal(records: EmotionRecord[]): { valence: number; arousal: number } {
  if (!records.length) return { valence: 50, arousal: 50 };
  let posCount = 0;
  let highArousalCount = 0;
  records.forEach((r) => {
    if (POSITIVE_EMOTIONS.has(r.dominant_emotion)) posCount++;
    if (HIGH_AROUSAL.has(r.dominant_emotion)) highArousalCount++;
  });
  return {
    valence: Math.round((posCount / records.length) * 100),
    arousal: Math.round((highArousalCount / records.length) * 100),
  };
}

// ── Comparison chart: first half vs second half of 30 days ──────────────────
function buildComparisonData(
  burnoutHistory: BurnoutHistoryRecord[],
  sleepHistory: SleepRecord[],
  phoneHistory: PhoneUsageRecord[],
  activityHistory: ActivityRecord[],
): ComparisonDataPoint[] {
  const halfLen = 15;

  const sortedBurnout = sortByDate(burnoutHistory.map((b) => ({ date: b.date, burnout_score: b.burnout_score })));
  const before_burnout = avg(sortedBurnout.slice(0, halfLen).map((b) => b.burnout_score));
  const after_burnout = avg(sortedBurnout.slice(-halfLen).map((b) => b.burnout_score));

  const sortedSleep = sortByDate(sleepHistory);
  const before_sleep = avg(sortedSleep.slice(0, halfLen).map((s) => s.quality_score));
  const after_sleep = avg(sortedSleep.slice(-halfLen).map((s) => s.quality_score));

  const sortedPhone = sortByDate(phoneHistory);
  // Invert: lower screen time = better score (100 - normalised)
  const before_phone_raw = avg(sortedPhone.slice(0, halfLen).map((p) => p.screen_time_hours));
  const after_phone_raw = avg(sortedPhone.slice(-halfLen).map((p) => p.screen_time_hours));
  const before_phone = Math.round(Math.max(0, 100 - before_phone_raw * 14));
  const after_phone = Math.round(Math.max(0, 100 - after_phone_raw * 14));

  const sortedActivity = sortByDate(activityHistory);
  const before_activity = avg(sortedActivity.slice(0, halfLen).map((a) => a.focus_score));
  const after_activity = avg(sortedActivity.slice(-halfLen).map((a) => a.focus_score));

  return [
    { name: 'Burnout', before: Math.round(before_burnout), after: Math.round(after_burnout) },
    { name: 'Sleep Q.', before: Math.round(before_sleep), after: Math.round(after_sleep) },
    { name: 'Phone', before: before_phone, after: after_phone },
    { name: 'Activity', before: Math.round(before_activity), after: Math.round(after_activity) },
  ];
}

// ── Radar chart data from burnout analysis ───────────────────────────────────
function buildRadarData(
  comp: { sleep_score: number; phone_overuse_score: number; typing_distress_score: number; activity_score: number; emotion_score: number } | null,
): RadarDataPoint[] {
  if (!comp) return [];
  return [
    { subject: 'Sleep',    value: Math.round(100 - comp.sleep_score),           fullMark: 100 },
    { subject: 'Phone',    value: Math.round(100 - comp.phone_overuse_score),    fullMark: 100 },
    { subject: 'Typing',   value: Math.round(100 - comp.typing_distress_score),  fullMark: 100 },
    { subject: 'Activity', value: Math.round(100 - comp.activity_score),         fullMark: 100 },
    { subject: 'Emotion',  value: Math.round(100 - comp.emotion_score),          fullMark: 100 },
  ];
}

// ── Quick stats ──────────────────────────────────────────────────────────────
function buildQuickStats(
  sleepHistory: SleepRecord[],
  phoneHistory: PhoneUsageRecord[],
  activityHistory: ActivityRecord[],
  wellnessScore: number,
  productivityScore: number,
): QuickStat[] {
  // Consecutive good sleep nights (≥ 7h), most recent first
  const sortedSleepDesc = [...sleepHistory].sort((a, b) => b.date.localeCompare(a.date));
  let consecutiveGoodSleep = 0;
  for (const s of sortedSleepDesc) {
    if (s.duration_hours >= 7) consecutiveGoodSleep++;
    else break;
  }

  // Screen time change: this week avg vs previous week avg (in hours)
  const sortedPhone = sortByDate(phoneHistory);
  const thisWeek  = sortedPhone.slice(-7).map((p) => p.screen_time_hours);
  const lastWeek  = sortedPhone.slice(-14, -7).map((p) => p.screen_time_hours);
  const thisWeekAvg = avg(thisWeek);
  const lastWeekAvg = avg(lastWeek);
  let screenTimeChange = '—';
  if (lastWeekAvg > 0 && thisWeekAvg > 0) {
    const pct = Math.round(((thisWeekAvg - lastWeekAvg) / lastWeekAvg) * 100);
    screenTimeChange = pct > 0 ? `+${pct}%` : `${pct}%`;
  }

  // Active days this week (exercise > 0)
  const last7Activity = activityHistory.filter(() => true).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
  const activeDays = last7Activity.filter((a) => a.exercise_minutes > 0).length;

  // Stress level bucket from wellness score (lower is better — stress_level is a raw score)
  const stressLabel =
    wellnessScore >= 70 ? 'Low' :
    wellnessScore >= 50 ? 'Moderate' :
    'High';
  const stressColor =
    wellnessScore >= 70 ? 'text-green-400' :
    wellnessScore >= 50 ? 'text-amber-400' :
    'text-red-400';

  return [
    {
      label: 'Consecutive good sleep nights',
      value: String(consecutiveGoodSleep),
      color: consecutiveGoodSleep >= 3 ? 'text-green-400' : 'text-amber-400',
      icon: 'Moon',
    },
    {
      label: 'Screen time vs last week',
      value: screenTimeChange,
      color: screenTimeChange.startsWith('-') ? 'text-green-400' : 'text-amber-400',
      icon: 'Smartphone',
    },
    {
      label: 'Active days this week',
      value: `${activeDays}/7`,
      color: activeDays >= 4 ? 'text-green-400' : 'text-amber-400',
      icon: 'Activity',
    },
    {
      label: 'Stress level (avg)',
      value: stressLabel,
      color: stressColor,
      icon: 'Brain',
    },
    {
      label: 'Productivity score',
      value: `${Math.round(productivityScore)}/100`,
      color: productivityScore >= 70 ? 'text-indigo-400' : 'text-amber-400',
      icon: 'Zap',
    },
  ];
}

// ── Empty state ──────────────────────────────────────────────────────────────
const emptyState: DashboardState = {
  overview: null,
  burnoutAnalysis: null,
  wellnessScore: null,
  sleepHistory: [],
  phoneHistory: [],
  activityHistory: [],
  emotionHistory: [],
  recommendations: [],
  trends: null,
  sleepSparkline: [],
  phoneSparkline: [],
  activitySparkline: [],
  emotionalChartData: [],
  emotionDistribution: [],
  comparisonData: [],
  radarData: [],
  quickStats: [],
};

// ── Main hook ────────────────────────────────────────────────────────────────
export const useDashboard = () => {
  const [data, setData] = useState<DashboardState>(emptyState);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fire all requests in parallel
      const [
        overview,
        burnoutAnalysis,
        wellnessScore,
        sleepHistory,
        phoneHistory,
        activityHistory,
        emotionHistory,
        recommendations,
        trends,
      ] = await Promise.all([
        wellnessAPI.getDashboard(),
        burnoutAPI.getAnalysis(),
        wellnessAPI.getScore(),
        sleepAPI.getHistory(),
        phoneAPI.getHistory(),
        activityAPI.getHistory(),
        emotionAPI.getHistory(),
        recommendationsAPI.getAll(),
        wellnessAPI.getTrends(),
      ]);

      const burnoutHistory = await burnoutAPI.getHistory();

      // Build derived data
      const emotionalChartData = buildEmotionalChart(
        trends.seven_day.wellness,
        trends.seven_day.activity,
      );

      const emotionDistribution = buildEmotionDistribution(emotionHistory);
      const comparisonData = buildComparisonData(burnoutHistory, sleepHistory, phoneHistory, activityHistory);
      const radarData = buildRadarData(burnoutAnalysis?.component_scores ?? null);
      const quickStats = buildQuickStats(
        sleepHistory,
        phoneHistory,
        activityHistory,
        wellnessScore.overall_score,
        wellnessScore.productivity_score,
      );

      setData({
        overview,
        burnoutAnalysis,
        wellnessScore,
        sleepHistory,
        phoneHistory,
        activityHistory,
        emotionHistory,
        recommendations,
        trends,
        sleepSparkline: sleepSparkline(sleepHistory),
        phoneSparkline: phoneSparkline(phoneHistory),
        activitySparkline: activitySparkline(activityHistory),
        emotionalChartData,
        emotionDistribution,
        comparisonData,
        radarData,
        quickStats,
      });
    } catch (err) {
      console.error('Failed to load dashboard data. Error:', err);
      setError('Failed to load dashboard data. Is the backend running?');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Expose valence/arousal computed from current emotion history
  const valenceArousal = buildValenceArousal(data.emotionHistory);

  return { data, isLoading, error, refetch: fetchAll, valenceArousal };
};

// ── Standalone hooks for individual pages ───────────────────────────────────
export const useSleepPage = () => {
  const [records, setRecords] = useState<SleepRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await sleepAPI.getHistory();
      setRecords(sortByDate(data));
    } catch {
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  return { records, isLoading, refetch: load };
};

export const usePhonePage = () => {
  const [records, setRecords] = useState<PhoneUsageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await phoneAPI.getHistory();
      setRecords(sortByDate(data));
    } catch {
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  return { records, isLoading, refetch: load };
};

export const useEmotionPage = () => {
  const [records, setRecords] = useState<EmotionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await emotionAPI.getHistory();
      setRecords(data);
    } catch {
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const distribution = buildEmotionDistribution(records);
  const valenceArousal = buildValenceArousal(records);
  return { records, isLoading, refetch: load, distribution, valenceArousal };
};

export const useActivityPage = () => {
  const [records, setRecords] = useState<ActivityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await activityAPI.getHistory();
      setRecords(sortByDate(data));
    } catch {
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  return { records, isLoading, refetch: load };
};

export const useRecommendations = () => {
  const [data, setData] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    recommendationsAPI.getAll()
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setIsLoading(false));
  }, []);

  return { data, isLoading };
};

export const useAnalytics = () => {
  const [trends, setTrends] = useState<import('../types').TrendsData | null>(null);
  const [burnoutHistory, setBurnoutHistory] = useState<import('../types').BurnoutHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [t, h] = await Promise.all([
        wellnessAPI.getTrends(),
        burnoutAPI.getHistory(),
      ]);
      setTrends(t);
      setBurnoutHistory(h);
    } catch {
      // leave as empty
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  return { trends, burnoutHistory, isLoading, refetch: load };
};
