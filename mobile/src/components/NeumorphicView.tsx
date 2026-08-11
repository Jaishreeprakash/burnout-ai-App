import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

interface NeumorphicViewProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'raised' | 'pressed' | 'flat' | 'gradient';
  borderRadius?: number;
  padding?: number;
  gradientColors?: readonly [string, string, ...string[]];
  active?: boolean;
  pointerEvents?: 'box-none' | 'none' | 'box-only' | 'auto';
}

const NeumorphicView: React.FC<NeumorphicViewProps> = ({
  children,
  style,
  variant = 'raised',
  borderRadius = 20,
  padding = 16,
  gradientColors,
  active = false,
  pointerEvents,
}) => {
  const { colors, scheme } = useTheme();

  const isLight = scheme === 'light';

  // Base background style
  const getBackgroundColor = () => {
    if (variant === 'pressed' || active) {
      return colors.surfacePressed;
    }
    if (variant === 'flat') {
      return colors.surfaceLight;
    }
    return colors.surface;
  };

  // Neumorphic dual shadow styling
  const raisedShadowStyles: ViewStyle = isLight
    ? {
        backgroundColor: getBackgroundColor(),
        borderRadius,
        shadowColor: colors.shadowDark,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 8,
        elevation: 6,
        borderWidth: 1,
        borderColor: '#FFFFFF99',
      }
    : {
        backgroundColor: getBackgroundColor(),
        borderRadius,
        shadowColor: '#000000',
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 0.6,
        shadowRadius: 10,
        elevation: 8,
        borderWidth: 1,
        borderColor: colors.border,
      };

  const pressedStyles: ViewStyle = {
    backgroundColor: getBackgroundColor(),
    borderRadius,
    borderWidth: 1.5,
    borderColor: isLight ? '#C8D2E1' : '#101218',
  };

  const flatStyles: ViewStyle = {
    backgroundColor: getBackgroundColor(),
    borderRadius,
    borderWidth: 1,
    borderColor: colors.borderLight,
  };

  if (variant === 'gradient' && gradientColors) {
    return (
      <View
        style={[raisedShadowStyles, { overflow: 'hidden', padding }, pointerEvents ? ({ pointerEvents } as any) : undefined, style]}
        pointerEvents={pointerEvents}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius, padding }}
        >
          {children}
        </LinearGradient>
      </View>
    );
  }

  const selectedVariantStyle =
    variant === 'pressed' || active
      ? pressedStyles
      : variant === 'flat'
      ? flatStyles
      : raisedShadowStyles;

  return (
    <View
      style={[selectedVariantStyle, { padding }, pointerEvents ? ({ pointerEvents } as any) : undefined, style]}
      pointerEvents={pointerEvents}
    >
      {children}
    </View>
  );
};

export default NeumorphicView;
