import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Path, Circle, G, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { ThemeColors, getRiskColor } from '../constants/colors';
import { useTheme } from '../context/ThemeContext';
import { RiskLevel } from '../types';

interface BurnoutGaugeProps {
  score: number;
  riskLevel: RiskLevel;
  size?: number;
}

const BurnoutGauge: React.FC<BurnoutGaugeProps> = ({ score, riskLevel, size = 220 }) => {
  const { colors, scheme } = useTheme();
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
  const strokeWidth = size * 0.076;

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

  const scoreAngle = Math.PI - (Math.min(100, Math.max(0, score)) / 100) * Math.PI;
  const needleTip = polarToCartesian(scoreAngle, r - 4);
  const needleBase1 = polarToCartesian(scoreAngle + Math.PI / 2, 7);
  const needleBase2 = polarToCartesian(scoreAngle - Math.PI / 2, 7);

  const color = getRiskColor(riskLevel, colors);

  const riskLabels: Record<RiskLevel, string> = {
    low: 'Low Risk',
    moderate: 'Moderate Risk',
    high: 'High Risk',
    critical: 'Critical Risk',
  };

  const isLight = scheme === 'light';

  return (
    <View style={styles.container}>
      <Svg width={size} height={size * 0.62}>
        <Defs>
          <SvgGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor={colors.primaryLight} />
            <Stop offset="100%" stopColor={color} />
          </SvgGradient>
        </Defs>

        {/* Neumorphic Background track channel */}
        <Path
          d={describeArc(Math.PI, 0, r)}
          stroke={isLight ? '#E4E9F2' : '#141720'}
          strokeWidth={strokeWidth + 4}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d={describeArc(Math.PI, 0, r)}
          stroke={isLight ? '#CBD5E1' : '#282D3C'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          opacity={0.6}
        />

        {/* Score arc */}
        <Path
          d={describeArc(Math.PI, scoreAngle, r)}
          stroke="url(#gaugeGrad)"
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
          <Circle cx={cx} cy={cy} r={11} fill={colors.surface} stroke={color} strokeWidth={2.5} />
          <Circle cx={cx} cy={cy} r={5} fill={color} />
        </G>

        {/* Score tick dots */}
        <G>
          {[0, 25, 50, 75, 100].map((val) => {
            const angle = Math.PI - (val / 100) * Math.PI;
            const pt = polarToCartesian(angle, r + strokeWidth / 2 + 10);
            return (
              <G key={val}>
                <Circle cx={pt.x} cy={pt.y} r={2.5} fill={colors.textMuted} opacity={0.6} />
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
    marginTop: -22,
  },
  score: {
    fontSize: 48,
    fontWeight: '800',
    lineHeight: 54,
  },
  scoreLabel: {
    fontSize: 16,
    color: colors.textMuted,
    marginLeft: 4,
    fontWeight: '600',
  },
  riskText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginTop: 2,
  },
});

export default BurnoutGauge;
