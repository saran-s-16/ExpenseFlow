/**
 * ==============================================================================
 * ExpenseFlow - Database Full Restoration Script
 * ==============================================================================
 * Restores all 7 tables, all 16 user accounts, categories, transactions,
 * budgets, and AI records from database/restore_full_backup.sql.
 * 
 * Works for both:
 *   - Local database (reads .env)
 *   - Remote Render PostgreSQL (via DATABASE_URL)
 * ==============================================================================
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
    path: path.resolve(__dirname, "../../.env"),
});

const { Pool } = pg;

async function runRestore() {
    let sqlPath = path.resolve(__dirname, "../../scratch/restore_full_backup.sql");
    if (!fs.existsSync(sqlPath)) {
        sqlPath = path.resolve(__dirname, "../../database/restore_full_backup.sql");
    }
    if (!fs.existsSync(sqlPath)) {
        console.error("Restoration SQL file not found at:", sqlPath);
        process.exit(1);
    }

    const sql = fs.readFileSync(sqlPath, "utf-8");

    const poolConfig = {};
    if (process.env.DATABASE_URL) {
        poolConfig.connectionString = process.env.DATABASE_URL;
        if (
            process.env.NODE_ENV === "production" ||
            process.env.DATABASE_URL.includes("render.com") ||
            process.env.DB_SSL === "true"
        ) {
            poolConfig.ssl = { rejectUnauthorized: false };
        }
    } else {
        poolConfig.host = process.env.DB_HOST || "localhost";
        poolConfig.port = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432;
        poolConfig.database = process.env.DB_NAME || "expense_tracker";
        poolConfig.user = process.env.DB_USER;
        poolConfig.password = process.env.DB_PASSWORD;

        if (
            process.env.NODE_ENV === "production" ||
            process.env.DB_SSL === "true" ||
            (process.env.DB_HOST && process.env.DB_HOST.includes("render.com"))
        ) {
            poolConfig.ssl = { rejectUnauthorized: false };
        }
    }

    const hostLabel = poolConfig.host || "via DATABASE_URL";
    console.log(`Connecting to PostgreSQL (${hostLabel})...`);

    const pool = new Pool(poolConfig);
    const client = await pool.connect();

    try {
        console.log("Applying full database restoration script...");
        await client.query(sql);
        console.log("✓ Full database restoration script executed successfully.");

        // Verification counts
        const tables = ["users", "categories", "transactions", "budgets", "user_ai_usage", "ai_chat_messages", "user_ai_daily_usage"];
        console.log("\nVerified Table Counts:");
        for (const t of tables) {
            const countRes = await client.query(`SELECT COUNT(*) FROM ${t}`);
            console.log(`  ✓ Table '${t}': ${countRes.rows[0].count} records`);
        }

        console.log("\n=================================================");
        console.log("  Restoration completed successfully!            ");
        console.log("=================================================");
        process.exit(0);
    } catch (err) {
        console.error("Restoration failed:", err.message);
        if (err.code) console.error("PostgreSQL Code:", err.code);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runRestore();
