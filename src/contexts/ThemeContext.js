// src/contexts/ThemeContext.js

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const useThemeContext = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const colorScheme = useColorScheme();
  const [isDarkTheme, setIsDarkTheme] = useState(colorScheme === 'dark');

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const themePreference = await AsyncStorage.getItem('theme');
        if (themePreference) {
          setIsDarkTheme(themePreference === 'dark');
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const newTheme = !isDarkTheme;
    setIsDarkTheme(newTheme);
    try {
      await AsyncStorage.setItem('theme', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ isDarkTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
