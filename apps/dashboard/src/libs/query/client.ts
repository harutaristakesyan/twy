import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export { QueryClientProvider };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
