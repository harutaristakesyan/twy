import { useEffect, useState } from "react";

const MOCK_DATA_STORAGE_KEY = "mock_data_enabled";

/**
 * Hook to manage mock data toggle state
 * Persists state to localStorage
 */
export const useMockData = () => {
  // Initialize from localStorage or default to false
  const [isEnabled, setIsEnabled] = useState(() => {
    const stored = localStorage.getItem(MOCK_DATA_STORAGE_KEY);
    if (stored !== null) {
      return stored === "true";
    }
    // Default to environment variable if not in localStorage
    return import.meta.env.VITE_ENABLE_MOCKS === "true";
  });

  // Update localStorage when state changes
  useEffect(() => {
    localStorage.setItem(MOCK_DATA_STORAGE_KEY, String(isEnabled));
    // Update the global mock config
    if (typeof window !== "undefined") {
      window.__MOCK_DATA_ENABLED__ = isEnabled;
    }
  }, [isEnabled]);

  const toggle = () => {
    setIsEnabled((prev) => !prev);
  };

  const enable = () => {
    setIsEnabled(true);
  };

  const disable = () => {
    setIsEnabled(false);
  };

  return {
    isEnabled,
    toggle,
    enable,
    disable,
  };
};

/**
 * Get current mock data state (for non-React code)
 */
export const getMockDataEnabled = (): boolean => {
  if (typeof window !== "undefined" && window.__MOCK_DATA_ENABLED__ !== undefined) {
    return window.__MOCK_DATA_ENABLED__;
  }
  const stored = localStorage.getItem(MOCK_DATA_STORAGE_KEY);
  if (stored !== null) {
    return stored === "true";
  }
  return import.meta.env.VITE_ENABLE_MOCKS === "true";
};
