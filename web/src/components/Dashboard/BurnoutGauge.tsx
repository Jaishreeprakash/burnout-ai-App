import React, { useEffect, useState } from 'react';
import { RiskLevel } from '../../types';

interface BurnoutGaugeProps {
  score: number;
  riskLevel: RiskLevel;
  size?: number;
}

const getRiskColor = (score: number): string => {
  if (score < 30) return '#22c55e'; // green
  if (score < 60) return '#f59e0b'; // amber
  if (score < 80) return '#f97316'; // orange
  return '#ef4444'; // red
};

const getRiskConfig = (level: string) => {
  const configs: Record<string, { label: string; color: string; glow: string }> = {
    LOW:      { label: 'LOW RISK',  color: '#22c55e', glow: 'rgba(34, 197, 94, 0.3)' },
    MODERATE: { label: 'MODERATE', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.3)' },
    HIGH:     { label: 'HIGH RISK', color: '#f97316', glow: 'rgba(249, 115, 22, 0.3)' },
    CRITICAL: { label: 'CRITICAL',  color: '#ef4444', glow: 'rgba(239, 68, 68, 0.3)' },
  };
  return configs[level] ?? configs['MODERATE'];
};

export const BurnoutGauge: React.FC<BurnoutGaugeProps> = ({ score, riskLevel, size = 220 }) => {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScore(score);
    }, 100);
    return () => clearTimeout(timer);
  }, [score]);

  const config = getRiskConfig(riskLevel);
  const strokeColor = getRiskColor(animatedScore);

  const cx = size / 2;
  const cy = size / 2;
  const radius = (size / 2) * 0.75;
  const strokeWidth = size * 0.065;

  // Semicircle from 180deg to 0deg (left to right)
  const startAngle = Math.PI; // 180 degrees
  const endAngle = 0; // 0 degrees

  const totalArc = Math.PI; // 180 degrees

  // Background arc
  const bgArc = describeArc(cx, cy, radius, startAngle, endAngle);

  // Score arc (how much to fill based on score 0-100)
  const fillRatio = animatedScore / 100;
  const fillEndAngle = startAngle - (fillRatio * totalArc);
  const fillArc = describeArc(cx, cy, radius, startAngle, fillEndAngle);

  // Needle angle
  const needleAngle = Math.PI - (fillRatio * Math.PI);
  const needleLength = radius * 0.75;
  const needleX = cx + needleLength * Math.cos(needleAngle);
  const needleY = cy + needleLength * Math.sin(needleAngle) * -1; // flip y

  const circumference = Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference * (1 - fillRatio);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size * 0.6 }}>
        <svg
          width={size}
          height={size * 0.65}
          viewBox={`0 0 ${size} ${size * 0.65}`}
          className="overflow-visible"
        >
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="40%" stopColor="#f59e0b" />
              <stop offset="70%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background track */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke="#1e293b"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Colored background gradient track */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            opacity="0.2"
          />

          {/* Active arc */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: 'stroke-dashoffset 1.5s ease-out, stroke 0.5s ease',
              filter: `drop-shadow(0 0 6px ${config.glow})`,
            }}
          />

          {/* Zone markers */}
          {[0, 30, 60, 80].map((zone) => {
            const angle = Math.PI - ((zone / 100) * Math.PI);
            const markerRadius = radius + strokeWidth / 2 + 6;
            const mx = cx + markerRadius * Math.cos(angle);
            const my = cy - markerRadius * Math.sin(angle);
            return (
              <circle key={zone} cx={mx} cy={my} r={2} fill="#475569" />
            );
          })}

          {/* Needle */}
          <g style={{ transition: 'transform 1.5s ease-out' }}>
            <line
              x1={cx}
              y1={cy}
              x2={needleX}
              y2={needleY + cy * 0.35}
              stroke="white"
              strokeWidth={2}
              strokeLinecap="round"
              opacity={0.9}
            />
            <circle cx={cx} cy={cy} r={6} fill={strokeColor} />
            <circle cx={cx} cy={cy} r={3} fill="white" />
          </g>
        </svg>

        {/* Score display in center */}
        <div
          className="absolute inset-x-0 bottom-0 flex flex-col items-center"
          style={{ bottom: '-10px' }}
        >
          <div
            className="text-4xl font-black tracking-tight"
            style={{ color: strokeColor, textShadow: `0 0 20px ${config.glow}` }}
          >
            {Math.round(animatedScore)}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">out of 100</div>
        </div>
      </div>

      {/* Risk level label */}
      <div className="mt-8 text-center">
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold border"
          style={{
            color: config.color,
            backgroundColor: `${config.glow}`,
            borderColor: `${config.color}40`,
          }}
        >
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: config.color }}
          />
          {config.label}
        </div>
      </div>

      {/* Scale labels */}
      <div className="flex items-center gap-6 mt-3 text-xs text-slate-400">
        <span className="text-green-400">Low</span>
        <span className="text-amber-400">Moderate</span>
        <span className="text-orange-400">High</span>
        <span className="text-red-400">Critical</span>
      </div>
    </div>
  );
};

// Helper: describe arc path
function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy - r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy - r * Math.sin(endAngle);

  const largeArc = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}
