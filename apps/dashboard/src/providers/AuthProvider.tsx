import type React from "react";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { login as loginAction, logout as logoutAction } from "@/features/auth/api/authActions";
import { getAuthMe } from "@/features/auth/api/authApi";
import ApiClient from "@/libs/ApiClient.ts";
import { clearTokens, getAccessToken, isTokenExpired } from "@/utils/jwt";
import { type AuthMe, emptyPermissionsMap } from "@/utils/permissions";

type ChallengeResult = { challengeName: "NEW_PASSWORD_REQUIRED"; session: string; email: string };

interface AuthContextType {
  login: (email: string, password: string) => Promise<ChallengeResult | undefined>;
  logout: () => void;
  authMe: AuthMe | null;
  userLoading: boolean;
  refetchAuthMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  login: async () => {
    throw new Error("AuthContext used outside of AuthProvider");
  },
  logout: () => {
    throw new Error("AuthContext used outside of AuthProvider");
  },
  authMe: null,
  userLoading: true,
  refetchAuthMe: async () => {
    throw new Error("AuthContext used outside of AuthProvider");
  },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [userLoading, setUserLoading] = useState(true);
  const [authMe, setAuthMe] = useState<AuthMe | null>(null);

  const refetchAuthMe = useCallback(async () => {
    try {
      const me = await getAuthMe();
      setAuthMe(me);
    } catch {
      setAuthMe({
        user: {
          id: "",
          branchId: null,
          teamId: null,
          email: "",
          firstName: null,
          lastName: null,
          phone: null,
          isActive: false,
          branch: null,
          profilePictureFileId: null,
        },
        team: null,
        permissions: emptyPermissionsMap(),
      });
    }
  }, []);

  const fetchCurrentUser = useCallback(async () => {
    setUserLoading(true);
    try {
      const me = await getAuthMe();
      setAuthMe(me);
    } catch {
      setAuthMe(null);
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
    setAuthMe(null);
    logoutAction();
  }, []);

  return (
    <AuthContext.Provider value={{ login, logout, authMe, userLoading, refetchAuthMe }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
