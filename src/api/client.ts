import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/auth";

export const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1").replace(/\/$/, "");

export class ApiError extends Error {
  status?: number;
  code?: string;
  details?: Array<{ field?: string; message: string }>;
  constructor(message: string, options: { status?: number; code?: string; details?: Array<{ field?: string; message: string }> } = {}) {
    super(message); this.name = "ApiError"; Object.assign(this, options);
  }
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 30000,
  headers: { Accept: "application/json" },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers["X-Request-Id"] = crypto.randomUUID?.() || `${Date.now()}`;
  return config;
});

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = axios.post(`${API_BASE_URL}/auth/refresh`, undefined, { withCredentials: true, timeout: 15000 })
      .then((response) => {
        const token = response.data?.data?.accessToken as string | undefined;
        if (!token) throw new Error("Refresh response did not contain an access token");
        useAuthStore.getState().setAccessToken(token);
        return token;
      })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

apiClient.interceptors.response.use((response) => response, async (error: AxiosError) => {
  const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
  const status = error.response?.status;
  const path = original?.url || "";
  const canRefresh = status === 401 && original && !original._retry && !path.includes("/auth/login") && !path.includes("/auth/register") && !path.includes("/auth/refresh");

  if (canRefresh) {
    original._retry = true;
    try {
      const token = await refreshAccessToken();
      original.headers.Authorization = `Bearer ${token}`;
      return apiClient(original);
    } catch {
      useAuthStore.getState().clearSession();
      window.dispatchEvent(new Event("auth:expired"));
    }
  }

  const payload = error.response?.data as { message?: string; error?: { code?: string; details?: Array<{ field?: string; message: string }> } } | undefined;
  return Promise.reject(new ApiError(payload?.message || error.message || "Network request failed", {
    status,
    code: payload?.error?.code,
    details: payload?.error?.details,
  }));
});
