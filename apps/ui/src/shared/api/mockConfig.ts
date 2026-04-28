/**
 * Mock API Configuration
 *
 * Set ENABLE_MOCK_API to true to use mock data instead of real API calls
 * This is useful for development and testing without a backend
 *
 * Environment Variables (optional):
 * - VITE_ENABLE_MOCKS: Set to 'true' to enable mocks
 * - VITE_MOCK_DELAY: Network delay in milliseconds
 *
 * Create a .env.development file with:
 * VITE_ENABLE_MOCKS=true
 * VITE_MOCK_DELAY=500
 */

declare global {
  interface Window {
    __MOCK_DATA_ENABLED__?: boolean;
  }
}

// Helper to get initial mock state from localStorage or env
const getInitialMockState = (): boolean => {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("mock_data_enabled");
    if (stored !== null) {
      return stored === "true";
    }
  }
  return import.meta.env.VITE_ENABLE_MOCKS === "true" || false;
};

export const MOCK_CONFIG = {
  // Master switch - can be toggled at runtime via useMockData hook
  // Checks localStorage first, then environment variable
  get ENABLE_MOCK_API(): boolean {
    if (typeof window !== "undefined" && window.__MOCK_DATA_ENABLED__ !== undefined) {
      return window.__MOCK_DATA_ENABLED__;
    }
    return getInitialMockState();
  },

  // Delay for simulating network latency (in milliseconds)
  // Or use environment variable VITE_MOCK_DELAY
  MOCK_DELAY: Number(import.meta.env.VITE_MOCK_DELAY) || 500,

  // Enable/disable specific endpoints (only works if ENABLE_MOCK_API is true)
  endpoints: {
    users: true,
    branches: true,
    loads: true,
    outside_brokers: true,
    outside_carriers: true,
  },
};

// Initialize global state
if (typeof window !== "undefined") {
  window.__MOCK_DATA_ENABLED__ = getInitialMockState();
}

/**
 * Helper function to check if mocking is enabled for a specific endpoint
 */
export const isMockEnabled = (endpoint: keyof typeof MOCK_CONFIG.endpoints): boolean => {
  return MOCK_CONFIG.ENABLE_MOCK_API && MOCK_CONFIG.endpoints[endpoint];
};
