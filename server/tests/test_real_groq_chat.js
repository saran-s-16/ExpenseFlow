import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config({
    path: fileURLToPath(new URL("../../.env", import.meta.url)),
});

import pool from "../config/db.js";
import jwt from "jsonwebtoken";

const BACKEND_URL = "http://localhost:5000";

async function testRealGroqChat() {
    console.log("==========================================");
    console.log("TESTING REAL GROQ REQUEST VIA BACKEND API");
    console.log("==========================================\n");

    // 1. Get test user
    const userRes = await pool.query(
        "SELECT id, email, name FROM users WHERE email = $1",
        ["aitest_1791730673015@example.com"]
    );
    if (userRes.rows.length === 0) {
        console.error("Test user not found");
        process.exit(1);
    }
    const testUser = userRes.rows[0];
    const token = jwt.sign(
        { id: testUser.id, email: testUser.email },
        process.env.JWT_SECRET || "fallback_secret",
        { expiresIn: "1h" }
    );

    console.log(`Testing with user: ${testUser.email} (ID: ${testUser.id})`);

    // Reset test user usage to 0 for clear token tracking verification
    await pool.query(
        `UPDATE user_ai_usage
         SET total_tokens_used = 0, reserved_tokens = 0
         WHERE user_id = $1`,
        [testUser.id]
    );

    // 2. Send a real prompt: "How much did I spend this month?"
    console.log("\nSending prompt to POST /api/ai/chat: 'How much did I spend this month?'...");
    const startTime = Date.now();
    const res = await fetch(`${BACKEND_URL}/api/ai/chat`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: "How much did I spend this month?" }),
    });

    const elapsed = Date.now() - startTime;
    const data = await res.json();

    console.log(`\nHTTP Status: ${res.status} (${elapsed}ms)`);
    console.log("Response success:", data.success);

    if (data.success) {
        console.log("\n--- AI ASSISTANT GROQ RESPONSE ---");
        console.log(data.message);
        console.log("\n--- TOKEN USAGE REPORT ---");
        console.log("Tokens used in this turn:", data.tokensUsedInTurn);
        console.log("Remaining tokens:", data.usage?.remainingTokens, "/", data.usage?.totalAllowed);
        console.log("Total tokens used:", data.usage?.totalTokensUsed);

        // Verify PostgreSQL persistence
        const dbUsage = await pool.query(
            "SELECT total_tokens_used, reserved_tokens FROM user_ai_usage WHERE user_id = $1",
            [testUser.id]
        );
        console.log("\nPostgreSQL verification:");
        console.log("user_ai_usage row:", dbUsage.rows[0]);

        const dbMsgs = await pool.query(
            "SELECT role, content, tokens_used FROM ai_chat_messages WHERE user_id = $1 ORDER BY id DESC LIMIT 2",
            [testUser.id]
        );
        console.log("Saved messages count:", dbMsgs.rows.length);
        console.log("Last assistant message tokens recorded in DB:", dbMsgs.rows[0]?.tokens_used);

        console.log("\n✅ REAL GROQ CHAT REQUEST COMPLETED SUCCESSFULLY!");
    } else {
        console.error("❌ REQUEST FAILED:", data);
    }

    await pool.end();
}

testRealGroqChat().catch(async (err) => {
    console.error("Error during real Groq chat test:", err);
    await pool.end();
    process.exit(1);
});
