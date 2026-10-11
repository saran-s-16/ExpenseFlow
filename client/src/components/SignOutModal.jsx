import React, { useEffect, useRef } from "react";
import { LogOut, X, ShieldCheck } from "lucide-react";

/**
 * SignOutModal — Polished animated confirmation modal for ExpenseFlow.
 * Conforms to the dark emerald glassmorphism visual language.
 */
export default function SignOutModal({ isOpen, onClose, onConfirm, isLoggingOut }) {
    const modalRef = useRef(null);

    // Close on Escape key press
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === "Escape" && !isLoggingOut) {
                onClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, isLoggingOut, onClose]);

    // Prevent background scrolling while modal is open
    useEffect(() => {
        if (!isOpen) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget && !isLoggingOut) {
            onClose();
        }
    };

    return (
        <div
            className="signout-modal-backdrop"
            onClick={handleBackdropClick}
            role="presentation"
        >
            <div
                className="signout-modal-card"
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="signout-modal-title"
                aria-describedby="signout-modal-desc"
            >
                {/* Close Button */}
                <button
                    type="button"
                    className="signout-modal-close"
                    onClick={onClose}
                    disabled={isLoggingOut}
                    aria-label="Close modal"
                >
                    <X size={18} />
                </button>

                {/* Subtle Logout Icon Pill */}
                <div className="signout-icon-wrapper">
                    <div className="signout-icon-circle">
                        <LogOut size={22} />
                    </div>
                </div>

                {/* Modal Headings */}
                <div className="signout-content">
                    <h3 id="signout-modal-title" className="signout-title">
                        Sign out of ExpenseFlow?
                    </h3>
                    <p id="signout-modal-desc" className="signout-desc">
                        Are you sure you want to sign out? You can securely log back in anytime.
                    </p>
                </div>

                {/* Security Detail Pill */}
                <div className="signout-security-pill">
                    <ShieldCheck size={16} className="security-icon" />
                    <span>Your financial data and transactions remain securely saved in PostgreSQL.</span>
                </div>

                {/* Actions */}
                <div className="signout-modal-actions">
                    <button
                        type="button"
                        className="btn-signout-cancel"
                        onClick={onClose}
                        disabled={isLoggingOut}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn-signout-confirm"
                        onClick={onConfirm}
                        disabled={isLoggingOut}
                    >
                        <LogOut size={16} />
                        <span>{isLoggingOut ? "Signing Out..." : "Sign Out"}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
