import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { MultiLineChartData } from '../../types';

const mockEmotionalData: MultiLineChartData[] = [
  { date: 'Mon', mood: 72, stress: 45, productivity: 68, energy: 70 },
  { date: 'Tue', mood: 65, stress: 58, productivity: 62, energy: 62 },
  { date: 'Wed', mood: 58, stress: 72, productivity: 55, energy: 55 },
  { date: 'Thu', mood: 62, stress: 65, productivity: 60, energy: 60 },
  { date: 'Fri', mood: 75, stress: 42, productivity: 72, energy: 74 },
  { date: 'Sat', mood: 82, stress: 32, productivity: 65, energy: 80 },
  { date: 'Sun', mood: 70, stress: 38, productivity: 58, energy: 72 },
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
        <p className="text-xs text-slate-400 mb-2 font-medium">{label}</p>
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2 text-xs">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-slate-400 capitalize">{entry.name}:</span>
            <span className="text-white font-medium">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

interface EmotionalChartProps {
  data?: MultiLineChartData[];
}

export const EmotionalChart: React.FC<EmotionalChartProps> = ({ data = mockEmotionalData }) => {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis
          dataKey="date"
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#94a3b8', fontSize: 11 }}
        />
        <YAxis
          domain={[0, 100]}
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#94a3b8', fontSize: 11 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
          formatter={(value) => (
            <span className="text-slate-400 capitalize">{value}</span>
          )}
        />
        <Line
          type="monotone"
          dataKey="mood"
          stroke="#6366f1"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#6366f1' }}
        />
        <Line
          type="monotone"
          dataKey="stress"
          stroke="#ef4444"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#ef4444' }}
          strokeDasharray="4 2"
        />
        <Line
          type="monotone"
          dataKey="productivity"
          stroke="#22c55e"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#22c55e' }}
        />
        <Line
          type="monotone"
          dataKey="energy"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#f59e0b' }}
          strokeDasharray="2 2"
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
