import { Suspense } from "react";
import { RouterProvider } from "react-router-dom";
import AntdApp from "@/providers/AntdProvider.tsx";
import { AuthProvider } from "@/providers/AuthProvider.tsx";
import { router } from "@/routes/router.tsx";

const App = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthProvider>
        <AntdApp>
          <RouterProvider router={router} />
        </AntdApp>
      </AuthProvider>
    </Suspense>
  );
};

export default App;
