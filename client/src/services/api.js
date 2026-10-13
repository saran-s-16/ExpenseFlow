import axios from "axios";

// Derive API base URL from Vite environment variable with local fallback.
// In local development, when VITE_API_URL is not set, use relative "/api"
// which is forwarded by Vite's proxy to http://localhost:5000/api,
// eliminating all CORS preflight and port-mismatch issues.
const envUrl = (import.meta.env.VITE_API_URL || "").trim();

export const API_BASE_URL = envUrl
    ? (envUrl.endsWith("/api") ? envUrl : `${envUrl.replace(/\/+$/, "")}/api`)
    : "/api";

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Attach JWT token to requests if present in localStorage
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("expenseflow_token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle 401 unauthorized / expired tokens
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            const isAuthRoute =
                error.config?.url?.includes("/auth/login") ||
                error.config?.url?.includes("/auth/register");

            if (!isAuthRoute) {
                localStorage.removeItem("expenseflow_token");
                localStorage.removeItem("expenseflow_user");
                if (window.location.pathname !== "/login") {
                    window.location.href = "/login";
                }
            }
        }
        return Promise.reject(error);
    }
);

export default api;
