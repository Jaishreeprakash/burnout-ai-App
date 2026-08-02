import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { DarkColors, LightColors, ThemeColors } from '../constants/colors';

interface ThemeContextValue {
  colors: ThemeColors;
  scheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextValue>({ colors: DarkColors, scheme: 'dark' });

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const scheme: 'light' | 'dark' = systemScheme === 'light' ? 'light' : 'dark';
  const colors = scheme === 'light' ? LightColors : DarkColors;

  return (
    <ThemeContext.Provider value={{ colors, scheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
