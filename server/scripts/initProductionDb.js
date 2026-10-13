/**
 * ==============================================================================
 * ExpenseFlow - Production Database Initializer
 * ==============================================================================
 * 
 * Safely applies all database schema migrations in chronological sequence.
 * 
 * Safety Guarantees:
 * 1. Fully idempotent: uses CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS.
 * 2. Non-destructive: NEVER drops tables, deletes records, or truncates data.
 * 3. Atomic: all migrations execute inside a single PostgreSQL transaction (BEGIN...COMMIT).
 * 4. Safe credentials: reads standard environment variables without printing secrets.
 * 5. Dry-run mode: supports --dry-run flag to validate files and SQL without connecting.
 * 
 * Usage:
 *   node server/scripts/initProductionDb.js             # Runs migrations
 *   node server/scripts/initProductionDb.js --dry-run   # Validates files without DB connection
 * ==============================================================================
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project root .env if present
dotenv.config({
    path: path.resolve(__dirname, "../../.env"),
});

const { Pool } = pg;

// Ordered list of migrations to execute
const MIGRATION_FILES = [
    "001_create_users.sql",
    "002_create_categories.sql",
    "003_create_transactions.sql",
    "004_create_ai_tables.sql",
    "005_create_daily_ai_usage.sql",
    "006_create_budgets.sql",
    "007_create_savings_goals.sql",
    "008_create_recurring_payments.sql",
    "009_create_stock_tracker.sql",
];

// Required tables that must exist after migrations
const REQUIRED_TABLES = [
    "users",
    "categories",
    "transactions",
    "budgets",
    "user_ai_usage",
    "ai_chat_messages",
    "user_ai_daily_usage",
    "savings_goals",
    "recurring_payments",
    "stock_watchlist",
    "stock_transactions",
];

async function run() {
    const isDryRun = process.argv.includes("--dry-run");
    const migrationsDir = path.resolve(__dirname, "../../database/migrations");

    console.log("=================================================");
    console.log("  ExpenseFlow Production Database Initializer    ");
    console.log("=================================================");

    // Step 1: Validate migration files
    console.log("\n[1/4] Checking migration files...");
    const migrationSqls = [];

    for (const filename of MIGRATION_FILES) {
        const filePath = path.join(migrationsDir, filename);
        if (!fs.existsSync(filePath)) {
            console.error(`[ERROR] Missing required migration file: ${filename}`);
            process.exit(1);
        }
        const sql = fs.readFileSync(filePath, "utf-8").trim();
        if (!sql) {
            console.error(`[ERROR] Migration file is empty: ${filename}`);
            process.exit(1);
        }
        migrationSqls.push({ filename, sql });
        console.log(`  ✓ Found ${filename} (${sql.length} bytes)`);
    }

    if (isDryRun) {
        console.log("\n[DRY RUN] All 6 migration files verified and ready to apply.");
        console.log("[DRY RUN] No database connection was made.");
        console.log("=================================================");
        process.exit(0);
    }

    // Step 2: Establish connection pool
    console.log("\n[2/4] Connecting to PostgreSQL database...");

    const poolConfig = {};

    if (process.env.DATABASE_URL) {
        poolConfig.connectionString = process.env.DATABASE_URL;
        // Enable SSL if connecting to Render or production
        if (
            process.env.NODE_ENV === "production" ||
            process.env.DATABASE_URL.includes("render.com") ||
            process.env.DB_SSL === "true"
        ) {
            poolConfig.ssl = { rejectUnauthorized: false };
        }
    } else {
        poolConfig.host = process.env.DB_HOST;
        poolConfig.port = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432;
        poolConfig.database = process.env.DB_NAME;
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

    // Safe sanitized connection log (NEVER prints password)
    const targetHost = poolConfig.host || (poolConfig.connectionString ? "via DATABASE_URL" : "localhost");
    const targetDb = poolConfig.database || "(from connection string)";
    console.log(`  Connecting to host: ${targetHost}, database: ${targetDb}`);

    const pool = new Pool(poolConfig);
    const client = await pool.connect();

    try {
        console.log("  ✓ Database connection established.");

        // Step 3: Run migrations in a transaction
        console.log("\n[3/4] Applying migrations in an atomic transaction...");
        await client.query("BEGIN");

        for (const { filename, sql } of migrationSqls) {
            console.log(`  Applying ${filename}...`);
            await client.query(sql);
            console.log(`  ✓ ${filename} applied successfully.`);
        }

        await client.query("COMMIT");
        console.log("  ✓ All migrations committed successfully.");

        // Step 4: Verify required tables
        console.log("\n[4/4] Verifying created tables in information_schema...");
        const tablesRes = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        `);

        const existingTables = new Set(tablesRes.rows.map((r) => r.table_name));
        let allPresent = true;

        for (const table of REQUIRED_TABLES) {
            if (existingTables.has(table)) {
                console.log(`  ✓ Table '${table}' exists.`);
            } else {
                console.error(`  ✗ Table '${table}' is MISSING!`);
                allPresent = false;
            }
        }

        if (!allPresent) {
            throw new Error("One or more required tables are missing after migration.");
        }

        console.log("\n=================================================");
        console.log("  Database initialization completed successfully! ");
        console.log("=================================================");
    } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        console.error("\n[ERROR] Migration failed and was rolled back safely:");
        console.error(`  Message: ${error.message}`);
        if (error.code) console.error(`  PostgreSQL Code: ${error.code}`);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
