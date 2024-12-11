// src/contexts/UnsubContext.js
import React, { createContext, useState, useCallback } from 'react';

export const UnsubContext = createContext();

export const UnsubProvider = ({ children }) => {
  const [unsubs, setUnsubs] = useState([]);

  const addUnsub = useCallback((fn) => {
    setUnsubs((prev) => [...prev, fn]);
  }, []);

  const removeUnsub = useCallback((fn) => {
    setUnsubs((prev) => prev.filter((f) => f !== fn));
  }, []);

  const clearUnsubs = useCallback(() => {
    unsubs.forEach((fn) => fn());
    setUnsubs([]);
  }, [unsubs]);

  return (
    <UnsubContext.Provider value={{ addUnsub, removeUnsub, clearUnsubs }}>
      {children}
    </UnsubContext.Provider>
  );
};
