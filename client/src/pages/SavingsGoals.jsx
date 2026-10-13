import React, { useState, useEffect, useCallback } from "react";
import {
    PiggyBank,
    Plus,
    Target,
    Calendar,
    CheckCircle,
    ArrowUpRight,
    Edit3,
    Trash2,
    X,
    Coins,
    Sparkles,
} from "lucide-react";
import {
    getSavingsGoals,
    createSavingsGoal,
    updateSavingsGoal,
    contributeToGoal,
    deleteSavingsGoal,
} from "../services/savingsService";
import { formatCurrency, formatDate } from "../utils/formatters";
import "../styles/dashboard.css";
import "../styles/budgets.css";

export default function SavingsGoals() {
    const [goalsData, setGoalsData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Create / Edit Modal
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState("create");
    const [currentGoalId, setCurrentGoalId] = useState(null);
    const [name, setName] = useState("");
    const [targetAmount, setTargetAmount] = useState("");
    const [currentAmount, setCurrentAmount] = useState("");
    const [targetDate, setTargetDate] = useState("");
    const [category, setCategory] = useState("General");
    const [notes, setNotes] = useState("");
    const [modalError, setModalError] = useState("");
    const [modalLoading, setModalLoading] = useState(false);

    // Quick Deposit Modal
    const [depositGoal, setDepositGoal] = useState(null);
    const [depositAmount, setDepositAmount] = useState("");
    const [depositLoading, setDepositLoading] = useState(false);
    const [depositError, setDepositError] = useState("");

    // Delete Modal
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const loadGoals = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            const res = await getSavingsGoals();
            if (res.success) {
                setGoalsData(res);
            }
        } catch (err) {
            console.error("Error loading savings goals:", err);
            setError(err.response?.data?.message || err.message || "Failed to load savings goals");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadGoals();
    }, [loadGoals]);

    const handleOpenCreate = () => {
        setModalMode("create");
        setCurrentGoalId(null);
        setName("");
        setTargetAmount("");
        setCurrentAmount("");
        setTargetDate("");
        setCategory("General");
        setNotes("");
        setModalError("");
        setShowModal(true);
    };

    const handleOpenEdit = (goal) => {
        setModalMode("edit");
        setCurrentGoalId(goal.id);
        setName(goal.name);
        setTargetAmount(goal.targetAmount);
        setCurrentAmount(goal.currentAmount);
        setTargetDate(goal.targetDate ? goal.targetDate.split("T")[0] : "");
        setCategory(goal.category || "General");
        setNotes(goal.notes || "");
        setModalError("");
        setShowModal(true);
    };

    const handleSaveGoal = async (e) => {
        e.preventDefault();
        setModalError("");

        const target = Number(targetAmount);
        if (!target || target <= 0) {
            setModalError("Please enter a valid target amount greater than 0");
            return;
        }

        if (!name.trim()) {
            setModalError("Goal name is required");
            return;
        }

        if (!targetDate) {
            setModalError("Target date is required");
            return;
        }

        try {
            setModalLoading(true);
            const payload = {
                name: name.trim(),
                targetAmount: target,
                currentAmount: Number(currentAmount) || 0,
                targetDate,
                category,
                notes,
            };

            if (modalMode === "create") {
                await createSavingsGoal(payload);
            } else {
                await updateSavingsGoal(currentGoalId, payload);
            }

            setShowModal(false);
            loadGoals();
        } catch (err) {
            setModalError(err.response?.data?.message || "Failed to save savings goal");
        } finally {
            setModalLoading(false);
        }
    };

    const handleDepositSubmit = async (e) => {
        e.preventDefault();
        setDepositError("");
        const num = Number(depositAmount);
        if (!num || num <= 0) {
            setDepositError("Please enter a contribution amount greater than 0");
            return;
        }

        try {
            setDepositLoading(true);
            await contributeToGoal(depositGoal.id, num);
            setDepositGoal(null);
            setDepositAmount("");
            loadGoals();
        } catch (err) {
            setDepositError(err.response?.data?.message || "Failed to add contribution");
        } finally {
            setDepositLoading(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            setDeleteLoading(true);
            await deleteSavingsGoal(deleteTarget.id);
            setDeleteTarget(null);
            loadGoals();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to delete savings goal");
        } finally {
            setDeleteLoading(false);
        }
    };

    const summary = goalsData?.summary || {
        totalGoals: 0,
        totalTarget: 0,
        totalSaved: 0,
        totalRemaining: 0,
        overallProgress: 0,
        totalRequiredMonthly: 0,
    };
    const goals = goalsData?.goals || [];

    return (
        <div className="budgets-page">
            {/* Header */}
            <div className="budget-header-strip">
                <div>
                    <h2 className="page-title">Savings Goals</h2>
                    <p className="page-subtitle">
                        Build your wealth systematically and track progress towards life milestones
                    </p>
                </div>

                <div className="budget-header-actions">
                    <button className="add-tx-btn" onClick={handleOpenCreate}>
                        <Plus size={16} />
                        <span>New Savings Goal</span>
                    </button>
                </div>
            </div>

            {error && (
                <div className="glass-card" style={{ padding: "20px", color: "#c45e5e", marginBottom: "20px" }}>
                    {error}
                </div>
            )}

            {/* Summary Banner */}
            <div className="glass-card budget-summary-banner" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                <div className="summary-banner-item">
                    <span>Total Target Capital</span>
                    <strong>{formatCurrency(summary.totalTarget)}</strong>
                </div>

                <div className="summary-banner-item">
                    <span>Total Saved to Date</span>
                    <strong style={{ color: "#3d9d52" }}>
                        {formatCurrency(summary.totalSaved)}
                    </strong>
                </div>

                <div className="summary-banner-item">
                    <span>Total Remaining</span>
                    <strong style={{ color: "#78827b" }}>
                        {formatCurrency(summary.totalRemaining)}
                    </strong>
                </div>

                <div className="summary-banner-item">
                    <span>Monthly Contribution Needed</span>
                    <strong style={{ color: "#55ad69" }}>
                        {formatCurrency(summary.totalRequiredMonthly)}/mo
                    </strong>
                </div>

                <div className="summary-banner-progress" style={{ gridColumn: "1 / -1", marginTop: "10px" }}>
                    <div className="progress-labels">
                        <span>Overall Portfolio Progress</span>
                        <strong>{summary.overallProgress}%</strong>
                    </div>
                    <div className="overall-progress-bar">
                        <div
                            className="overall-fill fill-good"
                            style={{ width: `${Math.min(100, summary.overallProgress)}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Goals Cards Grid */}
            {loading ? (
                <div className="glass-card" style={{ padding: "40px", textAlign: "center" }}>
                    <p style={{ color: "var(--text-secondary)" }}>Loading your savings goals...</p>
                </div>
            ) : goals.length === 0 ? (
                <div className="glass-card empty-state-box" style={{ padding: "40px", textAlign: "center" }}>
                    <PiggyBank size={48} style={{ margin: "0 auto 16px", color: "#55ad69" }} />
                    <h3>No Savings Goals Configured Yet</h3>
                    <p style={{ color: "var(--text-secondary)", maxWidth: "460px", margin: "8px auto 20px" }}>
                        Create a dedicated target for an emergency fund, gadget upgrade, or vacation to calculate required monthly contributions.
                    </p>
                    <button className="add-tx-btn" onClick={handleOpenCreate} style={{ margin: "0 auto" }}>
                        <Plus size={16} />
                        <span>Create Your First Goal</span>
                    </button>
                </div>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px", marginTop: "24px" }}>
                    {goals.map((g) => {
                        const progress = Math.min(100, g.progress);
                        const isDone = g.isCompleted;

                        return (
                            <div
                                key={g.id}
                                className="glass-card"
                                style={{
                                    padding: "24px",
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "space-between",
                                    position: "relative",
                                    border: isDone ? "1px solid rgba(85, 173, 105, 0.4)" : "1px solid rgba(255, 255, 255, 0.08)",
                                }}
                            >
                                <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                                        <div>
                                            <span style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 650, color: "#55ad69", letterSpacing: "0.5px" }}>
                                                {g.category}
                                            </span>
                                            <h3 style={{ fontSize: "18px", fontWeight: 650, marginTop: "4px" }}>
                                                {g.name}
                                            </h3>
                                        </div>

                                        <div style={{ display: "flex", gap: "6px" }}>
                                            <button
                                                className="btn-icon-subtle"
                                                onClick={() => handleOpenEdit(g)}
                                                title="Edit Goal"
                                            >
                                                <Edit3 size={15} />
                                            </button>
                                            <button
                                                className="btn-icon-subtle"
                                                onClick={() => setDeleteTarget(g)}
                                                title="Delete Goal"
                                                style={{ color: "#c45e5e" }}
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Amounts */}
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "16px 0 8px" }}>
                                        <div>
                                            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Saved</span>
                                            <h4 style={{ fontSize: "20px", fontWeight: 700, color: "#3d9d52" }}>
                                                {formatCurrency(g.currentAmount)}
                                            </h4>
                                        </div>
                                        <div style={{ textAlign: "right" }}>
                                            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Target</span>
                                            <h4 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-secondary)" }}>
                                                {formatCurrency(g.targetAmount)}
                                            </h4>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="overall-progress-bar" style={{ height: "10px", margin: "10px 0" }}>
                                        <div
                                            className="overall-fill fill-good"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>

                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "16px" }}>
                                        <span>{progress}% Completed</span>
                                        <span>{formatCurrency(g.remaining)} to go</span>
                                    </div>

                                    {/* Monthly contribution highlight */}
                                    {!isDone ? (
                                        <div
                                            style={{
                                                background: "rgba(85, 173, 105, 0.08)",
                                                border: "1px solid rgba(85, 173, 105, 0.2)",
                                                borderRadius: "10px",
                                                padding: "10px 14px",
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                fontSize: "12px",
                                                marginBottom: "16px",
                                            }}
                                        >
                                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                <Calendar size={14} color="#55ad69" />
                                                <span>Target: {formatDate(g.targetDate)}</span>
                                            </div>
                                            <strong>{formatCurrency(g.requiredMonthlyContribution)}/mo</strong>
                                        </div>
                                    ) : (
                                        <div
                                            style={{
                                                background: "rgba(61, 157, 82, 0.15)",
                                                border: "1px solid rgba(61, 157, 82, 0.3)",
                                                borderRadius: "10px",
                                                padding: "10px 14px",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "8px",
                                                color: "#3d9d52",
                                                fontSize: "13px",
                                                fontWeight: 600,
                                                marginBottom: "16px",
                                            }}
                                        >
                                            <CheckCircle size={16} />
                                            <span>Goal fully achieved! 🎉</span>
                                        </div>
                                    )}

                                    {g.notes && (
                                        <p style={{ fontSize: "12px", color: "var(--text-secondary)", fontStyle: "italic", marginBottom: "16px" }}>
                                            "{g.notes}"
                                        </p>
                                    )}
                                </div>

                                <button
                                    className="view-all-button"
                                    onClick={() => {
                                        setDepositGoal(g);
                                        setDepositAmount("");
                                        setDepositError("");
                                    }}
                                    style={{
                                        width: "100%",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "8px",
                                    }}
                                >
                                    <Coins size={15} />
                                    <span>Add Contribution</span>
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create / Edit Goal Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
                        <div className="modal-header">
                            <h3>{modalMode === "create" ? "New Savings Goal" : "Edit Savings Goal"}</h3>
                            <button className="modal-close-btn" onClick={() => setShowModal(false)}>
                                <X size={18} />
                            </button>
                        </div>

                        {modalError && (
                            <div style={{ color: "#c45e5e", background: "rgba(196,94,94,0.1)", padding: "10px", borderRadius: "8px", marginBottom: "14px", fontSize: "13px" }}>
                                {modalError}
                            </div>
                        )}

                        <form onSubmit={handleSaveGoal}>
                            <div className="form-group" style={{ marginBottom: "14px" }}>
                                <label className="form-label">Goal Name *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g. Emergency Fund, MacBook Pro, Japan Vacation"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                                <div className="form-group">
                                    <label className="form-label">Target Amount (₹) *</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        placeholder="e.g. 150000"
                                        value={targetAmount}
                                        onChange={(e) => setTargetAmount(e.target.value)}
                                        min="1"
                                        step="0.01"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Already Saved (₹)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        placeholder="0"
                                        value={currentAmount}
                                        onChange={(e) => setCurrentAmount(e.target.value)}
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                                <div className="form-group">
                                    <label className="form-label">Target Date *</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={targetDate}
                                        onChange={(e) => setTargetDate(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Category</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g. Safety, Tech, Travel"
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: "20px" }}>
                                <label className="form-label">Notes (Optional)</label>
                                <textarea
                                    className="form-input"
                                    rows="2"
                                    placeholder="Add any notes on strategy, liquid FD, or purpose..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="add-tx-btn" disabled={modalLoading}>
                                    {modalLoading ? "Saving..." : modalMode === "create" ? "Create Goal" : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Quick Deposit Modal */}
            {depositGoal && (
                <div className="modal-overlay" onClick={() => setDepositGoal(null)}>
                    <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "420px" }}>
                        <div className="modal-header">
                            <h3>Contribute to Goal</h3>
                            <button className="modal-close-btn" onClick={() => setDepositGoal(null)}>
                                <X size={18} />
                            </button>
                        </div>

                        <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "16px" }}>
                            Add savings towards <strong>"{depositGoal.name}"</strong>. Current saved: {formatCurrency(depositGoal.currentAmount)}.
                        </p>

                        {depositError && (
                            <div style={{ color: "#c45e5e", background: "rgba(196,94,94,0.1)", padding: "10px", borderRadius: "8px", marginBottom: "14px", fontSize: "13px" }}>
                                {depositError}
                            </div>
                        )}

                        <form onSubmit={handleDepositSubmit}>
                            <div className="form-group" style={{ marginBottom: "20px" }}>
                                <label className="form-label">Contribution Amount (₹) *</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    placeholder="e.g. 5000"
                                    value={depositAmount}
                                    onChange={(e) => setDepositAmount(e.target.value)}
                                    min="1"
                                    step="0.01"
                                    autoFocus
                                    required
                                />
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setDepositGoal(null)}>
                                    Cancel
                                </button>
                                <button type="submit" className="add-tx-btn" disabled={depositLoading}>
                                    {depositLoading ? "Recording..." : "Add Contribution"}
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
                            <h3 style={{ color: "#c45e5e" }}>Delete Savings Goal</h3>
                            <button className="modal-close-btn" onClick={() => setDeleteTarget(null)}>
                                <X size={18} />
                            </button>
                        </div>
                        <p style={{ margin: "16px 0", color: "var(--text-secondary)", fontSize: "14px" }}>
                            Are you sure you want to delete <strong>"{deleteTarget.name}"</strong>? This will remove the goal and its progress tracking.
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
                                {deleteLoading ? "Deleting..." : "Delete Goal"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
