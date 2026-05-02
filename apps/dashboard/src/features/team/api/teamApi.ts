import ApiClient from "@/libs/ApiClient.ts";
import type { ApiResponse } from "@/libs/api-types.ts";
import type { GetTeamsParams, Team, TeamFormData, TeamListResponse } from "../types/team";

export const getTeams = async (params?: GetTeamsParams): Promise<TeamListResponse> => {
  const queryParams: Record<string, string | number> = {};
  if (params?.page !== undefined) queryParams.page = params.page;
  if (params?.limit !== undefined) queryParams.limit = params.limit;
  if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;
  if (params?.query) queryParams.query = params.query;
  const response = await ApiClient.get<ApiResponse<TeamListResponse>>("/teams", queryParams);
  return response.data;
};

export const getTeamById = async (id: string): Promise<Team> => {
  const response = await ApiClient.get<ApiResponse<Team>>(`/teams/${id}`);
  return response.data;
};

export const createTeam = async (data: TeamFormData): Promise<Team> => {
  const response = await ApiClient.post<ApiResponse<Team>>("/teams", data);
  return response.data;
};

export const updateTeam = async (id: string, data: Partial<TeamFormData>): Promise<Team> => {
  const response = await ApiClient.put<ApiResponse<Team>>(`/teams/${id}`, data);
  return response.data;
};

export const deleteTeam = async (id: string): Promise<void> => {
  await ApiClient.delete<ApiResponse<void>>(`/teams/${id}`);
};
