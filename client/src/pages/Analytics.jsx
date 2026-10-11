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
];

export default function Analytics() {
    const [range, setRange] = useState("last_6_months");
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [exporting, setExporting] = useState(false);

    const loadAnalytics = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            const res = await getAnalytics({ range });
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
    }, [range]);

    useEffect(() => {
        loadAnalytics();
    }, [loadAnalytics]);

    const handleExport = async () => {
        try {
            setExporting(true);
            await downloadCsvExport({ range });
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
                    <h2 className="page-title">Analytics & Reports</h2>
                    <p className="page-subtitle">
                        Deep visual insights into your spending patterns and savings rate
                    </p>
                </div>

                <div className="analytics-controls">
                    <div className="range-pills">
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

                    <button
                        className="btn-export-csv"
                        onClick={handleExport}
                        disabled={exporting}
                    >
                        <Download size={16} />
                        <span>{exporting ? "Exporting..." : "Export CSV"}</span>
                    </button>
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
                    <span className="metric-title">Period Income</span>
                    <h3 className="metric-val" style={{ color: "#2e8b43" }}>
                        {formatCurrency(summary.totalIncome)}
                    </h3>
                    <span className="metric-sub">
                        From {monthlyTrends.length} active period(s)
                    </span>
                </div>

                <div className="glass-card metric-card">
                    <span className="metric-title">Period Expenses</span>
                    <h3 className="metric-val" style={{ color: "#c44040" }}>
                        {formatCurrency(summary.totalExpenses)}
                    </h3>
                    <span className="metric-sub">
                        {summary.totalCount} transaction(s) total
                    </span>
                </div>

                <div className="glass-card metric-card">
                    <span className="metric-title">Net Savings</span>
                    <h3
                        className="metric-val"
                        style={{
                            color: summary.netSavings >= 0 ? "#2e8b43" : "#c44040",
                        }}
                    >
                        {formatCurrency(summary.netSavings)}
                    </h3>
                    <span className="metric-sub">
                        Savings Rate: {summary.savingsRate}%
                    </span>
                </div>

                <div className="glass-card metric-card">
                    <span className="metric-title">Average Expense</span>
                    <h3 className="metric-val">
                        {formatCurrency(summary.avgExpense)}
                    </h3>
                    <span className="metric-sub">
                        Per expense transaction
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
                        {summary.highestExpense && (
                            <div className="insight-item">
                                <Info size={16} color="#8b5cf6" />
                                <span>
                                    Highest single expense:{" "}
                                    <strong>{formatCurrency(summary.highestExpense.amount)}</strong>{" "}
                                    on {summary.highestExpense.category} ("
                                    {summary.highestExpense.description}").
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Charts Row */}
            <div className="analytics-charts-grid">
                {/* Monthly Income vs Expense Bar Chart */}
                <div className="glass-card chart-container-card">
                    <div className="card-header">
                        <div>
                            <h3>Income vs. Expenses Over Time</h3>
                            <p>Monthly financial balance progression</p>
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
                                        stroke="var(--text-secondary, #888)"
                                        fontSize={12}
                                    />
                                    <YAxis
                                        stroke="var(--text-secondary, #888)"
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
                            <h3>Expense Distribution</h3>
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
                                        formatter={(value, entry) => (
                                            <span style={{ fontSize: "12px" }}>
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
                        <p>Net monthly retained capital (Income - Expenses)</p>
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
                                    stroke="var(--text-secondary, #888)"
                                    fontSize={12}
                                />
                                <YAxis
                                    stroke="var(--text-secondary, #888)"
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
