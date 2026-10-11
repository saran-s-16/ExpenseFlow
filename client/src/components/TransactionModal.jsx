import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { createTransaction, updateTransaction } from "../services/transactionService";
import { getCategories } from "../services/categoryService";
import { toInputDate } from "../utils/formatters";

/**
 * Reusable Add / Edit Transaction Modal Component
 * Shared across Dashboard, Transactions, and other pages.
 * Fully responsive, centered in viewport, with internal body scrolling,
 * sticky header/actions, and background scroll locking.
 */
export default function TransactionModal({
    isOpen,
    onClose,
    onSuccess,
    categories: propCategories = [],
    initialType = "expense",
    mode = "create",
    transaction = null,
}) {
    const [categories, setCategories] = useState(propCategories);
    const [txType, setTxType] = useState(initialType);
    const [txAmount, setTxAmount] = useState("");
    const [txCategory, setTxCategory] = useState("");
    const [txDescription, setTxDescription] = useState("");
    const [txDate, setTxDate] = useState(toInputDate(new Date()));
    const [txPaymentMethod, setTxPaymentMethod] = useState("cash");
    const [txNotes, setTxNotes] = useState("");
    const [modalError, setModalError] = useState("");
    const [modalLoading, setModalLoading] = useState(false);

    // Fetch categories if not provided or empty
    useEffect(() => {
        if (propCategories && propCategories.length > 0) {
            setCategories(propCategories);
        } else if (isOpen) {
            getCategories()
                .then((res) => {
                    if (res?.success && res.categories) {
                        setCategories(res.categories);
                    }
                })
                .catch((err) => console.error("Error loading categories:", err));
        }
    }, [propCategories, isOpen]);

    // Initialize or reset form state whenever modal opens or transaction changes
    useEffect(() => {
        if (!isOpen) return;

        setModalError("");
        setModalLoading(false);

        if (mode === "edit" && transaction) {
            setTxType(transaction.type || "expense");
            setTxAmount(transaction.amount?.toString() || "");
            setTxCategory(transaction.category || "");
            setTxDescription(transaction.description || "");
            setTxDate(transaction.date ? toInputDate(transaction.date) : toInputDate(new Date()));
            setTxPaymentMethod(transaction.payment_method || "cash");
            setTxNotes(transaction.notes || "");
        } else {
            const defaultType = initialType || "expense";
            setTxType(defaultType);
            setTxAmount("");
            setTxDescription("");
            setTxDate(toInputDate(new Date()));
            setTxPaymentMethod("cash");
            setTxNotes("");

            const available = (categories.length > 0 ? categories : propCategories).filter(
                (c) => c.type === defaultType
            );
            if (available.length > 0) {
                setTxCategory(available[0].name);
            } else {
                setTxCategory("Other");
            }
        }
    }, [isOpen, mode, transaction, initialType]);

    // When categories finish loading in create mode, ensure a matching category is selected
    useEffect(() => {
        if (isOpen && mode === "create" && categories.length > 0) {
            const available = categories.filter((c) => c.type === txType);
            if (available.length > 0 && (!txCategory || !available.some((c) => c.name === txCategory))) {
                setTxCategory(available[0].name);
            }
        }
    }, [isOpen, mode, categories, txType]);

    // Lock background scroll while modal is open, restore on close
    useEffect(() => {
        if (!isOpen) return;
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [isOpen]);

    // Close on Escape key press
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === "Escape" && !modalLoading) {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, modalLoading, onClose]);

    if (!isOpen) return null;

    // Handle switching between Expense and Income
    const handleTypeChange = (newType) => {
        setTxType(newType);
        const matchingCats = categories.filter((c) => c.type === newType);
        if (matchingCats.length > 0) {
            setTxCategory(matchingCats[0].name);
        } else {
            setTxCategory("Other");
        }
    };

    // Form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setModalError("");

        const num = Number(txAmount);
        if (!num || num <= 0) {
            setModalError("Please enter a valid positive amount");
            return;
        }

        if (!txCategory) {
            setModalError("Please select a category");
            return;
        }

        if (!txDescription.trim()) {
            setModalError("Please enter a description");
            return;
        }

        try {
            setModalLoading(true);
            const payload = {
                type: txType,
                amount: num,
                category: txCategory,
                description: txDescription.trim(),
                date: txDate,
                payment_method: txPaymentMethod,
                notes: txNotes.trim(),
            };

            if (mode === "create") {
                await createTransaction(payload);
            } else if (transaction?.id) {
                await updateTransaction(transaction.id, payload);
            }

            if (onSuccess) {
                await onSuccess();
            }
            onClose();
        } catch (err) {
            console.error("Save transaction error:", err);
            setModalError(
                err.response?.data?.message ||
                err.message ||
                "Failed to save transaction"
            );
        } finally {
            setModalLoading(false);
        }
    };

    const matchingCategories = categories.filter((c) => c.type === txType);

    return (
        <div
            className="modal-overlay"
            onClick={(e) => {
                if (e.target === e.currentTarget && !modalLoading) {
                    onClose();
                }
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div className="modal-card">
                {/* Header: fixed at top */}
                <div className="modal-header">
                    <h3 id="modal-title">
                        {mode === "create" ? "Add Transaction" : "Edit Transaction"}
                    </h3>
                    <button
                        type="button"
                        className="modal-close-btn"
                        onClick={onClose}
                        disabled={modalLoading}
                        aria-label="Close dialog"
                    >
                        <X size={18} />
                    </button>
                </div>

                {modalError && (
                    <div className="modal-error-alert" role="alert">
                        {modalError}
                    </div>
                )}

                {/* Form with scrollable body and fixed footer */}
                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="modal-body-scrollable">
                        {/* Type Toggle: Expense / Income */}
                        <div className="type-toggle-group">
                            <button
                                type="button"
                                className={`type-toggle-btn ${
                                    txType === "expense" ? "active-expense" : ""
                                }`}
                                onClick={() => handleTypeChange("expense")}
                            >
                                Expense
                            </button>
                            <button
                                type="button"
                                className={`type-toggle-btn ${
                                    txType === "income" ? "active-income" : ""
                                }`}
                                onClick={() => handleTypeChange("income")}
                            >
                                Income
                            </button>
                        </div>

                        {/* Amount */}
                        <div className="form-group">
                            <label htmlFor="tx-amount">Amount (₹) *</label>
                            <input
                                id="tx-amount"
                                type="number"
                                step="0.01"
                                min="0.01"
                                placeholder="Enter amount in ₹"
                                className="form-input"
                                value={txAmount}
                                onChange={(e) => setTxAmount(e.target.value)}
                                required
                            />
                        </div>

                        {/* Category */}
                        <div className="form-group">
                            <label htmlFor="tx-category">Category *</label>
                            <select
                                id="tx-category"
                                className="form-input"
                                value={txCategory}
                                onChange={(e) => setTxCategory(e.target.value)}
                                required
                            >
                                {matchingCategories.map((c) => (
                                    <option key={c.id || c.name} value={c.name}>
                                        {c.name}
                                    </option>
                                ))}
                                {matchingCategories.length === 0 && (
                                    <option value="Other">Other</option>
                                )}
                            </select>
                        </div>

                        {/* Description */}
                        <div className="form-group">
                            <label htmlFor="tx-description">Description *</label>
                            <input
                                id="tx-description"
                                type="text"
                                placeholder={
                                    txType === "expense"
                                        ? "What did you spend on?"
                                        : "Where did this income come from?"
                                }
                                className="form-input"
                                value={txDescription}
                                onChange={(e) => setTxDescription(e.target.value)}
                                required
                            />
                        </div>

                        {/* Date & Payment Method */}
                        <div className="form-row">
                            <div className="form-group" style={{ flex: 1 }}>
                                <label htmlFor="tx-date">Date *</label>
                                <input
                                    id="tx-date"
                                    type="date"
                                    className="form-input"
                                    value={txDate}
                                    onChange={(e) => setTxDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label htmlFor="tx-payment">Payment Method</label>
                                <select
                                    id="tx-payment"
                                    className="form-input"
                                    value={txPaymentMethod}
                                    onChange={(e) => setTxPaymentMethod(e.target.value)}
                                >
                                    <option value="cash">Cash</option>
                                    <option value="upi">UPI</option>
                                    <option value="card">Card</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="form-group">
                            <label htmlFor="tx-notes">Notes (Optional)</label>
                            <input
                                id="tx-notes"
                                type="text"
                                placeholder="Additional notes..."
                                className="form-input"
                                value={txNotes}
                                onChange={(e) => setTxNotes(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Footer Actions: fixed at bottom of modal card */}
                    <div className="modal-actions">
                        <button
                            type="button"
                            className="btn-cancel"
                            onClick={onClose}
                            disabled={modalLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-submit"
                            disabled={modalLoading}
                        >
                            {modalLoading
                                ? "Saving..."
                                : mode === "create"
                                ? "Save Transaction"
                                : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
