import pool from "../config/db.js";

export const DAILY_TOKEN_ALLOWANCE = 50000;
export const MAX_TOKEN_ALLOWANCE = DAILY_TOKEN_ALLOWANCE; // Alias for compatibility

export const EXACT_EXHAUSTED_MESSAGE =
    "You've used your 50,000 AI tokens for today. Your allowance refreshes at midnight IST.";

export class AllowanceExhaustedError extends Error {
    constructor(remainingTokens = 0) {
        super(EXACT_EXHAUSTED_MESSAGE);
        this.name = "AllowanceExhaustedError";
        this.code = "ALLOWANCE_EXHAUSTED";
        this.remainingTokens = remainingTokens;
    }
}

/**
 * Returns today's date in YYYY-MM-DD for Asia/Kolkata (IST).
 */
export function getIndiaCurrentDate() {
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
    return formatter.format(new Date());
}

/**
 * Returns ISO timestamp of the upcoming midnight in Asia/Kolkata (IST).
 */
export function getNextMidnightIst() {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "numeric",
        day: "numeric",
    }).formatToParts(new Date());

    const year = parseInt(parts.find((p) => p.type === "year").value, 10);
    const month = parseInt(parts.find((p) => p.type === "month").value, 10);
    const day = parseInt(parts.find((p) => p.type === "day").value, 10);

    // 00:00:00 IST of tomorrow = Date.UTC(year, month - 1, day + 1, -5, -30)
    return new Date(Date.UTC(year, month - 1, day + 1, -5, -30, 0, 0)).toISOString();
}

/**
 * Get or initialize token usage for an authenticated user for the given date (defaults to current IST date).
 */
export async function getUserTokenUsage(userId, targetDate = getIndiaCurrentDate()) {
    // Ensure daily record exists for this user and IST date
    await pool.query(
        `INSERT INTO user_ai_daily_usage (user_id, usage_date, total_tokens_used, reserved_tokens)
         VALUES ($1, $2, 0, 0)
         ON CONFLICT (user_id, usage_date) DO NOTHING`,
        [userId, targetDate]
    );

    const res = await pool.query(
        `SELECT total_tokens_used, reserved_tokens
         FROM user_ai_daily_usage
         WHERE user_id = $1 AND usage_date = $2`,
        [userId, targetDate]
    );

    const row = res.rows[0] || { total_tokens_used: 0, reserved_tokens: 0 };
    const totalUsed = Number(row.total_tokens_used);
    const reservedTokens = Number(row.reserved_tokens);
    const committedOrPending = totalUsed + reservedTokens;
    const remainingTokens = Math.max(0, DAILY_TOKEN_ALLOWANCE - committedOrPending);

    return {
        usageDate: targetDate,
        totalTokensUsed: totalUsed,
        confirmedUsage: totalUsed,
        reservedTokens,
        reservedUsage: reservedTokens,
        remainingTokens,
        dailyAllowance: DAILY_TOKEN_ALLOWANCE,
        totalAllowed: DAILY_TOKEN_ALLOWANCE,
        maxAllowance: DAILY_TOKEN_ALLOWANCE,
        isExhausted: remainingTokens <= 0,
        resetAt: "12:00 AM IST",
        nextResetTime: getNextMidnightIst(),
    };
}

/**
 * Atomically reserve capacity for an incoming AI request for the current IST day.
 * Must be executed using a dedicated client within an open transaction (BEGIN).
 */
export async function reserveTokens(
    client,
    userId,
    reservationAmount = 500,
    targetDate = getIndiaCurrentDate()
) {
    // Ensure user row exists for today before row-level locking
    await client.query(
        `INSERT INTO user_ai_daily_usage (user_id, usage_date, total_tokens_used, reserved_tokens)
         VALUES ($1, $2, 0, 0)
         ON CONFLICT (user_id, usage_date) DO NOTHING`,
        [userId, targetDate]
    );

    // Row-level lock to prevent concurrent requests from exceeding daily allowance
    const lockRes = await client.query(
        `SELECT total_tokens_used, reserved_tokens
         FROM user_ai_daily_usage
         WHERE user_id = $1 AND usage_date = $2
         FOR UPDATE`,
        [userId, targetDate]
    );

    const row = lockRes.rows[0] || { total_tokens_used: 0, reserved_tokens: 0 };
    const currentUsed = Number(row.total_tokens_used);
    const currentReserved = Number(row.reserved_tokens);
    const remaining = Math.max(0, DAILY_TOKEN_ALLOWANCE - (currentUsed + currentReserved));

    if (remaining <= 0 || remaining < reservationAmount) {
        throw new AllowanceExhaustedError(remaining);
    }

    const actualReservation = reservationAmount;

    await client.query(
        `UPDATE user_ai_daily_usage
         SET reserved_tokens = reserved_tokens + $3,
             updated_at = NOW()
         WHERE user_id = $1 AND usage_date = $2`,
        [userId, targetDate, actualReservation]
    );

    return {
        reservedAmount: actualReservation,
        remainingTokensAfterReservation: Math.max(0, remaining - actualReservation),
        usageDate: targetDate,
    };
}

