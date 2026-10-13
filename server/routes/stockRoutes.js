import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import {
    getMarket,
    getChart,
    searchStocks,
    getWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    getPortfolio,
    recordStockTransaction,
    deleteStockTransaction,
} from "../controllers/stockController.js";

const router = express.Router();

router.use(authenticate);

// Market data & charts
router.get("/market", getMarket);
router.get("/overview", getMarket);
router.get("/search", searchStocks);
router.get("/chart/:symbol", getChart);

// Watchlist
router.get("/watchlist", getWatchlist);
router.post("/watchlist", addToWatchlist);
router.delete("/watchlist/:symbol", removeFromWatchlist);

// Portfolio
router.get("/portfolio", getPortfolio);
router.post("/transactions", recordStockTransaction);
router.delete("/transactions/:id", deleteStockTransaction);

export default router;
