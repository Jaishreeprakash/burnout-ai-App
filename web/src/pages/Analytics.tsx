import React, { useState } from 'react';
import { BarChart2, Download, TrendingUp, Brain } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardHeader } from '../components/UI/Card';
import { Badge } from '../components/UI/Badge';
import { TrendChart } from '../components/Charts/TrendChart';
import { RadarChartComponent } from '../components/Charts/RadarChart';
import { useAnalytics } from '../hooks/useDashboard';
import { BurnoutHistoryRecord, TrendsData } from '../types';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend,
} from 'recharts';

type Range = '7D' | '30D';

// Build multi-metric chart data from trends
const buildMultiMetric = (trends: TrendsData | null, range: Range) => {
  const src = range === '7D' ? trends?.seven_day : trends?.thirty_day;
  if (!src) return [];

  const wellnessByDate = new Map(src.wellness.map((w) => [w.date, w]));
  const sleepByDate    = new Map(src.sleep.map((s)    => [s.date, s]));
  const actByDate      = new Map(src.activity.map((a) => [a.date, a]));

  return src.burnout.map((b) => {
    const w = wellnessByDate.get(b.date);
    const s = sleepByDate.get(b.date);
    const a = actByDate.get(b.date);
    return {
      date: format(new Date(b.date), range === '7D' ? 'EEE' : 'MMM d'),
      burnout:  Math.round(b.burnout_score),
      wellness: w ? Math.round(w.overall_score) : null,
      sleep:    s ? Math.round(s.duration_hours * 10) : null, // ×10 for same scale
      activity: a ? Math.round(a.exercise_minutes)   : null,
    };
  });
};

// Build burnout trend for TrendChart
const buildBurnoutTrend = (history: BurnoutHistoryRecord[], range: Range) => {
  const days = range === '7D' ? 7 : 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return history
    .filter((r) => new Date(r.date) >= cutoff)
    .map((r) => ({
      date: r.date,
      value: r.burnout_score,
      label: format(new Date(r.date), range === '7D' ? 'EEE' : 'MMM d'),
    }));
};

