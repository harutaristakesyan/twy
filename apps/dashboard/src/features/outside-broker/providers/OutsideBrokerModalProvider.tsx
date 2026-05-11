import type React from "react";
import { createContext, useContext, useState } from "react";
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

type CreateState = { open: boolean; onSuccess?: () => void };
type EditState = { open: boolean; broker: OutsideBroker | null; onSuccess?: () => void };

export const OutsideBrokerModalProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [createState, setCreateState] = useState<CreateState>({ open: false });
  const [editState, setEditState] = useState<EditState>({ open: false, broker: null });

  const openOutsideBrokerCreate = (onSuccess?: () => void) =>
    setCreateState({ open: true, onSuccess });

  const openOutsideBrokerEdit = (data: { broker: OutsideBroker }, onSuccess?: () => void) =>
    setEditState({ open: true, broker: data.broker, onSuccess });

  const closeCreate = () => setCreateState((prev) => ({ ...prev, open: false }));
  const closeEdit = () => setEditState((prev) => ({ ...prev, open: false }));

  return (
    <OutsideBrokerModalContext.Provider value={{ openOutsideBrokerCreate, openOutsideBrokerEdit }}>
      {children}

      <OutsideBrokerCreateModal
        open={createState.open}
        onCancel={closeCreate}
        onSuccess={() => {
          closeCreate();
          createState.onSuccess?.();
        }}
      />

      {editState.broker !== null && (
        <OutsideBrokerEditModal
          open={editState.open}
          broker={editState.broker}
          onCancel={closeEdit}
          onSuccess={() => {
            closeEdit();
            editState.onSuccess?.();
          }}
        />
      )}
    </OutsideBrokerModalContext.Provider>
  );
};
