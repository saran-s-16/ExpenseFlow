import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config({
    path: fileURLToPath(new URL("../../.env", import.meta.url)),
});

import pool from "../config/db.js";

async function runMigration() {
    console.log("Applying Migration 005: 005_create_daily_ai_usage.sql...");
    const sqlPath = fileURLToPath(new URL("../../database/migrations/005_create_daily_ai_usage.sql", import.meta.url));
    const sql = fs.readFileSync(sqlPath, "utf8");

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("COMMIT");
        console.log("Migration 005 applied successfully!");
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Migration 005 failed:", err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
