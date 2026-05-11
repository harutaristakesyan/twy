import type React from "react";
import { createContext, useContext, useState } from "react";
import type { User } from "@/features/user/types/user";
import BranchCreateModal from "../components/BranchCreateModal";
import BranchEditModal from "../components/BranchEditModal";
import type { Branch } from "../types/branch";

interface BranchModalContextType {
  openBranchCreate: (
    data: { owners: User[]; loadingOwners: boolean },
    onSuccess?: () => void,
  ) => void;
  openBranchEdit: (
    data: { branch: Branch; owners: User[]; loadingOwners: boolean },
    onSuccess?: () => void,
  ) => void;
}

const BranchModalContext = createContext<BranchModalContextType | null>(null);

export const useBranchModal = (): BranchModalContextType => {
  const ctx = useContext(BranchModalContext);
  if (ctx === null) throw new Error("useBranchModal must be used within BranchModalProvider");
  return ctx;
};

type CreateState = {
  open: boolean;
  owners: User[];
  loadingOwners: boolean;
  onSuccess?: () => void;
};

type EditState = {
  open: boolean;
  branch: Branch | null;
  owners: User[];
  loadingOwners: boolean;
  onSuccess?: () => void;
};

export const BranchModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [createState, setCreateState] = useState<CreateState>({
    open: false,
    owners: [],
    loadingOwners: false,
  });
  const [editState, setEditState] = useState<EditState>({
    open: false,
    branch: null,
    owners: [],
    loadingOwners: false,
  });

  const openBranchCreate = (
    data: { owners: User[]; loadingOwners: boolean },
    onSuccess?: () => void,
  ) => {
    setCreateState({ open: true, ...data, onSuccess });
  };

  const openBranchEdit = (
    data: { branch: Branch; owners: User[]; loadingOwners: boolean },
    onSuccess?: () => void,
  ) => {
    setEditState({ open: true, ...data, onSuccess });
  };

  const closeCreate = () => setCreateState((prev) => ({ ...prev, open: false }));
  const closeEdit = () => setEditState((prev) => ({ ...prev, open: false }));

  return (
    <BranchModalContext.Provider value={{ openBranchCreate, openBranchEdit }}>
      {children}

      <BranchCreateModal
        open={createState.open}
        owners={createState.owners}
        loadingOwners={createState.loadingOwners}
        onCancel={closeCreate}
        onSuccess={() => {
          closeCreate();
          createState.onSuccess?.();
        }}
      />

      {editState.branch !== null && (
        <BranchEditModal
          open={editState.open}
          branch={editState.branch}
          owners={editState.owners}
          loadingOwners={editState.loadingOwners}
          onCancel={closeEdit}
          onSuccess={() => {
            closeEdit();
            editState.onSuccess?.();
          }}
        />
      )}
    </BranchModalContext.Provider>
  );
};
