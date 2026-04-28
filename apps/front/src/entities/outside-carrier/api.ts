import ApiClient from '@/shared/api/ApiClient.ts'
import type { ApiResponse } from '@/shared/api/types.ts'
import type { MessageDto } from '@/shared/constants/request.ts'
import type {
  OutsideCarrier,
  OutsideCarrierFormData,
  UpdateOutsideCarrierRequest,
  GetOutsideCarriersParams,
  PaginatedOutsideCarriersResponse,
} from '@/entities/outside-carrier/types.ts'

// Get outside carriers with pagination, sorting, and search
export const getOutsideCarriers = async (params?: GetOutsideCarriersParams) => {
  const queryParams: Record<string, string | number> = {}

  if (params?.page !== undefined) queryParams.page = params.page
  if (params?.limit !== undefined) queryParams.limit = params.limit
  if (params?.sortField) queryParams.sortField = params.sortField
  if (params?.sortOrder) queryParams.sortOrder = params.sortOrder
  if (params?.query) queryParams.query = params.query

  try {
    const response = await ApiClient.get<ApiResponse<PaginatedOutsideCarriersResponse>>('/outside-carriers', queryParams)

    // Handle response structure - ApiResponse<T> has { data: T, requestId, error? }
    // So response.data should be PaginatedOutsideCarriersResponse
    if (!response) {
      console.error('❌ Empty response from getOutsideCarriers')
      return { carriers: [], total: 0 }
    }

    // Check if response is HTML (means mock API didn't intercept)
    if (typeof response === 'string' && response.trim().startsWith('<!')) {
      console.error('❌ Received HTML instead of JSON - Mock API is not intercepting the request!')
      console.error('💡 Make sure MOCK_CONFIG.ENABLE_MOCK_API is true and the dev server is restarted')
      return { carriers: [], total: 0 }
    }

    if (!response.data) {
      console.error('❌ Invalid response structure from getOutsideCarriers - missing data:', response)
      return { carriers: [], total: 0 }
    }

    // response.data should be PaginatedOutsideCarriersResponse: { carriers: [], total: number }
    return response.data
  } catch (error: any) {
    console.error('❌ Error in getOutsideCarriers:', error)

    // Check if error response is HTML
    if (error?.data && typeof error.data === 'string' && error.data.trim().startsWith('<!')) {
      console.error('❌ Received HTML error response - Mock API is not intercepting!')
      console.error('💡 Check browser console for mock API status. Restart dev server if needed.')
    }

    return { carriers: [], total: 0 }
  }
}

// Get outside carrier by ID
export const getOutsideCarrierById = async (id: string) => {
  const response = await ApiClient.get<ApiResponse<OutsideCarrier>>(`/outside-carriers/${id}`)
  return response.data
}

// Create new outside carrier
export const createOutsideCarrier = async (data: OutsideCarrierFormData) => {
  const response = await ApiClient.post<ApiResponse<OutsideCarrier>>('/outside-carriers', data)
  return response.data
}

// Update outside carrier
export const updateOutsideCarrier = async (data: UpdateOutsideCarrierRequest) => {
  const response = await ApiClient.put<ApiResponse<OutsideCarrier>>(`/outside-carriers/${data.id}`, data)
  return response.data
}

// Delete outside carrier
export const deleteOutsideCarrier = async (id: string) => {
  const response = await ApiClient.delete<ApiResponse<MessageDto>>(`/outside-carriers/${id}`)
  return response.data
}
