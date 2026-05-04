// Polyfill ResizeObserver for jsdom (used by antd Tabs internally)
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
