import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { DarkColors, LightColors, ThemeColors } from '../constants/colors';

interface ThemeContextValue {
  colors: ThemeColors;
  scheme: 'light' | 'dark';
  toggleTheme: () => void;
  setScheme: (scheme: 'light' | 'dark') => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: LightColors,
  scheme: 'light',
  toggleTheme: () => {},
  setScheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [userScheme, setUserScheme] = useState<'light' | 'dark' | null>(null);

  const scheme: 'light' | 'dark' = userScheme !== null ? userScheme : (systemScheme === 'dark' ? 'dark' : 'light');
  const colors = scheme === 'light' ? LightColors : DarkColors;

  const toggleTheme = () => {
    setUserScheme(prev => (prev === 'dark' || (prev === null && systemScheme === 'dark') ? 'light' : 'dark'));
  };

  const setScheme = (newScheme: 'light' | 'dark') => {
    setUserScheme(newScheme);
  };

  return (
    <ThemeContext.Provider value={{ colors, scheme, toggleTheme, setScheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
