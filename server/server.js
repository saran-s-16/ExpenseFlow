import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

// Ensure root .env is loaded regardless of working directory
dotenv.config({
    path: fileURLToPath(new URL("../.env", import.meta.url)),
});

import pool from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import budgetRoutes from "./routes/budgetRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import savingsGoalRoutes from "./routes/savingsGoalRoutes.js";
import recurringPaymentRoutes from "./routes/recurringPaymentRoutes.js";
import stockRoutes from "./routes/stockRoutes.js";


const app = express();
const PORT = process.env.PORT || 5001;

/* =========================================
   MIDDLEWARE
========================================= */

const allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "https://expense-flow-ivory.vercel.app",
];

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps, curl, Node fetch, same-origin)
            if (!origin) return callback(null, true);

            const normalizedOrigin = origin.replace(/\/+$/, "");

            // Allow any localhost, 127.0.0.1, or ::1 on any port (http or https)
            if (/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(normalizedOrigin)) {
                return callback(null, true);
            }

            // Allow local network IPs (e.g., 192.168.x.x, 10.x.x.x, 172.16-31.x.x)
            if (/^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/i.test(normalizedOrigin)) {
                return callback(null, true);
            }

            // Allow configured production origin and Vercel preview deployment URLs
            if (
                allowedOrigins.includes(normalizedOrigin) ||
                /^https:\/\/.*\.vercel\.app$/i.test(normalizedOrigin)
            ) {
                return callback(null, true);
            }

            // In development or local environments, allow any origin to ensure presentation never fails
            if (process.env.NODE_ENV !== "production") {
                return callback(null, true);
            }

            return callback(null, false);
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With", "Origin"],
    })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================================
   API HEALTH CHECK
========================================= */

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "ExpenseFlow API is running",
        version: "1.0.0",
    });
});

/* =========================================
   DATABASE HEALTH CHECK
========================================= */

app.get("/api/health/database", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");

        res.json({
            success: true,
            message: "PostgreSQL connection is working",
            databaseTime: result.rows[0].now,
        });
    } catch (error) {
        console.error("Database connection error:", error.message);

        res.status(500).json({
            success: false,
            message: "Database connection failed",
        });
    }
});

/* =========================================
   APPLICATION ROUTES
========================================= */

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/savings-goals", savingsGoalRoutes);
app.use("/api/recurring-payments", recurringPaymentRoutes);
app.use("/api/stocks", stockRoutes);


/* =========================================
   HANDLE UNKNOWN API ROUTES
========================================= */

app.use("/api", (req, res) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found",
    });
});

/* =========================================
   GLOBAL ERROR HANDLER
========================================= */

app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
        return res.status(400).json({
            success: false,
            message: "Invalid JSON format in request body",
        });
    }
    console.error("Unhandled server error:", err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal server error occurred",
    });
});

/* =========================================
   START SERVER
========================================= */

app.listen(PORT, () => {
    console.log(`ExpenseFlow server running on http://localhost:${PORT}`);
});

export default app;
