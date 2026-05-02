import NiceModal from "@ebay/nice-modal-react";
import { Suspense } from "react";
import { RouterProvider } from "react-router-dom";
import AntdApp from "@/app/AntdApp.tsx";
import { router } from "@/app/routes/router.tsx";
import { AuthProvider } from "@/auth/AuthContext.tsx";
import DevModeIndicator from "@/components/DevModeIndicator.tsx";

const App = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthProvider>
        <AntdApp>
          <NiceModal.Provider>
            <RouterProvider router={router} />
            <DevModeIndicator />
          </NiceModal.Provider>
        </AntdApp>
      </AuthProvider>
    </Suspense>
  );
};

export default App;
