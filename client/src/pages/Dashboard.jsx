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
    AlertTriangle,
    CheckCircle2,
    Sparkles,
    BarChart3,
    Activity,
    LineChart,
    Search,
    ChevronLeft,
    ShieldAlert,
} from "lucide-react";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
} from "recharts";
import { getDashboardData } from "../services/dashboardService";
import { formatCurrency, formatDate, getCategoryIcon } from "../utils/formatters";
import TransactionModal from "../components/TransactionModal";
import "../styles/dashboard.css";
import "../styles/budgets.css";

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

export default function Dashboard() {
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [period, setPeriod] = useState("month");
    const [selectedMonth, setSelectedMonth] = useState(9); // Default to 9 (September 2026 Demo)
    const [selectedYear, setSelectedYear] = useState(2026);

    // Quick Add Transaction Modal State
    const [showAddModal, setShowAddModal] = useState(false);

    // Recent Transactions search & pagination state
    const [txSearch, setTxSearch] = useState("");
    const [txPage, setTxPage] = useState(1);
    const txPerPage = 5;

    const loadDashboard = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            const params = { period };
            if (period === "month") {
                params.month = selectedMonth;
                params.year = selectedYear;
            }
            const data = await getDashboardData(params);
            if (data.success) {
                setDashboard(data);
                if (data.filter?.month && period === "month") {
                    setSelectedMonth(data.filter.month);
                    setSelectedYear(data.filter.year);
                }
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
    }, [period, selectedMonth, selectedYear]);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    if (loading && !dashboard) {
        return (
            <div className="dashboard-page">
                <div className="glass-card" style={{ padding: "40px", textAlign: "center" }}>
                    <p style={{ color: "var(--text-secondary)", fontSize: "15px" }}>
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
                    <p style={{ color: "var(--text-secondary)", marginBottom: "20px" }}>
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
        periodIncome: 0,
        periodExpenses: 0,
        periodSavings: 0,
        periodSavingsRate: 0,
    };
    const comparison = dashboard?.comparison || {
        prevIncome: 0,
        prevExpenses: 0,
        expenseChangeDiff: 0,
        expenseChangePercent: 0,
    };
    const categoryList = dashboard?.categories || [];
    const transactions = dashboard?.recentTransactions || [];
    const dailyTrends = dashboard?.dailyTrends || [];
    const budgetOverview = dashboard?.budgetOverview || {
        totalBudget: 0,
        totalSpent: 0,
        remaining: 0,
        percentage: 0,
        alerts: [],
    };
    const insights = dashboard?.insights || {
        metrics: [],
        dailyAvgSpend: 0,
        suggestedDailyAllowance: 0,
        estimatedMonthEndExpense: 0,
    };
    const portfolioSummary = dashboard?.portfolioSummary || {
        netInvested: 0,
        activeStocks: 0,
    };

    // Filter recent transactions
    const filteredTx = transactions.filter((tx) => {
        const q = txSearch.toLowerCase();
        return (
            (tx.description || "").toLowerCase().includes(q) ||
            (tx.category || "").toLowerCase().includes(q)
        );
    });

    const paginatedTx = filteredTx.slice((txPage - 1) * txPerPage, txPage * txPerPage);
    const totalTxPages = Math.ceil(filteredTx.length / txPerPage) || 1;

    const hasNoData =
        summary.totalIncome === 0 &&
        summary.totalExpenses === 0 &&
        transactions.length === 0;

    return (
        <div className="dashboard-page">
            {/* Top Period Selector Bar */}
            <div className="dashboard-action-bar" style={{ flexWrap: "wrap", gap: "12px" }}>
                <div className="period-selector-pill" style={{ flexWrap: "wrap" }}>
                    <Calendar size={15} />
                    <span>Period:</span>

                    <button
                        className={`period-btn ${period === "month" && selectedMonth === 9 && selectedYear === 2026 ? "active" : ""}`}
                        onClick={() => {
                            setPeriod("month");
                            setSelectedMonth(9);
                            setSelectedYear(2026);
                        }}
                    >
                        ⭐ September 2026 (Demo)
                    </button>

                    <button
                        className={`period-btn ${period === "week" ? "active" : ""}`}
                        onClick={() => setPeriod("week")}
                    >
                        This Week
                    </button>

                    <button
                        className={`period-btn ${period === "month" && (selectedMonth !== 9 || selectedYear !== 2026) ? "active" : ""}`}
                        onClick={() => {
                            setPeriod("month");
                            const curM = new Date().getMonth() + 1;
                            const curY = new Date().getFullYear();
                            setSelectedMonth(curM);
                            setSelectedYear(curY);
                        }}
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

                    {/* Month Picker for targeted views */}
                    {period === "month" && (
                        <div style={{ display: "flex", gap: "6px", marginLeft: "6px", alignItems: "center" }}>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                style={{
                                    background: "rgba(255,255,255,0.06)",
                                    border: "1px solid rgba(255,255,255,0.12)",
                                    color: "var(--text-primary)",
                                    borderRadius: "6px",
                                    padding: "3px 8px",
                                    fontSize: "12px",
                                }}
                            >
                                {MONTH_NAMES.map((name, i) => (
                                    <option key={name} value={i + 1}>
                                        {name}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                style={{
                                    background: "rgba(255,255,255,0.06)",
                                    border: "1px solid rgba(255,255,255,0.12)",
                                    color: "var(--text-primary)",
                                    borderRadius: "6px",
                                    padding: "3px 8px",
                                    fontSize: "12px",
                                }}
                            >
                                <option value={2025}>2025</option>
                                <option value={2026}>2026</option>
                                <option value={2027}>2027</option>
                            </select>
                        </div>
                    )}
                </div>

                <button
                    className="add-tx-btn"
                    onClick={() => setShowAddModal(true)}
                >
                    <Plus size={16} />
                    <span>Add Transaction</span>
                </button>
            </div>

            {/* Financial Health Summary Cards Grid */}
            <section className="summary-grid">
                {/* Total Balance */}
                <div className="summary-card balance-card">
                    <div className="summary-card-top">
                        <span>Total Net Balance</span>
                        <div className="summary-icon">
                            <Wallet size={19} />
                        </div>
                    </div>
                    <h2>{formatCurrency(summary.balance)}</h2>
                    <p className={summary.balance >= 0 ? "positive-text" : "negative-text"}>
                        <span>Lifetime Retained Capital</span>
                    </p>
                </div>

                {/* Period Income */}
                <div className="summary-card">
                    <div className="summary-card-top">
                        <span>{dashboard?.periodLabel} Income</span>
                        <div className="summary-icon income-icon">
                            <ArrowDownLeft size={19} />
                        </div>
                    </div>
                    <h2>{formatCurrency(summary.periodIncome)}</h2>
                    <p className="positive-text">
                        <span>Salary & supplementary earnings</span>
                    </p>
                </div>

                {/* Period Expenses */}
                <div className="summary-card">
                    <div className="summary-card-top">
                        <span>{dashboard?.periodLabel} Expenses</span>
                        <div className="summary-icon expense-icon">
                            <ArrowUpRight size={19} />
                        </div>
                    </div>
                    <h2>{formatCurrency(summary.periodExpenses)}</h2>
                    <p className={comparison.expenseChangePercent > 0 ? "negative-text" : "positive-text"}>
                        <span>
                            {comparison.expenseChangePercent !== 0
                                ? `${comparison.expenseChangePercent > 0 ? "+" : ""}${comparison.expenseChangePercent}% vs previous month`
                                : "All recorded outlays"}
                        </span>
                    </p>
                </div>

                {/* Net Savings & Savings Rate */}
                <div className="summary-card">
                    <div className="summary-card-top">
                        <span>Net Monthly Savings</span>
                        <div className="summary-icon savings-icon">
                            <PiggyBank size={19} />
                        </div>
                    </div>
                    <h2>{formatCurrency(summary.periodSavings)}</h2>
                    <p className="positive-text">
                        <span>
                            <strong>{summary.periodSavingsRate}%</strong> Savings Rate achieved
                        </span>
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

            {/* Smart Financial Insights Strip */}
            {insights.metrics && insights.metrics.length > 0 && (
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                        gap: "14px",
                        margin: "20px 0",
                    }}
                >
                    {insights.metrics.map((ins, idx) => (
                        <div
                            key={idx}
                            className="glass-card"
                            style={{
                                padding: "16px",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                            }}
                        >
                            <span style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 700, color: "#55ad69", letterSpacing: "0.5px" }}>
                                {ins.title}
                            </span>
                            <h4 style={{ fontSize: "17px", fontWeight: 700, margin: "6px 0 2px" }}>
                                {ins.value}
                            </h4>
                            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                                {ins.subtitle}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Middle Grid: Category Spending & Budget Guard Preview */}
            <section className="dashboard-grid">
                {/* Category Breakdown */}
                <div className="glass-card categories-card">
                    <div className="card-header">
                        <div>
                            <h3>Category Spending Breakdown</h3>
                            <p>{dashboard?.periodLabel} rank by highest outflow</p>
                        </div>
                        <Link to="/categories" className="sublink-btn">
                            Manage
                        </Link>
                    </div>

                    <div className="category-list">
                        {categoryList.length === 0 ? (
                            <div className="card-empty-note">
                                No category spending recorded for this period.
                            </div>
                        ) : (
                            categoryList.slice(0, 6).map((item) => (
                                <div className="category-item" key={item.category}>
                                    <div className="category-left">
                                        <div className="category-icon">
                                            {getCategoryIcon(item.category)}
                                        </div>
                                        <div>
                                            <strong>{item.category}</strong>
                                            <span>
                                                {formatCurrency(item.amount)} • {item.transactionCount} tx
                                            </span>
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

                {/* Daily Spending Trend or Budget Guard Preview */}
                <div className="glass-card spending-card">
                    <div className="card-header">
                        <div>
                            <h3>Daily Spending Progression</h3>
                            <p>Day-by-day expense outlays in {dashboard?.periodLabel}</p>
                        </div>
                        <Link to="/analytics" className="sublink-btn">
                            Detailed Analytics
                        </Link>
                    </div>

                    {dailyTrends.length === 0 ? (
                        <div className="card-empty-note">
                            No daily expense trends for this period.
                        </div>
                    ) : (
                        <div style={{ width: "100%", height: 260 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={dailyTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <XAxis dataKey="day" stroke="var(--text-secondary)" fontSize={11} />
                                    <YAxis
                                        stroke="var(--text-secondary)"
                                        fontSize={11}
                                        tickFormatter={(val) => `₹${val}`}
                                    />
                                    <Tooltip
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="custom-chart-tooltip">
                                                        <p className="tooltip-label">Day {payload[0].payload.day}</p>
                                                        <p style={{ color: "#e27c7c", fontWeight: 700 }}>
                                                            Expense: {formatCurrency(payload[0].value)}
                                                        </p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar
                                        dataKey="expense"
                                        fill="#55ad69"
                                        radius={[4, 4, 0, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </section>

            {/* Quick Cards: Budget Guard Alert & Stock Market Portfolio Preview */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                    gap: "20px",
                    margin: "20px 0",
                }}
            >
                {/* Budget Guard Alert Box */}
                <div className="glass-card" style={{ padding: "22px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <ShieldAlert size={18} color="#55ad69" />
                            <h3 style={{ fontSize: "16px", fontWeight: 650 }}>Budget Guard Status</h3>
                        </div>
                        <Link to="/budgets" className="sublink-btn">
                            View Budgets →
                        </Link>
                    </div>

                    <div style={{ marginBottom: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
                            <span style={{ color: "var(--text-secondary)" }}>
                                Overall Budget Used: {formatCurrency(budgetOverview.totalSpent)} of {formatCurrency(budgetOverview.totalBudget)}
                            </span>
                            <strong>{budgetOverview.percentage}%</strong>
                        </div>
                        <div className="overall-progress-bar" style={{ height: "8px" }}>
                            <div
                                className={`overall-fill ${
                                    budgetOverview.percentage >= 100
                                        ? "fill-danger"
                                        : budgetOverview.percentage >= 85
                                        ? "fill-warning"
                                        : "fill-good"
                                }`}
                                style={{ width: `${Math.min(100, budgetOverview.percentage)}%` }}
                            />
                        </div>
                    </div>

                    {budgetOverview.alerts && budgetOverview.alerts.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
                            {budgetOverview.alerts.slice(0, 3).map((al, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        background: al.type === "danger" ? "rgba(239, 68, 68, 0.1)" : "rgba(217, 119, 6, 0.1)",
                                        border: al.type === "danger" ? "1px solid rgba(239, 68, 68, 0.25)" : "1px solid rgba(217, 119, 6, 0.25)",
                                        borderRadius: "8px",
                                        padding: "8px 12px",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        fontSize: "12px",
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                        <AlertTriangle size={14} color={al.type === "danger" ? "#ef4444" : "#d97706"} />
                                        <strong>{al.category}</strong>
                                    </div>
                                    <span style={{ color: al.type === "danger" ? "#ef4444" : "#d97706", fontWeight: 650 }}>
                                        {al.message}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ fontSize: "13px", color: "#3d9d52", display: "flex", alignItems: "center", gap: "6px", marginTop: "10px" }}>
                            <CheckCircle2 size={16} />
                            <span>All monitored categories are within planned budget limits!</span>
                        </div>
                    )}
                </div>

                {/* Stock Portfolio Preview Card */}
                <div className="glass-card" style={{ padding: "22px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <TrendingUp size={18} color="#10b981" />
                            <h3 style={{ fontSize: "16px", fontWeight: 650 }}>Equity Investments</h3>
                        </div>
                        <Link to="/stocks" className="sublink-btn">
                            Stock Market →
                        </Link>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", margin: "14px 0" }}>
                        <div>
                            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Invested Capital</span>
                            <h4 style={{ fontSize: "18px", fontWeight: 700, marginTop: "2px" }}>
                                {formatCurrency(portfolioSummary.netInvested)}
                            </h4>
                        </div>
                        <div>
                            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Tracked Stocks</span>
                            <h4 style={{ fontSize: "18px", fontWeight: 700, marginTop: "2px", color: "#10b981" }}>
                                {portfolioSummary.activeStocks} Blue-Chips
                            </h4>
                        </div>
                    </div>

                    <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "10px 0 0" }}>
                        Monitor live NIFTY 50 & SENSEX benchmarks, manage stock purchases, and review portfolio allocation.
                    </p>
                </div>
            </div>

            {/* Recent Transactions Section with Search & Pagination */}
            <section className="glass-card transactions-card">
                <div className="card-header" style={{ flexWrap: "wrap", gap: "12px" }}>
                    <div>
                        <h3>Recent Transactions</h3>
                        <p>Latest ledger movements ({filteredTx.length} total)</p>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ position: "relative" }}>
                            <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Search recent..."
                                value={txSearch}
                                onChange={(e) => {
                                    setTxSearch(e.target.value);
                                    setTxPage(1);
                                }}
                                style={{ paddingLeft: "32px", height: "34px", fontSize: "12px", width: "160px" }}
                            />
                        </div>

                        <Link to="/transactions" className="view-all-button">
                            View All Transactions
                        </Link>
                    </div>
                </div>

                <div className="transactions-list">
                    {paginatedTx.length === 0 ? (
                        <div className="card-empty-note">
                            {txSearch ? `No transactions matching "${txSearch}".` : "No transactions recorded yet."}
                        </div>
                    ) : (
                        paginatedTx.map((tx) => {
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

                {/* Pagination Controls */}
                {totalTxPages > 1 && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: "12px" }}>
                        <span style={{ color: "var(--text-secondary)" }}>
                            Page {txPage} of {totalTxPages}
                        </span>
                        <div style={{ display: "flex", gap: "6px" }}>
                            <button
                                className="btn-secondary"
                                onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                                disabled={txPage === 1}
                                style={{ padding: "4px 10px", fontSize: "12px" }}
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <button
                                className="btn-secondary"
                                onClick={() => setTxPage((p) => Math.min(totalTxPages, p + 1))}
                                disabled={txPage === totalTxPages}
                                style={{ padding: "4px 10px", fontSize: "12px" }}
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </section>

            {/* Quick Add Transaction Modal */}
            <TransactionModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSuccess={loadDashboard}
            />
        </div>
    );
}
