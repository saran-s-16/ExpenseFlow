import React, { useState, useEffect, useCallback } from "react";
import {
    Target,
    Plus,
    Edit3,
    Trash2,
    Calendar,
    AlertTriangle,
    CheckCircle,
    X,
    TrendingUp,
    ShieldAlert,
    Coins,
} from "lucide-react";
import {
    getBudgets,
    createBudget,
    updateBudget,
    deleteBudget,
} from "../services/budgetService";
import { getCategories } from "../services/categoryService";
import { formatCurrency, getCategoryIcon } from "../utils/formatters";
import "../styles/budgets.css";

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

export default function Budgets() {
    const now = new Date();
    // Default to September 2026 (Demonstration Month)
    const [selectedMonth, setSelectedMonth] = useState(9);
    const [selectedYear, setSelectedYear] = useState(2026);

    const [budgetData, setBudgetData] = useState(null);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Create / Edit Modal State
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState("create");
    const [currentBudgetId, setCurrentBudgetId] = useState(null);
    const [budgetCategory, setBudgetCategory] = useState("");
    const [budgetAmount, setBudgetAmount] = useState("");
    const [modalError, setModalError] = useState("");
    const [modalLoading, setModalLoading] = useState(false);

    // Delete Modal State
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Fetch expense categories for selector
    useEffect(() => {
        getCategories("expense")
            .then((res) => {
                if (res.success && res.categories) {
                    setCategories(res.categories);
                }
            })
            .catch((e) => console.error("Error loading categories:", e));
    }, []);

    // Load budgets
    const loadBudgets = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            const res = await getBudgets(selectedMonth, selectedYear);
            if (res.success) {
                setBudgetData(res);
            }
        } catch (err) {
            console.error("Error loading budgets:", err);
            setError(
                err.response?.data?.message ||
                err.message ||
                "Unable to retrieve monthly budgets"
            );
        } finally {
            setLoading(false);
        }
    }, [selectedMonth, selectedYear]);

    useEffect(() => {
        loadBudgets();
    }, [loadBudgets]);

    const handleOpenCreate = () => {
        setModalMode("create");
        setCurrentBudgetId(null);
        setBudgetCategory(categories.length > 0 ? categories[0].name : "Food");
        setBudgetAmount("");
        setModalError("");
        setShowModal(true);
    };

    const handleOpenEdit = (b) => {
        setModalMode("edit");
        setCurrentBudgetId(b.id);
        setBudgetCategory(b.category);
        setBudgetAmount(b.amount);
        setModalError("");
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setModalError("");

        const num = Number(budgetAmount);
        if (!num || num <= 0) {
            setModalError("Please enter a valid monthly limit greater than 0");
            return;
        }

        if (!budgetCategory) {
            setModalError("Please select a category");
            return;
        }

        try {
            setModalLoading(true);
            const payload = {
                category: budgetCategory,
                amount: num,
                month: selectedMonth,
                year: selectedYear,
            };

            if (modalMode === "create") {
                await createBudget(payload);
            } else {
                await updateBudget(currentBudgetId, payload);
            }

            setShowModal(false);
            loadBudgets();
        } catch (err) {
            setModalError(
                err.response?.data?.message ||
                err.message ||
                "Failed to save monthly budget"
            );
        } finally {
            setModalLoading(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            setDeleteLoading(true);
            await deleteBudget(deleteTarget.id);
            setDeleteTarget(null);
            loadBudgets();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to delete budget");
        } finally {
            setDeleteLoading(false);
        }
    };

    const summary = budgetData?.summary || {
        totalBudget: 0,
        totalSpent: 0,
        remaining: 0,
        percentage: 0,
        budgetCount: 0,
    };
    const budgets = budgetData?.budgets || [];

    // Categorize budgets by compliance
    const exceededBudgets = budgets.filter((b) => b.percentage >= 100);
    const highAlertBudgets = budgets.filter((b) => b.percentage >= 90 && b.percentage < 100);
    const cautionBudgets = budgets.filter((b) => b.percentage >= 75 && b.percentage < 90);

    // Days calculation for daily allowance
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const isCurrentMonth =
        now.getMonth() + 1 === selectedMonth && now.getFullYear() === selectedYear;
    const daysRemaining = isCurrentMonth
        ? Math.max(1, daysInMonth - now.getDate())
        : daysInMonth;
    const dailySpendingAllowance =
        summary.remaining > 0 ? Number((summary.remaining / daysRemaining).toFixed(2)) : 0;

    return (
        <div className="budgets-page">
            {/* Header Strip with Month/Year Switcher */}
            <div className="budget-header-strip">
                <div>
                    <h2 className="page-title">Budget Guard & Control</h2>
                    <p className="page-subtitle">
                        Enforce spending thresholds with real-time alerts at 75%, 90%, and 100% capacity
                    </p>
                </div>

                <div className="budget-header-actions" style={{ flexWrap: "wrap", gap: "10px" }}>
                    {/* Quick Demo Month Button */}
                    <button
                        className={`period-btn ${selectedMonth === 9 && selectedYear === 2026 ? "active" : ""}`}
                        onClick={() => {
                            setSelectedMonth(9);
                            setSelectedYear(2026);
                        }}
                    >
                        ⭐ September 2026 (Demo)
                    </button>

                    <button
                        className={`period-btn ${selectedMonth === now.getMonth() + 1 && selectedYear === now.getFullYear() ? "active" : ""}`}
                        onClick={() => {
                            setSelectedMonth(now.getMonth() + 1);
                            setSelectedYear(now.getFullYear());
                        }}
                    >
                        This Month
                    </button>

                    <div className="period-pill-select">
                        <Calendar size={16} />
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className="month-select"
                        >
                            {MONTH_NAMES.map((name, idx) => (
                                <option key={name} value={idx + 1}>
                                    {name}
                                </option>
                            ))}
                        </select>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="year-select"
                        >
                            <option value={2025}>2025</option>
                            <option value={2026}>2026</option>
                            <option value={2027}>2027</option>
                        </select>
                    </div>

                    <button className="add-tx-btn" onClick={handleOpenCreate}>
                        <Plus size={16} />
                        <span>Set Budget</span>
                    </button>
                </div>
            </div>

            {/* Over-Budget Alert Banner */}
            {exceededBudgets.length > 0 && (
                <div
                    style={{
                        background: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.35)",
                        borderRadius: "12px",
                        padding: "14px 20px",
                        display: "flex",
                        alignItems: "center",
                        gap: "14px",
                        margin: "16px 0 24px",
                        fontSize: "14px",
                    }}
                >
                    <ShieldAlert size={22} color="#ef4444" style={{ flexShrink: 0 }} />
                    <div>
                        <strong style={{ color: "#ef4444" }}>
                            Budget Limit Exceeded in {exceededBudgets.length} Categories:
                        </strong>{" "}
                        <span>
                            {exceededBudgets.map((b) => `${b.category} (${b.percentage}%)`).join(", ")}. Immediate spending discipline recommended.
                        </span>
                    </div>
                </div>
            )}

            {/* Monthly Budget Summary Banner */}
            <div className="glass-card budget-summary-banner" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                <div className="summary-banner-item">
                    <span>Total Planned Budget</span>
                    <strong>{formatCurrency(summary.totalBudget)}</strong>
                </div>

                <div className="summary-banner-item">
                    <span>Actual Spent</span>
                    <strong style={{ color: summary.percentage >= 100 ? "#ef4444" : "#c45e5e" }}>
                        {formatCurrency(summary.totalSpent)}
                    </strong>
                </div>

                <div className="summary-banner-item">
                    <span>Remaining Allowance</span>
                    <strong
                        style={{
                            color: summary.remaining >= 0 ? "#3d9d52" : "#ef4444",
                        }}
                    >
                        {formatCurrency(summary.remaining)}
                    </strong>
                </div>

                <div className="summary-banner-item">
                    <span>Daily Spending Allowance</span>
                    <strong style={{ color: "#55ad69" }}>
                        {formatCurrency(dailySpendingAllowance)}/day
                    </strong>
                </div>

                <div className="summary-banner-progress" style={{ gridColumn: "1 / -1", marginTop: "10px" }}>
                    <div className="progress-labels">
                        <span>Overall Monthly Budget Utilization</span>
                        <strong>{summary.percentage}%</strong>
                    </div>
                    <div className="overall-progress-bar">
                        <div
                            className={`overall-fill ${
                                summary.percentage >= 100
                                    ? "fill-danger"
                                    : summary.percentage >= 90
                                    ? "fill-warning"
                                    : "fill-good"
                            }`}
                            style={{
                                width: `${Math.min(100, summary.percentage)}%`,
                            }}
                        />
                    </div>
                </div>
            </div>

            {error && (
                <div className="glass-card" style={{ padding: "20px", color: "#c45e5e" }}>
                    {error}
                </div>
            )}

            {/* Budgets Cards Grid */}
            <div className="budgets-grid" style={{ marginTop: "24px" }}>
                {loading ? (
                    <div className="glass-card budget-empty-box">
                        Loading monthly budgets...
                    </div>
                ) : budgets.length === 0 ? (
                    <div className="glass-card budget-empty-box">
                        <Target size={42} style={{ margin: "0 auto 14px", opacity: 0.5 }} />
                        <h3>
                            No budgets set for {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                        </h3>
                        <p>
                            Plan your spending ahead to avoid surprises and grow your savings.
                        </p>
                        <button className="add-tx-btn" onClick={handleOpenCreate}>
                            <Plus size={16} />
                            <span>Set Budget for This Month</span>
                        </button>
                    </div>
                ) : (
                    budgets.map((b) => {
                        const pct = b.percentage;
                        const isExceeded = pct >= 100;
                        const isHighAlert = pct >= 90 && pct < 100;
                        const isWarning = pct >= 75 && pct < 90;

                        return (
                            <div
                                className="glass-card budget-card"
                                key={b.id}
                                style={{
                                    border: isExceeded
                                        ? "1px solid rgba(239, 68, 68, 0.45)"
                                        : isHighAlert
                                        ? "1px solid rgba(249, 115, 22, 0.4)"
                                        : isWarning
                                        ? "1px solid rgba(234, 179, 8, 0.35)"
                                        : "1px solid rgba(255, 255, 255, 0.08)",
                                }}
                            >
                                <div className="budget-card-header">
                                    <div className="budget-title-left">
                                        <div className="cat-avatar-circle">
                                            {getCategoryIcon(b.category)}
                                        </div>
                                        <div>
                                            <h3>{b.category}</h3>
                                            <span>
                                                Limit: {formatCurrency(b.amount)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="budget-card-actions">
                                        <button
                                            className="action-icon-btn"
                                            title="Edit limit"
                                            onClick={() => handleOpenEdit(b)}
                                        >
                                            <Edit3 size={15} />
                                        </button>
                                        <button
                                            className="action-icon-btn delete"
                                            title="Delete budget"
                                            onClick={() => setDeleteTarget(b)}
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>

                                <div className="budget-progress-section">
                                    <div className="progress-labels">
                                        <span>Spent: {formatCurrency(b.spent)}</span>
                                        <strong
                                            style={{
                                                color: isExceeded
                                                    ? "#ef4444"
                                                    : isHighAlert
                                                    ? "#f97316"
                                                    : isWarning
                                                    ? "#eab308"
                                                    : "#3d9d52",
                                            }}
                                        >
                                            {b.percentage}%
                                        </strong>
                                    </div>
                                    <div className="budget-progress-track">
                                        <div
                                            className={`budget-progress-fill ${
                                                isExceeded
                                                    ? "fill-danger"
                                                    : isHighAlert || isWarning
                                                    ? "fill-warning"
                                                    : "fill-good"
                                            }`}
                                            style={{
                                                width: `${Math.min(100, b.percentage)}%`,
                                                background: isExceeded
                                                    ? "linear-gradient(to right, #ef4444, #dc2626)"
                                                    : isHighAlert
                                                    ? "linear-gradient(to right, #f97316, #ea580c)"
                                                    : isWarning
                                                    ? "linear-gradient(to right, #eab308, #ca8a04)"
                                                    : "linear-gradient(to right, #10b981, #059669)",
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="budget-card-footer">
                                    <div>
                                        <span className="footer-label">
                                            {b.remaining >= 0 ? "Remaining" : "Over Budget"}
                                        </span>
                                        <strong
                                            style={{
                                                color: b.remaining >= 0 ? "#3d9d52" : "#ef4444",
                                            }}
                                        >
                                            {formatCurrency(Math.abs(b.remaining))}
                                        </strong>
                                    </div>

                                    <div>
                                        {isExceeded && (
                                            <span
                                                className="budget-status-pill pill-danger"
                                                style={{ background: "rgba(239, 68, 68, 0.2)", color: "#ef4444" }}
                                            >
                                                <AlertTriangle size={12} /> 100%+ Exceeded
                                            </span>
                                        )}
                                        {isHighAlert && (
                                            <span
                                                className="budget-status-pill pill-warning"
                                                style={{ background: "rgba(249, 115, 22, 0.2)", color: "#f97316" }}
                                            >
                                                <AlertTriangle size={12} /> 90%+ High Alert
                                            </span>
                                        )}
                                        {isWarning && (
                                            <span
                                                className="budget-status-pill pill-warning"
                                                style={{ background: "rgba(234, 179, 8, 0.2)", color: "#eab308" }}
                                            >
                                                <AlertTriangle size={12} /> 75%+ Warning
                                            </span>
                                        )}
                                        {!isExceeded && !isHighAlert && !isWarning && (
                                            <span className="budget-status-pill pill-good">
                                                <CheckCircle size={12} /> On Track
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Create / Edit Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-card" style={{ maxWidth: "420px" }}>
                        <div className="modal-header">
                            <h3>
                                {modalMode === "create"
                                    ? `Set Budget for ${MONTH_NAMES[selectedMonth - 1]}`
                                    : "Edit Monthly Budget"}
                            </h3>
                            <button
                                className="modal-close-btn"
                                onClick={() => setShowModal(false)}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {modalError && (
                            <div className="form-error-banner">{modalError}</div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Category</label>
                                <select
                                    className="form-input"
                                    value={budgetCategory}
                                    onChange={(e) => setBudgetCategory(e.target.value)}
                                    disabled={modalMode === "edit"}
                                >
                                    {categories.map((c) => (
                                        <option key={c.id || c.name} value={c.name}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Monthly Limit Amount (₹)</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    placeholder="e.g. 15000"
                                    value={budgetAmount}
                                    onChange={(e) => setBudgetAmount(e.target.value)}
                                    min="1"
                                    step="0.01"
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => setShowModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="add-tx-btn"
                                    disabled={modalLoading}
                                >
                                    {modalLoading
                                        ? "Saving..."
                                        : modalMode === "create"
                                        ? "Create Budget"
                                        : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {deleteTarget && (
                <div className="modal-overlay">
                    <div className="modal-card" style={{ maxWidth: "380px" }}>
                        <div className="modal-header">
                            <h3 style={{ color: "#c44040" }}>Delete Budget</h3>
                            <button
                                className="modal-close-btn"
                                onClick={() => setDeleteTarget(null)}
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <p style={{ margin: "16px 0", color: "var(--text-secondary)", fontSize: "14px" }}>
                            Are you sure you want to remove the monthly limit for{" "}
                            <strong>{deleteTarget.category}</strong>?
                        </p>
                        <div className="modal-actions">
                            <button
                                className="btn-secondary"
                                onClick={() => setDeleteTarget(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className="add-tx-btn"
                                style={{ background: "#c44040" }}
                                onClick={handleConfirmDelete}
                                disabled={deleteLoading}
                            >
                                {deleteLoading ? "Deleting..." : "Delete Budget"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
