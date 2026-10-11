import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
    TrendingUp,
    TrendingDown,
    Wallet,
    PiggyBank,
    Plus,
    ArrowUpRight,
    ArrowDownLeft,
    Calendar,
    ChevronRight,
} from "lucide-react";
import { getDashboardData } from "../services/dashboardService";
import { formatCurrency, formatDate, getCategoryIcon } from "../utils/formatters";
import TransactionModal from "../components/TransactionModal";
import "../styles/dashboard.css";

export default function Dashboard() {
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [period, setPeriod] = useState("month");

    // Quick Add Transaction Modal State
    const [showAddModal, setShowAddModal] = useState(false);

    const loadDashboard = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            const data = await getDashboardData(period);
            if (data.success) {
                setDashboard(data);
            } else {
                throw new Error(data.message || "Failed to load dashboard data");
            }
        } catch (err) {
            console.error("Dashboard load error:", err);
            setError(
                err.response?.data?.message ||
                err.message ||
                "Unable to load financial data"
            );
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    if (loading && !dashboard) {
        return (
            <div className="dashboard-page">
                <div className="glass-card" style={{ padding: "40px", textAlign: "center" }}>
                    <p style={{ color: "var(--text-secondary, #78827b)", fontSize: "15px" }}>
                        Loading your financial dashboard...
                    </p>
                </div>
            </div>
        );
    }

    if (error && !dashboard) {
        return (
            <div className="dashboard-page">
                <div className="glass-card" style={{ padding: "35px" }}>
                    <h3 style={{ marginBottom: "10px", color: "#c45e5e" }}>
                        Unable to load dashboard
                    </h3>
                    <p style={{ color: "var(--text-secondary, #78827b)", marginBottom: "20px" }}>
                        {error}
                    </p>
                    <button className="view-all-button" onClick={loadDashboard}>
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    const summary = dashboard?.summary || {
        balance: 0,
        totalIncome: 0,
        totalExpenses: 0,
        totalSavings: 0,
    };
    const categoryList = dashboard?.categories || [];
    const transactions = dashboard?.recentTransactions || [];

    const hasNoData =
        summary.totalIncome === 0 &&
        summary.totalExpenses === 0 &&
        transactions.length === 0;

    return (
        <div className="dashboard-page">
            {/* Top Period Selector & Quick Add Button */}
            <div className="dashboard-action-bar">
                <div className="period-selector-pill">
                    <Calendar size={15} />
                    <span>Period:</span>
                    <button
                        className={`period-btn ${period === "week" ? "active" : ""}`}
                        onClick={() => setPeriod("week")}
                    >
                        This Week
                    </button>
                    <button
                        className={`period-btn ${period === "month" ? "active" : ""}`}
                        onClick={() => setPeriod("month")}
                    >
                        This Month
                    </button>
                    <button
                        className={`period-btn ${period === "year" ? "active" : ""}`}
                        onClick={() => setPeriod("year")}
                    >
                        This Year
                    </button>
                    <button
                        className={`period-btn ${period === "all" ? "active" : ""}`}
                        onClick={() => setPeriod("all")}
                    >
                        All Time
                    </button>
                </div>

                <button
                    className="add-tx-btn"
                    onClick={() => setShowAddModal(true)}
                >
                    <Plus size={16} />
                    <span>Add Transaction</span>
                </button>
            </div>

            {/* Summary Cards Grid */}
            <section className="summary-grid">
                {/* Total Balance */}
                <div className="summary-card balance-card">
                    <div className="summary-card-top">
                        <span>Total Balance</span>
                        <div className="summary-icon">
                            <Wallet size={19} />
                        </div>
                    </div>
                    <h2>{formatCurrency(summary.balance)}</h2>
                    <p className={summary.balance >= 0 ? "positive-text" : "negative-text"}>
                        <span>Lifetime Income minus Expenses</span>
                    </p>
                </div>

                {/* Total Income */}
                <div className="summary-card">
                    <div className="summary-card-top">
                        <span>Total Income</span>
                        <div className="summary-icon income-icon">
                            <ArrowDownLeft size={19} />
                        </div>
                    </div>
                    <h2>{formatCurrency(summary.totalIncome)}</h2>
                    <p className="positive-text">
                        <span>All recorded income</span>
                    </p>
                </div>

                {/* Total Expenses */}
                <div className="summary-card">
                    <div className="summary-card-top">
                        <span>Total Expenses</span>
                        <div className="summary-icon expense-icon">
                            <ArrowUpRight size={19} />
                        </div>
                    </div>
                    <h2>{formatCurrency(summary.totalExpenses)}</h2>
                    <p className="negative-text">
                        <span>All recorded expenses</span>
                    </p>
                </div>

                {/* Net Savings */}
                <div className="summary-card">
                    <div className="summary-card-top">
                        <span>Total Savings</span>
                        <div className="summary-icon savings-icon">
                            <PiggyBank size={19} />
                        </div>
                    </div>
                    <h2>{formatCurrency(summary.totalSavings)}</h2>
                    <p className="positive-text">
                        <span>Calculated from real transactions</span>
                    </p>
                </div>
            </section>

            {/* Empty state for brand new user */}
            {hasNoData && (
                <div className="glass-card empty-state-box">
                    <div className="empty-icon-bubble">✨</div>
                    <h3>Welcome to ExpenseFlow!</h3>
                    <p>
                        You don't have any recorded transactions yet. Start tracking your income
                        and expenses to unlock live financial insights and charts.
                    </p>
                    <button
                        className="add-tx-btn"
                        style={{ margin: "16px auto 0" }}
                        onClick={() => setShowAddModal(true)}
                    >
                        <Plus size={16} />
                        <span>Record Your First Transaction</span>
                    </button>
                </div>
            )}

            {/* Main Content Grid: Spending Breakdown & Categories */}
            <section className="dashboard-grid">
                {/* Spending Overview */}
                <div className="glass-card spending-card">
                    <div className="card-header">
                        <div>
                            <h3>Spending Overview</h3>
                            <p>
                                {period === "week"
                                    ? "This week's"
                                    : period === "year"
                                    ? "This year's"
                                    : period === "all"
                                    ? "All time"
                                    : "This month's"}{" "}
                                category spending
                            </p>
                        </div>
                        <span className="badge-tag">
                            {categoryList.length} categories active
                        </span>
                    </div>

                    {categoryList.length === 0 ? (
                        <div className="card-empty-note">
                            No expenses recorded for this period.
                        </div>
                    ) : (
                        <div className="chart-placeholder">
                            <div
                                className="chart-line"
                                style={{
                                    display: "flex",
                                    alignItems: "flex-end",
                                    justifyContent: "space-around",
                                    gap: "12px",
                                    minHeight: "180px",
                                    padding: "20px 0",
                                }}
                            >
                                {categoryList.slice(0, 7).map((item) => {
                                    const maxVal = Math.max(
                                        ...categoryList.map((c) => c.amount),
                                        1
                                    );
                                    const height = Math.max(12, (item.amount / maxVal) * 150);

                                    return (
                                        <div
                                            key={item.category}
                                            className="chart-bar-col"
                                            style={{
                                                flex: "1",
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                height: "100%",
                                                justifyContent: "flex-end",
                                            }}
                                        >
                                            <div
                                                title={`${item.category}: ${formatCurrency(item.amount)} (${item.percentage}%)`}
                                                style={{
                                                    width: "100%",
                                                    maxWidth: "42px",
                                                    height: `${height}px`,
                                                    background:
                                                        "linear-gradient(to top, #55ad69, #9be0ad)",
                                                    borderRadius: "8px 8px 0 0",
                                                    boxShadow: "0 6px 14px rgba(85, 173, 105, 0.25)",
                                                    transition: "height 0.4s ease",
                                                }}
                                            />
                                        </div>
                                    );
                                })}
                            </div>

                            <div
                                className="chart-labels"
                                style={{
                                    display: "flex",
                                    justifyContent: "space-around",
                                    gap: "8px",
                                    marginTop: "10px",
                                }}
                            >
                                {categoryList.slice(0, 7).map((item) => (
                                    <span
                                        key={item.category}
                                        style={{
                                            flex: "1",
                                            textAlign: "center",
                                            fontSize: "11px",
                                            fontWeight: 550,
                                            color: "var(--text-secondary, #78827b)",
                                            whiteSpace: "nowrap",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                        }}
                                    >
                                        {item.category}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Categories List */}
                <div className="glass-card categories-card">
                    <div className="card-header">
                        <div>
                            <h3>Category Breakdown</h3>
                            <p>Ranked by highest spend</p>
                        </div>
                        <Link to="/categories" className="sublink-btn">
                            Manage
                        </Link>
                    </div>

                    <div className="category-list">
                        {categoryList.length === 0 ? (
                            <div className="card-empty-note">
                                No category spending recorded.
                            </div>
                        ) : (
                            categoryList.slice(0, 5).map((item) => (
                                <div className="category-item" key={item.category}>
                                    <div className="category-left">
                                        <div className="category-icon">
                                            {getCategoryIcon(item.category)}
                                        </div>
                                        <div>
                                            <strong>{item.category}</strong>
                                            <span>{formatCurrency(item.amount)}</span>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                        <strong>{item.percentage}%</strong>
                                        <div className="cat-mini-progress">
                                            <div
                                                className="cat-mini-fill"
                                                style={{ width: `${Math.min(100, item.percentage)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </section>

            {/* Recent Transactions Section */}
            <section className="glass-card transactions-card">
                <div className="card-header">
                    <div>
                        <h3>Recent Transactions</h3>
                        <p>Latest financial activity</p>
                    </div>
                    <Link to="/transactions" className="view-all-button">
                        View All Transactions
                    </Link>
                </div>

                <div className="transactions-list">
                    {transactions.length === 0 ? (
                        <div className="card-empty-note">
                            No transactions recorded yet.
                        </div>
                    ) : (
                        transactions.map((tx) => {
                            const isIncome = tx.type === "income";

                            return (
                                <div className="transaction" key={tx.id}>
                                    <div className="transaction-left">
                                        <div
                                            className={`transaction-icon ${
                                                isIncome ? "income" : "food"
                                            }`}
                                        >
                                            {getCategoryIcon(tx.category)}
                                        </div>
                                        <div>
                                            <strong>
                                                {tx.description || tx.category || "Transaction"}
                                            </strong>
                                            <span>
                                                {tx.category} • {formatDate(tx.date)}
                                                {tx.payment_method ? ` • ${tx.payment_method.toUpperCase()}` : ""}
                                            </span>
                                        </div>
                                    </div>

                                    <strong
                                        className={
                                            isIncome ? "income-amount" : "expense-amount"
                                        }
                                    >
                                        {isIncome ? "+" : "-"}
                                        {formatCurrency(tx.amount)}
                                    </strong>
                                </div>
                            );
                        })
                    )}
                </div>
            </section>

            {/* Add Transaction Modal */}
            <TransactionModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSuccess={loadDashboard}
            />
        </div>
    );
}
