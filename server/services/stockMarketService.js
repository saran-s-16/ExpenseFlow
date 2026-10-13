/**
 * Service for Indian Stock Market Data & Quotes.
 *
 * Provides real market data via server-side Yahoo Finance endpoints for:
 * - Benchmark Indices: NIFTY 50 (^NSEI) and SENSEX (^BSESN)
 * - Major Indian Equities: RELIANCE, TCS, INFY, HDFCBANK, ICICIBANK, ITC, etc.
 *
 * Architecture & Safety:
 * - Server-side only: keeps provider details off the browser.
 * - In-memory cache with 5-minute TTL to prevent rate-limiting and handle network blips.
 * - Accurate market status: evaluates Indian Standard Time (IST) trading hours (09:15 to 15:30 IST weekdays).
 * - Never fabricates fake prices; clearly returns status: 'live', 'cached', 'closed', or 'unavailable'.
 */

// Popular Indian stocks catalogue for search and default view
export const POPULAR_INDIAN_STOCKS = [
    { symbol: "RELIANCE.NS", name: "Reliance Industries Ltd", sector: "Energy / Telecom", ticker: "RELIANCE" },
    { symbol: "TCS.NS", name: "Tata Consultancy Services Ltd", sector: "IT Services", ticker: "TCS" },
    { symbol: "INFY.NS", name: "Infosys Ltd", sector: "IT Services", ticker: "INFY" },
    { symbol: "HDFCBANK.NS", name: "HDFC Bank Ltd", sector: "Banking & Financials", ticker: "HDFCBANK" },
    { symbol: "ICICIBANK.NS", name: "ICICI Bank Ltd", sector: "Banking & Financials", ticker: "ICICIBANK" },
    { symbol: "ITC.NS", name: "ITC Ltd", sector: "FMCG / Diversified", ticker: "ITC" },
    { symbol: "BHARTIARTL.NS", name: "Bharti Airtel Ltd", sector: "Telecommunications", ticker: "BHARTIARTL" },
    { symbol: "SBIN.NS", name: "State Bank of India", sector: "Public Sector Banking", ticker: "SBIN" },
    { symbol: "LT.NS", name: "Larsen & Toubro Ltd", sector: "Engineering & Infrastructure", ticker: "LT" },
    { symbol: "TATAMOTORS.NS", name: "Tata Motors Ltd", sector: "Automobiles", ticker: "TATAMOTORS" },
];

export const BENCHMARK_INDICES = [
    { symbol: "^NSEI", name: "NIFTY 50", exchange: "NSE" },
    { symbol: "^BSESN", name: "SENSEX", exchange: "BSE" },
];

// In-memory cache
const quotesCache = new Map();
const chartsCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Calculates current Indian Market trading status based on IST (UTC+5:30)
 */
export function getIndianMarketStatus() {
    const now = new Date();
    // Convert to IST
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60 * 1000);

    const day = istTime.getDay(); // 0 = Sunday, 6 = Saturday
    const hours = istTime.getHours();
    const minutes = istTime.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    const marketOpen = 9 * 60 + 15; // 09:15 AM IST
    const marketClose = 15 * 60 + 30; // 03:30 PM IST

    const isWeekday = day >= 1 && day <= 5;
    const isOpen = isWeekday && totalMinutes >= marketOpen && totalMinutes <= marketClose;

    return {
        isOpen,
        statusText: isOpen ? "Market Open" : isWeekday ? "Market Closed (After Hours)" : "Market Closed (Weekend)",
        label: isOpen ? "Live (NSE/BSE)" : "End-of-Day / Cached",
        istTime: istTime.toISOString().replace("T", " ").substring(0, 19) + " IST",
        tradingHours: "09:15 AM – 03:30 PM IST (Mon–Fri)",
    };
}

/**
 * Formats a symbol to include .NS if missing and not an index
 */
export function normalizeSymbol(rawSymbol) {
    if (!rawSymbol) return "";
    const sym = rawSymbol.trim().toUpperCase();
    if (sym.startsWith("^")) return sym;
    if (sym.endsWith(".NS") || sym.endsWith(".BO")) return sym;
    return `${sym}.NS`;
}

/**
 * Fetches a single quote with caching
 */
