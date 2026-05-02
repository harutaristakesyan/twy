import type React from "react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import TeamFormDrawer from "../components/TeamFormDrawer";
import type { Team } from "../types/team";

interface TeamModalContextType {
  openTeamCreate: (onSuccess?: () => void) => void;
  openTeamEdit: (team: Team, onSuccess?: () => void) => void;
}

const TeamModalContext = createContext<TeamModalContextType | null>(null);

export const useTeamModal = (): TeamModalContextType => {
  const ctx = useContext(TeamModalContext);
  if (ctx === null) throw new Error("useTeamModal must be used within TeamModalProvider");
  return ctx;
};

export const TeamModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [drawerState, setDrawerState] = useState<{ open: boolean; team?: Team }>({ open: false });
  const onSuccessRef = useRef<(() => void) | undefined>(undefined);

  const openTeamCreate = useCallback((onSuccess?: () => void) => {
    onSuccessRef.current = onSuccess;
    setDrawerState({ open: true, team: undefined });
  }, []);

  const openTeamEdit = useCallback((team: Team, onSuccess?: () => void) => {
    onSuccessRef.current = onSuccess;
    setDrawerState({ open: true, team });
  }, []);

  const contextValue = useMemo(
    () => ({ openTeamCreate, openTeamEdit }),
    [openTeamCreate, openTeamEdit],
  );

  return (
    <TeamModalContext.Provider value={contextValue}>
      {children}

      <TeamFormDrawer
        open={drawerState.open}
        team={drawerState.team}
        onCancel={() => setDrawerState((prev) => ({ ...prev, open: false }))}
        onSuccess={() => {
          setDrawerState((prev) => ({ ...prev, open: false }));
          onSuccessRef.current?.();
        }}
      />
    </TeamModalContext.Provider>
  );
};
