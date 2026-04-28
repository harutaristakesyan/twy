import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosRequestHeaders, type AxiosResponse } from 'axios'
import { getAccessToken, getRefreshToken, isTokenExpired, setAccessToken, setIdToken, clearTokens, clearAuthMethod } from '@/shared/utils/jwt.ts'
import MockInterceptor from './mockInterceptor'
import { MOCK_CONFIG } from './mockConfig'

class ApiClient {
  private static instance: AxiosInstance = axios.create({
    baseURL: '/api',
    withCredentials: true,
  })

  static init() {
    // Initialize mock interceptor FIRST (before any other interceptors)
    // This ensures mock requests are intercepted before auth or other processing
    MockInterceptor.init(ApiClient.instance)

    // Log mock status for debugging
    if (MOCK_CONFIG.ENABLE_MOCK_API) {
      console.log('✅ Mock API initialized and ready to intercept requests')
    }

    // Add request interceptor for auth
    ApiClient.instance.interceptors.request.use(async (config) => {
      const headers = config.headers as AxiosRequestHeaders

      if (headers?.['skipAuth']) {
        delete headers['skipAuth']
        return config
      }

      let token = getAccessToken()
      if (token && isTokenExpired(token)) {
        token = await ApiClient.refreshAccessToken()
      }

      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      return config
    })

    // Add response interceptor to handle 401 errors
    ApiClient.instance.interceptors.response.use(
      (response) => {
        // Return successful responses as-is
        return response
      },
      (error) => {
        // Check if the error is a 401 Unauthorized
        if (error.response?.status === 401) {
          console.log('🔒 401 Unauthorized - Redirecting to login page')
          // Clear all authentication tokens and auth method
          clearTokens()
          clearAuthMethod()
          // Redirect to login page
          window.location.href = '/login'
        }
        // Reject the promise to allow error handling in components
        return Promise.reject(error)
      }
    )
  }

  static async refreshAccessToken(): Promise<string | null> {
    const refreshToken = getRefreshToken()
    if (!refreshToken) return null

    try {
      const res = await axios.post('/api/refresh-token', { refreshToken })
      const { accessToken, idToken } = res.data
      setAccessToken(accessToken)
      setIdToken(idToken)
      return accessToken
    } catch {
      return null
    }
  }

  private static async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: object,
    params?: Record<string, string | number | boolean>,
    skipAuth: boolean = false
  ): Promise<T> {
    const config: AxiosRequestConfig = {
      method,
      url: path,
      data: body,
      params,
    }

    if (skipAuth) {
      ;(config.headers ||= {})['skipAuth'] = true
    }

    try {
      const res: AxiosResponse<T> = await ApiClient.instance.request<T>(config)

      // Check if response is HTML (mock API didn't intercept)
      if (typeof res.data === 'string' && res.data.trim().startsWith('<!')) {
        console.error('❌ Received HTML response - Mock API may not be enabled!')
        console.error('💡 Response:', res.data.substring(0, 200))
        throw new Error('Mock API is not intercepting requests. Check MOCK_CONFIG.ENABLE_MOCK_API')
      }

      return res.data
    } catch (error: any) {
      // Extract error message from various possible locations
      let errorMessage = 'Request failed'

      try {
        // Try to get message from response.data (most common)
        if (error?.response?.data) {
          const data = error.response.data
          // Handle both object and string responses
          if (typeof data === 'object') {
            errorMessage = data.message || data.error || errorMessage
          } else if (typeof data === 'string') {
            errorMessage = data
          }
        }

        // Fallback to error.message if we didn't get a good message
        if (errorMessage === 'Request failed' && error?.message) {
          // Only use error.message if it doesn't look like a JavaScript error
          if (!error.message.includes(' is not a function') && !error.message.includes('Cannot read') && !error.message.includes('Request failed')) {
            errorMessage = error.message
          }
        }
      } catch (extractError) {
        // If extraction fails, use fallback
        console.error('Error extracting message in ApiClient:', extractError)
      }

      // Create error with API message, but preserve original error for debugging
      const apiError = new Error(errorMessage)

      // Attach original error details for advanced error handling
      try {
        if (error?.response) {
          ;(apiError as any).status = error.response.status(apiError as any).data = error.response.data
        }
      } catch (attachError) {
        // Silently fail if we can't attach debug info
        console.error('Error attaching debug info:', attachError)
      }

      throw apiError
    }
  }

  // --- Public HTTP methods ---

  static get<T>(path: string, params?: Record<string, string | number | boolean>, skipAuth = false) {
    return this.request<T>('GET', path, undefined, params, skipAuth)
  }

  static post<T>(path: string, body: object, skipAuth = false) {
    return this.request<T>('POST', path, body, undefined, skipAuth)
  }

  static put<T>(path: string, body: object, skipAuth = false) {
    return this.request<T>('PUT', path, body, undefined, skipAuth)
  }

  static patch<T>(path: string, body: object, skipAuth = false) {
    return this.request<T>('PATCH', path, body, undefined, skipAuth)
  }

  static delete<T>(path: string, skipAuth = false) {
    return this.request<T>('DELETE', path, undefined, undefined, skipAuth)
  }
}

// Initialize interceptors once
ApiClient.init()

export default ApiClient
