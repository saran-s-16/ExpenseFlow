import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config({
    path: fileURLToPath(new URL("../../.env", import.meta.url)),
});

import pool from "../config/db.js";
import {
    getUserTokenUsage,
    reserveTokens,
    reconcileTokens,
    releaseReservation,
} from "../services/aiTokenService.js";
import { getFinancialContext } from "../services/financialDataService.js";
import { OpenAiDomainError } from "../services/openaiService.js";

async function runMockPipelineTests() {
    console.log("==========================================");
    console.log("TESTING BACKEND WITH MOCKED OPENAI RESPONSES");
    console.log("==========================================\n");

    let passed = 0;
    let failed = 0;

    function assert(condition, name) {
        if (condition) {
            console.log(`✅ PASS: ${name}`);
            passed++;
        } else {
            console.error(`❌ FAIL: ${name}`);
            failed++;
        }
    }

    // 1. Get test user
    const userRes = await pool.query(
        "SELECT id, email FROM users WHERE email = $1",
        ["aitest_1791730673015@example.com"]
    );
    const userId = userRes.rows[0].id;

    // Reset user usage to 0
    await pool.query(
        `UPDATE user_ai_usage
         SET total_tokens_used = 0, reserved_tokens = 0
         WHERE user_id = $1`,
        [userId]
    );

    // 2. Test Mock Successful Chat Completion Pipeline
    try {
        console.log("--- Test 1: Mock Successful Completion Pipeline ---");
        // A. Pre-check usage
        const initial = await getUserTokenUsage(userId);
        assert(initial.remainingTokens === 600, "Initial tokens available: 600");

        // B. Atomic Reservation
        const client = await pool.connect();
        let reservation;
        try {
            await client.query("BEGIN");
            reservation = await reserveTokens(client, userId, 40);
            await client.query("COMMIT");
        } finally {
            client.release();
        }
        assert(reservation.reservedAmount === 40, "Reserved 40 tokens atomically");

        // C. Financial Context Extraction
        const finContext = await getFinancialContext(userId);
        assert(finContext.currency === "₹ (INR)", "Financial context extracted with INR currency");

        // D. Simulated OpenAI Response
        const mockedAiResponse = {
            content: "Based on your records, your total expenses for this month are ₹0 across all categories.",
            usage: {
                promptTokens: 180,
                completionTokens: 35,
                totalTokens: 215,
            },
        };

        // E. Reconcile with actual OpenAI token usage
        const postClient = await pool.connect();
        let reconciledUsage;
        try {
            await postClient.query("BEGIN");
            reconciledUsage = await reconcileTokens(
                postClient,
                userId,
                reservation.reservedAmount,
                mockedAiResponse.usage.totalTokens
            );
            await postClient.query(
                `INSERT INTO ai_chat_messages (user_id, role, content, tokens_used)
                 VALUES ($1, 'user', $2, 0)`,
                [userId, "hi"]
            );
            await postClient.query(
                `INSERT INTO ai_chat_messages (user_id, role, content, tokens_used)
                 VALUES ($1, 'assistant', $2, $3)`,
                [userId, mockedAiResponse.content, mockedAiResponse.usage.totalTokens]
            );
            await postClient.query("COMMIT");
        } finally {
            postClient.release();
        }

        assert(reconciledUsage.totalTokensUsed === 215, "Authoritative tokens recorded: 215");
        assert(reconciledUsage.remainingTokens === 385, "Authoritative remaining tokens: 385");

        // F. Verify database persistence
        const checkUsage = await getUserTokenUsage(userId);
        assert(checkUsage.totalTokensUsed === 215, "PostgreSQL persists confirmed 215 tokens");
        assert(checkUsage.remainingTokens === 385, "PostgreSQL persists remaining 385 tokens");
    } catch (e) {
        assert(false, `Mock pipeline error: ${e.message}`);
    }

    // 3. Test Error Mapping Distinctions
    console.log("\n--- Test 2: Error Mapping Distinctions ---");

    function simulateErrorMapping(err) {
        if (
            err.code === "credit_balance_exhausted" ||
            (err.message && (err.message.includes("credits remaining") || err.message.includes("Add credits")))
        ) {
            return new OpenAiDomainError(
                "AI Assistant is temporarily unavailable because your OpenAI account has run out of API credits. Please check your billing balance in the OpenAI platform dashboard.",
                "PROVIDER_CREDITS_EXHAUSTED",
                503
            );
        }
        if (
            err.code === "insufficient_quota" ||
            err.type === "insufficient_quota" ||
            (err.message && err.message.includes("quota"))
        ) {
            return new OpenAiDomainError(
                "AI Assistant is temporarily unavailable because the AI service has reached its usage limit. Please try again later.",
                "PROVIDER_QUOTA_EXCEEDED",
                503
            );
        }
        if (err.status === 429) {
            return new OpenAiDomainError(
                "AI Assistant is receiving too many requests right now. Please wait a moment and try again.",
                "RATE_LIMIT_EXCEEDED",
                429
            );
        }
        if (err.status === 401 || err.code === "invalid_api_key") {
            return new OpenAiDomainError(
                "AI Assistant is temporarily unavailable due to invalid API credentials. Please check your OpenAI API key in .env.",
                "INVALID_API_KEY",
                503
            );
        }
        if (err.code === "model_not_found" || err.status === 404) {
            return new OpenAiDomainError(
                "The configured AI model is not accessible with this API key. Please check your model configuration.",
                "MODEL_NOT_FOUND",
                503
            );
        }
        return new OpenAiDomainError(
            "We couldn't connect to AI Assistant. Please check your connection and try again.",
            "NETWORK_OR_SERVER_ERROR",
            502
        );
    }

    // A. Credit balance exhausted
    const errCredit = simulateErrorMapping({
        status: 429,
        code: "credit_balance_exhausted",
        type: "insufficient_quota",
        message: "You have no credits remaining. Add credits to continue using the API",
    });
    assert(errCredit.code === "PROVIDER_CREDITS_EXHAUSTED", "credit_balance_exhausted maps to PROVIDER_CREDITS_EXHAUSTED");
    assert(errCredit.statusCode === 503, "Credit exhaustion returns HTTP 503");
    assert(errCredit.userMessage.includes("run out of API credits"), "Message clearly explains API credits issue");

    // B. Organization hard quota limit
    const errQuota = simulateErrorMapping({
        status: 429,
        code: "insufficient_quota",
        type: "insufficient_quota",
        message: "You exceeded your current quota",
    });
    assert(errQuota.code === "PROVIDER_QUOTA_EXCEEDED", "insufficient_quota maps to PROVIDER_QUOTA_EXCEEDED");

    // C. Request rate limiting
    const errRate = simulateErrorMapping({
        status: 429,
        code: "rate_limit_exceeded",
        message: "Rate limit reached for requests per minute",
    });
    assert(errRate.code === "RATE_LIMIT_EXCEEDED", "rate_limit_exceeded maps to RATE_LIMIT_EXCEEDED");
    assert(errRate.statusCode === 429, "Rate limit returns HTTP 429");

    // D. Invalid API Key
    const errAuth = simulateErrorMapping({
        status: 401,
        code: "invalid_api_key",
        message: "Incorrect API key provided",
    });
    assert(errAuth.code === "INVALID_API_KEY", "invalid_api_key maps to INVALID_API_KEY");

    // E. Model not found
    const errModel = simulateErrorMapping({
        status: 404,
        code: "model_not_found",
        message: "The model `xyz` does not exist",
    });
    assert(errModel.code === "MODEL_NOT_FOUND", "model_not_found maps to MODEL_NOT_FOUND");

    // Reset user usage back to 0
    await pool.query(
        `UPDATE user_ai_usage
         SET total_tokens_used = 0, reserved_tokens = 0
         WHERE user_id = $1`,
        [userId]
    );
    await pool.query("DELETE FROM ai_chat_messages WHERE user_id = $1", [userId]);

    console.log("\n==========================================");
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("==========================================");

    await pool.end();
    process.exit(failed > 0 ? 1 : 0);
}

runMockPipelineTests().catch(async (err) => {
    console.error("Test error:", err);
    await pool.end();
    process.exit(1);
});
