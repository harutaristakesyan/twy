import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
    },
    mutations: { retry: 0 },
  },
});

const Devtools = React.lazy(() =>
  import("@tanstack/react-query-devtools").then((m) => ({
    default: m.ReactQueryDevtools,
  })),
);

const Root = () => (
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      {import.meta.env.DEV && (
        <React.Suspense fallback={null}>
          <Devtools initialIsOpen={false} buttonPosition="bottom-left" />
        </React.Suspense>
      )}
    </QueryClientProvider>
  </React.StrictMode>
);

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found in document");
}

ReactDOM.createRoot(rootElement).render(<Root />);
