import type React from "react";
import { createContext, useContext, useEffect } from "react";
import ApiClient from "@/shared/api/ApiClient.ts";
import { clearTokens, getAccessToken, isTokenExpired } from "@/shared/utils/jwt";
import { login, logout } from "./authActions";

interface AuthContextType {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  login: async () => {
    throw new Error("AuthContext used outside of AuthProvider");
  },
  logout: () => {
    throw new Error("AuthContext used outside of AuthProvider");
  },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    (async () => {
      const accessToken = getAccessToken();
      if (accessToken && isTokenExpired(accessToken)) {
        const newAccessToken = await ApiClient.refreshAccessToken();
        if (!newAccessToken) {
          clearTokens();
        }
      }
    })();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
