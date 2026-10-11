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
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());

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

    return (
        <div className="budgets-page">
            {/* Header Strip with Month/Year Switcher */}
            <div className="budget-header-strip">
                <div>
                    <h2 className="page-title">Monthly Budgets</h2>
                    <p className="page-subtitle">
                        Set spending limits and keep your expenses under control
                    </p>
                </div>

                <div className="budget-header-actions">
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

            {/* Monthly Budget Summary Banner */}
            <div className="glass-card budget-summary-banner">
                <div className="summary-banner-item">
                    <span>Total Planned Budget</span>
                    <strong>{formatCurrency(summary.totalBudget)}</strong>
                </div>

                <div className="summary-banner-item">
                    <span>Actual Spent</span>
                    <strong style={{ color: "#c45e5e" }}>
                        {formatCurrency(summary.totalSpent)}
                    </strong>
                </div>

                <div className="summary-banner-item">
                    <span>Remaining Allowance</span>
                    <strong
                        style={{
                            color: summary.remaining >= 0 ? "#3d9d52" : "#c45e5e",
                        }}
                    >
                        {formatCurrency(summary.remaining)}
                    </strong>
                </div>

                <div className="summary-banner-progress">
                    <div className="progress-labels">
                        <span>Overall Budget Usage</span>
                        <strong>{summary.percentage}%</strong>
                    </div>
                    <div className="overall-progress-bar">
                        <div
                            className={`overall-fill ${
                                summary.percentage >= 100
                                    ? "fill-danger"
                                    : summary.percentage >= 80
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
            <div className="budgets-grid">
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
                        const isOver = b.status === "exceeded";
                        const isNear = b.status === "warning";

                        return (
                            <div className="glass-card budget-card" key={b.id}>
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
                                                color: isOver
                                                    ? "#c44040"
                                                    : isNear
                                                    ? "#d97706"
                                                    : "#3d9d52",
                                            }}
                                        >
                                            {b.percentage}%
                                        </strong>
                                    </div>
                                    <div className="budget-progress-track">
                                        <div
                                            className={`budget-progress-fill ${
                                                isOver
                                                    ? "fill-danger"
                                                    : isNear
                                                    ? "fill-warning"
                                                    : "fill-good"
                                            }`}
                                            style={{
                                                width: `${Math.min(100, b.percentage)}%`,
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="budget-card-footer">
                                    <div>
                                        <span className="footer-label">Remaining</span>
                                        <strong
                                            style={{
                                                color: b.remaining >= 0 ? "#3d9d52" : "#c44040",
                                            }}
                                        >
                                            {formatCurrency(b.remaining)}
                                        </strong>
                                    </div>

                                    <div>
                                        {isOver && (
                                            <span className="budget-status-pill pill-danger">
                                                <AlertTriangle size={12} /> Exceeded
                                            </span>
                                        )}
                                        {isNear && (
                                            <span className="budget-status-pill pill-warning">
                                                <AlertTriangle size={12} /> Near Limit
                                            </span>
                                        )}
                                        {!isOver && !isNear && (
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
                            <div className="modal-error-alert">{modalError}</div>
                        )}

                        <form onSubmit={handleSubmit} className="modal-form">
                            <div className="form-group">
                                <label>Expense Category *</label>
                                <select
                                    className="form-input"
                                    value={budgetCategory}
                                    onChange={(e) => setBudgetCategory(e.target.value)}
                                    required
                                >
                                    {categories.map((c) => (
                                        <option key={c.id || c.name} value={c.name}>
                                            {c.name}
                                        </option>
                                    ))}
                                    {categories.length === 0 && (
                                        <option value="Food">Food</option>
                                    )}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Monthly Limit Amount (₹) *</label>
                                <input
                                    type="number"
                                    step="1"
                                    min="1"
                                    placeholder="e.g. 5000"
                                    className="form-input"
                                    value={budgetAmount}
                                    onChange={(e) => setBudgetAmount(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn-cancel"
                                    onClick={() => setShowModal(false)}
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
                                        : modalMode === "create"
                                        ? "Save Budget"
                                        : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <div className="modal-overlay">
                    <div className="modal-card" style={{ maxWidth: "400px" }}>
                        <div className="modal-header">
                            <h3>Remove Budget?</h3>
                            <button
                                className="modal-close-btn"
                                onClick={() => setDeleteTarget(null)}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <p
                            style={{
                                color: "var(--text-secondary, #666)",
                                margin: "14px 0",
                                fontSize: "14px",
                                lineHeight: "1.6",
                            }}
                        >
                            Are you sure you want to remove the monthly budget for{" "}
                            <strong>"{deleteTarget.category}"</strong>? Your transaction records
                            will remain untouched.
                        </p>

                        <div className="modal-actions">
                            <button
                                type="button"
                                className="btn-cancel"
                                onClick={() => setDeleteTarget(null)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn-delete-confirm"
                                onClick={handleConfirmDelete}
                                disabled={deleteLoading}
                            >
                                {deleteLoading ? "Removing..." : "Remove Budget"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
