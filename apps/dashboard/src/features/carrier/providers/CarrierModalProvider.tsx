import type React from "react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import CarrierCreateModal from "../components/CarrierCreateModal";
import CarrierEditModal from "../components/CarrierEditModal";
import type { Carrier, CarrierKind } from "../types/carrier";

interface CarrierModalContextType {
  openCarrierCreate: (kind: CarrierKind, onSuccess?: () => void) => void;
  openCarrierEdit: (data: { carrier: Carrier }, onSuccess?: () => void) => void;
}

const CarrierModalContext = createContext<CarrierModalContextType | null>(null);

export const useCarrierModal = (): CarrierModalContextType => {
  const ctx = useContext(CarrierModalContext);
  if (ctx === null) throw new Error("useCarrierModal must be used within CarrierModalProvider");
  return ctx;
};

export const CarrierModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [carrierCreate, setCarrierCreate] = useState<{ open: boolean; kind: CarrierKind }>({
    open: false,
    kind: "twy",
  });

  const [carrierEdit, setCarrierEdit] = useState<{ open: boolean; carrier: Carrier | null }>({
    open: false,
    carrier: null,
  });

  const carrierCreateOnSuccess = useRef<(() => void) | undefined>(undefined);
  const carrierEditOnSuccess = useRef<(() => void) | undefined>(undefined);

  const openCarrierCreate = useCallback((kind: CarrierKind, onSuccess?: () => void) => {
    carrierCreateOnSuccess.current = onSuccess;
    setCarrierCreate({ open: true, kind });
  }, []);

  const openCarrierEdit = useCallback((data: { carrier: Carrier }, onSuccess?: () => void) => {
    carrierEditOnSuccess.current = onSuccess;
    setCarrierEdit({ open: true, ...data });
  }, []);

  const contextValue = useMemo(
    () => ({ openCarrierCreate, openCarrierEdit }),
    [openCarrierCreate, openCarrierEdit],
  );

  return (
    <CarrierModalContext.Provider value={contextValue}>
      {children}

      <CarrierCreateModal
        open={carrierCreate.open}
        kind={carrierCreate.kind}
        onCancel={() => setCarrierCreate((prev) => ({ ...prev, open: false }))}
        onSuccess={() => {
          setCarrierCreate((prev) => ({ ...prev, open: false }));
          carrierCreateOnSuccess.current?.();
        }}
      />

      {carrierEdit.carrier !== null && (
        <CarrierEditModal
          open={carrierEdit.open}
          carrier={carrierEdit.carrier}
          onCancel={() => setCarrierEdit((prev) => ({ ...prev, open: false }))}
          onSuccess={() => {
            setCarrierEdit((prev) => ({ ...prev, open: false }));
            carrierEditOnSuccess.current?.();
          }}
        />
      )}
    </CarrierModalContext.Provider>
  );
};
