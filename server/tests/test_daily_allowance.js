import pool from "../config/db.js";
import {
    DAILY_TOKEN_ALLOWANCE,
    getIndiaCurrentDate,
    getNextMidnightIst,
    getUserTokenUsage,
    reserveTokens,
    reconcileTokens,
    releaseReservation,
    AllowanceExhaustedError,
    EXACT_EXHAUSTED_MESSAGE,
} from "../services/aiTokenService.js";

async function runTests() {
    console.log("=== EXPENSEFLOW DAILY TOKEN ALLOWANCE & RESET VERIFICATION ===");
    const istToday = getIndiaCurrentDate();
    const nextMidnight = getNextMidnightIst();
    console.log(`Current India-local date: ${istToday}`);
    console.log(`Next midnight IST timestamp: ${nextMidnight}`);

    let passed = 0;
    let failed = 0;

    function assert(cond, desc) {
        if (cond) {
            console.log(`[PASS] ${desc}`);
            passed++;
        } else {
            console.error(`[FAIL] ${desc}`);
            failed++;
        }
    }

    try {
        // Prepare 2 isolated test users
        const timestamp = Date.now();
        const emailA = `test_daily_a_${timestamp}@example.com`;
        const emailB = `test_daily_b_${timestamp}@example.com`;

        const userARes = await pool.query(
            `INSERT INTO users (name, email, password_hash)
             VALUES ('Daily User A', $1, 'hashed_pw_dummy')
             RETURNING id`,
            [emailA]
        );
        const userBRes = await pool.query(
            `INSERT INTO users (name, email, password_hash)
             VALUES ('Daily User B', $1, 'hashed_pw_dummy')
             RETURNING id`,
            [emailB]
        );

        const userAId = userARes.rows[0].id;
        const userBId = userBRes.rows[0].id;

        // Test 1: Each user starts with 50,000 tokens for the current India-local day
        console.log("\n--- Test 1: Initial daily allowance starts at 50,000 tokens ---");
        const usageA = await getUserTokenUsage(userAId, istToday);
        assert(usageA.totalAllowed === 50000, `Total allowed is 50,000 (got ${usageA.totalAllowed})`);
        assert(usageA.remainingTokens === 50000, `Initial remaining tokens is 50,000 (got ${usageA.remainingTokens})`);
        assert(usageA.confirmedUsage === 0, `Initial confirmed usage is 0 (got ${usageA.confirmedUsage})`);
        assert(usageA.isExhausted === false, `Initial isExhausted is false`);

        // Test 2: Usage persistence across queries and restarts
        console.log("\n--- Test 2: Usage persists across queries in PostgreSQL ---");
        const client1 = await pool.connect();
        try {
            await client1.query("BEGIN");
            await reserveTokens(client1, userAId, 350, istToday);
            await client1.query("COMMIT");
        } finally {
            client1.release();
        }
        await reconcileTokens(userAId, 350, 420, istToday); // 420 actual tokens used

        const usageAAfterUse = await getUserTokenUsage(userAId, istToday);
        assert(usageAAfterUse.confirmedUsage === 420, `Confirmed usage persisted as 420 (got ${usageAAfterUse.confirmedUsage})`);
        assert(usageAAfterUse.remainingTokens === 49580, `Remaining tokens persisted as 49,580 (got ${usageAAfterUse.remainingTokens})`);

        // Test 3: Multi-user isolation
        console.log("\n--- Test 3: User isolation (User B independent of User A) ---");
        const usageB = await getUserTokenUsage(userBId, istToday);
        assert(usageB.confirmedUsage === 0, `User B confirmed usage is 0 despite User A usage (got ${usageB.confirmedUsage})`);
        assert(usageB.remainingTokens === 50000, `User B still has full 50,000 tokens (got ${usageB.remainingTokens})`);

        // Test 4: Exhausted users are blocked
        console.log("\n--- Test 4: Exhausted users are blocked for the rest of the day ---");
        // Update user A to reach exactly 50,000 tokens
        await pool.query(
            `UPDATE user_ai_daily_usage
             SET total_tokens_used = 50000, reserved_tokens = 0
             WHERE user_id = $1 AND usage_date = $2`,
            [userAId, istToday]
        );

        const usageAExhausted = await getUserTokenUsage(userAId, istToday);
        assert(usageAExhausted.isExhausted === true, `isExhausted is true when 50,000 used`);
        assert(usageAExhausted.remainingTokens === 0, `remainingTokens is 0`);

        // Attempting to reserve should throw AllowanceExhaustedError
        let threwExhausted = false;
        let exhaustedMsg = "";
        const clientEx = await pool.connect();
        try {
            await clientEx.query("BEGIN");
            await reserveTokens(clientEx, userAId, 100, istToday);
            await clientEx.query("COMMIT");
        } catch (err) {
            await clientEx.query("ROLLBACK");
            if (err instanceof AllowanceExhaustedError) {
                threwExhausted = true;
                exhaustedMsg = err.message;
            }
        } finally {
            clientEx.release();
        }

        assert(threwExhausted, `Reservation rejected with AllowanceExhaustedError`);
        assert(
            exhaustedMsg === EXACT_EXHAUSTED_MESSAGE,
            `Correct exhausted message: "${exhaustedMsg}"`
        );

        // Test 5: Automatic reset on date rollover without manual intervention
        console.log("\n--- Test 5: Allowance refreshes after midnight IST automatically ---");
        // Calculate tomorrow's IST date string
        const [yr, mo, da] = istToday.split("-").map(Number);
        const tomorrowDate = new Date(Date.UTC(yr, mo - 1, da + 1));
        const tomorrowStr = tomorrowDate.toISOString().slice(0, 10);

        // Query User A on tomorrow's date
        const usageATomorrow = await getUserTokenUsage(userAId, tomorrowStr);
        assert(
            usageATomorrow.remainingTokens === 50000,
            `Next day allowance automatically starts fresh at 50,000 tokens (got ${usageATomorrow.remainingTokens})`
        );
        assert(usageATomorrow.isExhausted === false, `Next day isExhausted is false`);

        // Verify yesterday's usage is preserved and not deleted
        const usageAYesterdayCheck = await getUserTokenUsage(userAId, istToday);
        assert(
            usageAYesterdayCheck.confirmedUsage === 50000,
            `Previous day's 50,000 usage record is preserved intact (got ${usageAYesterdayCheck.confirmedUsage})`
        );

        // Test 6: Concurrency safety
        console.log("\n--- Test 6: Concurrency-safe limit enforcement ---");
        // Give User B 49,700 tokens used, leaving only 300 tokens
        await pool.query(
            `UPDATE user_ai_daily_usage
             SET total_tokens_used = 49700, reserved_tokens = 0
             WHERE user_id = $1 AND usage_date = $2`,
            [userBId, istToday]
        );

        // Launch 2 concurrent reservation requests of 200 tokens each (total 400 > 300 remaining)
        const reserveTask = async (idx) => {
            const client = await pool.connect();
            try {
                await client.query("BEGIN");
                await reserveTokens(client, userBId, 200, istToday);
                await client.query("COMMIT");
                return { idx, success: true };
            } catch (err) {
                await client.query("ROLLBACK");
                return { idx, success: false, error: err.code || err.message };
            } finally {
                client.release();
            }
        };

        const results = await Promise.all([reserveTask(1), reserveTask(2)]);
        const successes = results.filter((r) => r.success).length;
        const failures = results.filter((r) => !r.success).length;

        assert(successes === 1, `Exactly 1 concurrent reservation succeeded within 300 remaining limit`);
        assert(failures === 1, `Second concurrent reservation was blocked (error: ${results.find(r => !r.success)?.error})`);

        // Test 7: Live HTTP API verification
        console.log("\n--- Test 7: Live HTTP API checks (/api/ai/usage and /api/ai/chat) ---");
        // Register a clean user with password through API
        const testUserEmail = `live_verify_${timestamp}@example.com`;
        const testUserPass = "Password123!";
        const regFetch = await fetch("http://localhost:5000/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: "Live Daily Tester",
                email: testUserEmail,
                password: testUserPass,
            }),
        });

        const regData = await regFetch.json();
        const token = regData.token;
        const authHeaders = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        };

        // Test GET /api/ai/usage
        const usageFetch = await fetch("http://localhost:5000/api/ai/usage", {
            headers: authHeaders,
        });
        const apiData = await usageFetch.json();
        assert(apiData.totalAllowed === 50000, `API reports totalAllowed: 50,000`);
        assert(apiData.remainingTokens === 50000, `API reports remainingTokens: 50,000`);
        assert(apiData.resetAt === "12:00 AM IST", `API reports resetAt: 12:00 AM IST`);
        assert(!!apiData.nextResetTime, `API reports nextResetTime ISO string (${apiData.nextResetTime})`);

        // Test POST /api/ai/chat with live Groq call
        console.log("Sending live Groq test query...");
        const chatFetch = await fetch("http://localhost:5000/api/ai/chat", {
            method: "POST",
            headers: authHeaders,
            body: JSON.stringify({
                message: "Hello! In one sentence, give me a quick budgeting tip.",
            }),
        });

        const chatData = await chatFetch.json();
        assert(chatData.success === true, `Live AI chat returned success: true`);
        assert(typeof chatData.message === "string", `Live AI chat response message received`);
        assert(chatData.tokensUsedInTurn > 0, `Reported actual tokensUsedInTurn (${chatData.tokensUsedInTurn})`);
        assert(
            chatData.usage.remainingTokens === 50000 - chatData.tokensUsedInTurn,
            `Remaining balance accurately deducted: ${chatData.usage.remainingTokens} / 50,000`
        );

        // Clean up test users
        await pool.query(
            `DELETE FROM users WHERE email IN ($1, $2, $3)`,
            [emailA, emailB, testUserEmail]
        );

        console.log(`\n========================================`);
        console.log(`ALL TESTS FINISHED: Passed: ${passed}, Failed: ${failed}`);
        console.log(`========================================\n`);
    } catch (e) {
        console.error("Test execution error:", e);
        failed++;
    } finally {
        await pool.end();
        process.exit(failed > 0 ? 1 : 0);
    }
}

runTests();
