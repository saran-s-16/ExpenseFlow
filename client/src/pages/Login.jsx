import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
    ArrowLeft,
    Eye,
    EyeOff,
    Sun,
    Moon,
    ShieldCheck,
    Database,
    BarChart3,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "../styles/auth.css";

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, isAuthenticated, user, theme, toggleTheme } = useAuth();

    const from = location.state?.from?.pathname || "/dashboard";
    const initialEmail = location.state?.registeredEmail || "";
    const infoMessage = location.state?.successMessage || "";

    const [email, setEmail] = useState(initialEmail);
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const validate = () => {
        const errors = {};
        if (!email.trim()) {
            errors.email = "Email address is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            errors.email = "Please enter a valid email address";
        }

        if (!password) {
            errors.password = "Password is required";
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!validate()) {
            return;
        }

        try {
            setSubmitting(true);
            await login(email.trim(), password);
            navigate(from, { replace: true });
        } catch (err) {
            if (!err.response) {
                if (err.message === "Network Error" || err.code === "ERR_NETWORK") {
                    setError(
                        "Unable to connect to ExpenseFlow backend server. Please verify that the backend is running on http://localhost:5001."
                    );
                } else {
                    setError(err.message || "Connection failed. Please check your network.");
                }
            } else if (err.response.status === 401) {
                setError(err.response.data?.message || "Invalid email or password. Please verify your credentials.");
            } else if (err.response.status === 404) {
                setError("Authentication endpoint not found. Please verify backend route configuration.");
            } else if (err.response.status >= 500) {
                setError(err.response.data?.message || "Server error occurred. Please try again later.");
            } else {
                setError(err.response.data?.message || "Login failed. Please verify your credentials.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="auth-page">
            {/* Top Navigation: Back to Home & Theme Toggle */}
            <div className="auth-top-nav">
                <Link to="/" className="auth-back-link" aria-label="Back to home page">
                    <ArrowLeft size={15} />
                    <span>Back to Home</span>
                </Link>

                <button
                    className="auth-theme-btn"
                    onClick={toggleTheme}
                    title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    aria-label="Toggle theme"
                >
                    {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
                </button>
            </div>

            {/* Split Two-Column Auth Card */}
            <div className="auth-split-card">
                {/* Left Column: Brand Showpiece */}
                <div className="auth-brand-side">
                    <div>
                        <Link to="/" className="auth-brand-header">
                            <div className="brand-glyph-box">₹</div>
                            <span className="brand-title-text">ExpenseFlow</span>
                        </Link>

                        <div className="auth-brand-content">
                            <h2 className="auth-hero-title">
                                Your Money. <br />
                                <span className="auth-highlight-green">Your Clarity.</span> <br />
                                Your Flow.
                            </h2>

                            <p className="auth-hero-desc">
                                Access your real-time financial overview, monitor budgets, and understand your everyday spending.
                            </p>

                            <div className="auth-pill-list">
                                <div className="auth-pill-item">
                                    <div className="auth-pill-icon">
                                        <ShieldCheck size={15} />
                                    </div>
                                    <span>Strict PostgreSQL data isolation</span>
                                </div>

                                <div className="auth-pill-item">
                                    <div className="auth-pill-icon">
                                        <Database size={15} />
                                    </div>
                                    <span>Direct relational transaction storage</span>
                                </div>

                                <div className="auth-pill-item">
                                    <div className="auth-pill-icon">
                                        <BarChart3 size={15} />
                                    </div>
                                    <span>Interactive spending analytics</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="auth-mini-stat">
                        <div>
                            <span className="mini-stat-label">Net Balance Tracked</span>
                            <div className="mini-stat-value">₹1,42,850.00</div>
                        </div>
                        <span style={{ fontSize: "11px", fontWeight: "600", color: "var(--accent-green)" }}>
                            Live View
                        </span>
                    </div>
                </div>

                {/* Right Column: Login Form */}
                <div className="auth-form-side">
                    <div className="auth-heading-wrap">
                        <h1 className="auth-title">Welcome Back</h1>
                        <p className="auth-subtitle">Sign in to continue managing your finances.</p>
                    </div>

                    {/* Authenticated user notification */}
                    {isAuthenticated && user && (
                        <div className="auth-alert-box alert-info-pill">
                            <span>Currently signed in as <strong>{user.name}</strong></span>
                            <Link
                                to="/dashboard"
                                style={{
                                    color: "var(--accent-green, #2e7d32)",
                                    fontWeight: 650,
                                    textDecoration: "underline",
                                }}
                            >
                                Continue to Dashboard →
                            </Link>
                        </div>
                    )}

                    {/* Registration success message */}
                    {infoMessage && (
                        <div className="auth-alert-box alert-success" role="status">
                            <CheckCircle2 size={17} style={{ flexShrink: 0, marginTop: "2px" }} />
                            <span>{infoMessage}</span>
                        </div>
                    )}

                    {/* Error message */}
                    {error && (
                        <div className="auth-alert-box alert-error" role="alert">
                            <AlertCircle size={17} style={{ flexShrink: 0, marginTop: "2px" }} />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="auth-form-stack" noValidate>
                        <div className="auth-field-group">
                            <label className="auth-field-label" htmlFor="login-email">
                                Email Address
                            </label>
                            <div className="auth-input-container">
                                <input
                                    id="login-email"
                                    type="email"
                                    className={`auth-text-input ${fieldErrors.email ? "input-has-error" : ""}`}
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: "" });
                                    }}
                                    required
                                    autoComplete="email"
                                    autoFocus
                                />
                            </div>
                            {fieldErrors.email && (
                                <span className="field-error-hint">{fieldErrors.email}</span>
                            )}
                        </div>

                        <div className="auth-field-group">
                            <label className="auth-field-label" htmlFor="login-password">
                                Password
                            </label>
                            <div className="auth-input-container">
                                <input
                                    id="login-password"
                                    type={showPassword ? "text" : "password"}
                                    className={`auth-text-input auth-password-input ${fieldErrors.password ? "input-has-error" : ""}`}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: "" });
                                    }}
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    className="pw-visibility-btn"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {fieldErrors.password && (
                                <span className="field-error-hint">{fieldErrors.password}</span>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="auth-submit-btn"
                            disabled={submitting}
                        >
                            <span>{submitting ? "Signing in..." : "Sign In to ExpenseFlow"}</span>
                            {!submitting && <ArrowRight size={16} />}
                        </button>
                    </form>

                    <div className="auth-switch-footer">
                        Don't have an account yet?
                        <Link to="/signup" className="auth-switch-link">
                            Create an account
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
