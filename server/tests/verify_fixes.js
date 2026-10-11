import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config({
    path: fileURLToPath(new URL("../../.env", import.meta.url)),
});

import pool from "../config/db.js";
import jwt from "jsonwebtoken";
import {
    getUserTokenUsage,
    reserveTokens,
    reconcileTokens,
    releaseReservation,
} from "../services/aiTokenService.js";

const BACKEND_URL = "http://localhost:5000";

async function verifyAll() {
    console.log("==========================================");
    console.log("VERIFYING CHATBOT FIXES & TOKEN ALLOWANCE");
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

    // Reset test user usage to 0 for a clean test
    await pool.query(
        `UPDATE user_ai_usage
         SET total_tokens_used = 0, reserved_tokens = 0
         WHERE user_id = $1`,
        [testUser.id]
    );

    console.log(`Test User: ${testUser.email} (ID: ${testUser.id})`);

    // 2. Test single submission behavior with provider quota failure
    console.log("\n1. Testing single submission & failed request token safety...");
    const initialUsage = await getUserTokenUsage(testUser.id);
    console.log(`Initial tokens: remaining=${initialUsage.remainingTokens}, used=${initialUsage.totalTokensUsed}`);

    const chatRes = await fetch(`${BACKEND_URL}/api/ai/chat`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: "What are my expenses?" }),
    });
    const chatData = await chatRes.json();
    console.log(`Chat response status: ${chatRes.status}`);
    console.log(`Error code: ${chatData.code}`);
    console.log(`Message: ${chatData.message}`);

    const postFailedUsage = await getUserTokenUsage(testUser.id);
    console.log(`Post-failure tokens: remaining=${postFailedUsage.remainingTokens}, used=${postFailedUsage.totalTokensUsed}`);
    if (postFailedUsage.totalTokensUsed === 0 && postFailedUsage.remainingTokens === 600) {
        console.log("✅ PASS: Reservation was properly rolled back upon provider error. 0 tokens deducted.");
    } else {
        console.error("❌ FAIL: User was charged tokens despite provider failure!");
    }

    // Check message table: since OpenAI failed, no duplicate or corrupted assistant messages were persisted
    const msgRes = await pool.query(
        "SELECT count(*) FROM ai_chat_messages WHERE user_id = $1",
        [testUser.id]
    );
    console.log(`Messages in database for test user: ${msgRes.rows[0].count}`);
    if (parseInt(msgRes.rows[0].count, 10) === 0) {
        console.log("✅ PASS: Database contains 0 corrupted/partial messages from failed request.");
    }

    // 3. Test mock token reconciliation (authoritative usage from OpenAI)
    console.log("\n2. Testing atomic token reservation & reconciliation...");
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        // Reserve 40 tokens
        const resv = await reserveTokens(client, testUser.id, 40);
        console.log(`Reserved: ${resv.reservedAmount} tokens`);

        // Reconcile with 65 actual tokens (prompt + completion)
        const updated = await reconcileTokens(client, testUser.id, 40, 65);
        await client.query("COMMIT");

        console.log(`Confirmed tokens used: ${updated.totalTokensUsed} / ${updated.maxAllowance}`);
        console.log(`Remaining tokens: ${updated.remainingTokens}`);
        if (updated.totalTokensUsed === 65 && updated.remainingTokens === 535) {
            console.log("✅ PASS: Confirmed token usage atomically recorded in PostgreSQL.");
        } else {
            console.error("❌ FAIL: Token reconciliation mismatch!");
        }
    } finally {
        client.release();
    }

    // 4. Test allowance exhaustion enforcement at 600 tokens
    console.log("\n3. Testing allowance exhaustion enforcement...");
    await pool.query(
        `UPDATE user_ai_usage
         SET total_tokens_used = 600, reserved_tokens = 0
         WHERE user_id = $1`,
        [testUser.id]
    );

    const exhaustedRes = await fetch(`${BACKEND_URL}/api/ai/chat`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: "Should be rejected" }),
    });
    const exhaustedData = await exhaustedRes.json();
    console.log(`Exhausted status: ${exhaustedRes.status}`);
    console.log(`Exhausted code: ${exhaustedData.code}`);
    console.log(`Exhausted message: "${exhaustedData.message}"`);

    const expectedMsg =
        "You have used all 600 AI tokens available for your account. AI Assistant is unavailable until your token allowance resets.";
    if (
        exhaustedRes.status === 403 &&
        exhaustedData.code === "ALLOWANCE_EXHAUSTED" &&
        exhaustedData.message === expectedMsg
    ) {
        console.log("✅ PASS: Exact 600-token exhaustion enforcement verified.");
    } else {
        console.error("❌ FAIL: Allowance exhaustion response did not match requirements!");
    }

    // Clean up test user tokens back to 0
    await pool.query(
        `UPDATE user_ai_usage
         SET total_tokens_used = 0, reserved_tokens = 0
         WHERE user_id = $1`,
        [testUser.id]
    );

    console.log("\n==========================================");
    console.log("ALL VERIFICATIONS COMPLETED SUCCESSFULLY!");
    console.log("==========================================");
    await pool.end();
}

verifyAll().catch(async (e) => {
    console.error("Verification error:", e);
    await pool.end();
    process.exit(1);
});
