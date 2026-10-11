import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute() {
    const { isAuthenticated, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div
                style={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "var(--bg-primary, #f6faf6)",
                }}
            >
                <div
                    style={{
                        padding: "20px 32px",
                        borderRadius: "16px",
                        background: "var(--card-bg, rgba(255, 255, 255, 0.75))",
                        border: "1px solid var(--card-border, rgba(255, 255, 255, 0.85))",
                        backdropFilter: "blur(20px)",
                        boxShadow: "0 20px 40px rgba(0,0,0,0.06)",
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "var(--accent-green, #2e7d32)",
                    }}
                >
                    Loading ExpenseFlow...
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        // Direct access to any protected route (/dashboard, /transactions, /budgets, etc.) while logged out redirects to /login
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <Outlet />;
}
