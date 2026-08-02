import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Smartphone, Plus, Flame, Clock, Moon, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardHeader } from '../components/UI/Card';
import { Badge } from '../components/UI/Badge';
import { PhoneUsageRecord } from '../types';
import { phoneAPI } from '../services/api';
import { usePhonePage } from '../hooks/useDashboard';
import { DonutChart } from '../components/Charts/BarChart';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';

interface FormData {
  date: string;
  screen_time_hours: number;
  social: number;
  work: number;
  entertainment: number;
  health: number;
  other: number;
  pickups_count: number;
  late_night_usage: boolean;
}

export const PhoneUsage: React.FC = () => {
  const { records: apiHistory, isLoading, refetch } = usePhonePage();
  const [localRecords, setLocalRecords] = useState<PhoneUsageRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const history = [...apiHistory, ...localRecords].sort((a, b) => a.date.localeCompare(b.date));

  const { register, handleSubmit, reset } = useForm<FormData>({
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      screen_time_hours: 4,
      social: 60,
      work: 90,
      entertainment: 50,
      health: 20,
      other: 10,
      pickups_count: 55,
      late_night_usage: false,
    },
  });

  const today = history.length ? history[history.length - 1] : null;
  const avgScreenTime = history.length
    ? history.reduce((s, r) => s + r.screen_time_hours, 0) / history.length
    : 0;
  const lateNightCount = history.filter((r) => r.late_night_usage).length;
  const healthyDays = history.filter((r) => r.screen_time_hours <= 4).length;

  // Donut from today's app_usage_data
  const donutData = today?.app_usage_data
    ? Object.entries(today.app_usage_data).map(([key, val], i) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' '),
        value: val,
        color: ['#6366f1', '#22c55e', '#f59e0b', '#34d399', '#94a3b8'][i % 5],
      }))
    : [];

  const trendData = history.map((r) => ({
    date: format(new Date(r.date), 'MMM d'),
    hours: parseFloat(r.screen_time_hours.toFixed(1)),
  }));

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const record: Omit<PhoneUsageRecord, 'id' | 'user_id' | 'created_at'> = {
        date: new Date(data.date).toISOString(),
        screen_time_hours: Number(data.screen_time_hours),
        app_usage_data: {
          social: Number(data.social),
          work: Number(data.work),
          entertainment: Number(data.entertainment),
          health: Number(data.health),
          other: Number(data.other),
        },
        pickups_count: Number(data.pickups_count),
        late_night_usage: Boolean(data.late_night_usage),
      };
      const saved = await phoneAPI.logPhoneUsage(record).catch(() => null);
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
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Today's Screen Time",
            value: today ? `${today.screen_time_hours.toFixed(1)}h` : '—',
            sub: today ? `${Math.round(today.screen_time_hours * 60)} minutes` : 'No data',
            status: today && today.screen_time_hours > 6 ? 'danger' : today && today.screen_time_hours > 4 ? 'warning' : 'good',
            icon: <Smartphone size={18} />,
          },
          {
            label: 'Avg Screen Time',
            value: history.length ? `${avgScreenTime.toFixed(1)}h` : '—',
            sub: 'Last 30 days',
            status: avgScreenTime > 6 ? 'danger' : avgScreenTime > 4 ? 'warning' : 'good',
            icon: <Clock size={18} />,
          },
          {
            label: 'Late Night Usage',
            value: `${lateNightCount} days`,
            sub: 'Past 30 days',
            status: lateNightCount > 10 ? 'danger' : lateNightCount > 5 ? 'warning' : 'good',
            icon: <Moon size={18} />,
          },
          {
            label: 'Healthy Days',
            value: history.length ? `${healthyDays}/${history.length}` : '—',
            sub: '≤4h screen time',
            status: healthyDays / Math.max(history.length, 1) >= 0.7 ? 'good' : healthyDays / Math.max(history.length, 1) >= 0.4 ? 'warning' : 'danger',
            icon: <Flame size={18} />,
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <div className={`p-2 w-fit rounded-lg mb-3 ${
              stat.status === 'good' ? 'bg-green-500/10 text-green-400' :
              stat.status === 'warning' ? 'bg-amber-500/10 text-amber-400' :
              'bg-red-500/10 text-red-400'}`}>
              {stat.icon}
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{stat.label}</p>
            <p className="text-xs text-slate-400">{stat.sub}</p>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="App Usage Breakdown" subtitle="Today's distribution" />
          {donutData.length > 0 ? (
            <DonutChart data={donutData} size={180} innerRadius={55} />
          ) : (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
              No usage data for today
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Screen Time Trend" subtitle="Last 30 days (hours)"
            action={
              <button onClick={refetch} aria-label="Refresh" className="flex items-center gap-1 text-xs text-slate-400 hover:text-white">
                <RefreshCw size={11} />{isLoading ? 'Loading…' : 'Refresh'}
              </button>
            }
          />
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                <defs>
                  <linearGradient id="phoneGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} interval={4} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }}
                  formatter={(v: number) => [`${v}h`, 'Screen Time']} />
                <Area type="monotone" dataKey="hours" stroke="#6366f1" strokeWidth={2} fill="url(#phoneGrad)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No trend data yet</div>
          )}
          <p className="text-xs text-slate-400 mt-2 text-center">
            Recommended max: <span className="text-amber-400">4h/day</span>
          </p>
        </Card>
      </div>

      {/* Late night pattern calendar */}
      <Card>
        <CardHeader title="Late Night Usage Pattern" subtitle="Phone use after 11 PM" />
        {history.length > 0 ? (
          <>
            <div className="flex flex-wrap gap-2 mt-2">
              {history.map((r) => (
                <div key={r.date}
                  className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center text-xs cursor-default ${
                    r.late_night_usage
                      ? 'bg-red-500/20 border border-red-500/40 text-red-300'
                      : 'bg-slate-700/40 border border-slate-700 text-slate-400'}`}
                  title={`${r.date}: ${r.late_night_usage ? 'Late night usage' : 'Clean'}`}
                >
                  <span>{format(new Date(r.date), 'd')}</span>
                  {r.late_night_usage && <div className="w-1 h-1 rounded-full bg-red-400 mt-0.5" />}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-red-500/20 border border-red-500/40" />Late night usage
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-slate-700/40 border border-slate-700" />Clean day
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-slate-400 text-sm">No usage data yet</div>
        )}
      </Card>

      {/* Log button */}
      <div className="fixed bottom-6 right-6">
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-xl shadow-lg shadow-indigo-500/25 font-medium">
          <Plus size={18} />Log Usage
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader title="Log Phone Usage" subtitle="Track today's screen time"
              icon={<Smartphone size={16} />}
              action={<button onClick={() => setShowForm(false)} aria-label="Close" className="text-slate-400 hover:text-white text-xl">&times;</button>} />
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Date</label>
                <input type="date" {...register('date')}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Total Screen Time (hours)</label>
                <input type="number" min="0" max="24" step="0.5" {...register('screen_time_hours')}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 text-sm" />
              </div>
              <div className="border border-slate-700 rounded-lg p-3 space-y-2">
                <p className="text-xs text-slate-400 font-medium">App Categories (minutes)</p>
                {[
                  { key: 'social', label: 'Social Media' },
                  { key: 'work', label: 'Work Apps' },
                  { key: 'entertainment', label: 'Entertainment' },
                  { key: 'health', label: 'Health & Fitness' },
                  { key: 'other', label: 'Other' },
                ].map((cat) => (
                  <div key={cat.key} className="flex items-center gap-3">
                    <label className="text-xs text-slate-400 w-28 flex-shrink-0">{cat.label}</label>
                    <input type="number" min="0" {...register(cat.key as keyof FormData)}
                      className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:border-indigo-500 text-sm" />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Phone Pickups</label>
                <input type="number" min="0" {...register('pickups_count')}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 text-sm" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" {...register('late_night_usage')} className="w-4 h-4 accent-indigo-500" />
                <span className="text-sm text-slate-300">Used phone after 11 PM</span>
              </label>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-lg text-sm font-medium">Cancel</button>
                <button type="submit" disabled={isSubmitting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
