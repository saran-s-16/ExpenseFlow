import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Eye,
    EyeOff,
    Sun,
    Moon,
    ShieldCheck,
    Database,
    BarChart3,
    AlertCircle,
    ArrowRight,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "../styles/auth.css";

export default function Register() {
    const navigate = useNavigate();
    const { register, isAuthenticated, user, theme, toggleTheme } = useAuth();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const validate = () => {
        const errors = {};
        if (!name.trim()) {
            errors.name = "Full name is required";
        }

        if (!email.trim()) {
            errors.email = "Email address is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            errors.email = "Please enter a valid email address";
        }

        if (!password) {
            errors.password = "Password is required";
        } else if (password.length < 6) {
            errors.password = "Password must be at least 6 characters long";
        }

        if (password !== confirmPassword) {
            errors.confirmPassword = "Passwords do not match";
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
            await register({
                name: name.trim(),
                email: email.trim(),
                password,
                confirmPassword,
            });
            navigate("/login", {
                replace: true,
                state: {
                    registeredEmail: email.trim(),
                    successMessage: "Account created successfully! Please sign in with your password to continue.",
                },
            });
        } catch (err) {
            setError(
                err.response?.data?.message ||
                err.message ||
                "Failed to register. Please check your information."
            );
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
                                Start Your Journey to <br />
                                <span className="auth-highlight-green">Financial Clarity.</span>
                            </h2>

                            <p className="auth-hero-desc">
                                Create your isolated account and take full control of your income, expenses, and monthly budget targets.
                            </p>

                            <div className="auth-pill-list">
                                <div className="auth-pill-item">
                                    <div className="auth-pill-icon">
                                        <ShieldCheck size={15} />
                                    </div>
                                    <span>Zero third-party tracking or data sales</span>
                                </div>

                                <div className="auth-pill-item">
                                    <div className="auth-pill-icon">
                                        <Database size={15} />
                                    </div>
                                    <span>PostgreSQL database persistence</span>
                                </div>

                                <div className="auth-pill-item">
                                    <div className="auth-pill-icon">
                                        <BarChart3 size={15} />
                                    </div>
                                    <span>Intuitive budgeting and categorization</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="auth-mini-stat">
                        <div>
                            <span className="mini-stat-label">Fast & Lightweight</span>
                            <div className="mini-stat-value">Setup in 30 Seconds</div>
                        </div>
                        <span style={{ fontSize: "11px", fontWeight: "600", color: "var(--accent-green)" }}>
                            Free
                        </span>
                    </div>
                </div>

                {/* Right Column: Sign-Up Form */}
                <div className="auth-form-side">
                    <div className="auth-heading-wrap">
                        <h1 className="auth-title">Create Your Account</h1>
                        <p className="auth-subtitle">Start building a clearer picture of your finances.</p>
                    </div>

                    {/* Authenticated user banner */}
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

                    {/* Global Error Banner */}
                    {error && (
                        <div className="auth-alert-box alert-error" role="alert">
                            <AlertCircle size={17} style={{ flexShrink: 0, marginTop: "2px" }} />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="auth-form-stack" noValidate>
                        <div className="auth-field-group">
                            <label className="auth-field-label" htmlFor="reg-name">
                                Full Name
                            </label>
                            <div className="auth-input-container">
                                <input
                                    id="reg-name"
                                    type="text"
                                    className={`auth-text-input ${fieldErrors.name ? "input-has-error" : ""}`}
                                    placeholder="John Doe"
                                    value={name}
                                    onChange={(e) => {
                                        setName(e.target.value);
                                        if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: "" });
                                    }}
                                    required
                                    autoComplete="name"
                                    autoFocus
                                />
                            </div>
                            {fieldErrors.name && (
                                <span className="field-error-hint">{fieldErrors.name}</span>
                            )}
                        </div>

                        <div className="auth-field-group">
                            <label className="auth-field-label" htmlFor="reg-email">
                                Email Address
                            </label>
                            <div className="auth-input-container">
                                <input
                                    id="reg-email"
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
                                />
                            </div>
                            {fieldErrors.email && (
                                <span className="field-error-hint">{fieldErrors.email}</span>
                            )}
                        </div>

                        <div className="auth-field-group">
                            <label className="auth-field-label" htmlFor="reg-password">
                                Password (min. 6 characters)
                            </label>
                            <div className="auth-input-container">
                                <input
                                    id="reg-password"
                                    type={showPassword ? "text" : "password"}
                                    className={`auth-text-input auth-password-input ${fieldErrors.password ? "input-has-error" : ""}`}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: "" });
                                    }}
                                    required
                                    autoComplete="new-password"
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

                        <div className="auth-field-group">
                            <label className="auth-field-label" htmlFor="reg-confirm">
                                Confirm Password
                            </label>
                            <div className="auth-input-container">
                                <input
                                    id="reg-confirm"
                                    type={showConfirmPassword ? "text" : "password"}
                                    className={`auth-text-input auth-password-input ${fieldErrors.confirmPassword ? "input-has-error" : ""}`}
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => {
                                        setConfirmPassword(e.target.value);
                                        if (fieldErrors.confirmPassword) setFieldErrors({ ...fieldErrors, confirmPassword: "" });
                                    }}
                                    required
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    className="pw-visibility-btn"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                                >
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {fieldErrors.confirmPassword && (
                                <span className="field-error-hint">{fieldErrors.confirmPassword}</span>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="auth-submit-btn"
                            disabled={submitting}
                        >
                            <span>{submitting ? "Creating Account..." : "Create Free Account"}</span>
                            {!submitting && <ArrowRight size={16} />}
                        </button>
                    </form>

                    <div className="auth-switch-footer">
                        Already have an account?
                        <Link to="/login" className="auth-switch-link">
                            Sign in here
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
