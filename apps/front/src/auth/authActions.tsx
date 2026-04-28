import ApiClient from '@/shared/api/ApiClient.ts'
import { type AuthMethod, clearAuthMethod, clearTokens, setAccessToken, setAuthMethod, setIdToken, setRefreshToken } from '@/shared/utils/jwt'
import type { ApiResponse } from '@/shared/api/types.ts'

export const login = async (email: string, password: string) => {
  const res = await ApiClient.post<
    ApiResponse<{
      accessToken: string
      idToken: string
      refreshToken: string
    }>
  >('/login', { email, password }, true)
  applyLogin(res.data, 'local')
}

export const logout = async () => {
  clearTokens()
  clearAuthMethod()
  window.location.href = '/'
}

const applyLogin = (authData: { accessToken: string; refreshToken: string; idToken: string }, method: AuthMethod) => {
  setAuthMethod(method)
  setAccessToken(authData.accessToken)
  setRefreshToken(authData.refreshToken)
  setIdToken(authData.idToken)
}
