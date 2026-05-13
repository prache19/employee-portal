import axios, { AxiosError } from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

let accessToken: string | null = null;
let onAuthError: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export function setOnAuthError(cb: (() => void) | null) {
  onAuthError = cb;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function refresh(): Promise<string | null> {
  if (refreshing) return refreshing;
  refreshing = axios
    .post(`${baseURL}/auth/refresh`, {}, { withCredentials: true })
    .then((r) => {
      const t = r.data?.accessToken as string | undefined;
      if (t) {
        accessToken = t;
        return t;
      }
      return null;
    })
    .catch(() => null)
    .finally(() => { refreshing = null; });
  return refreshing;
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as (typeof error.config & { _retried?: boolean }) | undefined;
    if (error.response?.status === 401 && original && !original._retried && !original.url?.includes('/auth/')) {
      original._retried = true;
      const t = await refresh();
      if (t) {
        original.headers = original.headers ?? {};
        (original.headers as Record<string, string>).Authorization = `Bearer ${t}`;
        return api.request(original);
      }
      onAuthError?.();
    }
    return Promise.reject(error);
  },
);
