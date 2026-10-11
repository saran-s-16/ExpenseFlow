import pg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config({
    path: fileURLToPath(new URL("../../.env", import.meta.url))
});

const { Pool } = pg;

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

pool.on("connect", () => {
    console.log("PostgreSQL database connected");
});

pool.on("error", (error) => {
    console.error("PostgreSQL pool error:", error);
});

export default pool;