import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Activity, BookOpen, Briefcase, Coffee, Plus, Target, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardHeader } from '../components/UI/Card';
import { Badge } from '../components/UI/Badge';
import { ActivityRecord } from '../types';
import { activityAPI } from '../services/api';
import { useActivityPage } from '../hooks/useDashboard';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';

interface FormData {
  date: string;
  study_hours: number;
  work_hours: number;
  exercise_minutes: number;
  break_count: number;
  focus_score: number;
}

interface ProgressRingProps {
  value: number;
  goal: number;
  color: string;
  label: string;
  icon: React.ReactNode;
  size?: number;
}

const ProgressRing: React.FC<ProgressRingProps> = ({ value, goal, color, label, icon, size = 90 }) => {
  const pct = Math.min(value / goal, 1);
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth={6} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6}
            strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease-out', filter: `drop-shadow(0 0 4px ${color}80)` }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span style={{ color }} className="text-sm">{icon}</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-bold text-white">{value}<span className="text-xs text-slate-400">/{goal}</span></p>
        <p className="text-xs text-slate-400">{label}</p>
        {pct >= 1 && <Badge variant="success" size="sm" className="mt-1">Done!</Badge>}
      </div>
    </div>
  );
};

const heatmapScore = (r: ActivityRecord) => {
  let score = 0;
  if (r.exercise_minutes >= 30) score += 3;
  if (r.exercise_minutes >= 15) score += 1;
  if (r.break_count >= 4) score += 2;
  if (r.focus_score >= 70) score += 2;
  return score;
};

const heatColor = (score: number) => {
  if (score >= 6) return '#22c55e';
  if (score >= 4) return '#84cc16';
  if (score >= 2) return '#f59e0b';
  if (score >= 1) return '#f97316';
  return '#1e293b';
};

