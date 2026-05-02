import type React from "react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import OutsideCarrierCreateModal from "../components/OutsideCarrierCreateModal";
import OutsideCarrierEditModal from "../components/OutsideCarrierEditModal";
import type { OutsideCarrier } from "../types/carrier";

interface OutsideCarrierModalContextType {
  openOutsideCarrierCreate: (onSuccess?: () => void) => void;
  openOutsideCarrierEdit: (data: { carrier: OutsideCarrier }, onSuccess?: () => void) => void;
}

const OutsideCarrierModalContext = createContext<OutsideCarrierModalContextType | null>(null);

export const useOutsideCarrierModal = (): OutsideCarrierModalContextType => {
  const ctx = useContext(OutsideCarrierModalContext);
  if (ctx === null)
    throw new Error("useOutsideCarrierModal must be used within OutsideCarrierModalProvider");
  return ctx;
};

export const OutsideCarrierModalProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [carrierCreate, setCarrierCreate] = useState<{ open: boolean }>({ open: false });

  const [carrierEdit, setCarrierEdit] = useState<{
    open: boolean;
    carrier: OutsideCarrier | null;
  }>({ open: false, carrier: null });

  const carrierCreateOnSuccess = useRef<(() => void) | undefined>(undefined);
  const carrierEditOnSuccess = useRef<(() => void) | undefined>(undefined);

  const openOutsideCarrierCreate = useCallback((onSuccess?: () => void) => {
    carrierCreateOnSuccess.current = onSuccess;
    setCarrierCreate({ open: true });
  }, []);

  const openOutsideCarrierEdit = useCallback(
    (data: { carrier: OutsideCarrier }, onSuccess?: () => void) => {
      carrierEditOnSuccess.current = onSuccess;
      setCarrierEdit({ open: true, ...data });
    },
    [],
  );

  const contextValue = useMemo(
    () => ({ openOutsideCarrierCreate, openOutsideCarrierEdit }),
    [openOutsideCarrierCreate, openOutsideCarrierEdit],
  );

  return (
    <OutsideCarrierModalContext.Provider value={contextValue}>
      {children}

      <OutsideCarrierCreateModal
        open={carrierCreate.open}
        onCancel={() => setCarrierCreate({ open: false })}
        onSuccess={() => {
          setCarrierCreate({ open: false });
          carrierCreateOnSuccess.current?.();
        }}
      />

      {carrierEdit.carrier !== null && (
        <OutsideCarrierEditModal
          open={carrierEdit.open}
          carrier={carrierEdit.carrier}
          onCancel={() => setCarrierEdit((prev) => ({ ...prev, open: false }))}
          onSuccess={() => {
            setCarrierEdit((prev) => ({ ...prev, open: false }));
            carrierEditOnSuccess.current?.();
          }}
        />
      )}
    </OutsideCarrierModalContext.Provider>
  );
};
