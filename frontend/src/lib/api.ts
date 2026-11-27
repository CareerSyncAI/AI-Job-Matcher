import axios from "axios";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

// Attach token to requests if available
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;

// Auto-refresh token on 401 with single-flight deduplication for concurrent requests
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const url = original?.url || "";

    // Never loop or retry auth endpoints (/auth/login, /auth/refresh, /auth/register)
    if (url.includes("/auth/")) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (!refreshPromise) {
        refreshPromise = axios
          .post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true })
          .then((res) => {
            const newToken = res.data.access_token;
            setAccessToken(newToken);
            return newToken;
          })
          .catch((refreshErr) => {
            setAccessToken(null);
            if (
              typeof window !== "undefined" &&
              window.location.pathname.startsWith("/dashboard")
            ) {
              // eslint-disable-next-line @next/next/no-location-assign-relative-destination
              window.location.href = "/login";
            }
            throw refreshErr;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      try {
        const token = await refreshPromise;
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  }
);

export interface APIErrorDetails {
  code?: string;
  message: string;
  requestId?: string | null;
  statusCode?: number;
}

/**
 * Extracts a user-friendly error message from any backend API error response.
 * Handles the backend format: { "error": { "code", "message", "details", "request_id" } }
 * as well as legacy FastAPI { "detail": ... }, validation error arrays, and standard Error instances.
 */
export function getApiErrorMessage(error: unknown, fallbackMessage = "An unexpected error occurred."): string {
  if (!error) return fallbackMessage;

  const axiosError = error as {
    response?: {
      status?: number;
      data?: {
        error?:
          | string
          | {
              code?: string;
              message?: string;
              details?: Array<{ loc?: string[]; msg?: string }>;
              request_id?: string | null;
            };
        detail?: string | Array<{ loc?: string[]; msg?: string }>;
        message?: string;
      };
    };
    message?: string;
  };

  const responseData = axiosError?.response?.data;

  // 1. Backend ErrorResponse schema: { error: { message, code, ... } } or { error: "..." }
  if (typeof responseData?.error === "string" && responseData.error.trim()) {
    return responseData.error;
  }
  if (responseData?.error && typeof responseData.error === "object") {
    if (typeof responseData.error.message === "string" && responseData.error.message.trim()) {
      return responseData.error.message;
    }
    if (Array.isArray(responseData.error.details) && responseData.error.details.length > 0) {
      const firstDetail = responseData.error.details[0];
      if (firstDetail?.msg) return firstDetail.msg;
    }
  }

  // 2. Standard FastAPI HTTPException: { detail: "..." }
  if (typeof responseData?.detail === "string" && responseData.detail.trim()) {
    return responseData.detail;
  }
  if (Array.isArray(responseData?.detail) && responseData.detail.length > 0) {
    const first = responseData.detail[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object" && "msg" in first && typeof first.msg === "string") {
      return first.msg;
    }
  }

  // 3. Simple message property: { message: "..." }
  if (typeof responseData?.message === "string" && responseData.message.trim()) {
    return responseData.message;
  }

  // 4. Client error message
  if (axiosError instanceof Error && axiosError.message && !axiosError.message.includes("status code")) {
    return axiosError.message;
  }

  return fallbackMessage;
}

export default api;
