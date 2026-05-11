import type React from "react";
import { createContext, useContext, useState } from "react";
import CommentsDialog from "../components/CommentsDialog";
import LoadEditModal from "../components/LoadEditModal";
import StatusUpdateModal from "../components/StatusUpdateModal";
import type { Load } from "../types/load";

interface LoadModalContextType {
  openLoadEdit: (data: { load: Load | null }, onSuccess?: () => void) => void;
  openStatusUpdate: (data: { load: Load | null }, onSuccess?: () => void) => void;
  openComments: (data: { load: Load }) => void;
}

const LoadModalContext = createContext<LoadModalContextType | null>(null);

export const useLoadModal = (): LoadModalContextType => {
  const ctx = useContext(LoadModalContext);
  if (ctx === null) throw new Error("useLoadModal must be used within LoadModalProvider");
  return ctx;
};

type LoadEditState = {
  open: boolean;
  load: Load | null;
  onSuccess?: () => void;
};

type StatusUpdateState = {
  open: boolean;
  load: Load | null;
  onSuccess?: () => void;
};

type CommentsState = {
  open: boolean;
  load: Load | null;
};

export const LoadModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loadEdit, setLoadEdit] = useState<LoadEditState>({ open: false, load: null });
  const [statusUpdate, setStatusUpdate] = useState<StatusUpdateState>({ open: false, load: null });
  const [comments, setComments] = useState<CommentsState>({ open: false, load: null });

  const openLoadEdit = (data: { load: Load | null }, onSuccess?: () => void) => {
    setLoadEdit({ open: true, ...data, onSuccess });
  };

  const openStatusUpdate = (data: { load: Load | null }, onSuccess?: () => void) => {
    setStatusUpdate({ open: true, ...data, onSuccess });
  };

  const openComments = (data: { load: Load }) => {
    setComments({ open: true, load: data.load });
  };

  const closeLoadEdit = () => setLoadEdit((prev) => ({ ...prev, open: false }));
  const closeStatusUpdate = () => setStatusUpdate((prev) => ({ ...prev, open: false }));
  const closeComments = () => setComments((prev) => ({ ...prev, open: false }));

  return (
    <LoadModalContext.Provider value={{ openLoadEdit, openStatusUpdate, openComments }}>
      {children}

      {loadEdit.load !== null && (
        <LoadEditModal
          open={loadEdit.open}
          load={loadEdit.load}
          onCancel={closeLoadEdit}
          onSuccess={() => {
            closeLoadEdit();
            loadEdit.onSuccess?.();
          }}
        />
      )}

      {statusUpdate.load !== null && (
        <StatusUpdateModal
          open={statusUpdate.open}
          load={statusUpdate.load}
          onCancel={closeStatusUpdate}
          onSuccess={() => {
            closeStatusUpdate();
            statusUpdate.onSuccess?.();
          }}
        />
      )}

      {comments.load !== null && (
        <CommentsDialog
          open={comments.open}
          loadId={comments.load.id}
          referenceNumber={comments.load.referenceNumber}
          onCancel={closeComments}
        />
      )}
    </LoadModalContext.Provider>
  );
};
