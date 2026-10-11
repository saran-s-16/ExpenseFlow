import pool from "../config/db.js";
import {
    getUserTokenUsage,
    reserveTokens,
    reconcileTokens,
    releaseReservation,
    AllowanceExhaustedError,
    MAX_TOKEN_ALLOWANCE,
} from "../services/aiTokenService.js";
import { getFinancialContext } from "../services/financialDataService.js";
import { generateFinancialAdvice, GroqDomainError } from "../services/groqService.js";


/**
 * POST /api/ai/chat
 * Main AI chat conversation endpoint.
 */
export async function chatWithAi(req, res) {
    const userId = req.user.id;
    const { message } = req.body;

    // 1. Validate user input
    if (!message || typeof message !== "string" || !message.trim()) {
        return res.status(400).json({
            success: false,
            code: "INVALID_MESSAGE",
            message: "Please enter a valid message before sending.",
        });
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length > 1000) {
        return res.status(400).json({
            success: false,
            code: "MESSAGE_TOO_LONG",
            message: "Your message is too long. Please keep it under 1,000 characters.",
        });
    }

    // 2. Fast check: Check current token allowance before initiating transactions
    const currentUsage = await getUserTokenUsage(userId);
    if (currentUsage.isExhausted || currentUsage.remainingTokens <= 0) {
        return res.status(403).json({
            success: false,
            code: "ALLOWANCE_EXHAUSTED",
            message:
                "You've used your 50,000 AI tokens for today. Your allowance refreshes at midnight IST.",
            usage: currentUsage,
        });
    }

    // 3. Atomically reserve token capacity
    let reservedAmount = 0;
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const reservationAmount = Math.min(500, currentUsage.remainingTokens);
        const reservation = await reserveTokens(client, userId, reservationAmount);
        reservedAmount = reservation.reservedAmount;
        await client.query("COMMIT");
    } catch (err) {
        await client.query("ROLLBACK");
        if (err instanceof AllowanceExhaustedError) {
            return res.status(403).json({
                success: false,
                code: "ALLOWANCE_EXHAUSTED",
                message:
                    "You've used your 50,000 AI tokens for today. Your allowance refreshes at midnight IST.",
                usage: await getUserTokenUsage(userId),
            });
        }

        console.error("Token reservation error:", err);
        return res.status(500).json({
            success: false,
            code: "INTERNAL_ERROR",
            message: "We couldn't connect to AI Assistant. Please check your connection and try again.",
        });
    } finally {
        client.release();
    }

    // 4. Retrieve financial context and recent conversation history
    try {
        const [financialContext, historyRes] = await Promise.all([
            getFinancialContext(userId),
            pool.query(
                `SELECT role, content
                 FROM ai_chat_messages
                 WHERE user_id = $1
                 ORDER BY created_at DESC
                 LIMIT 6`,
                [userId]
            ),
        ]);

        const conversationHistory = historyRes.rows.reverse();

        // 5. Call OpenAI with aggregated context and safety constraints
        const aiResponse = await generateFinancialAdvice({
            userMessage: trimmedMessage,
            conversationHistory,
            financialContext,
        });

        const actualTokensUsed = aiResponse.usage?.totalTokens || 0;

        // 6. Atomically reconcile tokens and persist messages
        const postClient = await pool.connect();
        let updatedUsage = currentUsage;
        try {
            await postClient.query("BEGIN");

            // Reconcile token allowance with actual usage reported by OpenAI
            updatedUsage = await reconcileTokens(postClient, userId, reservedAmount, actualTokensUsed);

            // Save user message
            await postClient.query(
                `INSERT INTO ai_chat_messages (user_id, role, content, tokens_used)
                 VALUES ($1, 'user', $2, 0)`,
                [userId, trimmedMessage]
            );

            // Save assistant message
            await postClient.query(
                `INSERT INTO ai_chat_messages (user_id, role, content, tokens_used)
                 VALUES ($1, 'assistant', $2, $3)`,
                [userId, aiResponse.content, actualTokensUsed]
            );

            await postClient.query("COMMIT");
        } catch (postErr) {
            await postClient.query("ROLLBACK");
            console.error("Error reconciling token usage:", postErr);
        } finally {
            postClient.release();
        }

        return res.json({
            success: true,
            message: aiResponse.content,
            usage: updatedUsage,
            tokensUsedInTurn: actualTokensUsed,
        });
    } catch (err) {
        // Rollback reservation if OpenAI failed so user is not penalized
        if (reservedAmount > 0) {
            const rollbackClient = await pool.connect();
            try {
                await rollbackClient.query("BEGIN");
                await releaseReservation(rollbackClient, userId, reservedAmount);
                await rollbackClient.query("COMMIT");
            } catch (rbErr) {
                await rollbackClient.query("ROLLBACK");
                console.error("Failed to release reservation:", rbErr);
            } finally {
                rollbackClient.release();
            }
        }

        const freshUsage = await getUserTokenUsage(userId);

        if (err instanceof GroqDomainError) {

            return res.status(err.statusCode).json({
                success: false,
                code: err.code,
                message: err.userMessage,
                usage: freshUsage,
            });
        }

        console.error("AI chat processing error:", err);
        return res.status(500).json({
            success: false,
            code: "INTERNAL_ERROR",
            message: "We couldn't connect to AI Assistant. Please check your connection and try again.",
            usage: freshUsage,
        });
    }
}

/**
 * GET /api/ai/usage
 * Returns current authenticated user's token allowance usage.
 */
export async function getUsage(req, res) {
    try {
        const userId = req.user.id;
        const usage = await getUserTokenUsage(userId);
        return res.json({
            success: true,
            ...usage,
        });
    } catch (err) {
        console.error("Get AI usage error:", err);
        return res.status(500).json({
            success: false,
            message: "Unable to retrieve AI usage.",
        });
    }
}

/**
 * GET /api/ai/history
 * Returns the authenticated user's recent chat history.
 */
export async function getHistory(req, res) {
    try {
        const userId = req.user.id;
        const result = await pool.query(
            `SELECT id, role, content, tokens_used, created_at
             FROM ai_chat_messages
             WHERE user_id = $1
             ORDER BY created_at ASC
             LIMIT 50`,
            [userId]
        );

        return res.json({
            success: true,
            messages: result.rows.map((r) => ({
                id: r.id,
                role: r.role,
                content: r.content,
                tokensUsed: r.tokens_used,
                createdAt: r.created_at,
            })),
        });
    } catch (err) {
        console.error("Get AI history error:", err);
        return res.status(500).json({
            success: false,
            message: "Unable to load conversation history.",
        });
    }
}

/**
 * DELETE /api/ai/history
 * Clears the user's conversation history while preserving token usage.
 */
export async function clearHistory(req, res) {
    try {
        const userId = req.user.id;
        await pool.query("DELETE FROM ai_chat_messages WHERE user_id = $1", [userId]);
        return res.json({
            success: true,
            message: "Conversation history cleared successfully.",
        });
    } catch (err) {
        console.error("Clear AI history error:", err);
        return res.status(500).json({
            success: false,
            message: "Unable to clear conversation history.",
        });
    }
}
