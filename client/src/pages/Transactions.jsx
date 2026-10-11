import React, { useState, useEffect, useCallback } from "react";
import {
    Plus,
    Search,
    Filter,
    Edit3,
    Trash2,
    Calendar,
    ArrowUpRight,
    ArrowDownLeft,
    X,
    ChevronLeft,
    ChevronRight,
    SlidersHorizontal,
    FileText,
} from "lucide-react";
import {
    getTransactions,
    deleteTransaction,
} from "../services/transactionService";
import { getCategories } from "../services/categoryService";
import { formatCurrency, formatDate, getCategoryIcon } from "../utils/formatters";
import TransactionModal from "../components/TransactionModal";
import "../styles/transactions.css";

export default function Transactions() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [categories, setCategories] = useState([]);

    // Filter and search state
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [paymentFilter, setPaymentFilter] = useState("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [sortBy, setSortBy] = useState("date");
    const [sortOrder, setSortOrder] = useState("DESC");
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 15 });

    // Modals
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState("create"); // "create" or "edit"
    const [editingTx, setEditingTx] = useState(null);
    const [txType, setTxType] = useState("expense");

    // Delete Modal State
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Detail View Modal State
    const [detailTarget, setDetailTarget] = useState(null);

    // Fetch categories
    useEffect(() => {
        getCategories()
            .then((res) => {
                if (res.success && res.categories) {
                    setCategories(res.categories);
                }
            })
            .catch((e) => console.error("Error loading categories:", e));
    }, []);

    // Load transactions
    const loadTransactions = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            const params = {
                page,
                limit: 15,
                sortBy,
                sortOrder,
            };
            if (search.trim()) params.search = search.trim();
            if (typeFilter !== "all") params.type = typeFilter;
            if (categoryFilter !== "all") params.category = categoryFilter;
            if (paymentFilter !== "all") params.paymentMethod = paymentFilter;
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;

            const res = await getTransactions(params);
            if (res.success) {
                setTransactions(res.transactions || []);
                setPagination(res.pagination || { total: 0, totalPages: 1, limit: 15 });
            }
        } catch (err) {
            console.error("Failed to load transactions:", err);
            setError(
                err.response?.data?.message ||
                err.message ||
                "Unable to retrieve transactions"
            );
        } finally {
            setLoading(false);
        }
    }, [page, sortBy, sortOrder, search, typeFilter, categoryFilter, paymentFilter, startDate, endDate]);

    useEffect(() => {
        loadTransactions();
    }, [loadTransactions]);

    // Handle Open Create Modal
    const handleOpenCreate = (initialType = "expense") => {
        setModalMode("create");
        setEditingTx(null);
        setTxType(initialType);
        setShowModal(true);
    };

    // Handle Open Edit Modal
    const handleOpenEdit = (tx) => {
        setModalMode("edit");
        setEditingTx(tx);
        setTxType(tx.type);
        setShowModal(true);
    };

    // Confirm Delete
    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            setDeleteLoading(true);
            await deleteTransaction(deleteTarget.id);
            setDeleteTarget(null);
            loadTransactions();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to delete transaction");
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleClearFilters = () => {
        setSearch("");
        setTypeFilter("all");
        setCategoryFilter("all");
        setPaymentFilter("all");
        setStartDate("");
        setEndDate("");
        setSortBy("date");
        setSortOrder("DESC");
        setPage(1);
    };

    const activeFilterCount =
        (search ? 1 : 0) +
        (typeFilter !== "all" ? 1 : 0) +
        (categoryFilter !== "all" ? 1 : 0) +
        (paymentFilter !== "all" ? 1 : 0) +
        (startDate ? 1 : 0) +
        (endDate ? 1 : 0);

    return (
        <div className="transactions-page">
            {/* Page Header and Action Buttons */}
            <div className="tx-header-strip">
                <div>
                    <h2 className="page-title">Transactions</h2>
                    <p className="page-subtitle">
                        Manage, search, and track all your income and expenses
                    </p>
                </div>
                <div className="tx-header-actions">
                    <button
                        className="btn-income-action"
                        onClick={() => handleOpenCreate("income")}
                    >
                        <ArrowDownLeft size={16} />
                        <span>Add Income</span>
                    </button>
                    <button
                        className="btn-expense-action"
                        onClick={() => handleOpenCreate("expense")}
                    >
                        <Plus size={16} />
                        <span>Add Expense</span>
                    </button>
                </div>
            </div>

            {/* Filter and Search Bar Card */}
            <div className="glass-card tx-filter-card">
                <div className="filter-top-row">
                    <div className="search-input-wrap">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search description, category, or notes..."
                            className="search-input"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                        />
                        {search && (
                            <button
                                className="search-clear-btn"
                                onClick={() => setSearch("")}
                            >
                                <X size={15} />
                            </button>
                        )}
                    </div>

                    <div className="filter-select-group">
                        <select
                            className="filter-select"
                            value={typeFilter}
                            onChange={(e) => {
                                setTypeFilter(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="all">All Types</option>
                            <option value="expense">Expenses Only</option>
                            <option value="income">Income Only</option>
                        </select>

                        <select
                            className="filter-select"
                            value={categoryFilter}
                            onChange={(e) => {
                                setCategoryFilter(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="all">All Categories</option>
                            {categories.map((c) => (
                                <option key={c.id || c.name} value={c.name}>
                                    {c.name} ({c.type})
                                </option>
                            ))}
                        </select>

                        <select
                            className="filter-select"
                            value={paymentFilter}
                            onChange={(e) => {
                                setPaymentFilter(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="all">All Payment Methods</option>
                            <option value="cash">Cash</option>
                            <option value="upi">UPI</option>
                            <option value="card">Card</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                </div>

                <div className="filter-bottom-row">
                    <div className="date-filter-group">
                        <label>From:</label>
                        <input
                            type="date"
                            className="date-input"
                            value={startDate}
                            onChange={(e) => {
                                setStartDate(e.target.value);
                                setPage(1);
                            }}
                        />
                        <label>To:</label>
                        <input
                            type="date"
                            className="date-input"
                            value={endDate}
                            onChange={(e) => {
                                setEndDate(e.target.value);
                                setPage(1);
                            }}
                        />
                    </div>

                    <div className="sort-group">
                        <label>Sort By:</label>
                        <select
                            className="filter-select mini-select"
                            value={`${sortBy}-${sortOrder}`}
                            onChange={(e) => {
                                const [col, ord] = e.target.value.split("-");
                                setSortBy(col);
                                setSortOrder(ord);
                            }}
                        >
                            <option value="date-DESC">Date: Newest First</option>
                            <option value="date-ASC">Date: Oldest First</option>
                            <option value="amount-DESC">Amount: Highest First</option>
                            <option value="amount-ASC">Amount: Lowest First</option>
                        </select>

                        {activeFilterCount > 0 && (
                            <button
                                className="btn-clear-filters"
                                onClick={handleClearFilters}
                            >
                                Reset ({activeFilterCount})
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="glass-card" style={{ padding: "20px", color: "#c45e5e" }}>
                    {error}
                </div>
            )}

            {/* Transactions Table / List Card */}
            <div className="glass-card tx-table-card">
                <div className="tx-count-banner">
                    <span>
                        Showing {transactions.length} of {pagination.total} transaction
                        {pagination.total === 1 ? "" : "s"}
                    </span>
                </div>

                {loading ? (
                    <div className="tx-loading-state">Loading transactions...</div>
                ) : transactions.length === 0 ? (
                    <div className="tx-empty-state">
                        <div className="empty-icon-circle">📂</div>
                        <h3>No transactions found</h3>
                        <p>
                            {activeFilterCount > 0
                                ? "Try adjusting or clearing your filters to see results."
                                : "You haven't recorded any transactions yet."}
                        </p>
                        {activeFilterCount > 0 ? (
                            <button
                                className="btn-secondary"
                                onClick={handleClearFilters}
                            >
                                Clear All Filters
                            </button>
                        ) : (
                            <button
                                className="btn-primary"
                                onClick={() => handleOpenCreate("expense")}
                            >
                                Add Your First Transaction
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="tx-table-container">
                        <table className="tx-table">
                            <thead>
                                <tr>
                                    <th>Transaction</th>
                                    <th>Category</th>
                                    <th>Date</th>
                                    <th>Method</th>
                                    <th style={{ textAlign: "right" }}>Amount</th>
                                    <th style={{ textAlign: "center" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((tx) => {
                                    const isIncome = tx.type === "income";

                                    return (
                                        <tr key={tx.id} className="tx-row">
                                            <td>
                                                <div className="tx-cell-title">
                                                    <div
                                                        className={`tx-type-pill ${
                                                            isIncome
                                                                ? "pill-income"
                                                                : "pill-expense"
                                                        }`}
                                                    >
                                                        {getCategoryIcon(tx.category)}
                                                    </div>
                                                    <div>
                                                        <strong>
                                                            {tx.description || tx.category}
                                                        </strong>
                                                        {tx.notes && (
                                                            <span
                                                                className="tx-cell-notes"
                                                                title={tx.notes}
                                                            >
                                                                {tx.notes}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            <td>
                                                <span className="category-tag">
                                                    {tx.category}
                                                </span>
                                            </td>

                                            <td>
                                                <span className="date-tag">
                                                    {formatDate(tx.date)}
                                                </span>
                                            </td>

                                            <td>
                                                <span className="payment-badge">
                                                    {(tx.payment_method || "cash").toUpperCase()}
                                                </span>
                                            </td>

                                            <td style={{ textAlign: "right" }}>
                                                <strong
                                                    className={
                                                        isIncome
                                                            ? "income-amount"
                                                            : "expense-amount"
                                                    }
                                                >
                                                    {isIncome ? "+" : "-"}
                                                    {formatCurrency(tx.amount)}
                                                </strong>
                                            </td>

                                            <td>
                                                <div className="actions-cell">
                                                    <button
                                                        className="action-icon-btn"
                                                        title="View details"
                                                        onClick={() => setDetailTarget(tx)}
                                                    >
                                                        <FileText size={16} />
                                                    </button>
                                                    <button
                                                        className="action-icon-btn"
                                                        title="Edit transaction"
                                                        onClick={() => handleOpenEdit(tx)}
                                                    >
                                                        <Edit3 size={16} />
                                                    </button>
                                                    <button
                                                        className="action-icon-btn delete"
                                                        title="Delete transaction"
                                                        onClick={() => setDeleteTarget(tx)}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination Controls */}
                {pagination.totalPages > 1 && (
                    <div className="pagination-bar">
                        <span className="pagination-info">
                            Page {pagination.page} of {pagination.totalPages}
                        </span>
                        <div className="pagination-buttons">
                            <button
                                className="pagination-btn"
                                disabled={pagination.page <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                            >
                                <ChevronLeft size={16} />
                                <span>Previous</span>
                            </button>
                            <button
                                className="pagination-btn"
                                disabled={pagination.page >= pagination.totalPages}
                                onClick={() =>
                                    setPage((p) =>
                                        Math.min(pagination.totalPages, p + 1)
                                    )
                                }
                            >
                                <span>Next</span>
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create / Edit Modal */}
            <TransactionModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onSuccess={loadTransactions}
                categories={categories}
                mode={modalMode}
                initialType={txType}
                transaction={editingTx}
            />

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <div className="modal-overlay">
                    <div className="modal-card" style={{ maxWidth: "420px" }}>
                        <div className="modal-header">
                            <h3>Delete Transaction?</h3>
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
                                margin: "16px 0",
                                fontSize: "14px",
                                lineHeight: "1.6",
                            }}
                        >
                            Are you sure you want to permanently delete{" "}
                            <strong>
                                "{deleteTarget.description || deleteTarget.category}"
                            </strong>{" "}
                            for{" "}
                            <strong>{formatCurrency(deleteTarget.amount)}</strong>?
                            This action cannot be undone.
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
                                {deleteLoading ? "Deleting..." : "Delete Transaction"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail View Modal */}
            {detailTarget && (
                <div className="modal-overlay">
                    <div className="modal-card" style={{ maxWidth: "440px" }}>
                        <div className="modal-header">
                            <h3>Transaction Details</h3>
                            <button
                                className="modal-close-btn"
                                onClick={() => setDetailTarget(null)}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="detail-modal-body">
                            <div className="detail-header-card">
                                <div
                                    className={`detail-icon-circle ${
                                        detailTarget.type === "income"
                                            ? "pill-income"
                                            : "pill-expense"
                                    }`}
                                >
                                    {getCategoryIcon(detailTarget.category)}
                                </div>
                                <h2>{formatCurrency(detailTarget.amount)}</h2>
                                <span
                                    className={`badge-type ${
                                        detailTarget.type === "income"
                                            ? "badge-inc"
                                            : "badge-exp"
                                    }`}
                                >
                                    {detailTarget.type.toUpperCase()}
                                </span>
                            </div>

                            <div className="detail-item">
                                <span>Description</span>
                                <strong>{detailTarget.description}</strong>
                            </div>

                            <div className="detail-item">
                                <span>Category</span>
                                <strong>{detailTarget.category}</strong>
                            </div>

                            <div className="detail-item">
                                <span>Date</span>
                                <strong>{formatDate(detailTarget.date)}</strong>
                            </div>

                            <div className="detail-item">
                                <span>Payment Method</span>
                                <strong>
                                    {(detailTarget.payment_method || "cash").toUpperCase()}
                                </strong>
                            </div>

                            {detailTarget.notes && (
                                <div className="detail-item">
                                    <span>Notes</span>
                                    <p style={{ margin: 0, fontWeight: 500 }}>
                                        {detailTarget.notes}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="modal-actions">
                            <button
                                type="button"
                                className="btn-primary"
                                style={{ width: "100%" }}
                                onClick={() => setDetailTarget(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
