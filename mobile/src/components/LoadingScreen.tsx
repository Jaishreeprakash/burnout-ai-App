import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { ThemeColors } from '../constants/colors';
import { useTheme } from '../context/ThemeContext';

const LoadingScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const pulseAnim = useRef(new Animated.Value(0.6)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(rotateAnim, { toValue: 1, duration: 1500, useNativeDriver: true })
    ).start();
  }, []);

  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.ring, { transform: [{ rotate }] }]}>
        <View style={styles.ringInner} />
      </Animated.View>
      <Animated.Text style={[styles.logo, { opacity: pulseAnim }]}>BurnoutAI</Animated.Text>
      <Text style={styles.sub}>Loading your wellness data...</Text>
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: colors.primary,
    borderTopColor: 'transparent',
    marginBottom: 24,
  },
  ringInner: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    bottom: 10,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: colors.primaryLight,
    borderBottomColor: 'transparent',
  },
  logo: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 1,
    marginBottom: 8,
  },
  sub: {
    fontSize: 14,
    color: colors.textMuted,
  },
});

export default LoadingScreen;
