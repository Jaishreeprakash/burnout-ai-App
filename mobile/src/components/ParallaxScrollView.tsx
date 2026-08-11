import React, { useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  ScrollViewProps,
  RefreshControlProps,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

const { width, height: screenHeight } = Dimensions.get('window');

interface ParallaxScrollViewProps extends ScrollViewProps {
  headerComponent?: React.ReactNode;
  headerHeight?: number;
  children: React.ReactNode;
  refreshControl?: React.ReactElement<RefreshControlProps>;
}

/**
 * Advanced 5-layer parallax scroll view with staggered ambient elements,
 * rotation, scale pulsing, and depth-based opacity transitions.
 */
const ParallaxScrollView: React.FC<ParallaxScrollViewProps> = ({
  headerComponent,
  headerHeight = 180,
  children,
  refreshControl,
  style,
  contentContainerStyle,
  ...rest
}) => {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const isLight = scheme === 'light';

  // ── Header Parallax ────────────────────────────────────────────────────
  const headerTranslateY = scrollY.interpolate({
    inputRange: [-headerHeight, 0, headerHeight],
    outputRange: [headerHeight * 0.5, 0, -headerHeight * 0.45],
    extrapolate: 'clamp',
  });

  const headerScale = scrollY.interpolate({
    inputRange: [-headerHeight, 0],
    outputRange: [1.3, 1],
    extrapolateLeft: 'extend',
    extrapolateRight: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, headerHeight * 0.8],
    outputRange: [1, 0.15],
    extrapolate: 'clamp',
  });

  // ── Layer 1: Deep background — large gradient orb (slowest) ────────────
  const layer1TranslateY = scrollY.interpolate({
    inputRange: [0, 600],
    outputRange: [0, -90],
    extrapolate: 'clamp',
  });

  const layer1Rotate = scrollY.interpolate({
    inputRange: [0, 600],
    outputRange: ['0deg', '25deg'],
    extrapolate: 'clamp',
  });

  const layer1Opacity = scrollY.interpolate({
    inputRange: [0, 400],
    outputRange: [0.18, 0.04],
    extrapolate: 'clamp',
  });

  // ── Layer 2: Ring/donut shape ──────────────────────────────────────────
  const layer2TranslateY = scrollY.interpolate({
    inputRange: [0, 600],
    outputRange: [0, -150],
    extrapolate: 'clamp',
  });

  const layer2TranslateX = scrollY.interpolate({
    inputRange: [0, 600],
    outputRange: [0, 30],
    extrapolate: 'clamp',
  });

  const layer2Rotate = scrollY.interpolate({
    inputRange: [0, 600],
    outputRange: ['0deg', '-40deg'],
    extrapolate: 'clamp',
  });

  const layer2Opacity = scrollY.interpolate({
    inputRange: [0, 350],
    outputRange: [0.14, 0.03],
    extrapolate: 'clamp',
  });

  // ── Layer 3: Glowing mid-sphere ────────────────────────────────────────
  const layer3TranslateY = scrollY.interpolate({
    inputRange: [0, 600],
    outputRange: [0, -210],
    extrapolate: 'clamp',
  });

  const layer3Scale = scrollY.interpolate({
    inputRange: [0, 300, 600],
    outputRange: [1, 1.2, 0.85],
    extrapolate: 'clamp',
  });

  const layer3Opacity = scrollY.interpolate({
    inputRange: [0, 300],
    outputRange: [0.2, 0.05],
    extrapolate: 'clamp',
  });

  // ── Layer 4: Scattered particles (fastest background layer) ────────────
  const layer4TranslateY = scrollY.interpolate({
    inputRange: [0, 600],
    outputRange: [0, -300],
    extrapolate: 'clamp',
  });

  const layer4Opacity = scrollY.interpolate({
    inputRange: [0, 250],
    outputRange: [0.25, 0.04],
    extrapolate: 'clamp',
  });

  // Colors for layers
  const primaryOrb = isLight ? colors.primary : '#818CF8';
  const secondaryOrb = isLight ? '#00B894' : '#34D399';
  const accentOrb = isLight ? '#A29BFE' : '#C084FC';
  const warmOrb = isLight ? '#FFAB00' : '#FBD34D';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Parallax Background Layers ─────────────────────────────────── */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">

        {/* Layer 1 — Large gradient orb (deepest, slowest) */}
        <Animated.View
          style={[
            styles.ambientShape,
            {
              top: -80,
              right: -90,
              width: 320,
              height: 320,
              borderRadius: 160,
              opacity: layer1Opacity,
              transform: [
                { translateY: layer1TranslateY },
                { rotate: layer1Rotate },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={[primaryOrb + '40', primaryOrb + '08']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientFill}
          />
        </Animated.View>

        {/* Layer 2 — Donut ring shape */}
        <Animated.View
          style={[
            styles.ambientShape,
            {
              top: 200,
              left: -70,
              width: 200,
              height: 200,
              borderRadius: 100,
              borderWidth: 24,
              borderColor: secondaryOrb + '20',
              backgroundColor: 'transparent',
              opacity: layer2Opacity,
              transform: [
                { translateY: layer2TranslateY },
                { translateX: layer2TranslateX },
                { rotate: layer2Rotate },
              ],
            },
          ]}
        />

        {/* Layer 3 — Glowing mid-sphere with scale pulse */}
        <Animated.View
          style={[
            styles.ambientShape,
            {
              top: 380,
              right: 20,
              width: 110,
              height: 110,
              borderRadius: 55,
              opacity: layer3Opacity,
              transform: [
                { translateY: layer3TranslateY },
                { scale: layer3Scale },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={[accentOrb + '50', accentOrb + '10']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.gradientFill}
          />
        </Animated.View>

        {/* Layer 4 — Scattered particles (fastest) */}
        <Animated.View
          style={{
            ...StyleSheet.absoluteFillObject,
            opacity: layer4Opacity,
            transform: [{ translateY: layer4TranslateY }],
          }}
        >
          {/* Particle 1 */}
          <View style={[styles.particle, { top: 120, left: 40, width: 12, height: 12, backgroundColor: primaryOrb + '30', borderRadius: 6 }]} />
          {/* Particle 2 */}
          <View style={[styles.particle, { top: 280, right: 60, width: 18, height: 18, backgroundColor: secondaryOrb + '25', borderRadius: 9 }]} />
          {/* Particle 3 */}
          <View style={[styles.particle, { top: 440, left: 100, width: 10, height: 10, backgroundColor: warmOrb + '30', borderRadius: 5 }]} />
          {/* Particle 4 */}
          <View style={[styles.particle, { top: 180, right: 130, width: 8, height: 8, backgroundColor: accentOrb + '35', borderRadius: 4 }]} />
          {/* Particle 5 */}
          <View style={[styles.particle, { top: 520, left: 200, width: 14, height: 14, backgroundColor: primaryOrb + '20', borderRadius: 7 }]} />
          {/* Particle 6 — diamond shape */}
          <View style={[styles.particle, {
            top: 340,
            left: 260,
            width: 16,
            height: 16,
            backgroundColor: warmOrb + '25',
            borderRadius: 3,
            transform: [{ rotate: '45deg' }],
          }]} />
        </Animated.View>
      </View>

      {/* ── Header Parallax Container (Layer 5 — foreground) ───────────── */}
      {headerComponent && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.headerContainer,
            {
              height: headerHeight,
              paddingTop: insets.top,
              opacity: headerOpacity,
              transform: [{ translateY: headerTranslateY }, { scale: headerScale }],
            },
          ]}
        >
          {headerComponent}
        </Animated.View>
      )}

      {/* ── Main Scroll Content ───────────────────────────────────────── */}
      <Animated.ScrollView
        {...rest}
        style={[styles.scroll, style]}
        contentContainerStyle={[
          styles.scrollContent,
          headerComponent ? { paddingTop: headerHeight - 30 } : { paddingTop: insets.top + 10 },
          contentContainerStyle,
        ]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={8}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        refreshControl={refreshControl}
      >
        <View style={styles.innerContent}>
          {children}
        </View>
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 180,
  },
  innerContent: {
    maxWidth: 680,
    alignSelf: 'center',
    width: '100%',
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    elevation: 10,
    justifyContent: 'center',
    paddingHorizontal: 20,
    maxWidth: 680,
    alignSelf: 'center',
    width: '100%',
  },
  ambientShape: {
    position: 'absolute',
    overflow: 'hidden',
  },
  gradientFill: {
    flex: 1,
    borderRadius: 999,
  },
  particle: {
    position: 'absolute',
  },
});

export default ParallaxScrollView;
