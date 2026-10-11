import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config({
    path: fileURLToPath(new URL("../../.env", import.meta.url)),
});

import pool from "../config/db.js";
import jwt from "jsonwebtoken";

async function verifyExhaustion() {
    const userRes = await pool.query(
        "SELECT id, email FROM users WHERE email = $1",
        ["aitest_1791730673015@example.com"]
    );
    const userId = userRes.rows[0].id;
    const email = userRes.rows[0].email;

    // Temporarily set usage to 600
    await pool.query(
        `UPDATE user_ai_usage
         SET total_tokens_used = 600, reserved_tokens = 0
         WHERE user_id = $1`,
        [userId]
    );

    const token = jwt.sign(
        { id: userId, email },
        process.env.JWT_SECRET || "fallback_secret",
        { expiresIn: "1h" }
    );

    const res = await fetch("http://localhost:5000/api/ai/chat", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: "Hello AI!" }),
    });

    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Code:", data.code);
    console.log("Message:", data.message);
    console.log("Remaining tokens:", data.usage?.remainingTokens);

    // Restore to 0
    await pool.query(
        `UPDATE user_ai_usage
         SET total_tokens_used = 0, reserved_tokens = 0
         WHERE user_id = $1`,
        [userId]
    );

    await pool.end();
}

verifyExhaustion().catch(async (e) => {
    console.error(e);
    await pool.end();
    process.exit(1);
});
