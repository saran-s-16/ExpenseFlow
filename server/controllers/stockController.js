import pool from "../config/db.js";
import {
    getMarketOverview,
    getHistoricalChart,
    fetchStockQuote,
    POPULAR_INDIAN_STOCKS,
    normalizeSymbol,
} from "../services/stockMarketService.js";

/**
 * Controller for Indian Stock Market, Watchlist, and Educational Portfolio.
 * Strictly enforces user isolation via authenticated req.user.id.
 */

// 1. Market Overview (NIFTY 50, SENSEX, Popular Stocks)
export async function getMarket(req, res) {
    try {
        const data = await getMarketOverview();
        return res.json({
            success: true,
            ...data,
        });
    } catch (error) {
        console.error("getMarket error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to retrieve Indian market data",
        });
    }
}

// 2. Historical Chart Points for a Stock (1W, 1M, 6M, 1Y)
export async function getChart(req, res) {
    try {
        const { symbol } = req.params;
        const { range = "1mo" } = req.query;

        if (!symbol) {
            return res.status(400).json({
                success: false,
                message: "Stock symbol is required",
            });
        }

        const chart = await getHistoricalChart(symbol, range);
        return res.json({
            success: true,
            ...chart,
        });
    } catch (error) {
        console.error("getChart error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to load stock chart data",
        });
    }
}

// 3. Search / Autocomplete popular Indian Stocks
export async function searchStocks(req, res) {
    try {
        const { query = "" } = req.query;
        const q = query.trim().toUpperCase();

        let filtered = POPULAR_INDIAN_STOCKS;
        if (q) {
            filtered = POPULAR_INDIAN_STOCKS.filter(
                (s) =>
                    s.ticker.includes(q) ||
                    s.name.toUpperCase().includes(q) ||
                    s.symbol.includes(q)
            );
        }

        return res.json({
            success: true,
            results: filtered,
        });
    } catch (error) {
        console.error("searchStocks error:", error);
        return res.status(500).json({
            success: false,
            message: "Stock search failed",
        });
    }
}

