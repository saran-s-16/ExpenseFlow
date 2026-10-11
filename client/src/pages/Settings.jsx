import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    ShieldCheck,
    Lock,
    Eye,
    EyeOff,
    CheckCircle2,
    AlertCircle,
    Check,
    KeyRound,
    Globe,
    Shield,
    LogOut,
    Database,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { changeUserPassword } from "../services/authService";
import SignOutModal from "../components/SignOutModal";
import "../styles/settings.css";

export default function Settings() {
    const { logout } = useAuth();
    const navigate = useNavigate();

    // Sign out modal state
    const [showSignOutModal, setShowSignOutModal] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // Password form state
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");

    // Visibility toggles for each field
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // Form status state
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});

    // Password strength calculation
    const getStrength = (pass) => {
        if (!pass) return { score: 0, label: "", colorClass: "" };
        let score = 0;
        if (pass.length >= 6) score += 1;
        if (pass.length >= 10) score += 1;
        if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
        if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1;

        if (pass.length < 6) {
            return { score: 1, label: "Too short (min 6 chars)", colorClass: "strength-weak" };
        }
        if (score === 1) return { score: 1, label: "Weak", colorClass: "strength-weak" };
        if (score === 2) return { score: 2, label: "Fair", colorClass: "strength-fair" };
        if (score === 3) return { score: 3, label: "Good", colorClass: "strength-good" };
        return { score: 4, label: "Strong", colorClass: "strength-strong" };
    };

    const strength = getStrength(newPassword);

    // Checklist requirements
    const reqMinLength = newPassword.length >= 6;
    const reqHasNumberOrSymbol = /[0-9]/.test(newPassword) || /[^A-Za-z0-9]/.test(newPassword);
    const reqHasMixedCase = /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword);
    const reqPasswordsMatch = Boolean(newPassword && confirmNewPassword && newPassword === confirmNewPassword);

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage("");
        setSuccessMessage("");
        const errors = {};

        if (!currentPassword) {
            errors.current = "Current password is required";
        }
        if (!newPassword) {
            errors.new = "New password is required";
        } else if (newPassword.length < 6) {
            errors.new = "New password must be at least 6 characters long";
        }
        if (!confirmNewPassword) {
            errors.confirm = "Please confirm your new password";
        } else if (newPassword !== confirmNewPassword) {
            errors.confirm = "New passwords do not match";
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }
        setFieldErrors({});

        try {
            setSaving(true);
            const res = await changeUserPassword({
                currentPassword,
                newPassword,
                confirmNewPassword,
            });

            if (res.success) {
                setSuccessMessage("Password updated successfully! Your account is now secured with your new password.");
                setCurrentPassword("");
                setNewPassword("");
                setConfirmNewPassword("");
                setShowCurrent(false);
                setShowNew(false);
                setShowConfirm(false);
            } else {
                setErrorMessage(res.message || "Unable to update password. Please verify your current password.");
            }
        } catch (err) {
            setErrorMessage(
                err.response?.data?.message ||
                err.message ||
                "Failed to update password. Please check your credentials."
            );
        } finally {
            setSaving(false);
        }
    };

    const handleConfirmLogout = async () => {
        if (isLoggingOut) return;
        try {
            setIsLoggingOut(true);
            await logout();
        } finally {
            setIsLoggingOut(false);
            setShowSignOutModal(false);
            navigate("/", { replace: true, state: { signedOut: true } });
        }
    };

    return (
        <div className="settings-page">
            {/* Page Header */}
            <div className="settings-header">
                <h2 className="page-title">Settings & Account Security</h2>
                <p className="page-subtitle">
                    Protect your account with secure password management and review regional standards.
                </p>
            </div>

            {/* Responsive Full-Width Grid (2 columns on desktop, 1 on tablet/mobile) */}
            <div className="settings-grid">
                {/* Column 1: Security & Password Card */}
                <div className="glass-card settings-security-card">
                    <div className="settings-card-header">
                        <div className="settings-icon-circle">
                            <ShieldCheck size={22} />
                        </div>
                        <div>
                            <h3 className="settings-card-title">Security & Password</h3>
                            <p className="settings-card-subtitle">
                                Protect your account with secure password management.
                            </p>
                        </div>
                    </div>

                    <div className="security-notice-strip">
                        <div className="notice-icon">
                            <KeyRound size={16} />
                        </div>
                        <p className="notice-text">
                            Use a strong, unique password that you do not reuse across other websites. All passwords are encrypted with bcrypt before storage.
                        </p>
                    </div>

                    {/* Notifications */}
                    {successMessage && (
                        <div className="settings-alert-success" role="alert">
                            <CheckCircle2 size={18} className="alert-icon" />
                            <span>{successMessage}</span>
                        </div>
                    )}

                    {errorMessage && (
                        <div className="settings-alert-error" role="alert">
                            <AlertCircle size={18} className="alert-icon" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    {/* Password Update Form */}
                    <form onSubmit={handlePasswordSubmit} className="settings-form" noValidate>
                        {/* 1. Current Password */}
                        <div className="form-group">
                            <label htmlFor="currentPassword" className="form-label">
                                Current Password
                            </label>
                            <div className="input-wrapper">
                                <input
                                    id="currentPassword"
                                    type={showCurrent ? "text" : "password"}
                                    className={`settings-input ${fieldErrors.current ? "input-error" : ""}`}
                                    placeholder="Enter current password"
                                    value={currentPassword}
                                    onChange={(e) => {
                                        setCurrentPassword(e.target.value);
                                        if (fieldErrors.current) setFieldErrors((prev) => ({ ...prev, current: "" }));
                                    }}
                                    disabled={saving}
                                    autoComplete="current-password"
                                    required
                                />
                                <button
                                    type="button"
                                    className="password-toggle-btn"
                                    onClick={() => setShowCurrent(!showCurrent)}
                                    aria-label={showCurrent ? "Hide current password" : "Show current password"}
                                    tabIndex={-1}
                                >
                                    {showCurrent ? <EyeOff size={17} /> : <Eye size={17} />}
                                </button>
                            </div>
                            {fieldErrors.current && (
                                <span className="field-error-text">{fieldErrors.current}</span>
                            )}
                        </div>

                        {/* 2. New Password */}
                        <div className="form-group">
                            <label htmlFor="newPassword" className="form-label">
                                New Password
                            </label>
                            <div className="input-wrapper">
                                <input
                                    id="newPassword"
                                    type={showNew ? "text" : "password"}
                                    className={`settings-input ${fieldErrors.new ? "input-error" : ""}`}
                                    placeholder="Enter new password (min. 6 characters)"
                                    value={newPassword}
                                    onChange={(e) => {
                                        setNewPassword(e.target.value);
                                        if (fieldErrors.new) setFieldErrors((prev) => ({ ...prev, new: "" }));
                                    }}
                                    disabled={saving}
                                    autoComplete="new-password"
                                    required
                                />
                                <button
                                    type="button"
                                    className="password-toggle-btn"
                                    onClick={() => setShowNew(!showNew)}
                                    aria-label={showNew ? "Hide new password" : "Show new password"}
                                    tabIndex={-1}
                                >
                                    {showNew ? <EyeOff size={17} /> : <Eye size={17} />}
                                </button>
                            </div>
                            {fieldErrors.new && (
                                <span className="field-error-text">{fieldErrors.new}</span>
                            )}

                            {/* Password Strength Indicator */}
                            {newPassword && (
                                <div className="password-strength-container">
                                    <div className="strength-header">
                                        <span className="strength-title">Password Strength:</span>
                                        <span className={`strength-badge ${strength.colorClass}`}>
                                            {strength.label}
                                        </span>
                                    </div>
                                    <div className="strength-meter-bar">
                                        <div className={`strength-segment ${strength.score >= 1 ? strength.colorClass : ""}`}></div>
                                        <div className={`strength-segment ${strength.score >= 2 ? strength.colorClass : ""}`}></div>
                                        <div className={`strength-segment ${strength.score >= 3 ? strength.colorClass : ""}`}></div>
                                        <div className={`strength-segment ${strength.score >= 4 ? strength.colorClass : ""}`}></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 3. Confirm New Password */}
                        <div className="form-group">
                            <label htmlFor="confirmNewPassword" className="form-label">
                                Confirm New Password
                            </label>
                            <div className="input-wrapper">
                                <input
                                    id="confirmNewPassword"
                                    type={showConfirm ? "text" : "password"}
                                    className={`settings-input ${fieldErrors.confirm ? "input-error" : ""}`}
                                    placeholder="Confirm your new password"
                                    value={confirmNewPassword}
                                    onChange={(e) => {
                                        setConfirmNewPassword(e.target.value);
                                        if (fieldErrors.confirm) setFieldErrors((prev) => ({ ...prev, confirm: "" }));
                                    }}
                                    disabled={saving}
                                    autoComplete="new-password"
                                    required
                                />
                                <button
                                    type="button"
                                    className="password-toggle-btn"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    aria-label={showConfirm ? "Hide confirmation password" : "Show confirmation password"}
                                    tabIndex={-1}
                                >
                                    {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                                </button>
                            </div>
                            {fieldErrors.confirm && (
                                <span className="field-error-text">{fieldErrors.confirm}</span>
                            )}
                        </div>

                        {/* Password Requirements Checklist */}
                        <div className="password-checklist-box">
                            <span className="checklist-heading">Password Requirements</span>
                            <div className="checklist-grid">
                                <div className={`checklist-item ${reqMinLength ? "met" : ""}`}>
                                    {reqMinLength ? <Check size={14} className="check-icon" /> : <span className="dot-icon"></span>}
                                    <span>At least 6 characters</span>
                                </div>
                                <div className={`checklist-item ${reqHasNumberOrSymbol ? "met" : ""}`}>
                                    {reqHasNumberOrSymbol ? <Check size={14} className="check-icon" /> : <span className="dot-icon"></span>}
                                    <span>Contains number or symbol</span>
                                </div>
                                <div className={`checklist-item ${reqHasMixedCase ? "met" : ""}`}>
                                    {reqHasMixedCase ? <Check size={14} className="check-icon" /> : <span className="dot-icon"></span>}
                                    <span>Uppercase & lowercase letters</span>
                                </div>
                                <div className={`checklist-item ${reqPasswordsMatch ? "met" : ""}`}>
                                    {reqPasswordsMatch ? <Check size={14} className="check-icon" /> : <span className="dot-icon"></span>}
                                    <span>Passwords match</span>
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="form-actions">
                            <button
                                type="submit"
                                className="btn-update-password"
                                disabled={saving || !currentPassword || !newPassword || !confirmNewPassword}
                            >
                                <Lock size={16} />
                                <span>{saving ? "Updating Password..." : "Update Password"}</span>
                            </button>
                        </div>
                    </form>
                </div>

                {/* Column 2: Regional & Currency Standards Card */}
                <div className="glass-card settings-regional-card">
                    <div className="settings-card-header">
                        <div className="settings-icon-circle">
                            <span style={{ fontWeight: 750, fontSize: "18px" }}>₹</span>
                        </div>
                        <div>
                            <h3 className="settings-card-title">Regional & Currency Standards</h3>
                            <p className="settings-card-subtitle">
                                Format standards applied across dashboards, reports, and charts
                            </p>
                        </div>
                    </div>

                    <div className="security-notice-strip">
                        <div className="notice-icon">
                            <Globe size={16} />
                        </div>
                        <p className="notice-text">
                            ExpenseFlow formats all transactions and reports using the Indian numbering system (Lakhs and Crores) and INR currency standard.
                        </p>
                    </div>

                    {/* Standard Information Rows */}
                    <div className="regional-settings-list">
                        <div className="settings-preference-row">
                            <div className="preference-text-wrap">
                                <strong>Display Currency</strong>
                                <span>Indian Rupee (INR - ₹) standard format across all accounts</span>
                            </div>
                            <span className="pref-badge">INR (₹)</span>
                        </div>

                        <div className="settings-preference-row">
                            <div className="preference-text-wrap">
                                <strong>Locale & Number Formatting</strong>
                                <span>en-IN grouping (Lakhs & Crores standard: ₹1,00,000)</span>
                            </div>
                            <span className="pref-badge">en-IN</span>
                        </div>

                        <div className="settings-preference-row">
                            <div className="preference-text-wrap">
                                <strong>Ledger Accounting Precision</strong>
                                <span>Relational database storage with 2 decimal precision</span>
                            </div>
                            <span className="pref-badge">Decimal (2)</span>
                        </div>

                        <div className="settings-preference-row">
                            <div className="preference-text-wrap">
                                <strong>Account Security & Privacy</strong>
                                <span>Encrypted session tokens & isolated user record scopes</span>
                            </div>
                            <span className="pref-badge active-badge">Isolated</span>
                        </div>
                    </div>

                    {/* Active Session & Sign Out */}
                    <div className="settings-footer-actions">
                        <div className="signout-info-wrap">
                            <span className="signout-info-title">Active Session</span>
                            <span className="signout-info-desc">
                                End your current authenticated session on this browser
                            </span>
                        </div>
                        <button
                            type="button"
                            className="btn-logout-danger"
                            onClick={() => setShowSignOutModal(true)}
                        >
                            <LogOut size={16} />
                            <span>Sign Out of ExpenseFlow</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Polished Animated Sign-Out Confirmation Modal */}
            <SignOutModal
                isOpen={showSignOutModal}
                onClose={() => setShowSignOutModal(false)}
                onConfirm={handleConfirmLogout}
                isLoggingOut={isLoggingOut}
            />
        </div>
    );
}
