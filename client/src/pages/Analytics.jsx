import React, { useState, useEffect, useCallback } from "react";
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    PiggyBank,
    Download,
    Calendar,
    Sparkles,
    CheckCircle,
    Info,
    AlertCircle,
    Layers,
    Filter,
} from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
    AreaChart,
    Area,
} from "recharts";
import { getAnalytics, downloadCsvExport } from "../services/analyticsService";
import { getCategories } from "../services/categoryService";
import { formatCurrency, getCategoryIcon } from "../utils/formatters";
import "../styles/analytics.css";

const PIE_COLORS = [
    "#55ad69",
    "#3d9d52",
    "#82ca9d",
    "#a4de6c",
    "#d0ed57",
    "#f59e0b",
    "#ec4899",
    "#8b5cf6",
    "#3b82f6",
    "#14b8a6",
    "#f43f5e",
    "#06b6d4",
];

export default function Analytics() {
    // Default to demo_month so the seeded month is immediately showcased
    const [range, setRange] = useState("demo_month");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [selectedType, setSelectedType] = useState("all");
    const [categories, setCategories] = useState([]);

    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [exporting, setExporting] = useState(false);

    // Fetch categories for filter dropdown
    useEffect(() => {
        getCategories()
            .then((res) => {
                if (res.success && res.categories) {
                    setCategories(res.categories);
                }
            })
            .catch((e) => console.error("Error loading categories:", e));
    }, []);

    const loadAnalytics = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            const params = { range };
            if (selectedCategory !== "all") params.category = selectedCategory;
            if (selectedType !== "all") params.type = selectedType;

            const res = await getAnalytics(params);
            if (res.success) {
                setAnalytics(res);
            }
        } catch (err) {
            console.error("Failed to load analytics:", err);
            setError(
                err.response?.data?.message ||
                err.message ||
                "Unable to retrieve analytics data"
            );
        } finally {
            setLoading(false);
        }
    }, [range, selectedCategory, selectedType]);

    useEffect(() => {
        loadAnalytics();
    }, [loadAnalytics]);

    const handleExport = async () => {
        try {
            setExporting(true);
            const params = { range };
            if (selectedCategory !== "all") params.category = selectedCategory;
            if (selectedType !== "all") params.type = selectedType;
            await downloadCsvExport(params);
        } catch (err) {
            alert(err.message || "Failed to download CSV export");
        } finally {
            setExporting(false);
        }
    };

    const summary = analytics?.summary || {
        totalIncome: 0,
        totalExpenses: 0,
        netSavings: 0,
        savingsRate: 0,
        totalCount: 0,
        avgExpense: 0,
        highestExpense: null,
    };
    const categoryBreakdown = analytics?.categoryBreakdown || [];
    const monthlyTrends = analytics?.monthlyTrends || [];
    const dailyTrends = analytics?.dailyTrends || [];
    const weeklyTrends = analytics?.weeklyTrends || [];
    const paymentMethods = analytics?.paymentMethodBreakdown || [];
    const insights = analytics?.insights || [];

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="custom-chart-tooltip">
                    <p className="tooltip-label">{label}</p>
                    {payload.map((entry, index) => (
                        <p
                            key={`item-${index}`}
                            style={{ color: entry.color, margin: "3px 0" }}
                        >
                            {entry.name}: {formatCurrency(entry.value)}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="analytics-page">
            {/* Header & Filter Controls */}
            <div className="analytics-header-strip">
                <div>
                    <h2 className="page-title">Interactive Analytics Center</h2>
                    <p className="page-subtitle">
                        Comprehensive multi-dimensional analysis derived directly from verified database records
                    </p>
                </div>

                <div className="analytics-controls" style={{ flexWrap: "wrap", gap: "10px" }}>
                    <div className="range-pills" style={{ flexWrap: "wrap" }}>
                        <button
                            className={`range-pill ${range === "demo_month" ? "active" : ""}`}
                            onClick={() => setRange("demo_month")}
                        >
                            ⭐ September 2026 (Demo)
                        </button>
                        <button
                            className={`range-pill ${range === "this_month" ? "active" : ""}`}
                            onClick={() => setRange("this_month")}
                        >
                            This Month
                        </button>
                        <button
                            className={`range-pill ${range === "last_3_months" ? "active" : ""}`}
                            onClick={() => setRange("last_3_months")}
                        >
                            3 Months
                        </button>
                        <button
                            className={`range-pill ${range === "last_6_months" ? "active" : ""}`}
                            onClick={() => setRange("last_6_months")}
                        >
                            6 Months
                        </button>
                        <button
                            className={`range-pill ${range === "this_year" ? "active" : ""}`}
                            onClick={() => setRange("this_year")}
                        >
                            This Year
                        </button>
                        <button
                            className={`range-pill ${range === "all" ? "active" : ""}`}
                            onClick={() => setRange("all")}
                        >
                            All Time
                        </button>
                    </div>

                    {/* Category & Type Dropdowns */}
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <select
                            className="form-input"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            style={{ height: "34px", fontSize: "12px", padding: "4px 10px", width: "130px" }}
                        >
                            <option value="all">All Categories</option>
                            {categories.map((c) => (
                                <option key={c.id || c.name} value={c.name}>
                                    {c.name}
                                </option>
                            ))}
                        </select>

                        <select
                            className="form-input"
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            style={{ height: "34px", fontSize: "12px", padding: "4px 10px", width: "110px" }}
                        >
                            <option value="all">All Types</option>
                            <option value="expense">Expenses</option>
                            <option value="income">Income</option>
                        </select>

                        <button
                            className="btn-export-csv"
                            onClick={handleExport}
                            disabled={exporting}
                            style={{ height: "34px", fontSize: "12px" }}
                        >
                            <Download size={14} />
                            <span>{exporting ? "Exporting..." : "Export CSV"}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Presentation Summary Highlight Box */}
            <div
                style={{
                    background: "rgba(16, 185, 129, 0.08)",
                    border: "1px solid rgba(16, 185, 129, 0.25)",
                    borderRadius: "14px",
                    padding: "16px 22px",
                    margin: "12px 0 24px",
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "14px",
                }}
            >
                <div>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        🎓 College Presentation Snapshot • Indian Salaried Professional
                    </span>
                    <h3 style={{ fontSize: "17px", fontWeight: 700, marginTop: "2px" }}>
                        {range === "demo_month" ? "September 2026 Complete Financial Profile" : "Selected Analytics Period"}
                    </h3>
                    <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "4px 0 0" }}>
                        Monthly Salary: <strong>₹70,000</strong> (+ ₹5,000 freelance) • 30 real PostgreSQL transactions recorded
                    </p>
                </div>

                <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                    <div>
                        <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Period Income</span>
                        <h4 style={{ fontSize: "17px", fontWeight: 700, color: "#10b981" }}>
                            {formatCurrency(summary.totalIncome)}
                        </h4>
                    </div>
                    <div>
                        <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Period Expenses</span>
                        <h4 style={{ fontSize: "17px", fontWeight: 700, color: "#e27c7c" }}>
                            {formatCurrency(summary.totalExpenses)}
                        </h4>
                    </div>
                    <div>
                        <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Net Retained</span>
                        <h4 style={{ fontSize: "17px", fontWeight: 700, color: summary.netSavings >= 0 ? "#10b981" : "#e27c7c" }}>
                            {formatCurrency(summary.netSavings)}
                        </h4>
                    </div>
                    <div>
                        <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Savings Rate</span>
                        <h4 style={{ fontSize: "17px", fontWeight: 700, color: "#3d9d52" }}>
                            {summary.savingsRate}%
                        </h4>
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="glass-card" style={{ padding: "20px", color: "#c45e5e" }}>
                    {error}
                </div>
            )}

            {/* Metrics Overview Cards */}
            <div className="metrics-grid">
                <div className="glass-card metric-card">
                    <span className="metric-title">Period Inflow</span>
                    <h3 className="metric-val" style={{ color: "#2e8b43" }}>
                        {formatCurrency(summary.totalIncome)}
                    </h3>
                    <span className="metric-sub">
                        From {summary.totalCount} recorded movements
                    </span>
                </div>

                <div className="glass-card metric-card">
                    <span className="metric-title">Period Outflow</span>
                    <h3 className="metric-val" style={{ color: "#c44040" }}>
                        {formatCurrency(summary.totalExpenses)}
                    </h3>
                    <span className="metric-sub">
                        Average: {formatCurrency(summary.avgExpense)} / transaction
                    </span>
                </div>

                <div className="glass-card metric-card">
                    <span className="metric-title">Net Capital Savings</span>
                    <h3
                        className="metric-val"
                        style={{
                            color: summary.netSavings >= 0 ? "#2e8b43" : "#c44040",
                        }}
                    >
                        {formatCurrency(summary.netSavings)}
                    </h3>
                    <span className="metric-sub">
                        Retained capital rate: <strong>{summary.savingsRate}%</strong>
                    </span>
                </div>

                <div className="glass-card metric-card">
                    <span className="metric-title">Highest Single Expense</span>
                    <h3 className="metric-val">
                        {summary.highestExpense ? formatCurrency(summary.highestExpense.amount) : "₹0"}
                    </h3>
                    <span className="metric-sub">
                        {summary.highestExpense ? `"${summary.highestExpense.description}"` : "None"}
                    </span>
                </div>
            </div>

            {/* Financial Insights Strip */}
            {insights.length > 0 && (
                <div className="glass-card insights-card">
                    <div className="insights-header">
                        <Sparkles size={18} className="sparkle-icon" />
                        <strong>Data-Driven Observations</strong>
                    </div>
                    <div className="insights-list">
                        {insights.map((ins, idx) => (
                            <div className="insight-item" key={idx}>
                                {ins.type === "positive" ? (
                                    <CheckCircle size={16} color="#3d9d52" />
                                ) : ins.type === "warning" ? (
                                    <AlertCircle size={16} color="#d97706" />
                                ) : (
                                    <Info size={16} color="#3b82f6" />
                                )}
                                <span>{ins.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Charts Row 1: Daily Expense Progression & Weekly Comparison */}
            <div className="analytics-charts-grid" style={{ marginBottom: "24px" }}>
                {/* Daily Expense Trend */}
                <div className="glass-card chart-container-card">
                    <div className="card-header">
                        <div>
                            <h3>Daily Spending Progression</h3>
                            <p>Day-by-day expense outlays across the period</p>
                        </div>
                    </div>

                    <div style={{ width: "100%", height: 300 }}>
                        {dailyTrends.length === 0 ? (
                            <div className="chart-empty-placeholder">
                                No daily activity recorded for this period.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={dailyTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={11} />
                                    <YAxis
                                        stroke="var(--text-secondary)"
                                        fontSize={11}
                                        tickFormatter={(val) => `₹${val}`}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="expense" name="Expense" fill="#e27c7c" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Weekly Spending Comparison */}
                <div className="glass-card chart-container-card">
                    <div className="card-header">
                        <div>
                            <h3>Weekly Outlay Comparison</h3>
                            <p>Aggregated weekly spending pace</p>
                        </div>
                    </div>

                    <div style={{ width: "100%", height: 300 }}>
                        {weeklyTrends.length === 0 ? (
                            <div className="chart-empty-placeholder">
                                No weekly data available.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={weeklyTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <XAxis dataKey="week" stroke="var(--text-secondary)" fontSize={12} />
                                    <YAxis
                                        stroke="var(--text-secondary)"
                                        fontSize={11}
                                        tickFormatter={(val) => `₹${val}`}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="expense" name="Weekly Expense" fill="#55ad69" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            {/* Charts Row 2: Monthly Trends & Category Distribution */}
            <div className="analytics-charts-grid" style={{ marginBottom: "24px" }}>
                {/* Monthly Income vs Expense Bar Chart */}
                <div className="glass-card chart-container-card">
                    <div className="card-header">
                        <div>
                            <h3>Income vs. Expenses Over Time</h3>
                            <p>Monthly balance progression</p>
                        </div>
                    </div>

                    <div style={{ width: "100%", height: 320 }}>
                        {monthlyTrends.length === 0 ? (
                            <div className="chart-empty-placeholder">
                                No monthly trends recorded for this range.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={monthlyTrends}
                                    margin={{ top: 20, right: 20, left: 0, bottom: 20 }}
                                >
                                    <XAxis
                                        dataKey="month"
                                        stroke="var(--text-secondary)"
                                        fontSize={12}
                                    />
                                    <YAxis
                                        stroke="var(--text-secondary)"
                                        fontSize={11}
                                        tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Bar
                                        dataKey="income"
                                        name="Income"
                                        fill="#55ad69"
                                        radius={[6, 6, 0, 0]}
                                    />
                                    <Bar
                                        dataKey="expense"
                                        name="Expenses"
                                        fill="#e27c7c"
                                        radius={[6, 6, 0, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Category Breakdown Donut / Pie Chart */}
                <div className="glass-card chart-container-card">
                    <div className="card-header">
                        <div>
                            <h3>Category Spending Distribution</h3>
                            <p>Share of spending by category</p>
                        </div>
                    </div>

                    <div style={{ width: "100%", height: 320 }}>
                        {categoryBreakdown.length === 0 ? (
                            <div className="chart-empty-placeholder">
                                No expense categories to display.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={categoryBreakdown}
                                        dataKey="amount"
                                        nameKey="category"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={95}
                                        paddingAngle={3}
                                    >
                                        {categoryBreakdown.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={PIE_COLORS[index % PIE_COLORS.length]}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value) => [formatCurrency(value), "Amount"]}
                                    />
                                    <Legend
                                        formatter={(value) => (
                                            <span style={{ fontSize: "12px", color: "var(--text-primary)" }}>
                                                {value}
                                            </span>
                                        )}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            {/* Net Savings Area Chart */}
            <div className="glass-card chart-container-card">
                <div className="card-header">
                    <div>
                        <h3>Net Savings Trajectory</h3>
                        <p>Monthly retained capital trajectory (Income - Expenses)</p>
                    </div>
                </div>

                <div style={{ width: "100%", height: 260 }}>
                    {monthlyTrends.length === 0 ? (
                        <div className="chart-empty-placeholder">
                            No trajectory data to display.
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={monthlyTrends}
                                margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                            >
                                <defs>
                                    <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#55ad69" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#55ad69" stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="month"
                                    stroke="var(--text-secondary)"
                                    fontSize={12}
                                />
                                <YAxis
                                    stroke="var(--text-secondary)"
                                    fontSize={11}
                                    tickFormatter={(val) => `₹${val}`}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="net"
                                    name="Net Savings"
                                    stroke="#3d9d52"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#savingsGrad)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
        </div>
    );
}
