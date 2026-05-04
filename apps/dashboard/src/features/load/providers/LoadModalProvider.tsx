import type React from "react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import LoadEditModal from "../components/LoadEditModal";
import StatusUpdateModal from "../components/StatusUpdateModal";
import type { Load } from "../types/load";

interface LoadModalContextType {
  openLoadEdit: (data: { load: Load | null }, onSuccess?: () => void) => void;
  openStatusUpdate: (data: { load: Load | null }, onSuccess?: () => void) => void;
}

const LoadModalContext = createContext<LoadModalContextType | null>(null);

export const useLoadModal = (): LoadModalContextType => {
  const ctx = useContext(LoadModalContext);
  if (ctx === null) throw new Error("useLoadModal must be used within LoadModalProvider");
  return ctx;
};

export const LoadModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loadEdit, setLoadEdit] = useState<{
    open: boolean;
    load: Load | null;
  }>({ open: false, load: null });

  const [statusUpdate, setStatusUpdate] = useState<{
    open: boolean;
    load: Load | null;
  }>({ open: false, load: null });

  const loadEditOnSuccess = useRef<(() => void) | undefined>(undefined);
  const statusUpdateOnSuccess = useRef<(() => void) | undefined>(undefined);

  const openLoadEdit = useCallback((data: { load: Load | null }, onSuccess?: () => void) => {
    loadEditOnSuccess.current = onSuccess;
    setLoadEdit({ open: true, ...data });
  }, []);

  const openStatusUpdate = useCallback((data: { load: Load | null }, onSuccess?: () => void) => {
    statusUpdateOnSuccess.current = onSuccess;
    setStatusUpdate({ open: true, ...data });
  }, []);

  const contextValue = useMemo(
    () => ({ openLoadEdit, openStatusUpdate }),
    [openLoadEdit, openStatusUpdate],
  );

  return (
    <LoadModalContext.Provider value={contextValue}>
      {children}

      {loadEdit.load !== null && (
        <LoadEditModal
          open={loadEdit.open}
          load={loadEdit.load}
          onCancel={() => setLoadEdit({ open: false, load: null })}
          onSuccess={() => {
            setLoadEdit({ open: false, load: null });
            loadEditOnSuccess.current?.();
          }}
        />
      )}

      {statusUpdate.load !== null && (
        <StatusUpdateModal
          open={statusUpdate.open}
          load={statusUpdate.load}
          onCancel={() => setStatusUpdate({ open: false, load: null })}
          onSuccess={() => {
            setStatusUpdate({ open: false, load: null });
            statusUpdateOnSuccess.current?.();
          }}
        />
      )}
    </LoadModalContext.Provider>
  );
};
