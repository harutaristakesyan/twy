import type React from "react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { Branch } from "@/features/branch/types/branch";
import OutsideBrokerCreateModal from "../components/OutsideBrokerCreateModal";
import OutsideBrokerEditModal from "../components/OutsideBrokerEditModal";
import type { OutsideBroker } from "../types/broker";

interface OutsideBrokerModalContextType {
  openOutsideBrokerCreate: (
    data: { branches: Branch[]; loadingBranches: boolean },
    onSuccess?: () => void,
  ) => void;
  openOutsideBrokerEdit: (
    data: { broker: OutsideBroker; branches: Branch[]; loadingBranches: boolean },
    onSuccess?: () => void,
  ) => void;
}

const OutsideBrokerModalContext = createContext<OutsideBrokerModalContextType | null>(null);

export const useOutsideBrokerModal = (): OutsideBrokerModalContextType => {
  const ctx = useContext(OutsideBrokerModalContext);
  if (ctx === null)
    throw new Error("useOutsideBrokerModal must be used within OutsideBrokerModalProvider");
  return ctx;
};

export const OutsideBrokerModalProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [brokerCreate, setBrokerCreate] = useState<{
    open: boolean;
    branches: Branch[];
    loadingBranches: boolean;
  }>({ open: false, branches: [], loadingBranches: false });

  const [brokerEdit, setBrokerEdit] = useState<{
    open: boolean;
    broker: OutsideBroker | null;
    branches: Branch[];
    loadingBranches: boolean;
  }>({ open: false, broker: null, branches: [], loadingBranches: false });

  const brokerCreateOnSuccess = useRef<(() => void) | undefined>(undefined);
  const brokerEditOnSuccess = useRef<(() => void) | undefined>(undefined);

  const openOutsideBrokerCreate = useCallback(
    (data: { branches: Branch[]; loadingBranches: boolean }, onSuccess?: () => void) => {
      brokerCreateOnSuccess.current = onSuccess;
      setBrokerCreate({ open: true, ...data });
    },
    [],
  );

  const openOutsideBrokerEdit = useCallback(
    (
      data: { broker: OutsideBroker; branches: Branch[]; loadingBranches: boolean },
      onSuccess?: () => void,
    ) => {
      brokerEditOnSuccess.current = onSuccess;
      setBrokerEdit({ open: true, ...data });
    },
    [],
  );

  const contextValue = useMemo(
    () => ({ openOutsideBrokerCreate, openOutsideBrokerEdit }),
    [openOutsideBrokerCreate, openOutsideBrokerEdit],
  );

  return (
    <OutsideBrokerModalContext.Provider value={contextValue}>
      {children}

      <OutsideBrokerCreateModal
        open={brokerCreate.open}
        branches={brokerCreate.branches}
        loadingBranches={brokerCreate.loadingBranches}
        onCancel={() => setBrokerCreate((prev) => ({ ...prev, open: false }))}
        onSuccess={() => {
          setBrokerCreate((prev) => ({ ...prev, open: false }));
          brokerCreateOnSuccess.current?.();
        }}
      />

      {brokerEdit.broker !== null && (
        <OutsideBrokerEditModal
          open={brokerEdit.open}
          broker={brokerEdit.broker}
          branches={brokerEdit.branches}
          loadingBranches={brokerEdit.loadingBranches}
          onCancel={() => setBrokerEdit((prev) => ({ ...prev, open: false }))}
          onSuccess={() => {
            setBrokerEdit((prev) => ({ ...prev, open: false }));
            brokerEditOnSuccess.current?.();
          }}
        />
      )}
    </OutsideBrokerModalContext.Provider>
  );
};
