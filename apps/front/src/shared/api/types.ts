export interface ApiResponse<T> {
  data: T
  requestId: string
  error?: string
}
