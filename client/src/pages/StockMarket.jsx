import React, { useState, useEffect, useCallback } from "react";
import {
    TrendingUp,
    TrendingDown,
    Search,
    Star,
    Plus,
    Clock,
    Shield,
    BarChart2,
    PieChart,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Trash2,
    X,
    Info,
    RefreshCw,
    Activity,
    SlidersHorizontal,
} from "lucide-react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import {
    getMarketData,
    getStockChart,
    getWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    getPortfolio,
    recordStockTransaction,
    deleteStockTransaction,
} from "../services/stockService";
import { formatCurrency, formatDate } from "../utils/formatters";
import "../styles/dashboard.css";
import "../styles/budgets.css";
import "../styles/analytics.css";

export default function StockMarket() {
    const [activeTab, setActiveTab] = useState("overview"); // "overview", "watchlist", "portfolio"

    // Market Overview State
    const [marketData, setMarketData] = useState(null);
    const [marketLoading, setMarketLoading] = useState(true);
    const [marketError, setMarketError] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    // Selected Stock for Chart Modal
    const [selectedStock, setSelectedStock] = useState(null);
    const [chartRange, setChartRange] = useState("1mo");
    const [chartData, setChartData] = useState(null);
    const [chartLoading, setChartLoading] = useState(false);

    // Watchlist State
    const [watchlist, setWatchlist] = useState([]);
    const [watchlistLoading, setWatchlistLoading] = useState(false);
    const [customSymbol, setCustomSymbol] = useState("");

    // Portfolio State
    const [portfolioData, setPortfolioData] = useState(null);
    const [portfolioLoading, setPortfolioLoading] = useState(false);

    // Record Transaction Modal
    const [showTxModal, setShowTxModal] = useState(false);
    const [txSymbol, setTxSymbol] = useState("RELIANCE.NS");
    const [txName, setTxName] = useState("Reliance Industries Ltd");
    const [txType, setTxType] = useState("BUY");
    const [txQty, setTxQty] = useState("");
    const [txPrice, setTxPrice] = useState("");
    const [txCharges, setTxCharges] = useState("0");
    const [txDate, setTxDate] = useState(new Date().toISOString().split("T")[0]);
    const [txNotes, setTxNotes] = useState("");
    const [modalError, setModalError] = useState("");
    const [modalSubmitting, setModalSubmitting] = useState(false);

    // Load Market Data
    const loadMarket = useCallback(async () => {
        try {
            setMarketLoading(true);
            setMarketError("");
            const res = await getMarketData();
            if (res.success) {
                setMarketData(res);
            }
        } catch (err) {
            console.error("Failed to load market data:", err);
            setMarketError(
                err.response?.data?.message || err.message || "Failed to retrieve Indian stock market data"
            );
        } finally {
            setMarketLoading(false);
        }
    }, []);

    // Load Watchlist
    const loadWatchlist = useCallback(async () => {
        try {
            setWatchlistLoading(true);
            const res = await getWatchlist();
            if (res.success) {
                setWatchlist(res.watchlist || []);
            }
        } catch (err) {
            console.error("Watchlist error:", err);
        } finally {
            setWatchlistLoading(false);
        }
    }, []);

    // Load Portfolio
    const loadPortfolio = useCallback(async () => {
        try {
            setPortfolioLoading(true);
            const res = await getPortfolio();
            if (res.success) {
                setPortfolioData(res);
            }
        } catch (err) {
            console.error("Portfolio error:", err);
        } finally {
            setPortfolioLoading(false);
        }
    }, []);

    useEffect(() => {
        loadMarket();
        loadWatchlist();
        loadPortfolio();
    }, [loadMarket, loadWatchlist, loadPortfolio]);

    // Load Chart when stock or range changes
    const loadChart = useCallback(async (symbol, range) => {
        if (!symbol) return;
        try {
            setChartLoading(true);
            const res = await getStockChart(symbol, range);
            if (res.success) {
                setChartData(res);
            }
        } catch (err) {
            console.error("Chart load error:", err);
        } finally {
            setChartLoading(false);
        }
    }, []);

    const handleSelectStockForChart = (stock) => {
        setSelectedStock(stock);
        setChartRange("1mo");
        loadChart(stock.symbol, "1mo");
    };

    const handleRangeChange = (newRange) => {
        setChartRange(newRange);
        if (selectedStock) {
            loadChart(selectedStock.symbol, newRange);
        }
    };

    // Watchlist Actions
    const handleToggleWatchlist = async (stock) => {
        const isWatched = watchlist.some((w) => w.symbol === stock.symbol);
        try {
            if (isWatched) {
                await removeFromWatchlist(stock.symbol);
            } else {
                await addToWatchlist(stock.symbol, stock.name);
            }
            loadWatchlist();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to update watchlist");
        }
    };

    const handleAddCustomSymbol = async (e) => {
        e.preventDefault();
        if (!customSymbol.trim()) return;
        try {
            await addToWatchlist(customSymbol.trim(), customSymbol.trim().toUpperCase());
            setCustomSymbol("");
            loadWatchlist();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to add symbol");
        }
    };

    // Record Transaction Submit
    const handleSaveTransaction = async (e) => {
        e.preventDefault();
        setModalError("");

        const q = Number(txQty);
        const p = Number(txPrice);
        const c = Number(txCharges) || 0;

        if (!q || q <= 0) {
            setModalError("Quantity must be greater than 0");
            return;
        }
        if (!p || p <= 0) {
            setModalError("Price per share must be greater than 0");
            return;
        }
        if (!txDate) {
            setModalError("Transaction date is required");
            return;
        }

        try {
            setModalSubmitting(true);
            await recordStockTransaction({
                symbol: txSymbol,
                companyName: txName,
                transactionType: txType,
                quantity: q,
                pricePerShare: p,
                brokerageCharges: c,
                transactionDate: txDate,
                notes: txNotes,
            });
            setShowTxModal(false);
            loadPortfolio();
        } catch (err) {
            setModalError(err.response?.data?.message || "Failed to record transaction");
        } finally {
            setModalSubmitting(false);
        }
    };

    const handleDeleteTransaction = async (id) => {
        if (!window.confirm("Are you sure you want to delete this recorded stock transaction?")) return;
        try {
            await deleteStockTransaction(id);
            loadPortfolio();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to delete transaction");
        }
    };

    // Filter popular stocks for search
    const filteredPopular = (marketData?.popularStocks || []).filter((s) => {
        const q = searchQuery.toLowerCase();
        return (
            s.name.toLowerCase().includes(q) ||
            s.symbol.toLowerCase().includes(q) ||
            (s.ticker && s.ticker.toLowerCase().includes(q))
        );
    });

    const marketStatus = marketData?.marketStatus || {
        isOpen: false,
        statusText: "Market Closed (After Hours)",
        label: "End-of-Day / Cached",
        tradingHours: "09:15 AM – 03:30 PM IST (Mon–Fri)",
        istTime: "",
    };

    const portfolioSummary = portfolioData?.summary || {
        totalInvested: 0,
        totalCurrentValue: 0,
        totalUnrealizedPl: 0,
        totalUnrealizedPlPercent: 0,
        totalRealizedPl: 0,
        totalHoldingsCount: 0,
    };
    const holdings = portfolioData?.holdings || [];
    const transactions = portfolioData?.transactions || [];

    return (
        <div className="budgets-page">
            {/* Header Strip */}
            <div className="budget-header-strip">
                <div>
                    <h2 className="page-title">Indian Stock Market & Portfolio</h2>
                    <p className="page-subtitle">
                        Track NIFTY 50, SENSEX, popular Indian equities, and manage your investment portfolio
                    </p>
                </div>

                <div className="budget-header-actions">
                    <button
                        className="btn-secondary"
                        onClick={() => {
                            loadMarket();
                            loadWatchlist();
                            loadPortfolio();
                        }}
                        style={{ display: "flex", alignItems: "center", gap: "6px" }}
                        title="Refresh market data"
                    >
                        <RefreshCw size={14} />
                        <span>Refresh Data</span>
                    </button>

                    <button
                        className="add-tx-btn"
                        onClick={() => {
                            setShowTxModal(true);
                            setModalError("");
                        }}
                    >
                        <Plus size={16} />
                        <span>Record Stock Trade</span>
                    </button>
                </div>
            </div>

            {/* Market Status & Regulatory Pill Banner */}
            <div
                style={{
                    background: "rgba(16, 185, 129, 0.06)",
                    border: "1px solid rgba(16, 185, 129, 0.2)",
                    borderRadius: "12px",
                    padding: "12px 18px",
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    margin: "12px 0 20px",
                    fontSize: "13px",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                        style={{
                            width: "10px",
                            height: "10px",
                            borderRadius: "50%",
                            background: marketStatus.isOpen ? "#10b981" : "#d97706",
                            boxShadow: marketStatus.isOpen
                                ? "0 0 10px rgba(16, 185, 129, 0.8)"
                                : "0 0 10px rgba(217, 119, 6, 0.6)",
                        }}
                    />
                    <strong>{marketStatus.statusText}</strong>
                    <span style={{ color: "var(--text-secondary)" }}>•</span>
                    <span style={{ color: "var(--text-secondary)" }}>
                        Data Source: <strong>{marketStatus.label}</strong>
                    </span>
                    <span style={{ color: "var(--text-secondary)" }}>•</span>
                    <span style={{ color: "var(--text-secondary)" }}>{marketStatus.tradingHours}</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--text-secondary)" }}>
                    <Clock size={13} />
                    <span>{marketStatus.istTime || "IST Feed"}</span>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div
                style={{
                    display: "flex",
                    gap: "8px",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                    paddingBottom: "12px",
                    marginBottom: "24px",
                }}
            >
                <button
                    className={`range-pill ${activeTab === "overview" ? "active" : ""}`}
                    onClick={() => setActiveTab("overview")}
                    style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                    <Activity size={15} />
                    <span>Market Overview & Explore</span>
                </button>

                <button
                    className={`range-pill ${activeTab === "watchlist" ? "active" : ""}`}
                    onClick={() => setActiveTab("watchlist")}
                    style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                    <Star size={15} />
                    <span>Watchlist ({watchlist.length})</span>
                </button>

                <button
                    className={`range-pill ${activeTab === "portfolio" ? "active" : ""}`}
                    onClick={() => setActiveTab("portfolio")}
                    style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                    <BarChart2 size={15} />
                    <span>My Portfolio ({holdings.length})</span>
                </button>
            </div>

            {/* TAB 1: MARKET OVERVIEW */}
            {activeTab === "overview" && (
                <div>
                    {/* Benchmark Indices Cards */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginBottom: "24px" }}>
                        {(marketData?.indices || []).map((idx) => {
                            const isPositive = idx.change >= 0;
                            return (
                                <div
                                    key={idx.symbol}
                                    className="glass-card"
                                    style={{
                                        padding: "20px",
                                        cursor: "pointer",
                                        transition: "transform 0.2s ease, border-color 0.2s ease",
                                    }}
                                    onClick={() => handleSelectStockForChart(idx)}
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
                                        <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-secondary)" }}>
                                            {idx.name} ({idx.exchange})
                                        </span>
                                        <span
                                            style={{
                                                fontSize: "12px",
                                                fontWeight: 650,
                                                padding: "2px 8px",
                                                borderRadius: "6px",
                                                background: isPositive ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                                                color: isPositive ? "#10b981" : "#ef4444",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "3px",
                                            }}
                                        >
                                            {isPositive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                                            {isPositive ? "+" : ""}{idx.changePercent}%
                                        </span>
                                    </div>

                                    <h3 style={{ fontSize: "26px", fontWeight: 700, margin: "4px 0" }}>
                                        ₹{idx.price ? idx.price.toLocaleString("en-IN") : "N/A"}
                                    </h3>

                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-secondary)" }}>
                                        <span>
                                            {isPositive ? "+" : ""}₹{idx.change ? Math.abs(idx.change).toLocaleString("en-IN") : "0"} today
                                        </span>
                                        <span style={{ color: "#55ad69" }}>Click to view chart →</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Popular Indian Stocks Section */}
                    <div className="glass-card" style={{ padding: "24px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
                            <div>
                                <h3 style={{ fontSize: "18px", fontWeight: 650 }}>Popular Indian Blue-Chips</h3>
                                <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                                    Live quotes from the National Stock Exchange of India (NSE)
                                </p>
                            </div>

                            <div style={{ position: "relative", minWidth: "260px" }}>
                                <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Search RELIANCE, TCS, INFY..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{ paddingLeft: "36px" }}
                                />
                            </div>
                        </div>

                        {marketLoading ? (
                            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
                                Loading NSE live quotes...
                            </div>
                        ) : filteredPopular.length === 0 ? (
                            <div style={{ padding: "30px", textAlign: "center", color: "var(--text-secondary)" }}>
                                No stocks matched your search query "{searchQuery}".
                            </div>
                        ) : (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
                                {filteredPopular.map((st) => {
                                    const isPositive = (st.change || 0) >= 0;
                                    const isWatched = watchlist.some((w) => w.symbol === st.symbol);

                                    return (
                                        <div
                                            key={st.symbol}
                                            style={{
                                                background: "rgba(255, 255, 255, 0.03)",
                                                border: "1px solid rgba(255, 255, 255, 0.07)",
                                                borderRadius: "12px",
                                                padding: "16px",
                                                display: "flex",
                                                flexDirection: "column",
                                                justifyContent: "space-between",
                                            }}
                                        >
                                            <div>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                                                    <div>
                                                        <span style={{ fontSize: "11px", fontWeight: 650, color: "#55ad69", textTransform: "uppercase" }}>
                                                            {st.sector}
                                                        </span>
                                                        <h4 style={{ fontSize: "16px", fontWeight: 700, margin: "2px 0" }}>
                                                            {st.ticker || st.symbol.replace(/\.NS$/, "")}
                                                        </h4>
                                                        <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                                                            {st.name}
                                                        </span>
                                                    </div>

                                                    <button
                                                        onClick={() => handleToggleWatchlist(st)}
                                                        className="btn-icon-subtle"
                                                        title={isWatched ? "Remove from watchlist" : "Add to watchlist"}
                                                        style={{ color: isWatched ? "#eab308" : "var(--text-secondary)" }}
                                                    >
                                                        <Star size={16} fill={isWatched ? "#eab308" : "none"} />
                                                    </button>
                                                </div>

                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "14px 0 8px" }}>
                                                    <h3 style={{ fontSize: "20px", fontWeight: 700 }}>
                                                        {st.price !== null ? `₹${st.price.toLocaleString("en-IN")}` : "Unavailable"}
                                                    </h3>
                                                    {st.changePercent !== null && (
                                                        <span
                                                            style={{
                                                                fontSize: "12px",
                                                                fontWeight: 650,
                                                                padding: "2px 7px",
                                                                borderRadius: "6px",
                                                                background: isPositive ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                                                                color: isPositive ? "#10b981" : "#ef4444",
                                                            }}
                                                        >
                                                            {isPositive ? "+" : ""}{st.changePercent}%
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div style={{ display: "flex", gap: "8px", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                                                <button
                                                    className="view-all-button"
                                                    onClick={() => handleSelectStockForChart(st)}
                                                    style={{ flex: 1, padding: "7px 12px", fontSize: "12px", textAlign: "center" }}
                                                >
                                                    View Chart
                                                </button>
                                                <button
                                                    className="btn-secondary"
                                                    onClick={() => {
                                                        setTxSymbol(st.symbol);
                                                        setTxName(st.name);
                                                        setTxPrice(st.price ? String(st.price) : "");
                                                        setShowTxModal(true);
                                                    }}
                                                    style={{ fontSize: "12px", padding: "7px 12px" }}
                                                >
                                                    + Trade
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 2: WATCHLIST */}
            {activeTab === "watchlist" && (
                <div className="glass-card" style={{ padding: "24px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
                        <div>
                            <h3 style={{ fontSize: "18px", fontWeight: 650 }}>Personal Watchlist</h3>
                            <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                                Track your favorite Indian equities persisted securely in your database
                            </p>
                        </div>

                        {/* Add Custom Symbol form */}
                        <form onSubmit={handleAddCustomSymbol} style={{ display: "flex", gap: "8px" }}>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Symbol e.g. TATASTEEL"
                                value={customSymbol}
                                onChange={(e) => setCustomSymbol(e.target.value)}
                                style={{ width: "190px" }}
                            />
                            <button type="submit" className="add-tx-btn">
                                <Plus size={15} />
                                <span>Add</span>
                            </button>
                        </form>
                    </div>

                    {watchlistLoading ? (
                        <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
                            Loading watchlist...
                        </div>
                    ) : watchlist.length === 0 ? (
                        <div style={{ padding: "40px", textAlign: "center" }}>
                            <Star size={44} style={{ margin: "0 auto 12px", color: "#eab308" }} />
                            <h4>Your Watchlist is Empty</h4>
                            <p style={{ color: "var(--text-secondary)", maxWidth: "420px", margin: "6px auto 16px", fontSize: "13px" }}>
                                Click the star icon on any stock in Market Overview or enter a symbol above to monitor price movements.
                            </p>
                        </div>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                                <thead>
                                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", color: "var(--text-secondary)", textAlign: "left" }}>
                                        <th style={{ padding: "12px 14px" }}>Stock Symbol</th>
                                        <th style={{ padding: "12px 14px" }}>Company</th>
                                        <th style={{ padding: "12px 14px" }}>Latest Price</th>
                                        <th style={{ padding: "12px 14px" }}>Day Change</th>
                                        <th style={{ padding: "12px 14px" }}>Day High / Low</th>
                                        <th style={{ padding: "12px 14px", textAlign: "right" }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {watchlist.map((item) => {
                                        const isPositive = (item.change || 0) >= 0;
                                        return (
                                            <tr key={item.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                                <td style={{ padding: "14px", fontWeight: 700, color: "#10b981" }}>
                                                    {item.symbol}
                                                </td>
                                                <td style={{ padding: "14px" }}>{item.companyName}</td>
                                                <td style={{ padding: "14px", fontWeight: 700 }}>
                                                    {item.price !== null ? `₹${item.price.toLocaleString("en-IN")}` : "Unavailable"}
                                                </td>
                                                <td style={{ padding: "14px" }}>
                                                    {item.changePercent !== null ? (
                                                        <span
                                                            style={{
                                                                color: isPositive ? "#10b981" : "#ef4444",
                                                                fontWeight: 650,
                                                            }}
                                                        >
                                                            {isPositive ? "+" : ""}{item.changePercent}% (₹{item.change})
                                                        </span>
                                                    ) : "—"}
                                                </td>
                                                <td style={{ padding: "14px", fontSize: "12px", color: "var(--text-secondary)" }}>
                                                    {item.high && item.low ? `₹${item.high} / ₹${item.low}` : "—"}
                                                </td>
                                                <td style={{ padding: "14px", textAlign: "right" }}>
                                                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                                                        <button
                                                            className="view-all-button"
                                                            onClick={() => handleSelectStockForChart({ symbol: item.symbol, name: item.companyName })}
                                                            style={{ padding: "5px 10px", fontSize: "12px" }}
                                                        >
                                                            Chart
                                                        </button>
                                                        <button
                                                            className="btn-icon-subtle"
                                                            onClick={() => handleToggleWatchlist(item)}
                                                            title="Remove from watchlist"
                                                            style={{ color: "#c45e5e" }}
                                                        >
                                                            <Trash2 size={15} />
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
                </div>
            )}

            {/* TAB 3: PORTFOLIO TRACKER */}
            {activeTab === "portfolio" && (
                <div>
                    {/* Portfolio Summary Cards */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
                        <div className="summary-card">
                            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Total Capital Invested</span>
                            <h2 style={{ fontSize: "24px", margin: "6px 0", fontWeight: 700 }}>
                                {formatCurrency(portfolioSummary.totalInvested)}
                            </h2>
                            <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                                Across {portfolioSummary.totalHoldingsCount} active stock position(s)
                            </p>
                        </div>

                        <div className="summary-card">
                            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Current Portfolio Value</span>
                            <h2 style={{ fontSize: "24px", margin: "6px 0", fontWeight: 700, color: "#10b981" }}>
                                {formatCurrency(portfolioSummary.totalCurrentValue)}
                            </h2>
                            <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                                Evaluated at latest market prices
                            </p>
                        </div>

                        <div className="summary-card">
                            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Unrealized Profit / Loss</span>
                            <h2
                                style={{
                                    fontSize: "24px",
                                    margin: "6px 0",
                                    fontWeight: 700,
                                    color: portfolioSummary.totalUnrealizedPl >= 0 ? "#10b981" : "#ef4444",
                                }}
                            >
                                {portfolioSummary.totalUnrealizedPl >= 0 ? "+" : ""}
                                {formatCurrency(portfolioSummary.totalUnrealizedPl)}
                            </h2>
                            <p
                                style={{
                                    fontSize: "12px",
                                    fontWeight: 650,
                                    color: portfolioSummary.totalUnrealizedPl >= 0 ? "#10b981" : "#ef4444",
                                }}
                            >
                                {portfolioSummary.totalUnrealizedPl >= 0 ? "+" : ""}
                                {portfolioSummary.totalUnrealizedPlPercent}% Total Return
                            </p>
                        </div>

                        <div className="summary-card">
                            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Realized Profit from Sales</span>
                            <h2
                                style={{
                                    fontSize: "24px",
                                    margin: "6px 0",
                                    fontWeight: 700,
                                    color: portfolioSummary.totalRealizedPl >= 0 ? "#10b981" : "#ef4444",
                                }}
                            >
                                {portfolioSummary.totalRealizedPl >= 0 ? "+" : ""}
                                {formatCurrency(portfolioSummary.totalRealizedPl)}
                            </h2>
                            <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                                Net booked return on sold positions
                            </p>
                        </div>
                    </div>

                    {/* Holdings Table */}
                    <div className="glass-card" style={{ padding: "24px", marginBottom: "24px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                            <div>
                                <h3 style={{ fontSize: "18px", fontWeight: 650 }}>Active Holdings</h3>
                                <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                                    Weightage, cost basis, and live performance of your equity portfolio
                                </p>
                            </div>

                            <button
                                className="add-tx-btn"
                                onClick={() => {
                                    setShowTxModal(true);
                                    setModalError("");
                                }}
                            >
                                <Plus size={15} />
                                <span>Record BUY / SELL</span>
                            </button>
                        </div>

                        {portfolioLoading ? (
                            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
                                Loading portfolio holdings...
                            </div>
                        ) : holdings.length === 0 ? (
                            <div style={{ padding: "40px", textAlign: "center" }}>
                                <PieChart size={44} style={{ margin: "0 auto 12px", color: "#55ad69" }} />
                                <h4>No Active Stock Holdings</h4>
                                <p style={{ color: "var(--text-secondary)", maxWidth: "420px", margin: "6px auto 16px", fontSize: "13px" }}>
                                    Record your stock purchases manually to track holdings, average cost basis, and unrealized gains.
                                </p>
                                <button className="add-tx-btn" onClick={() => setShowTxModal(true)} style={{ margin: "0 auto" }}>
                                    <Plus size={15} />
                                    <span>Record Initial Purchase</span>
                                </button>
                            </div>
                        ) : (
                            <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                                    <thead>
                                        <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", color: "var(--text-secondary)", textAlign: "left" }}>
                                            <th style={{ padding: "12px 14px" }}>Stock Symbol</th>
                                            <th style={{ padding: "12px 14px" }}>Quantity</th>
                                            <th style={{ padding: "12px 14px" }}>Avg Buy Price</th>
                                            <th style={{ padding: "12px 14px" }}>Current Price</th>
                                            <th style={{ padding: "12px 14px" }}>Invested</th>
                                            <th style={{ padding: "12px 14px" }}>Market Value</th>
                                            <th style={{ padding: "12px 14px" }}>Unrealized P&L</th>
                                            <th style={{ padding: "12px 14px" }}>Allocation</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {holdings.map((h) => {
                                            const isProfit = h.unrealizedPl >= 0;
                                            return (
                                                <tr key={h.symbol} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                                    <td style={{ padding: "14px" }}>
                                                        <div style={{ fontWeight: 700, color: "#10b981" }}>{h.symbol}</div>
                                                        <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{h.companyName}</div>
                                                    </td>
                                                    <td style={{ padding: "14px", fontWeight: 650 }}>{h.quantity} shares</td>
                                                    <td style={{ padding: "14px" }}>₹{h.averageBuyPrice.toLocaleString("en-IN")}</td>
                                                    <td style={{ padding: "14px", fontWeight: 700 }}>
                                                        {h.currentPrice ? `₹${h.currentPrice.toLocaleString("en-IN")}` : "Unavailable"}
                                                    </td>
                                                    <td style={{ padding: "14px" }}>{formatCurrency(h.investedAmount)}</td>
                                                    <td style={{ padding: "14px", fontWeight: 700 }}>{formatCurrency(h.currentValue)}</td>
                                                    <td style={{ padding: "14px" }}>
                                                        <div style={{ color: isProfit ? "#10b981" : "#ef4444", fontWeight: 700 }}>
                                                            {isProfit ? "+" : ""}{formatCurrency(h.unrealizedPl)}
                                                        </div>
                                                        <div style={{ fontSize: "12px", color: isProfit ? "#10b981" : "#ef4444" }}>
                                                            {isProfit ? "+" : ""}{h.unrealizedPlPercent}%
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: "14px" }}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                            <div style={{ flex: 1, height: "6px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", overflow: "hidden" }}>
                                                                <div style={{ width: `${Math.min(100, h.allocationPercent)}%`, height: "100%", background: "#10b981" }} />
                                                            </div>
                                                            <span style={{ fontSize: "12px", color: "var(--text-secondary)", minWidth: "36px" }}>
                                                                {h.allocationPercent}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Transaction History Log */}
                    <div className="glass-card" style={{ padding: "24px" }}>
                        <h3 style={{ fontSize: "18px", fontWeight: 650, marginBottom: "16px" }}>
                            Stock Transaction Log
                        </h3>

                        {transactions.length === 0 ? (
                            <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                                No buy or sell transactions recorded yet.
                            </p>
                        ) : (
                            <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                                    <thead>
                                        <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", color: "var(--text-secondary)", textAlign: "left" }}>
                                            <th style={{ padding: "10px 12px" }}>Date</th>
                                            <th style={{ padding: "10px 12px" }}>Type</th>
                                            <th style={{ padding: "10px 12px" }}>Stock</th>
                                            <th style={{ padding: "10px 12px" }}>Qty</th>
                                            <th style={{ padding: "10px 12px" }}>Price / Share</th>
                                            <th style={{ padding: "10px 12px" }}>Charges</th>
                                            <th style={{ padding: "10px 12px" }}>Total Amount</th>
                                            <th style={{ padding: "10px 12px", textAlign: "right" }}>Delete</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transactions.map((t) => (
                                            <tr key={t.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                                <td style={{ padding: "12px" }}>{formatDate(t.date)}</td>
                                                <td style={{ padding: "12px" }}>
                                                    <span
                                                        style={{
                                                            fontSize: "11px",
                                                            fontWeight: 700,
                                                            padding: "2px 7px",
                                                            borderRadius: "4px",
                                                            background: t.type === "BUY" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                                                            color: t.type === "BUY" ? "#10b981" : "#ef4444",
                                                        }}
                                                    >
                                                        {t.type}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "12px", fontWeight: 600 }}>{t.symbol}</td>
                                                <td style={{ padding: "12px" }}>{t.quantity}</td>
                                                <td style={{ padding: "12px" }}>₹{t.pricePerShare.toLocaleString("en-IN")}</td>
                                                <td style={{ padding: "12px", color: "var(--text-secondary)" }}>₹{t.brokerageCharges}</td>
                                                <td style={{ padding: "12px", fontWeight: 700 }}>₹{t.totalAmount.toLocaleString("en-IN")}</td>
                                                <td style={{ padding: "12px", textAlign: "right" }}>
                                                    <button
                                                        className="btn-icon-subtle"
                                                        onClick={() => handleDeleteTransaction(t.id)}
                                                        style={{ color: "#c45e5e" }}
                                                        title="Delete record"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* CHART MODAL */}
            {selectedStock && (
                <div className="modal-overlay" onClick={() => setSelectedStock(null)}>
                    <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "700px" }}>
                        <div className="modal-header">
                            <div>
                                <span style={{ fontSize: "12px", color: "#10b981", fontWeight: 650 }}>
                                    {selectedStock.symbol} • NSE/BSE
                                </span>
                                <h3 style={{ fontSize: "20px", marginTop: "2px" }}>{selectedStock.name}</h3>
                            </div>
                            <button className="modal-close-btn" onClick={() => setSelectedStock(null)}>
                                <X size={18} />
                            </button>
                        </div>

                        {/* Range Selectors */}
                        <div style={{ display: "flex", gap: "8px", margin: "14px 0 20px" }}>
                            {["1w", "1mo", "6mo", "1y"].map((r) => (
                                <button
                                    key={r}
                                    className={`range-pill ${chartRange === r ? "active" : ""}`}
                                    onClick={() => handleRangeChange(r)}
                                    style={{ textTransform: "uppercase", padding: "4px 12px", fontSize: "12px" }}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>

                        {/* Chart Area */}
                        <div style={{ width: "100%", height: 320 }}>
                            {chartLoading ? (
                                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
                                    Loading historical quotes...
                                </div>
                            ) : !chartData?.points || chartData.points.length === 0 ? (
                                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
                                    Historical chart data unavailable for {selectedStock.symbol}.
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData.points} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="stockAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="displayDate" stroke="var(--text-secondary)" fontSize={11} />
                                        <YAxis
                                            stroke="var(--text-secondary)"
                                            fontSize={11}
                                            domain={["auto", "auto"]}
                                            tickFormatter={(val) => `₹${val}`}
                                        />
                                        <Tooltip
                                            content={({ active, payload, label }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="custom-chart-tooltip">
                                                            <p className="tooltip-label">{label}</p>
                                                            <p style={{ color: "#10b981", margin: "4px 0", fontWeight: 700 }}>
                                                                Price: ₹{payload[0].value.toLocaleString("en-IN")}
                                                            </p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="price"
                                            stroke="#10b981"
                                            strokeWidth={2.5}
                                            fillOpacity={1}
                                            fill="url(#stockAreaGrad)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", paddingTop: "14px", borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: "12px", color: "var(--text-secondary)" }}>
                            <span>Quotes provided via server-side cached market feed.</span>
                            <button
                                className="add-tx-btn"
                                onClick={() => {
                                    setTxSymbol(selectedStock.symbol);
                                    setTxName(selectedStock.name);
                                    setSelectedStock(null);
                                    setShowTxModal(true);
                                }}
                                style={{ padding: "6px 14px", fontSize: "12px" }}
                            >
                                Record Trade in Portfolio
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* RECORD TRANSACTION MODAL */}
            {showTxModal && (
                <div className="modal-overlay" onClick={() => setShowTxModal(false)}>
                    <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
                        <div className="modal-header">
                            <h3>Record Stock Trade</h3>
                            <button className="modal-close-btn" onClick={() => setShowTxModal(false)}>
                                <X size={18} />
                            </button>
                        </div>

                        {modalError && (
                            <div style={{ color: "#c45e5e", background: "rgba(196,94,94,0.1)", padding: "10px", borderRadius: "8px", marginBottom: "14px", fontSize: "13px" }}>
                                {modalError}
                            </div>
                        )}

                        <form onSubmit={handleSaveTransaction}>
                            {/* Type selector */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
                                <button
                                    type="button"
                                    onClick={() => setTxType("BUY")}
                                    style={{
                                        padding: "10px",
                                        borderRadius: "8px",
                                        border: txType === "BUY" ? "2px solid #10b981" : "1px solid rgba(255,255,255,0.1)",
                                        background: txType === "BUY" ? "rgba(16,185,129,0.15)" : "transparent",
                                        color: txType === "BUY" ? "#10b981" : "var(--text-secondary)",
                                        fontWeight: 700,
                                        cursor: "pointer",
                                    }}
                                >
                                    BUY (Purchase)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTxType("SELL")}
                                    style={{
                                        padding: "10px",
                                        borderRadius: "8px",
                                        border: txType === "SELL" ? "2px solid #ef4444" : "1px solid rgba(255,255,255,0.1)",
                                        background: txType === "SELL" ? "rgba(239,68,68,0.15)" : "transparent",
                                        color: txType === "SELL" ? "#ef4444" : "var(--text-secondary)",
                                        fontWeight: 700,
                                        cursor: "pointer",
                                    }}
                                >
                                    SELL (Realize)
                                </button>
                            </div>

                            <div className="form-group" style={{ marginBottom: "14px" }}>
                                <label className="form-label">Stock Symbol *</label>
                                <select
                                    className="form-input"
                                    value={txSymbol}
                                    onChange={(e) => {
                                        setTxSymbol(e.target.value);
                                        const found = (marketData?.popularStocks || []).find((s) => s.symbol === e.target.value);
                                        if (found) {
                                            setTxName(found.name);
                                            if (found.price) setTxPrice(String(found.price));
                                        }
                                    }}
                                >
                                    {(marketData?.popularStocks || []).map((s) => (
                                        <option key={s.symbol} value={s.symbol}>
                                            {s.symbol} — {s.name}
                                        </option>
                                    ))}
                                    <option value="CUSTOM">Other / Custom Symbol</option>
                                </select>
                            </div>

                            {txSymbol === "CUSTOM" && (
                                <div className="form-group" style={{ marginBottom: "14px" }}>
                                    <label className="form-label">Custom Symbol (e.g. TATAPOWER.NS) *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g. TATAPOWER.NS"
                                        onChange={(e) => setTxSymbol(e.target.value.toUpperCase())}
                                        required
                                    />
                                </div>
                            )}

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                                <div className="form-group">
                                    <label className="form-label">Quantity (Shares) *</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        placeholder="e.g. 25"
                                        value={txQty}
                                        onChange={(e) => setTxQty(e.target.value)}
                                        min="1"
                                        step="1"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Price per Share (₹) *</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        placeholder="e.g. 1120.00"
                                        value={txPrice}
                                        onChange={(e) => setTxPrice(e.target.value)}
                                        min="0.01"
                                        step="0.01"
                                        required
                                    />
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                                <div className="form-group">
                                    <label className="form-label">Brokerage & STT (₹)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        placeholder="0"
                                        value={txCharges}
                                        onChange={(e) => setTxCharges(e.target.value)}
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Transaction Date *</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={txDate}
                                        onChange={(e) => setTxDate(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: "20px" }}>
                                <label className="form-label">Trade Notes (Optional)</label>
                                <textarea
                                    className="form-input"
                                    rows="2"
                                    placeholder="Strategy, swing trade, or long-term investment reason..."
                                    value={txNotes}
                                    onChange={(e) => setTxNotes(e.target.value)}
                                />
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowTxModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="add-tx-btn" disabled={modalSubmitting}>
                                    {modalSubmitting ? "Saving..." : `Record ${txType}`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
