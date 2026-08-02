import React, { useState } from 'react';
import { Heart, Camera, RefreshCw, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardHeader } from '../components/UI/Card';
import { Badge } from '../components/UI/Badge';
import { emotionAPI } from '../services/api';
import { useEmotionPage } from '../hooks/useDashboard';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from 'recharts';

// Lighter (300-level) shades — these are used both as fill colors and as
// inline text colors on dark backgrounds; the 500-level brand palette read
// well under 4.5:1 contrast for small text (real axe-core finding), so text
// usages need a lighter shade than a typical light-theme accent color would.
const EMOTIONS = [
  { key: 'happy',     label: 'Happy',     color: '#86efac', emoji: '😊' },
  { key: 'neutral',   label: 'Neutral',   color: '#a5b4fc', emoji: '😐' },
  { key: 'calm',      label: 'Calm',      color: '#67e8f9', emoji: '😌' },
  { key: 'sad',       label: 'Sad',       color: '#93c5fd', emoji: '😢' },
  { key: 'angry',     label: 'Angry',     color: '#fca5a5', emoji: '😠' },
  { key: 'anxious',   label: 'Anxious',   color: '#fcd34d', emoji: '😰' },
  { key: 'stressed',  label: 'Stressed',  color: '#fdba74', emoji: '😤' },
  { key: 'surprised', label: 'Surprised', color: '#d8b4fe', emoji: '😲' },
  { key: 'fearful',   label: 'Fearful',   color: '#c4b5fd', emoji: '😨' },
];

const emotionMeta = (key: string) =>
  EMOTIONS.find((e) => e.key === key.toLowerCase()) || { key, label: key, color: '#a5b4fc', emoji: '🙂' };