/**
 * Atomically commit confirmed Groq token usage and release the reserved capacity for the given date.
 */
export async function reconcileTokens(
    clientOrUserId,
    userIdOrReserved,
    reservedOrActual,
    actualOrTargetDate,
    targetDateOpt
) {
    let client = pool;
    let userId;
    let reservedAmount;
    let actualTokensUsed;
    let targetDate = getIndiaCurrentDate();

    if (clientOrUserId && typeof clientOrUserId.query === "function") {
        client = clientOrUserId;
        userId = userIdOrReserved;
        reservedAmount = reservedOrActual;
        actualTokensUsed = actualOrTargetDate;
        if (targetDateOpt) targetDate = targetDateOpt;
    } else {
        userId = clientOrUserId;
        reservedAmount = userIdOrReserved;
        actualTokensUsed = reservedOrActual;
        if (actualOrTargetDate) targetDate = actualOrTargetDate;
    }

    const tokensToAdd = Math.max(0, Number(actualTokensUsed) || 0);
    const reservationToRelease = Math.max(0, Number(reservedAmount) || 0);

    const res = await client.query(
        `UPDATE user_ai_daily_usage
         SET total_tokens_used = LEAST($5::int, total_tokens_used + $3),
             reserved_tokens = GREATEST(0, reserved_tokens - $4),
             updated_at = NOW()
         WHERE user_id = $1 AND usage_date = $2
         RETURNING total_tokens_used, reserved_tokens`,
        [userId, targetDate, tokensToAdd, reservationToRelease, DAILY_TOKEN_ALLOWANCE]
    );

    const row = res.rows[0];
    const totalUsed = Number(row.total_tokens_used);
    const reservedTokens = Number(row.reserved_tokens);
    const remainingTokens = Math.max(0, DAILY_TOKEN_ALLOWANCE - (totalUsed + reservedTokens));

    return {
        usageDate: targetDate,
        totalTokensUsed: totalUsed,
        confirmedUsage: totalUsed,
        reservedTokens,
        reservedUsage: reservedTokens,
        remainingTokens,
        dailyAllowance: DAILY_TOKEN_ALLOWANCE,
        totalAllowed: DAILY_TOKEN_ALLOWANCE,
        maxAllowance: DAILY_TOKEN_ALLOWANCE,
        isExhausted: remainingTokens <= 0,
        resetAt: "12:00 AM IST",
        nextResetTime: getNextMidnightIst(),
    };
}

/**
 * Release a reservation without incrementing usage (e.g., if Groq fails or returns an error).
 */
export async function releaseReservation(
    clientOrUserId,
    userIdOrReserved,
    reservedOrTargetDate,
    targetDateOpt
) {
    let client = pool;
    let userId;
    let reservedAmount;
    let targetDate = getIndiaCurrentDate();

    if (clientOrUserId && typeof clientOrUserId.query === "function") {
        client = clientOrUserId;
        userId = userIdOrReserved;
        reservedAmount = reservedOrTargetDate;
        if (targetDateOpt) targetDate = targetDateOpt;
    } else {
        userId = clientOrUserId;
        reservedAmount = userIdOrReserved;
        if (reservedOrTargetDate) targetDate = reservedOrTargetDate;
    }

    const reservationToRelease = Math.max(0, Number(reservedAmount) || 0);

    const res = await client.query(
        `UPDATE user_ai_daily_usage
         SET reserved_tokens = GREATEST(0, reserved_tokens - $3),
             updated_at = NOW()
         WHERE user_id = $1 AND usage_date = $2
         RETURNING total_tokens_used, reserved_tokens`,
        [userId, targetDate, reservationToRelease]
    );

    const row = res.rows[0];
    const totalUsed = Number(row?.total_tokens_used || 0);
    const reservedTokens = Number(row?.reserved_tokens || 0);
    const remainingTokens = Math.max(0, DAILY_TOKEN_ALLOWANCE - (totalUsed + reservedTokens));

    return {
        usageDate: targetDate,
        totalTokensUsed: totalUsed,
        confirmedUsage: totalUsed,
        reservedTokens,
        reservedUsage: reservedTokens,
        remainingTokens,
        dailyAllowance: DAILY_TOKEN_ALLOWANCE,
        totalAllowed: DAILY_TOKEN_ALLOWANCE,
        maxAllowance: DAILY_TOKEN_ALLOWANCE,
        isExhausted: remainingTokens <= 0,
        resetAt: "12:00 AM IST",
        nextResetTime: getNextMidnightIst(),
    };
}
