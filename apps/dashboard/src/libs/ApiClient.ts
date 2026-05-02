import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosRequestHeaders,
  type AxiosResponse,
} from "axios";
import {
  clearAuthMethod,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  isTokenExpired,
  setAccessToken,
  setIdToken,
} from "@/utils/jwt.ts";

class ApiError extends Error {
  status?: number;
  data?: unknown;

  constructor(message: string) {
    super(message);
    this.name = "ApiError";
  }
}

interface AxiosLikeError {
  response?: { data?: unknown; status?: number };
  message?: string;
}

const instance: AxiosInstance = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await axios.post("/api/refresh-token", { refreshToken });
    const { accessToken, idToken } = res.data;
    setAccessToken(accessToken);
    setIdToken(idToken);
    return accessToken;
  } catch {
    return null;
  }
}

// Add request interceptor for auth
instance.interceptors.request.use(async (config) => {
  const headers = config.headers as AxiosRequestHeaders;

  if (headers?.skipAuth) {
    delete headers.skipAuth;
    return config;
  }

  let token = getAccessToken();
  if (token && isTokenExpired(token)) {
    token = await refreshAccessToken();
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Add response interceptor to handle 401 errors
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearTokens();
      clearAuthMethod();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

async function request<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: object,
  params?: Record<string, string | number | boolean>,
  skipAuth = false,
): Promise<T> {
  const config: AxiosRequestConfig = {
    method,
    url: path,
    data: body,
    params,
  };

  if (skipAuth) {
    config.headers = config.headers ?? {};
    config.headers.skipAuth = true;
  }

  try {
    const res: AxiosResponse<T> = await instance.request<T>(config);
    return res.data;
  } catch (error) {
    const err = error as AxiosLikeError;
    let errorMessage = "Request failed";

    // Try to get message from response.data (most common)
    const data = err.response?.data;
    if (data && typeof data === "object") {
      const obj = data as { message?: unknown; error?: unknown };
      if (typeof obj.message === "string") {
        errorMessage = obj.message;
      } else if (typeof obj.error === "string") {
        errorMessage = obj.error;
      }
    } else if (typeof data === "string") {
      errorMessage = data;
    }

    // Fallback to error.message if we didn't get a good message
    if (errorMessage === "Request failed" && typeof err.message === "string") {
      // Only use error.message if it doesn't look like a JavaScript error
      if (
        !err.message.includes(" is not a function") &&
        !err.message.includes("Cannot read") &&
        !err.message.includes("Request failed")
      ) {
        errorMessage = err.message;
      }
    }

    // Create error with API message, but preserve original error for debugging
    const apiError = new ApiError(errorMessage);
    if (err.response) {
      apiError.status = err.response.status;
      apiError.data = err.response.data;
    }

    throw apiError;
  }
}

const ApiClient = {
  refreshAccessToken,
  get<T>(path: string, params?: Record<string, string | number | boolean>, skipAuth = false) {
    return request<T>("GET", path, undefined, params, skipAuth);
  },
  post<T>(path: string, body: object, skipAuth = false) {
    return request<T>("POST", path, body, undefined, skipAuth);
  },
  put<T>(path: string, body: object, skipAuth = false) {
    return request<T>("PUT", path, body, undefined, skipAuth);
  },
  patch<T>(path: string, body: object, skipAuth = false) {
    return request<T>("PATCH", path, body, undefined, skipAuth);
  },
  delete<T>(path: string, skipAuth = false) {
    return request<T>("DELETE", path, undefined, undefined, skipAuth);
  },
};

export default ApiClient;
