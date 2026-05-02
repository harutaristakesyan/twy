import type React from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { login as loginAction, logout as logoutAction } from "@/features/auth/api/authActions";
import { getCurrentUser } from "@/features/user/api/userApi";
import type { CurrentUser } from "@/features/user/types/user";
import ApiClient from "@/libs/ApiClient.ts";
import { clearTokens, getAccessToken, isTokenExpired } from "@/utils/jwt";
import { type AppPermissions, computePermissions, EMPTY_PERMISSIONS } from "@/utils/permissions";

type ChallengeResult = { challengeName: "NEW_PASSWORD_REQUIRED"; session: string; email: string };

interface AuthContextType {
  login: (email: string, password: string) => Promise<ChallengeResult | undefined>;
  logout: () => void;
  currentUser: CurrentUser | null;
  userLoading: boolean;
  refetchUser: () => Promise<void>;
  permissions: AppPermissions;
}

const AuthContext = createContext<AuthContextType>({
  login: async () => {
    throw new Error("AuthContext used outside of AuthProvider");
  },
  logout: () => {
    throw new Error("AuthContext used outside of AuthProvider");
  },
  currentUser: null,
  userLoading: true,
  refetchUser: async () => {
    throw new Error("AuthContext used outside of AuthProvider");
  },
  permissions: EMPTY_PERMISSIONS,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  const permissions = useMemo(() => computePermissions(currentUser?.role), [currentUser?.role]);

  const fetchCurrentUser = useCallback(async () => {
    setUserLoading(true);
    try {
      const userData = await getCurrentUser();
      setCurrentUser(userData);
    } catch {
      setCurrentUser(null);
    } finally {
      setUserLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const accessToken = getAccessToken();
      if (!accessToken) {
        setUserLoading(false);
        return;
      }
      if (isTokenExpired(accessToken)) {
        const newAccessToken = await ApiClient.refreshAccessToken();
        if (!newAccessToken) {
          clearTokens();
          setUserLoading(false);
          return;
        }
      }
      await fetchCurrentUser();
    })();
  }, [fetchCurrentUser]);

  const login = useCallback(
    async (email: string, password: string): Promise<ChallengeResult | undefined> => {
      const challenge = await loginAction(email, password);
      if (challenge) return challenge;
      await fetchCurrentUser();
      return undefined;
    },
    [fetchCurrentUser],
  );

  const logout = useCallback(() => {
    setCurrentUser(null);
    logoutAction();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        login,
        logout,
        currentUser,
        userLoading,
        refetchUser: fetchCurrentUser,
        permissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
