import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';
import { ChartDataPoint } from '../../types';

interface BarChartComponentProps {
  data: ChartDataPoint[];
  height?: number;
  color?: string;
  showGrid?: boolean;
  horizontal?: boolean;
}

export const BarChartComponent: React.FC<BarChartComponentProps> = ({
  data,
  height = 200,
  color = '#6366f1',
  showGrid = true,
  horizontal = false,
}) => {
  const defaultColors = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8'];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={horizontal ? 'vertical' : 'horizontal'}
        margin={{ top: 5, right: 5, left: horizontal ? 60 : -20, bottom: 5 }}
      >
        {showGrid && (
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={!horizontal} horizontal={horizontal} />
        )}
        {horizontal ? (
          <>
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} width={55} />
          </>
        ) : (
          <>
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
          </>
        )}
        <Tooltip
          contentStyle={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '8px',
            fontSize: '11px',
          }}
          labelStyle={{ color: '#94a3b8' }}
          cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color || defaultColors[index % defaultColors.length]}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

interface ComparisonBarChartProps {
  data: Array<{ name: string; before: number; after: number }>;
  height?: number;
}

export const ComparisonBarChart: React.FC<ComparisonBarChartProps> = ({
  data,
  height = 200,
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#94a3b8', fontSize: 10 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#94a3b8', fontSize: 10 }}
          domain={[0, 100]}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '8px',
            fontSize: '11px',
          }}
          labelStyle={{ color: '#94a3b8' }}
          cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
        />
        <Legend
          wrapperStyle={{ fontSize: '11px' }}
          formatter={(value) => (
            <span style={{ color: '#94a3b8' }}>{value === 'before' ? 'Last Month' : 'This Month'}</span>
          )}
        />
        <Bar dataKey="before" name="before" fill="#334155" radius={[4, 4, 0, 0]} maxBarSize={30} />
        <Bar dataKey="after" name="after" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={30} />
      </BarChart>
    </ResponsiveContainer>
  );
};

interface PieChartData {
  name: string;
  value: number;
  color: string;
}

import { PieChart, Pie, Cell as PieCell } from 'recharts';

export const DonutChart: React.FC<{ data: PieChartData[]; size?: number; innerRadius?: number }> = ({
  data,
  size = 160,
  innerRadius = 50,
}) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="flex items-center gap-6">
      <PieChart width={size} height={size} role="img" aria-label="Breakdown chart (see list below for exact values)">
        <Pie
          data={data}
          cx={size / 2 - 1}
          cy={size / 2 - 1}
          innerRadius={innerRadius}
          outerRadius={size / 2 - 10}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <PieCell key={`cell-${index}`} fill={entry.color} aria-label={`${entry.name}: ${entry.value} minutes`} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '8px',
            fontSize: '11px',
          }}
          formatter={(value: number) => [
            `${Math.round((value / total) * 100)}% (${value} min)`,
            '',
          ]}
        />
      </PieChart>

      <div className="space-y-2 flex-1">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-slate-400">{item.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-white">{item.value}m</span>
              <span className="text-xs text-slate-400">
                ({Math.round((item.value / total) * 100)}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
