import type React from "react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import UserCreateModal from "../components/UserCreateModal";
import UserEditModal from "../components/UserEditModal";
import type { User } from "../types/user";

interface UserModalContextType {
  openUserCreate: (onSuccess?: () => void) => void;
  openUserEdit: (data: { user: User }, onSuccess?: () => void) => void;
}

const UserModalContext = createContext<UserModalContextType | null>(null);

export const useUserModal = (): UserModalContextType => {
  const ctx = useContext(UserModalContext);
  if (ctx === null) throw new Error("useUserModal must be used within UserModalProvider");
  return ctx;
};

export const UserModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userCreate, setUserCreate] = useState<{ open: boolean }>({ open: false });

  const [userEdit, setUserEdit] = useState<{
    open: boolean;
    user: User | null;
  }>({ open: false, user: null });

  const userCreateOnSuccess = useRef<(() => void) | undefined>(undefined);
  const userEditOnSuccess = useRef<(() => void) | undefined>(undefined);

  const openUserCreate = useCallback((onSuccess?: () => void) => {
    userCreateOnSuccess.current = onSuccess;
    setUserCreate({ open: true });
  }, []);

  const openUserEdit = useCallback((data: { user: User }, onSuccess?: () => void) => {
    userEditOnSuccess.current = onSuccess;
    setUserEdit({ open: true, ...data });
  }, []);

  const contextValue = useMemo(
    () => ({ openUserCreate, openUserEdit }),
    [openUserCreate, openUserEdit],
  );

  return (
    <UserModalContext.Provider value={contextValue}>
      {children}

      <UserCreateModal
        open={userCreate.open}
        onCancel={() => setUserCreate({ open: false })}
        onSuccess={() => {
          setUserCreate({ open: false });
          userCreateOnSuccess.current?.();
        }}
      />

      {userEdit.user !== null && (
        <UserEditModal
          open={userEdit.open}
          user={userEdit.user}
          onCancel={() => setUserEdit((prev) => ({ ...prev, open: false }))}
          onSuccess={() => {
            setUserEdit((prev) => ({ ...prev, open: false }));
            userEditOnSuccess.current?.();
          }}
        />
      )}
    </UserModalContext.Provider>
  );
};
