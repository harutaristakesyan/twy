import { Spinner, Toast } from "@heroui/react";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Suspense } from "react";
import { RouterProvider } from "react-router-dom";
import { QueryClientProvider, queryClient } from "@/libs/query";
import { AuthProvider } from "@/providers/AuthProvider";
import { router } from "@/routes/router";

const App = () => {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <QueryClientProvider client={queryClient}>
        <Toast.Provider />
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </Suspense>
  );
};

export default App;
