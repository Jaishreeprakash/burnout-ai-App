import React from 'react';
import {
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { RadarDataPoint } from '../../types';

interface RadarChartProps {
  data: RadarDataPoint[];
  color?: string;
  height?: number;
  showLegend?: boolean;
  compareData?: RadarDataPoint[];
  compareColor?: string;
}

export const RadarChartComponent: React.FC<RadarChartProps> = ({
  data,
  color = '#6366f1',
  height = 280,
  showLegend = false,
  compareData,
  compareColor = '#22c55e',
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsRadarChart data={data}>
        <PolarGrid stroke="#1e293b" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fill: '#94a3b8', fontSize: 11 }}
        />
        <Radar
          name="Current"
          dataKey="value"
          stroke={color}
          fill={color}
          fillOpacity={0.2}
          strokeWidth={2}
        />
        {compareData && (
          <Radar
            name="Previous"
            dataKey="value"
            stroke={compareColor}
            fill={compareColor}
            fillOpacity={0.1}
            strokeWidth={2}
          />
        )}
        {showLegend && <Legend wrapperStyle={{ fontSize: '11px' }} />}
        <Tooltip
          contentStyle={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '8px',
            fontSize: '11px',
          }}
        />
      </RechartsRadarChart>
    </ResponsiveContainer>
  );
};