export async function fetchStockQuote(symbol) {
    const normalized = normalizeSymbol(symbol);
    const cached = quotesCache.get(normalized);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return { ...cached.data, isCached: true };
    }

    try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
            normalized
        )}?range=5d&interval=1d`;

        const response = await fetch(url, {
            signal: AbortSignal.timeout(7000),
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }

        const dataJson = await response.json();
        const result = dataJson?.chart?.result?.[0];
        if (!result || !result.meta) {
            throw new Error(`Quote not available for ${symbol}`);
        }

        const meta = result.meta;
        const currentPrice = meta.regularMarketPrice || meta.chartPreviousClose || 0;
        const prevClose = meta.chartPreviousClose || currentPrice;
        const change = currentPrice - prevClose;
        const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

        const data = {
            symbol: normalized,
            rawSymbol: normalized.replace(/\.(NS|BO)$/, ""),
            name: meta.longName || meta.shortName || normalized,
            currency: meta.currency || "INR",
            exchange: meta.exchangeName || "NSE",
            price: Number(currentPrice.toFixed(2)),
            previousClose: Number(prevClose.toFixed(2)),
            change: Number(change.toFixed(2)),
            changePercent: Number(changePercent.toFixed(2)),
            high: meta.regularMarketDayHigh ? Number(meta.regularMarketDayHigh.toFixed(2)) : null,
            low: meta.regularMarketDayLow ? Number(meta.regularMarketDayLow.toFixed(2)) : null,
            volume: meta.regularMarketVolume || 0,
            timestamp: new Date().toISOString(),
            isAvailable: true,
            isCached: false,
        };

        quotesCache.set(normalized, { data, timestamp: Date.now() });
        return data;
    } catch (err) {
        console.error(`Quote fetch error for ${symbol}:`, err.message);
        // If we have any stale cached data, return that with warning
        if (cached) {
            return {
                ...cached.data,
                isCached: true,
                staleWarning: "Network error; showing last cached quote",
            };
        }

        // Return clear unavailable state, NEVER fake numbers
        return {
            symbol: normalized,
            rawSymbol: normalized.replace(/\.(NS|BO)$/, ""),
            name: normalized,
            currency: "INR",
            price: null,
            previousClose: null,
            change: null,
            changePercent: null,
            isAvailable: false,
            errorMessage: "Market data temporarily unavailable",
            timestamp: new Date().toISOString(),
        };
    }
}

/**
 * Fetches overview of Indices + Popular Stocks
 */
export async function getMarketOverview() {
    const marketStatus = getIndianMarketStatus();

    // Fetch Indices
    const indicesPromises = BENCHMARK_INDICES.map((idx) => fetchStockQuote(idx.symbol));
    const stocksPromises = POPULAR_INDIAN_STOCKS.map((st) => fetchStockQuote(st.symbol));

    const [indicesResults, stocksResults] = await Promise.all([
        Promise.all(indicesPromises),
        Promise.all(stocksPromises),
    ]);

    const formattedIndices = indicesResults.map((res, i) => ({
        ...res,
        name: BENCHMARK_INDICES[i].name,
    }));

    const formattedStocks = stocksResults.map((res, i) => ({
        ...res,
        name: POPULAR_INDIAN_STOCKS[i].name,
        sector: POPULAR_INDIAN_STOCKS[i].sector,
        ticker: POPULAR_INDIAN_STOCKS[i].ticker,
    }));

    return {
        marketStatus,
        indices: formattedIndices,
        popularStocks: formattedStocks,
        disclaimer:
            "Educational personal portfolio tracker. Quotes provided via public market feeds and may be delayed up to 15 minutes. Not for live trade execution.",
    };
}

/**
 * Fetches historical price points for charting (1W, 1M, 6M, 1Y)
 */
export async function getHistoricalChart(symbol, range = "1mo") {
    const normalized = normalizeSymbol(symbol);
    const cacheKey = `${normalized}_${range}`;
    const cached = chartsCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.data;
    }

    let interval = "1d";
    if (range === "1w") {
        interval = "15m";
    } else if (range === "1mo") {
        interval = "1d";
    } else if (range === "6mo") {
        interval = "1wk";
    } else if (range === "1y") {
        interval = "1wk";
    }

    try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
            normalized
        )}?range=${range}&interval=${interval}`;

        const response = await fetch(url, {
            signal: AbortSignal.timeout(9000),
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }

        const dataJson = await response.json();
        const result = dataJson?.chart?.result?.[0];
        if (!result || !result.timestamp || !result.indicators?.quote?.[0]) {
            throw new Error(`Chart data unavailable for ${symbol}`);
        }

        const timestamps = result.timestamp;
        const quotes = result.indicators.quote[0];
        const closes = quotes.close || [];

        const points = [];
        for (let i = 0; i < timestamps.length; i++) {
            const close = closes[i];
            if (close !== null && close !== undefined && !Number.isNaN(close)) {
                const dateObj = new Date(timestamps[i] * 1000);
                points.push({
                    timestamp: timestamps[i],
                    date: dateObj.toISOString().split("T")[0],
                    displayDate: dateObj.toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                    }),
                    price: Number(close.toFixed(2)),
                });
            }
        }

        const data = {
            symbol: normalized,
            range,
            currency: result.meta?.currency || "INR",
            points,
            isAvailable: true,
        };

        chartsCache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
    } catch (err) {
        console.error(`Chart fetch error for ${symbol}:`, err.message);
        return {
            symbol: normalized,
            range,
            points: [],
            isAvailable: false,
            errorMessage: "Historical chart data temporarily unavailable",
        };
    }
}
