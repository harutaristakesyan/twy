import type {
  GetOutsideBrokersParams,
  OutsideBroker,
  OutsideBrokerFormData,
  PaginatedOutsideBrokersResponse,
  UpdateOutsideBrokerRequest,
} from "@/entities/outside-broker/types.ts";
import ApiClient from "@/shared/api/ApiClient.ts";
import type { ApiResponse } from "@/shared/api/types.ts";
import type { MessageDto } from "@/shared/constants/request.ts";

// Get outside brokers with pagination, sorting, and search
export const getOutsideBrokers = async (params?: GetOutsideBrokersParams) => {
  const queryParams: Record<string, string | number> = {};

  if (params?.page !== undefined) queryParams.page = params.page;
  if (params?.limit !== undefined) queryParams.limit = params.limit;
  if (params?.sortField) queryParams.sortField = params.sortField;
  if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;
  if (params?.query) queryParams.query = params.query;

  try {
    const response = await ApiClient.get<ApiResponse<PaginatedOutsideBrokersResponse>>(
      "/outside-brokers",
      queryParams,
    );

    // Handle response structure - ApiResponse<T> has { data: T, requestId, error? }
    // So response.data should be PaginatedOutsideBrokersResponse
    if (!response) {
      console.error("❌ Empty response from getOutsideBrokers");
      return { brokers: [], total: 0 };
    }

    // Check if response is HTML (means mock API didn't intercept)
    if (typeof response === "string" && response.trim().startsWith("<!")) {
      console.error("❌ Received HTML instead of JSON - Mock API is not intercepting the request!");
      console.error(
        "💡 Make sure MOCK_CONFIG.ENABLE_MOCK_API is true and the dev server is restarted",
      );
      return { brokers: [], total: 0 };
    }

    if (!response.data) {
      console.error(
        "❌ Invalid response structure from getOutsideBrokers - missing data:",
        response,
      );
      return { brokers: [], total: 0 };
    }

    // response.data should be PaginatedOutsideBrokersResponse: { brokers: [], total: number }
    return response.data;
  } catch (error) {
    console.error("❌ Error in getOutsideBrokers:", error);

    // Check if error response is HTML
    const errorData = (error as { data?: unknown } | null)?.data;
    if (typeof errorData === "string" && errorData.trim().startsWith("<!")) {
      console.error("❌ Received HTML error response - Mock API is not intercepting!");
      console.error("💡 Check browser console for mock API status. Restart dev server if needed.");
    }

    return { brokers: [], total: 0 };
  }
};

// Get outside broker by ID
export const getOutsideBrokerById = async (id: string) => {
  const response = await ApiClient.get<ApiResponse<OutsideBroker>>(`/outside-brokers/${id}`);
  return response.data;
};

// Create new outside broker
export const createOutsideBroker = async (data: OutsideBrokerFormData) => {
  const response = await ApiClient.post<ApiResponse<OutsideBroker>>("/outside-brokers", data);
  return response.data;
};

// Update outside broker
export const updateOutsideBroker = async (data: UpdateOutsideBrokerRequest) => {
  const response = await ApiClient.put<ApiResponse<OutsideBroker>>(
    `/outside-brokers/${data.id}`,
    data,
  );
  return response.data;
};

// Delete outside broker
export const deleteOutsideBroker = async (id: string) => {
  const response = await ApiClient.delete<ApiResponse<MessageDto>>(`/outside-brokers/${id}`);
  return response.data;
};
