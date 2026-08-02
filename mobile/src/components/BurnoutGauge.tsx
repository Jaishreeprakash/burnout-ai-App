import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Path, Circle, Line, G, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { ThemeColors, getRiskColor } from '../constants/colors';
import { useTheme } from '../context/ThemeContext';
import { RiskLevel } from '../types';

interface BurnoutGaugeProps {
  score: number;
  riskLevel: RiskLevel;
  size?: number;
}

const BurnoutGauge: React.FC<BurnoutGaugeProps> = ({ score, riskLevel, size = 220 }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const animatedScore = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedScore, {
      toValue: score,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [score]);

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;
  const strokeWidth = size * 0.072;

  // Semicircle from 180° to 0° (left to right across top)
  const startAngle = Math.PI; // 180 deg
  const endAngle = 0; // 0 deg

  const polarToCartesian = (angle: number, radius: number) => ({
    x: cx + radius * Math.cos(angle),
    y: cy - radius * Math.sin(angle),
  });

  const describeArc = (fromAngle: number, toAngle: number, radius: number) => {
    const start = polarToCartesian(fromAngle, radius);
    const end = polarToCartesian(toAngle, radius);
    const largeArc = Math.abs(toAngle - fromAngle) > Math.PI ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  // Score angle: 0 → left (180°), 100 → right (0°)
  const scoreAngle = Math.PI - (score / 100) * Math.PI;
  const needleTip = polarToCartesian(scoreAngle, r - 5);
  const needleBase1 = polarToCartesian(scoreAngle + Math.PI / 2, 8);
  const needleBase2 = polarToCartesian(scoreAngle - Math.PI / 2, 8);

  const color = getRiskColor(riskLevel, colors);

  const riskLabels: Record<RiskLevel, string> = {
    low: 'Low Risk',
    moderate: 'Moderate Risk',
    high: 'High Risk',
    critical: 'Critical Risk',
  };

  // Zone arcs
  const zones = [
    { from: Math.PI, to: Math.PI * 0.75, color: colors.low },
    { from: Math.PI * 0.75, to: Math.PI * 0.5, color: colors.moderate },
    { from: Math.PI * 0.5, to: Math.PI * 0.25, color: colors.high },
    { from: Math.PI * 0.25, to: 0, color: colors.critical },
  ];

  return (
    <View style={styles.container}>
      <Svg width={size} height={size * 0.65}>
        <Defs>
          <SvgGradient id="needleGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={color} stopOpacity="0.8" />
            <Stop offset="1" stopColor={color} stopOpacity="0.2" />
          </SvgGradient>
        </Defs>

        {/* Background track */}
        <Path
          d={describeArc(Math.PI, 0, r)}
          stroke={colors.surfaceLight}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
        />

        {/* Zone arcs */}
        {zones.map((zone, i) => (
          <Path
            key={i}
            d={describeArc(zone.from, zone.to, r)}
            stroke={zone.color}
            strokeWidth={strokeWidth - 4}
            strokeLinecap="butt"
            fill="none"
            opacity={0.35}
          />
        ))}

        {/* Score arc */}
        <Path
          d={describeArc(Math.PI, scoreAngle, r)}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
        />

        {/* Needle */}
        <G>
          <Path
            d={`M ${needleBase1.x} ${needleBase1.y} L ${needleTip.x} ${needleTip.y} L ${needleBase2.x} ${needleBase2.y} Z`}
            fill={color}
            opacity={0.9}
          />
          <Circle cx={cx} cy={cy} r={10} fill={colors.surface} stroke={color} strokeWidth={2} />
          <Circle cx={cx} cy={cy} r={5} fill={color} />
        </G>

        {/* Score labels */}
        <G>
          {[0, 25, 50, 75, 100].map((val) => {
            const angle = Math.PI - (val / 100) * Math.PI;
            const pt = polarToCartesian(angle, r + strokeWidth / 2 + 10);
            return (
              <G key={val}>
                <Circle cx={pt.x} cy={pt.y} r={2} fill={colors.textMuted} />
              </G>
            );
          })}
        </G>
      </Svg>

      {/* Center text */}
      <View style={styles.scoreContainer}>
        <Text style={[styles.score, { color }]} maxFontSizeMultiplier={1.2}>{score}</Text>
        <Text style={styles.scoreLabel} maxFontSizeMultiplier={1.2}>/ 100</Text>
      </View>
      <Text style={[styles.riskText, { color }]} maxFontSizeMultiplier={1.2}>{riskLabels[riskLevel]}</Text>
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: -24,
  },
  score: {
    fontSize: 52,
    fontWeight: '800',
    lineHeight: 60,
  },
  scoreLabel: {
    fontSize: 18,
    color: colors.textMuted,
    marginLeft: 4,
    fontWeight: '600',
  },
  riskText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 4,
  },
});

export default BurnoutGauge;
