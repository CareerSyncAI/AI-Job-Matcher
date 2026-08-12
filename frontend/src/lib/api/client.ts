import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

let accessTokenInMemory: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessTokenInMemory = token;
};

export const getAccessToken = (): string | null => {
  return accessTokenInMemory;
};

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (accessTokenInMemory && config.headers) {
      config.headers.Authorization = `Bearer ${accessTokenInMemory}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

export interface APIErrorResponse {
  error: {
    code: string;
    message: string;
    request_id?: string;
  };
}

export const formatAPIErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const serverError = error.response?.data as APIErrorResponse | undefined;
    if (serverError?.error?.message) {
      return serverError.error.message;
    }
    if (error.message) {
      return error.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected network or server error occurred.";
};
