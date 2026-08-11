import { TextStyle } from 'react-native';

export const Typography = {
  h1: {
    fontSize: 28,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  h2: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    lineHeight: 24,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 20,
  },
  bodyBold: {
    fontSize: 14,
    fontWeight: '600' as const,
    letterSpacing: 0,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    letterSpacing: 0.2,
    lineHeight: 16,
  },
  button: {
    fontSize: 15,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  metricValue: {
    fontSize: 32,
    fontWeight: '800' as const,
    letterSpacing: -0.8,
    lineHeight: 38,
  },
};
