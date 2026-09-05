import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// A production build with no VITE_API_URL silently bakes in localhost —
// every real visitor's browser then tries to call their own machine and
// every request fails with no clue why. Dev is fine falling back (that's
// the correct local setup); only warn when it's an actual prod build.
if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
  console.error(
    'VITE_API_URL is not set in this production build — API calls will try (and fail) ' +
      'against http://localhost:5000/api. Set VITE_API_URL at build time.'
  );
  if (typeof document !== 'undefined' && document.body) {
    const banner = document.createElement('div');
    banner.textContent =
      "This site isn't configured correctly (missing API URL) — please let the site owner know.";
    banner.style.cssText =
      'position:fixed;top:0;left:0;right:0;z-index:2147483647;' +
      'background:#b3261e;color:#fff;font:13px/1.4 system-ui,sans-serif;' +
      'padding:8px 16px;text-align:center;';
    document.body.prepend(banner);
  }
}

const api = axios.create({
  baseURL: apiUrl,
  withCredentials: true,
  timeout: 10000,
});

/**
 * When the server returns 401 on a normal request, try to silently refresh
 * the access token exactly once, then retry the original request.
 * If refresh fails, propagate the 401 so the UI can redirect to /login.
 */
let refreshing: Promise<void> | null = null;

async function refreshOnce(): Promise<void> {
  if (refreshing) return refreshing;
  refreshing = axios
    .post(`${api.defaults.baseURL}/auth/refresh`, {}, { withCredentials: true })
    .then(() => undefined)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retried?: boolean;
    };

    const isAuthEndpoint = original?.url?.includes('/auth/');
    if (error.response?.status === 401 && !original?._retried && !isAuthEndpoint) {
      original._retried = true;
      try {
        await refreshOnce();
        return api(original);
      } catch {
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
