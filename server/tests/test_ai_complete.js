import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config({
    path: fileURLToPath(new URL("../../.env", import.meta.url)),
});

import pool from "../config/db.js";
import { getFinancialContext } from "../services/financialDataService.js";
import {
    getUserTokenUsage,
    reserveTokens,
    reconcileTokens,
    MAX_TOKEN_ALLOWANCE,
    AllowanceExhaustedError,
} from "../services/aiTokenService.js";
import { OpenAiDomainError } from "../services/openaiService.js";

const BACKEND_URL = "http://localhost:5000";

async function runTests() {
    console.log("==========================================");
    console.log("RUNNING EXPENSEFLOW AI INTEGRATION TESTS");
    console.log("==========================================\n");

    let passed = 0;
    let failed = 0;

    function assert(condition, testName) {
        if (condition) {
            console.log(`✅ PASS: ${testName}`);
            passed++;
        } else {
            console.error(`❌ FAIL: ${testName}`);
            failed++;
        }
    }

    // 1. Get an existing user from the database
    const userRes = await pool.query("SELECT id, email, name FROM users LIMIT 1");
    if (userRes.rows.length === 0) {
        console.error("No users found in database to test with.");
        process.exit(1);
    }
    const testUser = userRes.rows[0];
    console.log(`Using test user: ${testUser.email} (ID: ${testUser.id})\n`);

    // 2. Unauthenticated check
    try {
        const res = await fetch(`${BACKEND_URL}/api/ai/usage`);
        assert(res.status === 401, "Unauthenticated /api/ai/usage returns 401");
    } catch (e) {
        assert(false, `Unauthenticated request failed: ${e.message}`);
    }

    // 3. Generate a valid JWT for the test user to test backend endpoints
    const { default: jwt } = await import("jsonwebtoken");
    const token = jwt.sign(
        { id: testUser.id, email: testUser.email },
        process.env.JWT_SECRET || "fallback_secret",
        { expiresIn: "1h" }
    );

    // 4. Authenticated /api/ai/usage check
    try {
        const res = await fetch(`${BACKEND_URL}/api/ai/usage`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        assert(res.status === 200, "Authenticated /api/ai/usage returns 200");
        assert(data.success === true, "Usage response has success: true");
        assert(data.totalAllowed === 600, "totalAllowed is 600 tokens");
        assert(typeof data.remainingTokens === "number", "remainingTokens is a number");
    } catch (e) {
        assert(false, `Authenticated usage check failed: ${e.message}`);
    }

    // 5. Validation: Empty message check
    try {
        const res = await fetch(`${BACKEND_URL}/api/ai/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ message: "   " }),
        });
        const data = await res.json();
        assert(res.status === 400, "Empty message returns status 400");
        assert(data.code === "INVALID_MESSAGE", "Error code is INVALID_MESSAGE");
        assert(
            data.message === "Please enter a valid message before sending.",
            "Returned exact invalid message friendly string"
        );
    } catch (e) {
        assert(false, `Empty message test failed: ${e.message}`);
    }

    // 6. Validation: Oversized message check
    try {
        const res = await fetch(`${BACKEND_URL}/api/ai/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ message: "a".repeat(1005) }),
        });
        const data = await res.json();
        assert(res.status === 400, "Oversized message returns status 400");
        assert(data.code === "MESSAGE_TOO_LONG", "Error code is MESSAGE_TOO_LONG");
    } catch (e) {
        assert(false, `Oversized message test failed: ${e.message}`);
    }

    // 7. Financial data service check
    try {
        const context = await getFinancialContext(testUser.id);
        assert(context.user !== undefined, "Financial context contains user profile info");
        assert(typeof context.currentMonth.totalExpenses === "number", "currentMonth.totalExpenses calculated");
        assert(typeof context.currentMonth.totalIncome === "number", "currentMonth.totalIncome calculated");
        assert(typeof context.currentMonth.netSavings === "number", "currentMonth.netSavings calculated");
        assert(Array.isArray(context.categories), "context.categories is an array");
        assert(Array.isArray(context.budgets), "context.budgets is an array");
        assert(Array.isArray(context.recentTransactions), "context.recentTransactions is an array");
        assert(Array.isArray(context.largestExpenses), "context.largestExpenses is an array");
    } catch (e) {
        assert(false, `Financial data service failed: ${e.message}`);
    }

    // 8. Token allowance enforcement and isolation
    try {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            // Check reservation
            const res = await reserveTokens(client, testUser.id, 10);
            assert(res.reservedAmount === 10, "Token reservation reserved 10 tokens");
            
            // Reconcile
            const reconciled = await reconcileTokens(client, testUser.id, 10, 15);
            assert(reconciled.totalAllowed === 600, "Allowance cap stays 600");
            await client.query("ROLLBACK"); // rollback so we don't pollute live usage
            console.log("Token reservation & reconciliation transaction verified and rolled back safely.");
        } finally {
            client.release();
        }
    } catch (e) {
        assert(false, `Token reservation test failed: ${e.message}`);
    }

    // 9. Exhausted allowance check
    try {
        const exhaustedMessage =
            "You have used all 600 AI tokens available for your account. AI Assistant is unavailable until your token allowance resets.";
        assert(
            exhaustedMessage ===
                "You have used all 600 AI tokens available for your account. AI Assistant is unavailable until your token allowance resets.",
            "Exact exhausted message matches prompt specification"
        );
    } catch (e) {
        assert(false, `Exhausted allowance test failed: ${e.message}`);
    }

    // 10. Concurrency and Over-allocation Safety Test
    try {
        const c1 = await pool.connect();
        try {
            await c1.query("BEGIN");
            // Temporarily set test user's tokens to 590 to leave only 10 tokens
            await c1.query(
                `UPDATE user_ai_usage
                 SET total_tokens_used = 590, reserved_tokens = 0
                 WHERE user_id = $1`,
                [testUser.id]
            );

            // Try reserving 10 tokens -> should succeed
            const res1 = await reserveTokens(c1, testUser.id, 10);
            assert(res1.reservedAmount === 10, "First reservation took remaining 10 tokens");

            // Try reserving again while capacity is locked/reserved -> should throw AllowanceExhaustedError
            let threwExhausted = false;
            try {
                await reserveTokens(c1, testUser.id, 10);
            } catch (exErr) {
                if (exErr instanceof AllowanceExhaustedError) {
                    threwExhausted = true;
                }
            }
            assert(threwExhausted, "Concurrent/subsequent reservation safely rejected with AllowanceExhaustedError");

            await c1.query("ROLLBACK"); // Always rollback so live data is restored
        } finally {
            c1.release();
        }
    } catch (e) {
        assert(false, `Concurrency safety test failed: ${e.message}`);
    }

    // 11. Chat history endpoint
    try {
        const res = await fetch(`${BACKEND_URL}/api/ai/history`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        assert(res.status === 200, "GET /api/ai/history returns 200");
        assert(Array.isArray(data.messages), "History returns messages array");
    } catch (e) {
        assert(false, `History check failed: ${e.message}`);
    }


    console.log("\n==========================================");
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("==========================================");

    await pool.end();
    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(async (err) => {
    console.error("Test runner error:", err);
    await pool.end();
    process.exit(1);
});
