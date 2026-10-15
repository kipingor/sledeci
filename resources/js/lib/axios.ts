// resources/js/lib/axios.ts
import initAuth from '@/lib/initAuth';
import { showAuthErrorUI } from '@/lib/auth-ui';
import axios from 'axios';

/**
 * Axios instance for app API calls.
 * - Base URL should match your Laravel API prefix (see routes/api.php)
 * - withCredentials true for Sanctum SPA authentication
 * - XSRF cookie names default to Laravel's XSRF-TOKEN
 */

const api = axios.create({
  baseURL: '/api/v1', // <--- confirm this matches routes/api.php prefix
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  headers: {
    Accept: 'application/json',
  },
});

// api.interceptors.request.use((config) => {
//   const token = localStorage.getItem('api_token');
//   if (token && config.headers) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }
//   return config;
// });


api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    // CSRF / session expired: 419 -> reload to re-acquire CSRF cookie
    if (status === 419) {
      // Instead of forcing a full reload (which can create reload loops),
      // attempt to re-acquire the CSRF cookie and retry the original request once.
      const config = error.config || {};
      // Avoid retrying infinitely
      if (!config.__isRetry) {
        config.__isRetry = true;
        return initAuth({ warmUser: false })
          .then(() => axios.request(config))
          .catch(() => Promise.reject(error));
      }

      // If already retried, fall back to a reload to ensure a clean state
      try {
        window.location.reload();
      } catch (e) {
        // ignore
      }
      return Promise.reject(error);
    }
    // Not authenticated: redirect to login
    if (status === 401) {
      const config = error.config || {};
      if (!config.__isAuthRetry) {
        config.__isAuthRetry = true;
        // Try to re-establish CSRF/session and retry once.
        return initAuth({ warmUser: true })
          .then(() => axios.request(config))
          .catch(() => {
            // Show a user-facing UI offering a Retry or Login option.
            return showAuthErrorUI()
              .then(() => Promise.reject(error))
              .catch(() => Promise.reject(error));
          });
      }

      // Already retried — show auth UI and then redirect to login if user chooses so.
      try {
        return showAuthErrorUI().then(() => Promise.reject(error));
      } catch (e) {
        try {
          window.location.href = '/login';
        } catch (ee) {
          // ignore
        }
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default api;