export const ActivityTracker: React.FC = () => {
  const { records: apiHistory, isLoading, refetch } = useActivityPage();
  const [localRecords, setLocalRecords] = useState<ActivityRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const history = [...apiHistory, ...localRecords].sort((a, b) => a.date.localeCompare(b.date));

  const { register, handleSubmit, reset } = useForm<FormData>({
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      study_hours: 0,
      work_hours: 0,
      exercise_minutes: 0,
      break_count: 0,
      focus_score: 70,
    },
  });

  const today = history.length ? history[history.length - 1] : null;
  const avgExercise = history.length ? history.reduce((s, r) => s + r.exercise_minutes, 0) / history.length : 0;
  const activeDays = history.filter((r) => r.exercise_minutes >= 30).length;
  const avgFocus = history.length ? history.reduce((s, r) => s + r.focus_score, 0) / history.length : 0;

  const GOALS = { exercise: 30, work: 8, breaks: 4, study: 3 };

  const chartData = history.slice(-7).map((r) => ({
    name: format(new Date(r.date), 'EEE'),
    exercise: r.exercise_minutes,
    work: r.work_hours,
    study: r.study_hours,
    focus: r.focus_score,
  }));

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const record: Omit<ActivityRecord, 'id' | 'user_id' | 'created_at'> = {
        date: new Date(data.date).toISOString(),
        study_hours: Number(data.study_hours),
        work_hours: Number(data.work_hours),
        exercise_minutes: Number(data.exercise_minutes),
        break_count: Number(data.break_count),
        focus_score: Number(data.focus_score),
      };
      const saved = await activityAPI.logActivity(record).catch(() => null);
      setLocalRecords((prev) => [...prev, { ...(saved || record), date: data.date }]);
      setShowForm(false);
      reset();
      refetch();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Progress Rings */}
      <Card>
        <CardHeader title="Today's Progress" subtitle="Daily goal completion"
          action={
            <button onClick={refetch} aria-label="Refresh" className="flex items-center gap-1 text-xs text-slate-400 hover:text-white">
              <RefreshCw size={11} />{isLoading ? 'Loading…' : 'Refresh'}
            </button>
          } />
        <div className="flex items-center justify-around flex-wrap gap-6 py-4">
          <ProgressRing value={today?.exercise_minutes || 0} goal={GOALS.exercise} color="#22c55e" label="Exercise (min)" icon={<Activity size={18} />} />
          <ProgressRing value={today?.work_hours || 0} goal={GOALS.work} color="#f59e0b" label="Work (hrs)" icon={<Briefcase size={18} />} />
          <ProgressRing value={today?.break_count || 0} goal={GOALS.breaks} color="#34d399" label="Breaks" icon={<Coffee size={18} />} />
          <ProgressRing value={today?.study_hours || 0} goal={GOALS.study} color="#a78bfa" label="Study (hrs)" icon={<BookOpen size={18} />} />
          <ProgressRing value={Math.round(today?.focus_score || 0)} goal={100} color="#6366f1" label="Focus Score" icon={<Target size={18} />} />
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Avg Exercise', value: `${Math.round(avgExercise)}min`, status: avgExercise >= 30 ? 'good' : 'warning' },
          { label: 'Avg Focus', value: `${Math.round(avgFocus)}/100`, status: avgFocus >= 70 ? 'good' : 'warning' },
          { label: 'Active Days', value: history.length ? `${activeDays}/${history.length}` : '—', status: activeDays / Math.max(history.length, 1) >= 0.7 ? 'good' : 'warning' },
          { label: 'Consistency', value: history.length ? `${Math.round((activeDays / history.length) * 100)}%` : '—', status: activeDays / Math.max(history.length, 1) >= 0.7 ? 'good' : 'warning' },
        ].map((s) => (
          <Card key={s.label}>
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-slate-400 mt-1">{s.label}</p>
            <Badge variant={s.status === 'good' ? 'success' : 'warning'} size="sm" className="mt-2">
              {s.status === 'good' ? 'On Track' : 'Below Goal'}
            </Badge>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Activity Summary" subtitle="Last 7 days" />
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }} />
                <Bar dataKey="exercise" name="Exercise (min)" fill="#22c55e" radius={[3, 3, 0, 0]} maxBarSize={20} />
                <Bar dataKey="work" name="Work (hrs)" fill="#f59e0b" radius={[3, 3, 0, 0]} maxBarSize={20} />
                <Bar dataKey="study" name="Study (hrs)" fill="#8b5cf6" radius={[3, 3, 0, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No activity data yet</div>
          )}
        </Card>

        {/* Heatmap */}
        <Card>
          <CardHeader title="Activity Heatmap" subtitle="Daily activity level" />
          {history.length > 0 ? (
            <>
              <div className="grid grid-cols-7 gap-1.5 mt-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="text-center text-xs text-slate-400">{d}</div>
                ))}
                {Array.from({ length: new Date(history[0].date).getDay() }, (_, i) => <div key={`e-${i}`} />)}
                {history.map((r) => {
                  const score = heatmapScore(r);
                  return (
                    <div key={r.date}
                      className="aspect-square rounded-md flex items-center justify-center cursor-default group relative"
                      style={{ backgroundColor: heatColor(score), opacity: score === 0 ? 0.3 : 1 }}
                      title={`${r.date}: ${r.exercise_minutes}min exercise, Focus ${r.focus_score}/100`}
                    >
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-slate-800 border border-slate-700 rounded p-1.5 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                        <p className="text-white">{format(new Date(r.date), 'MMM d')}</p>
                        <p className="text-slate-400">{r.exercise_minutes}min · Focus {r.focus_score}/100</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
                <span>Less</span>
                {['#1e293b', '#f97316', '#f59e0b', '#84cc16', '#22c55e'].map((c) => (
                  <div key={c} className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
                ))}
                <span>More</span>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No activity data yet</div>
          )}
        </Card>
      </div>

      {/* Log */}
      <Card>
        <CardHeader title="Activity Log" subtitle="Recent records" />
        <div className="space-y-2 mt-2">
          {history.length === 0 && <p className="text-slate-400 text-sm text-center py-4">No records yet — log your first activity!</p>}
          {[...history].reverse().slice(0, 7).map((r) => (
            <div key={r.date} className="flex items-center justify-between py-2.5 border-b border-slate-700/50 last:border-0 flex-wrap gap-2">
              <p className="text-sm text-white font-medium">{format(new Date(r.date), 'EEEE, MMM d')}</p>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-slate-400"><span className="text-green-400 font-medium">{r.exercise_minutes}min</span> exercise</span>
                <span className="text-slate-400"><span className="text-amber-400 font-medium">{r.work_hours}h</span> work</span>
                <span className="text-slate-400"><span className="text-purple-400 font-medium">{r.study_hours}h</span> study</span>
                <span className="text-slate-400"><span className="text-indigo-400 font-medium">{r.focus_score}/100</span> focus</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="fixed bottom-6 right-6">
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-xl shadow-lg shadow-indigo-500/25 font-medium">
          <Plus size={18} />Log Activity
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader title="Log Activity" subtitle="Record today's activities" icon={<Activity size={16} />}
              action={<button onClick={() => setShowForm(false)} aria-label="Close" className="text-slate-400 hover:text-white text-xl">&times;</button>} />
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Date</label>
                <input type="date" {...register('date')}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 text-sm" />
              </div>
              {[
                { key: 'study_hours', label: 'Study Hours', max: 16 },
                { key: 'work_hours', label: 'Work Hours', max: 24 },
                { key: 'exercise_minutes', label: 'Exercise (minutes)', max: 300 },
                { key: 'break_count', label: 'Number of Breaks', max: 20 },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-sm text-slate-300 mb-1">{f.label}</label>
                  <input type="number" min="0" max={f.max} {...register(f.key as keyof FormData)}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 text-sm" />
                </div>
              ))}
              <div>
                <label className="block text-sm text-slate-300 mb-1">Focus Score (0-100)</label>
                <input type="range" min="0" max="100" step="5" {...register('focus_score')} className="w-full accent-indigo-500" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-lg text-sm font-medium">Cancel</button>
                <button type="submit" disabled={isSubmitting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : 'Save Activity'}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
