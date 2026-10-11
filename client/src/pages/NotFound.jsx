import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px",
                background: "var(--bg-primary, #f4faf5)",
            }}
        >
            <div
                className="glass-card"
                style={{
                    maxWidth: "460px",
                    width: "100%",
                    padding: "45px 35px",
                    textAlign: "center",
                }}
            >
                <div style={{ fontSize: "56px", marginBottom: "12px" }}>🧭</div>
                <h1 style={{ fontSize: "28px", fontWeight: 750, marginBottom: "10px" }}>
                    404 - Page Not Found
                </h1>
                <p
                    style={{
                        color: "var(--text-secondary, #78827b)",
                        fontSize: "14px",
                        lineHeight: "1.6",
                        marginBottom: "28px",
                    }}
                >
                    The page you are looking for doesn't exist or has been moved to another location.
                </p>
                <Link
                    to="/dashboard"
                    className="btn-submit"
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        textDecoration: "none",
                    }}
                >
                    <ArrowLeft size={16} />
                    <span>Return to Dashboard</span>
                </Link>
            </div>
        </div>
    );
}
