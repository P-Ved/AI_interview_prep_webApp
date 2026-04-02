import axios from "axios";
import { BASE_URL, HAS_CONFIGURED_API_BASE_URL } from "./apiPaths";

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 80000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Request Interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const requestUrl = String(config?.url || "");
    const isApiRequest = requestUrl.startsWith("/api/");
    if (!HAS_CONFIGURED_API_BASE_URL && isApiRequest) {
      const configError = new Error(
        "Frontend is missing VITE_API_BASE_URL. Set it in deployment env, then redeploy."
      );
      configError.code = "API_BASE_URL_MISSING";
      return Promise.reject(configError);
    }

    const accessToken = localStorage.getItem("token");
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const original = error.config;

    // Allow auth endpoints to surface errors to the page (no forced redirect)
    const isAuthRoute =
      original?.url?.includes("/api/auth/login") ||
      original?.url?.includes("/api/auth/register");

    if (error.response) {
        if (error.response.status === 401 && !isAuthRoute) {
        // Not the login/register call: kick back to login
        window.location.href = "/";
      } else if (error.response.status === 500) {
        console.error("Server error. Please try again later.");
        } else if (error.response.status === 429) {
          // Rate limited by upstream AI; surface retry delay if provided
          const retryAfter = error.response.headers['retry-after'] || error.response.data?.retryAfter;
          const msg = error.response.data?.message || 'Too many requests. Please try again later.';
          console.warn(`Received 429 from server. retryAfter=${retryAfter}`);
          // Attach retry info to the error for callers
          error.retryAfter = retryAfter ? Number(retryAfter) : null;
          if (msg) console.error(msg);
      }
    } else if (error.code === "API_BASE_URL_MISSING") {
      console.error(error.message);
    } else if (error.code === "ECONNABORTED") {
      console.error("Request timeout. Please try again.");
    } else {
      // Network/CORS or the request never left the browser
      console.error("Network error or CORS issue.");
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
