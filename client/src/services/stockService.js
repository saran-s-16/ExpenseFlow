import api from "./api";

export async function getMarketData() {
    const res = await api.get("/stocks/market");
    return res.data;
}

export async function getStockChart(symbol, range = "1mo") {
    const res = await api.get(`/stocks/chart/${encodeURIComponent(symbol)}?range=${range}`);
    return res.data;
}

export async function searchStocks(query = "") {
    const res = await api.get(`/stocks/search?query=${encodeURIComponent(query)}`);
    return res.data;
}

export async function getWatchlist() {
    const res = await api.get("/stocks/watchlist");
    return res.data;
}

export async function addToWatchlist(symbol, companyName) {
    const res = await api.post("/stocks/watchlist", { symbol, companyName });
    return res.data;
}

export async function removeFromWatchlist(symbol) {
    const res = await api.delete(`/stocks/watchlist/${encodeURIComponent(symbol)}`);
    return res.data;
}

export async function getPortfolio() {
    const res = await api.get("/stocks/portfolio");
    return res.data;
}

export async function recordStockTransaction(data) {
    const res = await api.post("/stocks/transactions", data);
    return res.data;
}

export async function deleteStockTransaction(id) {
    const res = await api.delete(`/stocks/transactions/${id}`);
    return res.data;
}
