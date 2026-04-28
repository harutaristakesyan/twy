import Cookies from 'js-cookie'
import { jwtDecode } from 'jwt-decode'

export interface JwtPayload {
  exp: number
  given_name?: string
  family_name?: string
  email?: string
}

// --- Token Storage Keys ---
const ACCESS_TOKEN_KEY = 'accessToken'
const REFRESH_TOKEN_KEY = 'refreshToken'
const ID_TOKEN_KEY = 'idToken'
const AUTH_METHOD_KEY = 'authMethod'

export type AuthMethod = 'local'

const expiryFromJwt = (token: string): Date | undefined => {
  try {
    const { exp } = jwtDecode<JwtPayload>(token)
    if (!exp) return undefined
    return new Date(exp * 1000)
  } catch {
    return undefined
  }
}

const cookieGet = (key: string): string | null => {
  return Cookies.get(key) ?? null
}

const cookieSet = (key: string, value: string, opts?: Cookies.CookieAttributes): void => {
  Cookies.set(key, value, { ...opts })
}

const cookieRemove = (key: string): void => {
  Cookies.remove(key)
}

export const getAccessToken = (): string | null => cookieGet(ACCESS_TOKEN_KEY)

export const setAccessToken = (token: string): void => cookieSet(ACCESS_TOKEN_KEY, token, { expires: expiryFromJwt(token) })

export const getRefreshToken = (): string | null => cookieGet(REFRESH_TOKEN_KEY)

export const setRefreshToken = (token: string): void => cookieSet(REFRESH_TOKEN_KEY, token, { expires: expiryFromJwt(token) })

export const getIdToken = (): string | null => cookieGet(ID_TOKEN_KEY)

export const setIdToken = (token: string): void => cookieSet(ID_TOKEN_KEY, token, { expires: expiryFromJwt(token) })

export const clearTokens = (): void => {
  cookieRemove(ACCESS_TOKEN_KEY)
  cookieRemove(REFRESH_TOKEN_KEY)
  cookieRemove(ID_TOKEN_KEY)
}

export const setAuthMethod = (method: AuthMethod): void => cookieSet(AUTH_METHOD_KEY, method)

export const clearAuthMethod = (): void => cookieRemove(AUTH_METHOD_KEY)

export const isTokenExpired = (token: string): boolean => {
  try {
    const { exp } = jwtDecode<JwtPayload>(token)
    return exp < Date.now() / 1000
  } catch {
    return true
  }
}

export const decodeIdTokenToken = (): JwtPayload | null => {
  const token = getIdToken()
  if (!token) return null
  return decodeToken(token)
}

export const decodeToken = (token: string): JwtPayload | null => {
  try {
    return jwtDecode<JwtPayload>(token)
  } catch {
    return null
  }
}
