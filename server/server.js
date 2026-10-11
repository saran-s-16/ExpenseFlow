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


const app = express();
const PORT = process.env.PORT || 5000;

/* =========================================
   MIDDLEWARE
========================================= */

app.use(
    cors({
        origin: [
            "http://localhost:5173",
            "https://expense-flow-ivory.vercel.app",
        ],
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
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
    console.error("Unhandled server error:", err);
    res.status(500).json({
        success: false,
        message: "Internal server error occurred",
    });
});

/* =========================================
   START SERVER
========================================= */

app.listen(PORT, () => {
    console.log(`ExpenseFlow server running on http://localhost:${PORT}`);
});

export default app;
