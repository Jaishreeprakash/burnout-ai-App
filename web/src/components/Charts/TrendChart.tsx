import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
} from 'recharts';
import { TrendData } from '../../types';
import { format, parseISO } from 'date-fns';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
  valueLabel?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, valueLabel = 'Score' }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl text-xs">
        <p className="text-slate-400 mb-1">{label}</p>
        <p className="text-white font-semibold">
          {valueLabel}: <span className="text-indigo-400">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

interface TrendChartProps {
  data: TrendData[];
  color?: string;
  height?: number;
  valueLabel?: string;
  showGrid?: boolean;
  gradientId?: string;
}

export const TrendChart: React.FC<TrendChartProps> = ({
  data,
  color = '#6366f1',
  height = 200,
  valueLabel = 'Score',
  showGrid = true,
  gradientId = 'trendGradient',
}) => {
  const formattedData = data.map((d) => ({
    ...d,
    displayDate: d.label || (() => {
      try {
        return format(parseISO(d.date), 'MMM d');
      } catch {
        return d.date;
      }
    })(),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={formattedData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {showGrid && (
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        )}
        <XAxis
          dataKey="displayDate"
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#94a3b8', fontSize: 10 }}
          interval="preserveStartEnd"
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#94a3b8', fontSize: 10 }}
          domain={['auto', 'auto']}
        />
        <Tooltip content={<CustomTooltip valueLabel={valueLabel} />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
}

export const SparklineChart: React.FC<SparklineProps> = ({
  data,
  color = '#6366f1',
  height = 40,
}) => {
  const chartData = data.map((value, i) => ({ value, i }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

interface MultiTrendChartProps {
  data: Array<Record<string, string | number>>;
  lines: Array<{ key: string; color: string; label: string }>;
  height?: number;
  xKey?: string;
}

export const MultiTrendChart: React.FC<MultiTrendChartProps> = ({
  data,
  lines,
  height = 200,
  xKey = 'date',
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
        <defs>
          {lines.map((line) => (
            <linearGradient key={line.key} id={`gradient_${line.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={line.color} stopOpacity={0.2} />
              <stop offset="95%" stopColor={line.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis
          dataKey={xKey}
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#94a3b8', fontSize: 10 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#94a3b8', fontSize: 10 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '8px',
          }}
          labelStyle={{ color: '#94a3b8', fontSize: '11px' }}
          itemStyle={{ fontSize: '11px' }}
        />
        {lines.map((line) => (
          <Area
            key={line.key}
            type="monotone"
            dataKey={line.key}
            stroke={line.color}
            strokeWidth={2}
            fill={`url(#gradient_${line.key})`}
            dot={false}
            name={line.label}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
};
