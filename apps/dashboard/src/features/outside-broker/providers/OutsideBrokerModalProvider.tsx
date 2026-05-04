import type React from "react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import OutsideBrokerCreateModal from "../components/OutsideBrokerCreateModal";
import OutsideBrokerEditModal from "../components/OutsideBrokerEditModal";
import type { OutsideBroker } from "../types/broker";

interface OutsideBrokerModalContextType {
  openOutsideBrokerCreate: (onSuccess?: () => void) => void;
  openOutsideBrokerEdit: (data: { broker: OutsideBroker }, onSuccess?: () => void) => void;
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
  const [brokerCreateOpen, setBrokerCreateOpen] = useState(false);

  const [brokerEdit, setBrokerEdit] = useState<{
    open: boolean;
    broker: OutsideBroker | null;
  }>({ open: false, broker: null });

  const brokerCreateOnSuccess = useRef<(() => void) | undefined>(undefined);
  const brokerEditOnSuccess = useRef<(() => void) | undefined>(undefined);

  const openOutsideBrokerCreate = useCallback((onSuccess?: () => void) => {
    brokerCreateOnSuccess.current = onSuccess;
    setBrokerCreateOpen(true);
  }, []);

  const openOutsideBrokerEdit = useCallback(
    (data: { broker: OutsideBroker }, onSuccess?: () => void) => {
      brokerEditOnSuccess.current = onSuccess;
      setBrokerEdit({ open: true, broker: data.broker });
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
        open={brokerCreateOpen}
        onCancel={() => setBrokerCreateOpen(false)}
        onSuccess={() => {
          setBrokerCreateOpen(false);
          brokerCreateOnSuccess.current?.();
        }}
      />

      {brokerEdit.broker !== null && (
        <OutsideBrokerEditModal
          open={brokerEdit.open}
          broker={brokerEdit.broker}
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
