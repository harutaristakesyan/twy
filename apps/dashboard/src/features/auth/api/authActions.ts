import ApiClient from "@/libs/ApiClient.ts";
import type { ApiResponse } from "@/libs/api-types.ts";
import {
  type AuthMethod,
  clearAuthMethod,
  clearTokens,
  setAccessToken,
  setAuthMethod,
  setIdToken,
  setRefreshToken,
} from "@/utils/jwt";

type LoginApiResponse =
  | { accessToken: string; idToken: string; refreshToken: string }
  | { challengeName: "NEW_PASSWORD_REQUIRED"; session: string; email: string };

export const login = async (
  email: string,
  password: string,
): Promise<
  { challengeName: "NEW_PASSWORD_REQUIRED"; session: string; email: string } | undefined
> => {
  const res = await ApiClient.post<ApiResponse<LoginApiResponse>>(
    "/login",
    { email, password },
    true,
  );
  if ("challengeName" in res.data) return res.data;
  applyLogin(res.data, "local");
  return undefined;
};

export const logout = async () => {
  clearTokens();
  clearAuthMethod();
  window.location.href = "/";
};

export const applyLogin = (
  authData: { accessToken: string; refreshToken: string; idToken: string },
  method: AuthMethod,
) => {
  setAuthMethod(method);
  setAccessToken(authData.accessToken);
  setRefreshToken(authData.refreshToken);
  setIdToken(authData.idToken);
};
