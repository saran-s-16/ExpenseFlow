import React, { useState, useEffect, useCallback } from "react";
import {
    Clock,
    Plus,
    Calendar,
    AlertCircle,
    CheckCircle,
    Edit3,
    Trash2,
    X,
    Repeat,
    Bell,
    ShieldAlert,
} from "lucide-react";
import {
    getRecurringPayments,
    createRecurringPayment,
    updateRecurringPayment,
    deleteRecurringPayment,
} from "../services/recurringService";
import { formatCurrency, formatDate, getCategoryIcon } from "../utils/formatters";
import "../styles/dashboard.css";
import "../styles/budgets.css";

export default function RecurringPayments() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Create / Edit Modal
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState("create");
    const [currentId, setCurrentId] = useState(null);
    const [title, setTitle] = useState("");
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("Bills");
    const [frequency, setFrequency] = useState("monthly");
    const [nextDueDate, setNextDueDate] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("upi");
    const [notes, setNotes] = useState("");
    const [modalError, setModalError] = useState("");
    const [modalLoading, setModalLoading] = useState(false);

    // Delete Modal
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            const res = await getRecurringPayments();
            if (res.success) {
                setData(res);
            }
        } catch (err) {
            console.error("Error loading recurring payments:", err);
            setError(err.response?.data?.message || err.message || "Failed to load recurring payments");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleOpenCreate = () => {
        setModalMode("create");
        setCurrentId(null);
        setTitle("");
        setAmount("");
        setCategory("Bills");
        setFrequency("monthly");
        setNextDueDate("");
        setPaymentMethod("upi");
        setNotes("");
        setModalError("");
        setShowModal(true);
    };

    const handleOpenEdit = (item) => {
        setModalMode("edit");
        setCurrentId(item.id);
        setTitle(item.title);
        setAmount(item.amount);
        setCategory(item.category);
        setFrequency(item.frequency);
        setNextDueDate(item.nextDueDate ? item.nextDueDate.split("T")[0] : "");
        setPaymentMethod(item.paymentMethod || "upi");
        setNotes(item.notes || "");
        setModalError("");
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setModalError("");

        const num = Number(amount);
        if (!num || num <= 0) {
            setModalError("Please enter a valid amount greater than 0");
            return;
        }

        if (!title.trim()) {
            setModalError("Title is required");
            return;
        }

        if (!nextDueDate) {
            setModalError("Next due date is required");
            return;
        }

        try {
            setModalLoading(true);
            const payload = {
                title: title.trim(),
                amount: num,
                category,
                frequency,
                nextDueDate,
                paymentMethod,
                notes,
            };

            if (modalMode === "create") {
                await createRecurringPayment(payload);
            } else {
                await updateRecurringPayment(currentId, payload);
            }

            setShowModal(false);
            loadData();
        } catch (err) {
            setModalError(err.response?.data?.message || "Failed to save recurring payment");
        } finally {
            setModalLoading(false);
        }
    };

    const handleToggleActive = async (item) => {
        try {
            await updateRecurringPayment(item.id, { isActive: !item.isActive });
            loadData();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to toggle status");
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            setDeleteLoading(true);
            await deleteRecurringPayment(deleteTarget.id);
            setDeleteTarget(null);
            loadData();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to delete recurring payment");
        } finally {
            setDeleteLoading(false);
        }
    };

    const summary = data?.summary || {
        totalCount: 0,
        activeCount: 0,
        totalEstimatedMonthly: 0,
    };
    const items = data?.recurringPayments || [];

    return (
        <div className="budgets-page">
            {/* Header Strip */}
            <div className="budget-header-strip">
                <div>
                    <h2 className="page-title">Recurring Payments & Bills</h2>
                    <p className="page-subtitle">
                        Manage recurring rent, utilities, subscriptions, and EMIs in one place
                    </p>
                </div>

                <div className="budget-header-actions">
                    <button className="add-tx-btn" onClick={handleOpenCreate}>
                        <Plus size={16} />
                        <span>Add Recurring Bill</span>
                    </button>
                </div>
            </div>

            {error && (
                <div className="glass-card" style={{ padding: "20px", color: "#c45e5e", marginBottom: "20px" }}>
                    {error}
                </div>
            )}

            {/* Summary Banner */}
            <div className="glass-card budget-summary-banner" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                <div className="summary-banner-item">
                    <span>Estimated Monthly Fixed Outflow</span>
                    <strong style={{ color: "#c45e5e" }}>
                        {formatCurrency(summary.totalEstimatedMonthly)}
                    </strong>
                </div>

                <div className="summary-banner-item">
                    <span>Active Recurring Bills</span>
                    <strong style={{ color: "#3d9d52" }}>
                        {summary.activeCount} of {summary.totalCount} active
                    </strong>
                </div>

                <div className="summary-banner-item">
                    <span>Annual Projected Fixed Cost</span>
                    <strong style={{ color: "var(--text-primary)" }}>
                        {formatCurrency(summary.totalEstimatedMonthly * 12)}
                    </strong>
                </div>
            </div>

            {/* In-app Reminder Disclaimer Banner */}
            <div
                style={{
                    background: "rgba(59, 130, 246, 0.08)",
                    border: "1px solid rgba(59, 130, 246, 0.2)",
                    borderRadius: "12px",
                    padding: "12px 18px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    margin: "18px 0 24px",
                    fontSize: "13px",
                    color: "var(--text-secondary)",
                }}
            >
                <Bell size={18} color="#3b82f6" style={{ flexShrink: 0 }} />
                <span>
                    <strong>In-App Schedule Tracker:</strong> Recurring payments calculate your monthly committed budget and track upcoming due dates inside ExpenseFlow. External SMS/Email alerts are not dispatched.
                </span>
            </div>

            {/* List */}
            {loading ? (
                <div className="glass-card" style={{ padding: "40px", textAlign: "center" }}>
                    <p style={{ color: "var(--text-secondary)" }}>Loading recurring payments...</p>
                </div>
            ) : items.length === 0 ? (
                <div className="glass-card empty-state-box" style={{ padding: "40px", textAlign: "center" }}>
                    <Repeat size={48} style={{ margin: "0 auto 16px", color: "#55ad69" }} />
                    <h3>No Recurring Payments Recorded</h3>
                    <p style={{ color: "var(--text-secondary)", maxWidth: "460px", margin: "8px auto 20px" }}>
                        Add apartment rent, fiber broadband, electricity, mobile recharges, or streaming subscriptions to forecast fixed expenses.
                    </p>
                    <button className="add-tx-btn" onClick={handleOpenCreate} style={{ margin: "0 auto" }}>
                        <Plus size={16} />
                        <span>Add First Recurring Payment</span>
                    </button>
                </div>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
                    {items.map((item) => {
                        const dueDate = new Date(item.nextDueDate);
                        const today = new Date();
                        const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

                        return (
                            <div
                                key={item.id}
                                className="glass-card"
                                style={{
                                    padding: "22px",
                                    opacity: item.isActive ? 1 : 0.6,
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "space-between",
                                }}
                            >
                                <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                            <div className="category-icon" style={{ width: "36px", height: "36px" }}>
                                                {getCategoryIcon(item.category)}
                                            </div>
                                            <div>
                                                <h4 style={{ fontSize: "16px", fontWeight: 650, margin: 0 }}>
                                                    {item.title}
                                                </h4>
                                                <span style={{ fontSize: "12px", color: "var(--text-secondary)", textTransform: "capitalize" }}>
                                                    {item.category} • {item.frequency}
                                                </span>
                                            </div>
                                        </div>

                                        <div style={{ display: "flex", gap: "6px" }}>
                                            <button
                                                className="btn-icon-subtle"
                                                onClick={() => handleOpenEdit(item)}
                                                title="Edit"
                                            >
                                                <Edit3 size={15} />
                                            </button>
                                            <button
                                                className="btn-icon-subtle"
                                                onClick={() => setDeleteTarget(item)}
                                                title="Delete"
                                                style={{ color: "#c45e5e" }}
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Amount */}
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "14px 0" }}>
                                        <h3 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)" }}>
                                            {formatCurrency(item.amount)}
                                        </h3>
                                        <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                                            via {item.paymentMethod.toUpperCase()}
                                        </span>
                                    </div>

                                    {/* Next due date & status */}
                                    <div
                                        style={{
                                            background: "rgba(255, 255, 255, 0.04)",
                                            borderRadius: "8px",
                                            padding: "10px 12px",
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            fontSize: "12px",
                                            marginBottom: "14px",
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                            <Clock size={14} color="#55ad69" />
                                            <span>Next Due: <strong>{formatDate(item.nextDueDate)}</strong></span>
                                        </div>
                                        <span
                                            style={{
                                                fontSize: "11px",
                                                fontWeight: 650,
                                                padding: "3px 8px",
                                                borderRadius: "6px",
                                                background: diffDays <= 5 ? "rgba(239,68,68,0.15)" : "rgba(85,173,105,0.15)",
                                                color: diffDays <= 5 ? "#ef4444" : "#55ad69",
                                            }}
                                        >
                                            {diffDays < 0 ? "Past due" : diffDays === 0 ? "Due today" : `In ${diffDays} days`}
                                        </span>
                                    </div>

                                    {item.notes && (
                                        <p style={{ fontSize: "12px", color: "var(--text-secondary)", fontStyle: "italic", marginBottom: "14px" }}>
                                            "{item.notes}"
                                        </p>
                                    )}
                                </div>

                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                                    <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                                        Status: <strong>{item.isActive ? "Active Commitment" : "Paused"}</strong>
                                    </span>
                                    <button
                                        onClick={() => handleToggleActive(item)}
                                        style={{
                                            background: "transparent",
                                            border: "none",
                                            color: item.isActive ? "#55ad69" : "var(--text-secondary)",
                                            fontSize: "12px",
                                            fontWeight: 600,
                                            cursor: "pointer",
                                        }}
                                    >
                                        {item.isActive ? "Pause" : "Resume"}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
                        <div className="modal-header">
                            <h3>{modalMode === "create" ? "Add Recurring Payment" : "Edit Recurring Payment"}</h3>
                            <button className="modal-close-btn" onClick={() => setShowModal(false)}>
                                <X size={18} />
                            </button>
                        </div>

                        {modalError && (
                            <div style={{ color: "#c45e5e", background: "rgba(196,94,94,0.1)", padding: "10px", borderRadius: "8px", marginBottom: "14px", fontSize: "13px" }}>
                                {modalError}
                            </div>
                        )}

                        <form onSubmit={handleSave}>
                            <div className="form-group" style={{ marginBottom: "14px" }}>
                                <label className="form-label">Title / Service *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g. Apartment Rent, Airtel Fiber, Netflix"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                />
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                                <div className="form-group">
                                    <label className="form-label">Amount (₹) *</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        placeholder="e.g. 15000"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        min="1"
                                        step="0.01"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Category</label>
                                    <select
                                        className="form-input"
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                    >
                                        <option value="Rent">Rent</option>
                                        <option value="Bills">Bills / Utilities</option>
                                        <option value="Subscriptions">Subscriptions</option>
                                        <option value="Transport">Transport / Fuel</option>
                                        <option value="Health">Health / Insurance</option>
                                        <option value="Education">Education / EMI</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                                <div className="form-group">
                                    <label className="form-label">Frequency</label>
                                    <select
                                        className="form-input"
                                        value={frequency}
                                        onChange={(e) => setFrequency(e.target.value)}
                                    >
                                        <option value="monthly">Monthly</option>
                                        <option value="yearly">Yearly</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="quarterly">Quarterly</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Next Due Date *</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={nextDueDate}
                                        onChange={(e) => setNextDueDate(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: "14px" }}>
                                <label className="form-label">Payment Method</label>
                                <select
                                    className="form-input"
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                >
                                    <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                                    <option value="bank_transfer">Direct Bank Transfer (NEFT / IMPS)</option>
                                    <option value="card">Credit / Debit Card</option>
                                    <option value="cash">Cash</option>
                                </select>
                            </div>

                            <div className="form-group" style={{ marginBottom: "20px" }}>
                                <label className="form-label">Notes (Optional)</label>
                                <textarea
                                    className="form-input"
                                    rows="2"
                                    placeholder="Account details, policy number, or payment link notes..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="add-tx-btn" disabled={modalLoading}>
                                    {modalLoading ? "Saving..." : modalMode === "create" ? "Add Bill" : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {deleteTarget && (
                <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
                    <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "400px" }}>
                        <div className="modal-header">
                            <h3 style={{ color: "#c45e5e" }}>Delete Recurring Bill</h3>
                            <button className="modal-close-btn" onClick={() => setDeleteTarget(null)}>
                                <X size={18} />
                            </button>
                        </div>
                        <p style={{ margin: "16px 0", color: "var(--text-secondary)", fontSize: "14px" }}>
                            Are you sure you want to delete <strong>"{deleteTarget.title}"</strong>?
                        </p>
                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>
                                Cancel
                            </button>
                            <button
                                className="add-tx-btn"
                                style={{ background: "#c45e5e" }}
                                onClick={handleConfirmDelete}
                                disabled={deleteLoading}
                            >
                                {deleteLoading ? "Deleting..." : "Delete Bill"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
