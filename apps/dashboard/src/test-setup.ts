import "@testing-library/jest-dom";

const noop = (): void => undefined;

// Polyfill ResizeObserver for jsdom (used by antd Tabs internally)
globalThis.ResizeObserver = class ResizeObserver {
  observe = noop;
  unobserve = noop;
  disconnect = noop;
};

// Polyfill window.matchMedia for jsdom (used by antd responsive observer)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null as MediaQueryList["onchange"],
    addListener: noop,
    removeListener: noop,
    addEventListener: noop,
    removeEventListener: noop,
    dispatchEvent: () => false,
  }),
});
