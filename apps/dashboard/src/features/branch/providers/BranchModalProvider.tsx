import type React from "react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
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

export const BranchModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branchCreate, setBranchCreate] = useState<{
    open: boolean;
    owners: User[];
    loadingOwners: boolean;
  }>({ open: false, owners: [], loadingOwners: false });

  const [branchEdit, setBranchEdit] = useState<{
    open: boolean;
    branch: Branch | null;
    owners: User[];
    loadingOwners: boolean;
  }>({ open: false, branch: null, owners: [], loadingOwners: false });

  const branchCreateOnSuccess = useRef<(() => void) | undefined>(undefined);
  const branchEditOnSuccess = useRef<(() => void) | undefined>(undefined);

  const openBranchCreate = useCallback(
    (data: { owners: User[]; loadingOwners: boolean }, onSuccess?: () => void) => {
      branchCreateOnSuccess.current = onSuccess;
      setBranchCreate({ open: true, ...data });
    },
    [],
  );

  const openBranchEdit = useCallback(
    (data: { branch: Branch; owners: User[]; loadingOwners: boolean }, onSuccess?: () => void) => {
      branchEditOnSuccess.current = onSuccess;
      setBranchEdit({ open: true, ...data });
    },
    [],
  );

  const contextValue = useMemo(
    () => ({ openBranchCreate, openBranchEdit }),
    [openBranchCreate, openBranchEdit],
  );

  return (
    <BranchModalContext.Provider value={contextValue}>
      {children}

      <BranchCreateModal
        open={branchCreate.open}
        owners={branchCreate.owners}
        loadingOwners={branchCreate.loadingOwners}
        onCancel={() => setBranchCreate((prev) => ({ ...prev, open: false }))}
        onSuccess={() => {
          setBranchCreate((prev) => ({ ...prev, open: false }));
          branchCreateOnSuccess.current?.();
        }}
      />

      {branchEdit.branch !== null && (
        <BranchEditModal
          open={branchEdit.open}
          branch={branchEdit.branch}
          owners={branchEdit.owners}
          loadingOwners={branchEdit.loadingOwners}
          onCancel={() => setBranchEdit((prev) => ({ ...prev, open: false }))}
          onSuccess={() => {
            setBranchEdit((prev) => ({ ...prev, open: false }));
            branchEditOnSuccess.current?.();
          }}
        />
      )}
    </BranchModalContext.Provider>
  );
};
