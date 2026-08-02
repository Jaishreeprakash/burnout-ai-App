import React from 'react';
import {
  Moon, Smartphone, Activity, RefreshCw,
  Brain, Zap, Clock, TrendingUp, AlertTriangle,
} from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import { BurnoutGauge } from '../components/Dashboard/BurnoutGauge';
import { WellnessCard, WellnessCardData } from '../components/Dashboard/WellnessCard';
import { EmotionalChart } from '../components/Dashboard/EmotionalChart';
import { MetricCard } from '../components/Dashboard/MetricCard';
import { RecommendationCard } from '../components/Dashboard/RecommendationCard';
import { Card, CardHeader } from '../components/UI/Card';
import { Badge } from '../components/UI/Badge';
import { PageLoader } from '../components/UI/LoadingSpinner';
import { ComparisonBarChart } from '../components/Charts/BarChart';
import { RadarChartComponent } from '../components/Charts/RadarChart';
import { useAuth } from '../context/AuthContext';

// Icon resolver for quick stats
const STAT_ICONS: Record<string, React.ReactNode> = {
  Moon:       <Moon size={14} />,
  Smartphone: <Smartphone size={14} />,
  Activity:   <Activity size={14} />,
  Brain:      <Brain size={14} />,
  Zap:        <Zap size={14} />,
};