// 4. User's Personal Watchlist
export async function getWatchlist(req, res) {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            `SELECT id, symbol, company_name, exchange, created_at
             FROM stock_watchlist
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [userId]
        );

        // Enhance watchlist items with quotes
        const enhancedItems = await Promise.all(
            result.rows.map(async (row) => {
                const quote = await fetchStockQuote(row.symbol);
                return {
                    id: row.id,
                    symbol: row.symbol,
                    companyName: row.company_name,
                    exchange: row.exchange,
                    price: quote.price,
                    change: quote.change,
                    changePercent: quote.changePercent,
                    previousClose: quote.previousClose,
                    high: quote.high,
                    low: quote.low,
                    isAvailable: quote.isAvailable,
                    isCached: quote.isCached,
                    timestamp: quote.timestamp,
                };
            })
        );

        return res.json({
            success: true,
            watchlist: enhancedItems,
        });
    } catch (error) {
        console.error("getWatchlist error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve stock watchlist",
        });
    }
}

// 5. Add to Personal Watchlist
export async function addToWatchlist(req, res) {
    try {
        const userId = req.user.id;
        const { symbol, companyName } = req.body;

        if (!symbol) {
            return res.status(400).json({
                success: false,
                message: "Stock symbol is required",
            });
        }

        const normalized = normalizeSymbol(symbol);
        const name = companyName || normalized.replace(/\.(NS|BO)$/, "");

        const result = await pool.query(
            `INSERT INTO stock_watchlist (user_id, symbol, company_name)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, symbol) DO NOTHING
             RETURNING id, symbol, company_name, exchange, created_at`,
            [userId, normalized, name]
        );

        return res.status(201).json({
            success: true,
            message: `Added ${normalized} to your watchlist`,
            item: result.rows[0] || { symbol: normalized, companyName: name },
        });
    } catch (error) {
        console.error("addToWatchlist error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to add stock to watchlist",
        });
    }
}

// 6. Remove from Watchlist
export async function removeFromWatchlist(req, res) {
    try {
        const userId = req.user.id;
        const { symbol } = req.params;

        const normalized = normalizeSymbol(symbol);

        const result = await pool.query(
            "DELETE FROM stock_watchlist WHERE user_id = $1 AND (symbol = $2 OR symbol = $3) RETURNING id",
            [userId, normalized, symbol.toUpperCase()]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Stock not found in your watchlist",
            });
        }

        return res.json({
            success: true,
            message: "Removed from watchlist",
        });
    } catch (error) {
        console.error("removeFromWatchlist error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to remove stock from watchlist",
        });
    }
}

// 7. Portfolio Tracker (Holdings, Invested, Market Value, Unrealized P&L, Realized P&L)
export async function getPortfolio(req, res) {
    try {
        const userId = req.user.id;

        // Fetch all transactions for this user
        const txRes = await pool.query(
            `SELECT id, user_id, symbol, company_name, transaction_type, quantity, price_per_share, brokerage_charges, transaction_date, notes, created_at
             FROM stock_transactions
             WHERE user_id = $1
             ORDER BY transaction_date ASC, id ASC`,
            [userId]
        );

        const transactions = txRes.rows;

        // Group by symbol to compute holdings and cost basis
        const holdingsMap = {};
        let totalRealizedPl = 0;

        for (const tx of transactions) {
            const sym = normalizeSymbol(tx.symbol);
            const qty = Number(tx.quantity);
            const price = Number(tx.price_per_share);
            const charges = Number(tx.brokerage_charges || 0);

            if (!holdingsMap[sym]) {
                holdingsMap[sym] = {
                    symbol: sym,
                    companyName: tx.company_name,
                    totalBoughtQty: 0,
                    totalBoughtCost: 0,
                    totalSoldQty: 0,
                    totalSoldRevenue: 0,
                    currentQty: 0,
                    realizedPl: 0,
                };
            }

            const h = holdingsMap[sym];

            if (tx.transaction_type === "BUY") {
                h.totalBoughtQty += qty;
                h.totalBoughtCost += qty * price + charges;
                h.currentQty += qty;
            } else if (tx.transaction_type === "SELL") {
                // Average cost basis at the time of sale
                const avgBuyPrice =
                    h.currentQty > 0 ? h.totalBoughtCost / (h.currentQty + h.totalSoldQty) : price;
                const costBasisForSale = avgBuyPrice * qty;
                const saleProceeds = qty * price - charges;
                const profitOnSale = saleProceeds - costBasisForSale;

                h.totalSoldQty += qty;
                h.totalSoldRevenue += saleProceeds;
                h.currentQty = Math.max(0, h.currentQty - qty);
                h.realizedPl += profitOnSale;
                totalRealizedPl += profitOnSale;
            }
        }

        // Fetch live quotes for all currently held stocks
        const activeSymbols = Object.keys(holdingsMap).filter((s) => holdingsMap[s].currentQty > 0);
        const quotesList = await Promise.all(activeSymbols.map((s) => fetchStockQuote(s)));
        const quoteMap = {};
        quotesList.forEach((q) => {
            quoteMap[q.symbol] = q;
        });

        let totalInvested = 0;
        let totalCurrentValue = 0;
        let totalUnrealizedPl = 0;

        const holdings = [];

        for (const sym of activeSymbols) {
            const h = holdingsMap[sym];
            const quote = quoteMap[sym] || {};
            const marketPrice = quote.price || 0;

            const avgBuyPrice =
                h.totalBoughtQty > 0 ? Number((h.totalBoughtCost / h.totalBoughtQty).toFixed(2)) : 0;
            const investedAmount = Number((h.currentQty * avgBuyPrice).toFixed(2));
            const currentValue = Number((h.currentQty * marketPrice).toFixed(2));
            const unrealizedPl = marketPrice > 0 ? Number((currentValue - investedAmount).toFixed(2)) : 0;
            const unrealizedPlPercent =
                investedAmount > 0 && marketPrice > 0
                    ? Number(((unrealizedPl / investedAmount) * 100).toFixed(2))
                    : 0;

            totalInvested += investedAmount;
            totalCurrentValue += currentValue;
            totalUnrealizedPl += unrealizedPl;

            holdings.push({
                symbol: sym,
                companyName: h.companyName,
                quantity: h.currentQty,
                averageBuyPrice: avgBuyPrice,
                investedAmount,
                currentPrice: marketPrice,
                currentValue,
                unrealizedPl,
                unrealizedPlPercent,
                dailyChange: quote.change || 0,
                dailyChangePercent: quote.changePercent || 0,
                isMarketDataAvailable: Boolean(quote.isAvailable),
            });
        }

        // Compute portfolio allocation percentage
        holdings.forEach((h) => {
            h.allocationPercent =
                totalCurrentValue > 0
                    ? Number(((h.currentValue / totalCurrentValue) * 100).toFixed(1))
                    : 0;
        });

        // Sort holdings by largest current value
        holdings.sort((a, b) => b.currentValue - a.currentValue);

        const totalUnrealizedPlPercent =
            totalInvested > 0 ? Number(((totalUnrealizedPl / totalInvested) * 100).toFixed(2)) : 0;

        return res.json({
            success: true,
            summary: {
                totalInvested: Number(totalInvested.toFixed(2)),
                totalCurrentValue: Number(totalCurrentValue.toFixed(2)),
                totalUnrealizedPl: Number(totalUnrealizedPl.toFixed(2)),
                totalUnrealizedPlPercent,
                totalRealizedPl: Number(totalRealizedPl.toFixed(2)),
                totalHoldingsCount: holdings.length,
            },
            holdings,
            transactions: transactions.map((t) => ({
                id: t.id,
                symbol: t.symbol,
                companyName: t.company_name,
                type: t.transaction_type,
                quantity: Number(t.quantity),
                pricePerShare: Number(t.price_per_share),
                brokerageCharges: Number(t.brokerage_charges || 0),
                totalAmount:
                    Number(t.quantity) * Number(t.price_per_share) +
                    Number(t.brokerage_charges || 0),
                date: t.transaction_date,
                notes: t.notes || "",
            })),
            disclaimer:
                "This portfolio tracker is for educational tracking purposes only. Does not execute trades or connect to brokerage accounts.",
        });
    } catch (error) {
        console.error("getPortfolio error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to calculate investment portfolio",
        });
    }
}

// 8. Record Stock Transaction (Manual BUY or SELL)
export async function recordStockTransaction(req, res) {
    try {
        const userId = req.user.id;
        const {
            symbol,
            companyName,
            transactionType,
            quantity,
            pricePerShare,
            brokerageCharges = 0,
            transactionDate,
            notes,
        } = req.body;

        if (!symbol) {
            return res.status(400).json({
                success: false,
                message: "Stock symbol is required",
            });
        }

        const type = transactionType ? transactionType.toUpperCase() : "BUY";
        if (type !== "BUY" && type !== "SELL") {
            return res.status(400).json({
                success: false,
                message: "Transaction type must be 'BUY' or 'SELL'",
            });
        }

        const qty = Number(quantity);
        if (!qty || qty <= 0) {
            return res.status(400).json({
                success: false,
                message: "Quantity must be greater than 0",
            });
        }

        const price = Number(pricePerShare);
        if (!price || price <= 0) {
            return res.status(400).json({
                success: false,
                message: "Price per share must be greater than 0",
            });
        }

        const charges = Number(brokerageCharges) || 0;
        if (charges < 0) {
            return res.status(400).json({
                success: false,
                message: "Brokerage charges cannot be negative",
            });
        }

        if (!transactionDate) {
            return res.status(400).json({
                success: false,
                message: "Transaction date is required",
            });
        }

        const normalized = normalizeSymbol(symbol);
        const name = companyName || normalized.replace(/\.(NS|BO)$/, "");

        // If SELL: validate user has enough shares
        if (type === "SELL") {
            const checkHoldings = await pool.query(
                `SELECT
                    COALESCE(SUM(quantity) FILTER (WHERE transaction_type = 'BUY'), 0) -
                    COALESCE(SUM(quantity) FILTER (WHERE transaction_type = 'SELL'), 0) AS current_qty
                 FROM stock_transactions
                 WHERE user_id = $1 AND (symbol = $2 OR symbol = $3)`,
                [userId, normalized, symbol.toUpperCase()]
            );

            const ownedQty = Number(checkHoldings.rows[0].current_qty || 0);
            if (qty > ownedQty) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot sell ${qty} shares. You currently own ${ownedQty} shares of ${normalized}.`,
                });
            }
        }

        const insertRes = await pool.query(
            `INSERT INTO stock_transactions
             (user_id, symbol, company_name, transaction_type, quantity, price_per_share, brokerage_charges, transaction_date, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [userId, normalized, name, type, qty, price, charges, transactionDate, notes || ""]
        );

        return res.status(201).json({
            success: true,
            message: `Recorded ${type} transaction for ${normalized}`,
            transaction: insertRes.rows[0],
        });
    } catch (error) {
        console.error("recordStockTransaction error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to record stock transaction",
        });
    }
}

// 9. Delete Stock Transaction
export async function deleteStockTransaction(req, res) {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const result = await pool.query(
            "DELETE FROM stock_transactions WHERE id = $1 AND user_id = $2 RETURNING id",
            [id, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Transaction not found",
            });
        }

        return res.json({
            success: true,
            message: "Stock transaction deleted successfully",
        });
    } catch (error) {
        console.error("deleteStockTransaction error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete transaction",
        });
    }
}
