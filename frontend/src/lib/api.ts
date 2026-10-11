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

export default api;
