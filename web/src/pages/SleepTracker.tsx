import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Moon, Plus, BarChart2, Calendar, Star, Clock, RefreshCw } from 'lucide-react';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { Card, CardHeader } from '../components/UI/Card';
import { Badge } from '../components/UI/Badge';
import { sleepAPI } from '../services/api';
import { SleepRecord } from '../types';
import { useSleepPage } from '../hooks/useDashboard';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell
} from 'recharts';

interface SleepFormData {
  date: string;
  bedtime: string;
  wake_time: string;
  quality_score: number;   // UI: 1-10; sent to API as *10 (0-100 scale)
  notes: string;
}

const getQualityColor = (score: number): string => {
  // score is 0-100
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#f59e0b';
  if (score >= 40) return '#f97316';
  return '#ef4444';
};

const getDurationColor = (hours: number): string => {
  if (hours >= 7 && hours <= 9) return '#22c55e';
  if (hours >= 6) return '#f59e0b';
  return '#ef4444';
};

export const SleepTracker: React.FC = () => {
  const { records: sleepHistory, isLoading, refetch } = useSleepPage();
  const [localRecords, setLocalRecords] = useState<SleepRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'calendar' | 'log'>('overview');

  // Merge API records with any locally added ones (before page refresh)
  const allRecords = [...sleepHistory, ...localRecords].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  const { register, handleSubmit, reset } = useForm<SleepFormData>({
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      quality_score: 7,
    },
  });

  const avgDuration = allRecords.length
    ? allRecords.reduce((s, r) => s + r.duration_hours, 0) / allRecords.length
    : 0;
  const avgQuality = allRecords.length
    ? allRecords.reduce((s, r) => s + r.quality_score, 0) / allRecords.length
    : 0;
  const goodNights = allRecords.filter((r) => r.duration_hours >= 7 && r.quality_score >= 70).length;

  const chartData = allRecords.slice(-7).map((r) => ({
    name: format(new Date(r.date), 'EEE'),
    duration: r.duration_hours,
    quality: Math.round(r.quality_score / 10), // convert 0-100 → 0-10 for display
    color: getDurationColor(r.duration_hours),
  }));

  const onSubmit = async (data: SleepFormData) => {
    setIsSubmitting(true);
    try {
      const bedHour = parseInt(data.bedtime.split(':')[0]);
      const bedMin = parseInt(data.bedtime.split(':')[1]);
      const wakeHour = parseInt(data.wake_time.split(':')[0]);
      const wakeMin = parseInt(data.wake_time.split(':')[1]);
      let duration = (wakeHour * 60 + wakeMin - (bedHour * 60 + bedMin)) / 60;
      if (duration < 0) duration += 24;

      const record: Omit<SleepRecord, 'id' | 'user_id' | 'created_at'> = {
        date: new Date(data.date).toISOString(),
        bedtime: data.bedtime,
        wake_time: data.wake_time,
        duration_hours: parseFloat(duration.toFixed(1)),
        quality_score: Number(data.quality_score) * 10, // convert 1-10 → 0-100
        consistency_score: 70, // default consistency
      };

      const saved = await sleepAPI.logSleep(record).catch(() => null);
      const displayRecord: SleepRecord = {
        ...(saved || record),
        date: data.date,
        quality_score: Number(data.quality_score) * 10,
      };
      setLocalRecords((prev) => [...prev, displayRecord]);
      reset();
      setShowForm(false);
      refetch();
    } finally {
      setIsSubmitting(false);
    }
  };

  const last30Days = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() });
  const sleepByDate = Object.fromEntries(allRecords.map((r) => [r.date.slice(0, 10), r]));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Avg Duration', value: allRecords.length ? `${avgDuration.toFixed(1)}h` : '—', icon: <Clock size={18} />, status: avgDuration >= 7 ? 'good' : 'warning', sub: 'Goal: 7-9h' },
          { label: 'Avg Quality', value: allRecords.length ? `${(avgQuality / 10).toFixed(1)}/10` : '—', icon: <Star size={18} />, status: avgQuality >= 70 ? 'good' : 'warning', sub: 'Score 0-100' },
          { label: 'Good Nights', value: allRecords.length ? `${goodNights}/${allRecords.length}` : '—', icon: <Moon size={18} />, status: goodNights / Math.max(allRecords.length, 1) >= 0.7 ? 'good' : 'warning', sub: '≥7h & quality≥70' },
          { label: 'Consistency', value: allRecords.length ? `${Math.round((goodNights / allRecords.length) * 100)}%` : '—', icon: <BarChart2 size={18} />, status: goodNights / Math.max(allRecords.length, 1) >= 0.7 ? 'good' : 'neutral', sub: 'Schedule adherence' },
        ].map((stat) => (
          <Card key={stat.label} className="flex flex-col gap-2">
            <div className={`p-2 w-fit rounded-lg ${stat.status === 'good' ? 'bg-green-500/10 text-green-400' : stat.status === 'warning' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-700 text-slate-400'}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-slate-400">{stat.label}</p>
              <p className="text-xs text-slate-400">{stat.sub}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg p-1 w-fit">
          {(['overview', 'calendar', 'log'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize ${activeTab === tab ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              {tab}
            </button>
          ))}
        </div>
        <button onClick={refetch} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors">
          <RefreshCw size={12} />
          {isLoading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader title="Sleep Duration" subtitle="Last 7 nights (hours)" />
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis domain={[0, 12]} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }}
                    formatter={(v: number) => [`${v}h`, 'Duration']} />
                  <Bar dataKey="duration" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No data yet — log your first sleep record</div>
            )}
            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /> Optimal (7-9h)</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" /> Fair</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> Poor</div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Sleep Quality" subtitle="Last 7 nights (score 0-10)" />
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }}
                    formatter={(v: number) => [v, 'Quality']} />
                  <Bar dataKey="quality" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {chartData.map((entry, i) => <Cell key={i} fill={getQualityColor(entry.quality * 10)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No data yet</div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'calendar' && (
        <Card>
          <CardHeader title="30-Day Sleep Calendar" subtitle="Color shows sleep quality" />
          <div className="grid grid-cols-7 gap-2 mt-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="text-center text-xs text-slate-400 py-1">{d}</div>
            ))}
            {Array.from({ length: last30Days[0].getDay() }, (_, i) => <div key={`e-${i}`} />)}
            {last30Days.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const record = sleepByDate[dateStr];
              const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');
              return (
                <div key={dateStr}
                  className="aspect-square flex flex-col items-center justify-center rounded-lg text-xs relative group cursor-pointer"
                  style={{
                    backgroundColor: record ? `${getQualityColor(record.quality_score)}20` : '#1e293b',
                    border: isToday ? '1px solid #6366f1' : '1px solid transparent',
                  }}
                  title={record ? `${record.duration_hours}h, Q:${record.quality_score}/100` : 'No data'}
                >
                  <span className="text-slate-400">{format(day, 'd')}</span>
                  {record && <div className="w-1.5 h-1.5 rounded-full mt-0.5" style={{ backgroundColor: getQualityColor(record.quality_score) }} />}
                  {record && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                      <p className="text-white font-medium">{dateStr}</p>
                      <p className="text-slate-400">{record.duration_hours}h · Q{record.quality_score}/100</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {activeTab === 'log' && (
        <div className="space-y-4">
          {allRecords.length === 0 && (
            <div className="text-center py-12 text-slate-400">No sleep records yet. Log your first one!</div>
          )}
          {[...allRecords].reverse().map((record, i) => (
            <Card key={i} className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-indigo-500/10 rounded-lg"><Moon size={18} className="text-indigo-400" /></div>
                <div>
                  <p className="font-medium text-white text-sm">{format(new Date(record.date), 'EEEE, MMM d')}</p>
                  <p className="text-xs text-slate-400">{record.bedtime ?? '—'} — {record.wake_time ?? '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="text-center">
                  <p className="font-bold text-white">{record.duration_hours}h</p>
                  <p className="text-xs text-slate-400">Duration</p>
                </div>
                <div className="text-center">
                  <p className="font-bold" style={{ color: getQualityColor(record.quality_score) }}>
                    {(record.quality_score / 10).toFixed(0)}/10
                  </p>
                  <p className="text-xs text-slate-400">Quality</p>
                </div>
                <Badge variant={record.duration_hours >= 7 ? 'success' : 'warning'} size="sm">
                  {record.duration_hours >= 7 ? 'Good' : 'Short'}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Log Button */}
      <div className="fixed bottom-6 right-6">
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-xl shadow-lg shadow-indigo-500/25 font-medium transition-all">
          <Plus size={18} />Log Sleep
        </button>
      </div>

      {/* Log Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader title="Log Sleep Record" subtitle="Track last night's sleep" icon={<Moon size={16} />}
              action={<button onClick={() => setShowForm(false)} aria-label="Close" className="text-slate-400 hover:text-white text-xl">&times;</button>} />
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Date</label>
                <input type="date" {...register('date', { required: true })}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Bedtime</label>
                  <input type="time" {...register('bedtime', { required: true })}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Wake Time</label>
                  <input type="time" {...register('wake_time', { required: true })}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Sleep Quality (1-10)</label>
                <input type="range" min="1" max="10" step="1" {...register('quality_score')} className="w-full accent-indigo-500" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-lg text-sm font-medium">Cancel</button>
                <button type="submit" disabled={isSubmitting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
