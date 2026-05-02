import ApiClient from "@/libs/ApiClient.ts";
import type { ApiResponse } from "@/libs/api-types.ts";
import type { AuthMe } from "@/utils/permissions";

export const getAuthMe = async (): Promise<AuthMe> => {
  const response = await ApiClient.get<ApiResponse<AuthMe>>("/auth/me");
  return response.data;
};
