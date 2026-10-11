import React, { createContext, useContext, useState, useEffect } from "react";
import { getCurrentUser, loginUser, registerUser, logoutUser } from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try {
            const savedUser = localStorage.getItem("expenseflow_user");
            return savedUser ? JSON.parse(savedUser) : null;
        } catch {
            return null;
        }
    });

    const [token, setToken] = useState(() => {
        return localStorage.getItem("expenseflow_token") || null;
    });

    const [loading, setLoading] = useState(true);

    // Dark / Light mode state
    const [theme, setTheme] = useState(() => {
        const savedTheme = localStorage.getItem("expenseflow_theme");
        if (savedTheme) return savedTheme;
        return window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
    });

    // Apply theme class to document element
    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        if (theme === "dark") {
            document.body.classList.add("dark-theme");
        } else {
            document.body.classList.remove("dark-theme");
        }
        localStorage.setItem("expenseflow_theme", theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === "dark" ? "light" : "dark"));
    };

    // Verify token validity on initial mount
    useEffect(() => {
        let isMounted = true;

        async function verifyAuth() {
            const storedToken = localStorage.getItem("expenseflow_token");
            if (!storedToken) {
                if (isMounted) setLoading(false);
                return;
            }

            try {
                const res = await getCurrentUser();
                if (isMounted && res.success && res.user) {
                    setUser(res.user);
                    localStorage.setItem("expenseflow_user", JSON.stringify(res.user));
                }
            } catch (err) {
                console.error("Auth validation failed:", err);
                if (isMounted) {
                    setToken(null);
                    setUser(null);
                    localStorage.removeItem("expenseflow_token");
                    localStorage.removeItem("expenseflow_user");
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        verifyAuth();

        return () => {
            isMounted = false;
        };
    }, []);

    const login = async (email, password) => {
        const res = await loginUser(email, password);
        if (res.success && res.token) {
            setToken(res.token);
            setUser(res.user);
            localStorage.setItem("expenseflow_token", res.token);
            localStorage.setItem("expenseflow_user", JSON.stringify(res.user));
            return res;
        }
        throw new Error(res.message || "Login failed");
    };

    const register = async (userData) => {
        const res = await registerUser(userData);
        if (res.success) {
            return res;
        }
        throw new Error(res.message || "Registration failed");
    };

    const logout = async () => {
        try {
            await logoutUser();
        } catch {
            // Safe fallback: local session is always wiped
        } finally {
            setToken(null);
            setUser(null);
            localStorage.removeItem("expenseflow_token");
            localStorage.removeItem("expenseflow_user");
        }
    };

    const updateUser = (updatedUser) => {
        setUser((prev) => {
            const next = { ...prev, ...updatedUser };
            localStorage.setItem("expenseflow_user", JSON.stringify(next));
            return next;
        });
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isAuthenticated: Boolean(!loading && token && user),
                loading,
                login,
                register,
                logout,
                updateUser,
                theme,
                toggleTheme,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
