import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api";

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
