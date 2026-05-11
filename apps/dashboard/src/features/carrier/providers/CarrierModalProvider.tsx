import type React from "react";
import { createContext, useContext, useState } from "react";
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

type CreateState = {
  open: boolean;
  kind: CarrierKind;
  onSuccess?: () => void;
};

type EditState = {
  open: boolean;
  carrier: Carrier | null;
  onSuccess?: () => void;
};

export const CarrierModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [createState, setCreateState] = useState<CreateState>({ open: false, kind: "twy" });
  const [editState, setEditState] = useState<EditState>({ open: false, carrier: null });

  const openCarrierCreate = (kind: CarrierKind, onSuccess?: () => void) => {
    setCreateState({ open: true, kind, onSuccess });
  };

  const openCarrierEdit = (data: { carrier: Carrier }, onSuccess?: () => void) => {
    setEditState({ open: true, ...data, onSuccess });
  };

  const closeCreate = () => setCreateState((prev) => ({ ...prev, open: false }));
  const closeEdit = () => setEditState((prev) => ({ ...prev, open: false }));

  return (
    <CarrierModalContext.Provider value={{ openCarrierCreate, openCarrierEdit }}>
      {children}

      <CarrierCreateModal
        open={createState.open}
        kind={createState.kind}
        onCancel={closeCreate}
        onSuccess={() => {
          closeCreate();
          createState.onSuccess?.();
        }}
      />

      {editState.carrier !== null && (
        <CarrierEditModal
          open={editState.open}
          carrier={editState.carrier}
          onCancel={closeEdit}
          onSuccess={() => {
            closeEdit();
            editState.onSuccess?.();
          }}
        />
      )}
    </CarrierModalContext.Provider>
  );
};