export const Dashboard: React.FC = () => {
  const { data, isLoading, error, refetch, valenceArousal } = useDashboard();
  const { user } = useAuth();

  if (isLoading) return <PageLoader message="Loading your wellness data..." />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle className="text-amber-400" size={40} />
        <p className="text-slate-400 text-center">{error}</p>
        <button
          onClick={refetch}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const {
    burnoutAnalysis,
    wellnessScore,
    sleepHistory,
    phoneHistory,
    activityHistory,
    recommendations,
    emotionalChartData,
    emotionDistribution,
    comparisonData,
    radarData,
    quickStats,
    sleepSparkline,
    phoneSparkline,
    activitySparkline,
  } = data;

  // Latest records for metric cards
  const latestSleep   = sleepHistory.length   ? sleepHistory[sleepHistory.length - 1]     : null;
  const latestPhone   = phoneHistory.length   ? phoneHistory[phoneHistory.length - 1]     : null;
  const latestActivity = activityHistory.length ? activityHistory[activityHistory.length - 1] : null;

  // Wellness card sub-scores mapped from API
  const wellnessCardData: WellnessCardData | null = wellnessScore
    ? {
        overall_score:      wellnessScore.overall_score,
        sleep_component:    Math.round(100 - (burnoutAnalysis?.component_scores.sleep_score ?? 50)),
        activity_component: Math.round(100 - (burnoutAnalysis?.component_scores.activity_score ?? 50)),
        emotion_component:  Math.round(100 - (burnoutAnalysis?.component_scores.emotion_score ?? 50)),
        balance_component:  wellnessScore.productivity_score,
        trend: wellnessScore.overall_score >= 65 ? 'improving' : wellnessScore.overall_score >= 45 ? 'stable' : 'declining',
        calculated_at: wellnessScore.created_at ?? new Date().toISOString(),
      }
    : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Greeting ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">
            Good {getTimeOfDay()},{' '}
            <span className="text-indigo-400">{user?.full_name?.split(' ')[0] || 'there'}</span>
          </h2>
          <p className="text-slate-400 text-sm mt-1">Here's your wellness summary for today</p>
        </div>
        <button
          onClick={refetch}
          className="flex items-center gap-2 text-slate-400 hover:text-white bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm transition-colors hover:border-slate-600"
        >
          <RefreshCw size={14} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* ── Alert banner for high/critical risk ── */}
      {burnoutAnalysis && ['high', 'critical'].includes(burnoutAnalysis.risk_level.toLowerCase()) && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="text-red-400 flex-shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-red-400 font-semibold text-sm">High Burnout Risk Detected</p>
            <p className="text-red-400/70 text-xs mt-1">
              Your burnout score is elevated. Please review the recommendations below and consider speaking with a wellness professional.
            </p>
          </div>
        </div>
      )}

      {/* ── Hero row: Gauge · Wellness · Radar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 flex flex-col items-center justify-center py-6">
          <CardHeader
            title="Burnout Risk Score"
            subtitle="AI-powered analysis"
            icon={<Brain size={16} />}
            className="w-full"
          />
          {burnoutAnalysis ? (
            <BurnoutGauge
              score={burnoutAnalysis.burnout_score}
              riskLevel={burnoutAnalysis.risk_level.toUpperCase()}
              size={200}
            />
          ) : (
            <div className="text-slate-400 text-sm py-8">No analysis data yet. Log some data to get started.</div>
          )}
        </Card>

        <Card className="flex flex-col items-center justify-center py-5">
          <CardHeader
            title="Wellness Score"
            subtitle="Component breakdown"
            icon={<Zap size={16} />}
            className="w-full"
          />
          {wellnessCardData ? (
            <WellnessCard wellness={wellnessCardData} />
          ) : (
            <div className="text-slate-400 text-sm py-8">No data available</div>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Health Dimensions"
            subtitle="5-axis wellness profile"
            icon={<TrendingUp size={16} />}
          />
          {radarData.length > 0 ? (
            <RadarChartComponent data={radarData} color="#6366f1" height={260} />
          ) : (
            <div className="text-slate-400 text-sm py-8 text-center">No data available</div>
          )}
        </Card>
      </div>

      {/* ── Metric cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<Moon size={18} />}
          title="Sleep Duration"
          value={latestSleep ? latestSleep.duration_hours.toFixed(1) : '—'}
          unit="hrs"
          trend={latestSleep ? (latestSleep.duration_hours >= 7 ? 'up' : 'down') : 'stable'}
          trendValue={latestSleep ? `Q ${latestSleep.quality_score.toFixed(0)}/100` : '—'}
          status={latestSleep ? (latestSleep.duration_hours >= 7 ? 'good' : latestSleep.duration_hours >= 6 ? 'warning' : 'danger') : 'warning'}
          sparklineData={sleepSparkline}
          subtitle="Last night"
        />
        <MetricCard
          icon={<Smartphone size={18} />}
          title="Screen Time"
          value={latestPhone ? latestPhone.screen_time_hours.toFixed(1) : '—'}
          unit="hrs"
          trend={latestPhone ? (latestPhone.screen_time_hours < 4 ? 'up' : 'down') : 'stable'}
          trendValue={latestPhone ? `${latestPhone.pickups_count ?? 0} pickups` : '—'}
          status={latestPhone ? (latestPhone.screen_time_hours > 6 ? 'danger' : latestPhone.screen_time_hours > 4 ? 'warning' : 'good') : 'warning'}
          sparklineData={phoneSparkline}
          subtitle="Today"
        />
        <MetricCard
          icon={<Activity size={18} />}
          title="Exercise"
          value={latestActivity ? latestActivity.exercise_minutes : '—'}
          unit="min"
          trend={latestActivity ? (latestActivity.exercise_minutes >= 30 ? 'up' : 'down') : 'stable'}
          trendValue={latestActivity ? `Focus ${latestActivity.focus_score.toFixed(0)}/100` : '—'}
          status={latestActivity ? (latestActivity.exercise_minutes >= 30 ? 'good' : latestActivity.exercise_minutes > 0 ? 'warning' : 'danger') : 'warning'}
          sparklineData={activitySparkline}
          subtitle="Today"
        />
        <MetricCard
          icon={<Clock size={18} />}
          title="Work Hours"
          value={latestActivity ? latestActivity.work_hours.toFixed(1) : '—'}
          unit="hrs"
          trend={latestActivity ? (latestActivity.work_hours <= 8 ? 'stable' : 'down') : 'stable'}
          trendValue={`${latestActivity?.break_count ?? 0} breaks`}
          status={latestActivity ? (latestActivity.work_hours > 10 ? 'danger' : latestActivity.work_hours > 8 ? 'warning' : 'good') : 'warning'}
          subtitle="Today"
        />
      </div>

      {/* ── Emotional stability chart + Emotion distribution ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Emotional Stability Trend"
            subtitle="7-day mood, stress and productivity"
            action={<Badge variant="info" size="sm" dot>7 days</Badge>}
          />
          {emotionalChartData.length > 0 ? (
            <EmotionalChart data={emotionalChartData} />
          ) : (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
              No trend data yet — data will appear after a few days of tracking
            </div>
          )}
        </Card>

        {/* Emotion distribution */}
        <Card>
          <CardHeader title="Emotion Distribution" subtitle="From recent records" />
          {emotionDistribution.length > 0 ? (
            <>
              <div className="space-y-3 mt-2">
                {emotionDistribution.map((emotion) => (
                  <div key={emotion.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-400">{emotion.label}</span>
                      <span className="text-white font-medium">{emotion.value}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${emotion.value}%`,
                          backgroundColor: emotion.color,
                          boxShadow: `0 0 8px ${emotion.color}60`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 pt-4 border-t border-slate-700">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <p className="text-lg font-bold text-indigo-400">{valenceArousal.valence}%</p>
                    <p className="text-xs text-slate-400">Valence</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <p className="text-lg font-bold text-amber-400">{valenceArousal.arousal}%</p>
                    <p className="text-xs text-slate-400">Arousal</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
              No emotion data yet
            </div>
          )}
        </Card>
      </div>

      {/* ── Recommendations ── */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader
            title="AI Recommendations"
            subtitle="Personalized actions to reduce burnout"
            action={
              <a href="/recommendations" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                View all
              </a>
            }
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommendations.slice(0, 3).map((rec, i) => (
              <RecommendationCard key={rec.id ?? i} recommendation={rec} />
            ))}
          </div>
        </Card>
      )}

      {/* ── Comparison chart + Quick Stats ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader
            title="Progress Comparison"
            subtitle="First 15 days vs last 15 days"
          />
          {comparisonData.length > 0 ? (
            <ComparisonBarChart data={comparisonData} height={200} />
          ) : (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
              Need at least 30 days of data for comparison
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Quick Stats" subtitle="Computed from your real data" />
          <div className="space-y-3">
            {quickStats.map((stat) => (
              <div
                key={stat.label}
                className="flex items-center justify-between py-2.5 border-b border-slate-700/50 last:border-0"
              >
                <div className="flex items-center gap-2.5 text-slate-400">
                  <span className="text-slate-400">{STAT_ICONS[stat.icon]}</span>
                  <span className="text-sm">{stat.label}</span>
                </div>
                <span className={`text-sm font-semibold ${stat.color}`}>{stat.value}</span>
              </div>
            ))}
            {quickStats.length === 0 && (
              <p className="text-slate-400 text-sm text-center py-4">Log data to see your stats</p>
            )}
          </div>
        </Card>
      </div>

      {/* ── AI confidence footer ── */}
      {burnoutAnalysis && (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-slate-400">
            <Brain size={14} className="text-indigo-400" />
            <span className="text-xs">AI Burnout Score: <span className="text-white font-medium">{burnoutAnalysis.burnout_score.toFixed(1)}/100</span></span>
          </div>
          <div className="text-xs text-slate-400">
            Last updated: {new Date(burnoutAnalysis.analysis_date).toLocaleString()}
          </div>
          <Badge variant="info" size="sm">AI-Powered Analysis</Badge>
        </div>
      )}
    </div>
  );
};

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
