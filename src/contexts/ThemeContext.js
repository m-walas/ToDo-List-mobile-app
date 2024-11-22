// src/contexts/ThemeContext.js

import React, { createContext, useContext } from 'react';

const ThemeContext = createContext();

export const useThemeContext = () => useContext(ThemeContext);

export default ThemeContext;
