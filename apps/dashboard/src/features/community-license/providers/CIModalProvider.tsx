import type React from "react";
import { createContext, useContext, useState } from "react";
import CICreateModal from "../components/CICreateModal";
import CIEditModal from "../components/CIEditModal";
import type { CommunityLicense } from "../types/communityLicense";

interface CIModalContextType {
  openCICreate: (onSuccess?: () => void) => void;
  openCIEdit: (communityLicense: CommunityLicense, onSuccess?: () => void) => void;
}

const CIModalContext = createContext<CIModalContextType | null>(null);

export const useCIModal = (): CIModalContextType => {
  const ctx = useContext(CIModalContext);
  if (ctx === null) throw new Error("useCIModal must be used within CIModalProvider");
  return ctx;
};

type CreateState = { open: boolean; onSuccess?: () => void };
type EditState = {
  open: boolean;
  communityLicense: CommunityLicense | null;
  onSuccess?: () => void;
};

export const CIModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [createState, setCreateState] = useState<CreateState>({ open: false });
  const [editState, setEditState] = useState<EditState>({ open: false, communityLicense: null });

  const openCICreate = (onSuccess?: () => void) => setCreateState({ open: true, onSuccess });

  const openCIEdit = (communityLicense: CommunityLicense, onSuccess?: () => void) =>
    setEditState({ open: true, communityLicense, onSuccess });

  const closeCreate = () => setCreateState((prev) => ({ ...prev, open: false }));
  const closeEdit = () => setEditState((prev) => ({ ...prev, open: false }));

  return (
    <CIModalContext.Provider value={{ openCICreate, openCIEdit }}>
      {children}

      <CICreateModal
        open={createState.open}
        onCancel={closeCreate}
        onSuccess={() => {
          closeCreate();
          createState.onSuccess?.();
        }}
      />

      {editState.communityLicense !== null && (
        <CIEditModal
          open={editState.open}
          communityLicense={editState.communityLicense}
          onCancel={closeEdit}
          onSuccess={() => {
            closeEdit();
            editState.onSuccess?.();
          }}
        />
      )}
    </CIModalContext.Provider>
  );
};
