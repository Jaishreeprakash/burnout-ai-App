import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
  Animated,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

interface NeumorphicButtonProps {
  onPress: () => void;
  title?: string;
  icon?: string;
  variant?: 'primary' | 'raised' | 'pressed' | 'danger' | 'success';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  active?: boolean;
  testID?: string;
}

const NeumorphicButton: React.FC<NeumorphicButtonProps> = ({
  onPress,
  title,
  icon,
  variant = 'raised',
  style,
  textStyle,
  size = 'medium',
  disabled = false,
  active = false,
  testID,
}) => {
  const { colors, scheme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isLight = scheme === 'light';

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  };

  const handlePress = () => {
    if (!disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  const sizePadding =
    size === 'small'
      ? { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 14 }
      : size === 'large'
      ? { paddingVertical: 16, paddingHorizontal: 24, borderRadius: 24 }
      : { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 18 };

  const iconSize = size === 'small' ? 18 : size === 'large' ? 24 : 20;
  const fontSize = size === 'small' ? 12 : size === 'large' ? 16 : 14;

  if (variant === 'primary' || variant === 'danger' || variant === 'success') {
    const gradientColors =
      variant === 'danger'
        ? ([colors.danger, '#E53935'] as const)
        : variant === 'success'
        ? ([colors.success, '#00A884'] as const)
        : ([colors.primary, colors.primaryDark || '#5B4BC4'] as const);

    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          testID={testID}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handlePress}
          disabled={disabled}
          activeOpacity={0.9}
          style={[
            styles.shadowWrapper,
            {
              shadowColor: variant === 'danger' ? colors.danger : colors.primary,
              shadowOpacity: 0.35,
              shadowRadius: 10,
              elevation: 6,
            },
            style,
          ]}
        >
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.buttonContent, sizePadding]}
          >
            {icon && (
              <MaterialCommunityIcons
                name={icon as any}
                size={iconSize}
                color="#FFFFFF"
                style={title ? styles.iconWithText : undefined}
              />
            )}
            {title && (
              <Text style={[styles.primaryText, { fontSize }, textStyle]}>
                {title}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  const isPressed = variant === 'pressed' || active;

  const neumorphicStyle: ViewStyle = isPressed
    ? {
        backgroundColor: colors.surfacePressed,
        borderWidth: 1.5,
        borderColor: isLight ? '#C8D2E1' : '#101218',
      }
    : {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: isLight ? '#FFFFFF99' : colors.border,
        shadowColor: isLight ? colors.shadowDark : '#000000',
        shadowOffset: { width: 3, height: 3 },
        shadowOpacity: isLight ? 0.35 : 0.5,
        shadowRadius: 6,
        elevation: 4,
      };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        testID={testID}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.9}
        style={[styles.buttonContent, neumorphicStyle, sizePadding, style]}
      >
        {icon && (
          <MaterialCommunityIcons
            name={icon as any}
            size={iconSize}
            color={active ? colors.primary : colors.text}
            style={title ? styles.iconWithText : undefined}
          />
        )}
        {title && (
          <Text
            style={[
              styles.raisedText,
              { fontSize, color: active ? colors.primary : colors.text },
              textStyle,
            ]}
          >
            {title}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  shadowWrapper: {
    borderRadius: 20,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWithText: {
    marginRight: 8,
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  raisedText: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

export default NeumorphicButton;