export const Analytics: React.FC = () => {
  const { trends, burnoutHistory, isLoading, refetch } = useAnalytics();
  const [range, setRange] = useState<Range>('30D');
  const [showExport, setShowExport] = useState(false);

  const multiMetricData = buildMultiMetric(trends, range);
  const burnoutTrend = buildBurnoutTrend(burnoutHistory, range);

  // Radar from 30-day averages
  const src30 = trends?.thirty_day;
  const radarData = src30
    ? [
        {
          subject: 'Sleep',
          value: Math.round(src30.sleep.reduce((s, r) => s + r.quality_score, 0) / Math.max(src30.sleep.length, 1)),
          fullMark: 100,
        },
        {
          subject: 'Activity',
          value: Math.min(100, Math.round(src30.activity.reduce((s, r) => s + r.exercise_minutes, 0) / Math.max(src30.activity.length, 1) * 3)),
          fullMark: 100,
        },
        {
          subject: 'Wellness',
          value: Math.round(src30.wellness.reduce((s, r) => s + r.overall_score, 0) / Math.max(src30.wellness.length, 1)),
          fullMark: 100,
        },
        {
          subject: 'Focus',
          value: Math.round(src30.activity.reduce((s, r) => s + r.focus_score, 0) / Math.max(src30.activity.length, 1)),
          fullMark: 100,
        },
        {
          subject: 'Mood',
          value: Math.round(src30.wellness.reduce((s, r) => s + r.mood_score, 0) / Math.max(src30.wellness.length, 1)),
          fullMark: 100,
        },
      ]
    : [];

  // Prediction info
  const prediction = trends?.prediction;

  const avgBurnout = burnoutHistory.length
    ? burnoutHistory.reduce((s, r) => s + r.burnout_score, 0) / burnoutHistory.length
    : 0;

  const exportData = {
    generated_at: new Date().toISOString(),
    range,
    avg_burnout_score: avgBurnout.toFixed(1),
    total_records: burnoutHistory.length,
    trend_direction: prediction?.direction || 'unknown',
    burnout_history: burnoutHistory.slice(0, 10),
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <BarChart2 size={18} className="text-indigo-400" />
          <span className="text-white font-medium">Analytics Dashboard</span>
          {isLoading && <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />}
        </div>
        <div className="flex items-center gap-3">
          {/* Range selector */}
          <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg p-1">
            {(['7D', '30D'] as Range[]).map((r) => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-3 py-1 rounded text-sm font-medium transition-all ${range === r ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                {r}
              </button>
            ))}
          </div>
          <button onClick={() => setShowExport(true)}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
            <Download size={14} />Export
          </button>
          <button onClick={refetch} className="text-xs text-indigo-400 hover:text-indigo-300">Refresh</button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Avg Burnout Score',
            value: burnoutHistory.length > 0 ? avgBurnout.toFixed(1) : '—',
            unit: burnoutHistory.length > 0 ? '/100' : '',
            color: burnoutHistory.length === 0 ? 'text-slate-400' : avgBurnout < 30 ? 'text-green-400' : avgBurnout < 60 ? 'text-amber-400' : 'text-red-400',
          },
          {
            label: 'Records Tracked',
            value: String(burnoutHistory.length),
            unit: 'days',
            color: 'text-indigo-400',
          },
          {
            label: 'Trend Direction',
            value: burnoutHistory.length === 0 ? 'Not enough data' : prediction?.direction === 'improving' ? '↑ Improving' : prediction?.direction === 'worsening' ? '↓ Worsening' : '→ Stable',
            unit: '',
            color: burnoutHistory.length === 0 ? 'text-slate-400' : prediction?.direction === 'improving' ? 'text-green-400' : prediction?.direction === 'worsening' ? 'text-red-400' : 'text-amber-400',
          },
          {
            label: 'Predicted Next Week',
            value: burnoutHistory.length > 0 && prediction?.predicted_next_week ? prediction.predicted_next_week.toFixed(1) : '—',
            unit: burnoutHistory.length > 0 && prediction?.predicted_next_week ? '/100' : '',
            color: 'text-slate-300',
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}<span className="text-sm text-slate-400">{stat.unit}</span></p>
            <p className="text-xs text-slate-400 mt-1">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Burnout trend */}
      <Card>
        <CardHeader
          title="Burnout Score Trend"
          subtitle={`${range} history — lower is better`}
          icon={<Brain size={16} />}
          action={<Badge variant={avgBurnout < 30 ? 'success' : avgBurnout < 60 ? 'warning' : 'danger'} size="sm">Avg {avgBurnout.toFixed(1)}</Badge>}
        />
        {burnoutTrend.length > 0 ? (
          <TrendChart data={burnoutTrend} color="#6366f1" height={220} />
        ) : (
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No burnout history yet</div>
        )}
      </Card>

      {/* Multi-metric chart */}
      <Card>
        <CardHeader title="All Metrics Overlay" subtitle="Burnout · Wellness · Sleep quality · Exercise" icon={<TrendingUp size={16} />} />
        {multiMetricData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={multiMetricData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[0, 100]} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} formatter={(v) => <span className="text-slate-400 capitalize">{v}</span>} />
              <Line type="monotone" dataKey="burnout"  name="Burnout"  stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="wellness" name="Wellness" stroke="#22c55e" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="sleep"    name="Sleep Q×10" stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{ r: 4 }} strokeDasharray="4 2" />
              <Line type="monotone" dataKey="activity" name="Exercise(min)" stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={{ r: 4 }} strokeDasharray="2 2" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No trend data yet</div>
        )}
      </Card>

      {/* Radar + stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="30-Day Wellness Profile" subtitle="5-axis radar from averaged data" />
          {radarData.length > 0 ? (
            <RadarChartComponent data={radarData} color="#6366f1" height={260} />
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Need 30 days of data</div>
          )}
        </Card>

        <Card>
          <CardHeader title="Burnout Records" subtitle={`Last ${range}`} />
          <div className="space-y-1 mt-2 max-h-64 overflow-y-auto" tabIndex={0} role="region" aria-label="Burnout records list">
            {burnoutHistory.length === 0 && (
              <p className="text-slate-400 text-sm text-center py-8">No records yet</p>
            )}
            {burnoutHistory.slice(0, 15).map((r) => (
              <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-slate-700/40 last:border-0">
                <span className="text-xs text-slate-400">{format(new Date(r.date), 'MMM d')}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full"
                      style={{
                        width: `${r.burnout_score}%`,
                        backgroundColor: r.burnout_score < 30 ? '#22c55e' : r.burnout_score < 60 ? '#f59e0b' : '#ef4444',
                      }} />
                  </div>
                  <span className={`text-xs font-medium w-10 text-right ${
                    r.burnout_score < 30 ? 'text-green-400' : r.burnout_score < 60 ? 'text-amber-400' : 'text-red-400'
                  }`}>{r.burnout_score.toFixed(0)}</span>
                  <Badge variant={r.risk_level === 'low' ? 'success' : r.risk_level === 'moderate' ? 'warning' : 'danger'} size="sm">
                    {r.risk_level}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Export Modal */}
      {showExport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <CardHeader title="Export Data" subtitle="Your wellness analytics report"
              action={<button onClick={() => setShowExport(false)} aria-label="Close" className="text-slate-400 hover:text-white text-xl">&times;</button>} />
            <pre className="bg-slate-900 rounded-lg p-4 text-xs text-slate-300 overflow-auto mt-4 max-h-80">
              {JSON.stringify(exportData, null, 2)}
            </pre>
            <button onClick={() => {
              const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = `burnout-analytics-${format(new Date(), 'yyyy-MM-dd')}.json`;
              a.click();
            }}
              className="w-full mt-3 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
              Download JSON
            </button>
          </Card>
        </div>
      )}
    </div>
  );
};