export const EmotionAnalysis: React.FC = () => {
  const { records, isLoading, refetch, distribution, valenceArousal } = useEmotionPage();
  const [activeTab, setActiveTab] = useState<'current' | 'history' | 'trends'>('current');
  const [isLogging, setIsLogging] = useState(false);

  // Latest emotion from real records
  const latest = records.length ? records[0] : null;
  const dominantMeta = emotionMeta(latest?.dominant_emotion || 'neutral');

  // Emotion scores from latest record (dict of emotion → confidence)
  const emotionScores: Array<{ key: string; label: string; color: string; emoji: string; score: number }> =
    latest?.emotion_scores
      ? Object.entries(latest.emotion_scores)
          .map(([k, v]) => ({ ...emotionMeta(k), score: v }))
          .sort((a, b) => b.score - a.score)
      : EMOTIONS.map((e) => ({ ...e, score: e.key === (latest?.dominant_emotion || 'neutral') ? 0.7 : 0.05 }));

  // Frequency bar chart from distribution
  const freqData = distribution.map((d) => ({
    name: d.label,
    value: d.value,
    color: d.color,
  }));

  // 7-day trend from records grouped by day
  const trendByDay: Record<string, { dominant: string; count: number }> = {};
  records.forEach((r) => {
    const day = format(new Date(r.timestamp), 'EEE');
    if (!trendByDay[day]) trendByDay[day] = { dominant: r.dominant_emotion, count: 0 };
    trendByDay[day].count++;
  });

  const logManualEmotion = async (emotionKey: string) => {
    setIsLogging(true);
    try {
      await emotionAPI.logEmotion({
        timestamp: new Date().toISOString(),
        emotion_type: 'facial',
        dominant_emotion: emotionKey,
        confidence: 0.85,
        emotion_scores: Object.fromEntries(EMOTIONS.map((e) => [e.key, e.key === emotionKey ? 0.85 : 0.02])),
      });
      refetch();
    } catch {
      // silently ignore
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg p-1 w-fit">
        {(['current', 'history', 'trends'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize ${activeTab === tab ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            {tab === 'current' ? 'Current Emotion' : tab}
          </button>
        ))}
      </div>

      {activeTab === 'current' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Camera / Detection UI */}
          <Card>
            <CardHeader title="Emotion Detection" subtitle="Facial analysis" icon={<Camera size={16} />} />
            <div className="relative bg-slate-900 rounded-xl overflow-hidden aspect-video flex items-center justify-center mb-4">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-dashed border-slate-600 flex items-center justify-center mx-auto mb-3">
                  <Camera size={32} className="text-slate-400" />
                </div>
                <p className="text-slate-400 text-sm">Camera integration via mobile app</p>
                <p className="text-slate-400 text-xs mt-1">Log emotion manually below</p>
              </div>
              {latest && (
                <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full text-sm font-bold border"
                  style={{ color: dominantMeta.color, backgroundColor: `${dominantMeta.color}20`, borderColor: `${dominantMeta.color}40` }}>
                  {dominantMeta.emoji} {dominantMeta.label}
                </div>
              )}
            </div>

            {/* Quick log emoji buttons */}
            <p className="text-xs text-slate-400 mb-2">Log how you feel right now:</p>
            <div className="grid grid-cols-4 gap-2">
              {EMOTIONS.slice(0, 8).map((e) => (
                <button key={e.key} onClick={() => logManualEmotion(e.key)} disabled={isLogging}
                  className="flex flex-col items-center gap-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 transition-all disabled:opacity-50 text-xs">
                  <span className="text-xl">{e.emoji}</span>
                  <span className="text-slate-300">{e.label}</span>
                </button>
              ))}
            </div>
            <button onClick={refetch} disabled={isLogging}
              className="w-full mt-3 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              {isLoading ? 'Loading...' : 'Refresh Data'}
            </button>
          </Card>

          {/* Latest emotion display */}
          <Card>
            {latest ? (
              <>
                <CardHeader title={`Detected: ${dominantMeta.label}`}
                  subtitle={`Confidence: ${Math.round(latest.confidence * 100)}% · ${format(new Date(latest.timestamp), 'MMM d, HH:mm')}`}
                  icon={<Heart size={16} />} />
                <div className="text-6xl text-center my-4">{dominantMeta.emoji}</div>
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Detection confidence</span>
                    <span className="font-medium" style={{ color: dominantMeta.color }}>
                      {Math.round(latest.confidence * 100)}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${latest.confidence * 100}%`, backgroundColor: dominantMeta.color, boxShadow: `0 0 8px ${dominantMeta.color}60` }} />
                  </div>
                </div>
                <div className="space-y-2">
                  {emotionScores.slice(0, 5).map((e) => (
                    <div key={e.key}>
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <span className="text-slate-400">{e.emoji} {e.label}</span>
                        <span style={{ color: e.color }}>{Math.round(e.score * 100)}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${e.score * 100}%`, backgroundColor: e.color }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-slate-700 grid grid-cols-2 gap-3 text-center">
                  <div className="bg-slate-700/50 rounded-lg p-2">
                    <p className="text-lg font-bold text-indigo-300">{valenceArousal.valence}%</p>
                    <p className="text-xs text-slate-400">Valence</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-2">
                    <p className="text-lg font-bold text-amber-400">{valenceArousal.arousal}%</p>
                    <p className="text-xs text-slate-400">Arousal</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
                <Heart size={40} className="text-slate-400" />
                <p className="text-sm">No emotion data yet</p>
                <p className="text-xs">Use the buttons on the left to log your emotion</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'history' && (
        <Card>
          <CardHeader title="Emotion History" subtitle={`${records.length} records from last 30 days`}
            action={<button onClick={refetch} aria-label="Refresh" className="text-xs text-indigo-300 hover:text-indigo-300"><RefreshCw size={12} /></button>} />
          {records.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No emotion records yet — log your first emotion!</div>
          ) : (
            <div className="space-y-3 mt-2 max-h-96 overflow-y-auto">
              {records.map((r, i) => {
                const meta = emotionMeta(r.dominant_emotion);
                return (
                  <div key={i} className="flex items-center justify-between py-2.5 border-b border-slate-700/50 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{meta.emoji}</span>
                      <div>
                        <p className="text-sm font-medium text-white">{meta.label}</p>
                        <p className="text-xs text-slate-400">
                          {format(new Date(r.timestamp), 'MMM d, HH:mm')} · {r.emotion_type}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold" style={{ color: meta.color }}>
                        {Math.round(r.confidence * 100)}%
                      </p>
                      <p className="text-xs text-slate-400">confidence</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'trends' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader title="Emotion Distribution" subtitle="From all records" icon={<TrendingUp size={16} />} />
            {freqData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={freqData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }}
                    formatter={(v: number) => [`${v}%`, 'Frequency']} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {freqData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No data yet</div>
            )}
          </Card>

          <Card>
            <CardHeader title="Valence & Arousal" subtitle="Emotional state summary" />
            <div className="flex flex-col gap-6 mt-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">Positive Valence</span>
                  <span className="text-indigo-300 font-bold">{valenceArousal.valence}%</span>
                </div>
                <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                    style={{ width: `${valenceArousal.valence}%`, boxShadow: '0 0 8px rgba(99,102,241,0.5)' }} />
                </div>
                <p className="text-xs text-slate-400 mt-1">% of records with positive emotions</p>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">High Arousal</span>
                  <span className="text-amber-400 font-bold">{valenceArousal.arousal}%</span>
                </div>
                <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full transition-all duration-1000"
                    style={{ width: `${valenceArousal.arousal}%`, boxShadow: '0 0 8px rgba(245,158,11,0.5)' }} />
                </div>
                <p className="text-xs text-slate-400 mt-1">% of records with high-energy emotions</p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-700">
                {distribution.slice(0, 4).map((d) => (
                  <div key={d.label} className="bg-slate-700/30 rounded-lg p-3">
                    <p className="text-lg font-bold" style={{ color: d.color }}>{d.value}%</p>
                    <p className="text-xs text-slate-400">{d.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
