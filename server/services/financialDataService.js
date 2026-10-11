import pool from "../config/db.js";

/**
 * Service to aggregate authenticated financial context directly from PostgreSQL.
 * All queries are strictly scoped to the authenticated userId.
 */
export async function getFinancialContext(userId) {
    // 0. User profile
    const userRes = await pool.query(
        "SELECT id, name, email FROM users WHERE id = $1",
        [userId]
    );
    const user = userRes.rows[0] || { id: userId, name: "User", email: "" };

    // 1. Current month summary (Income, Expense, Net Balance)
    const currentMonthRes = await pool.query(

        `SELECT
            COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0) AS current_income,
            COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS current_expenses,
            COUNT(id) AS tx_count
         FROM transactions
         WHERE user_id = $1
           AND date >= DATE_TRUNC('month', CURRENT_DATE)::date
           AND date < (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::date`,
        [userId]
    );

    const currentIncome = Number(currentMonthRes.rows[0].current_income);
    const currentExpenses = Number(currentMonthRes.rows[0].current_expenses);
    const currentNetSavings = currentIncome - currentExpenses;

    // 2. Previous month summary for comparisons
    const prevMonthRes = await pool.query(
        `SELECT
            COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0) AS prev_income,
            COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS prev_expenses
         FROM transactions
         WHERE user_id = $1
           AND date >= (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month')::date
           AND date < DATE_TRUNC('month', CURRENT_DATE)::date`,
        [userId]
    );

    const prevIncome = Number(prevMonthRes.rows[0].prev_income);
    const prevExpenses = Number(prevMonthRes.rows[0].prev_expenses);
    const prevNetSavings = prevIncome - prevExpenses;

    // 3. Category spending breakdown for current month (sorted highest to lowest)
    const catRes = await pool.query(
        `SELECT
            category,
            SUM(amount) AS total_amount,
            COUNT(id) AS count
         FROM transactions
         WHERE user_id = $1
           AND type = 'expense'
           AND date >= DATE_TRUNC('month', CURRENT_DATE)::date
           AND date < (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::date
         GROUP BY category
         ORDER BY SUM(amount) DESC`,
        [userId]
    );

    const categoryBreakdown = catRes.rows.map((r) => ({
        category: r.category,
        amount: Number(r.total_amount),
        count: parseInt(r.count, 10),
        percentageOfExpenses:
            currentExpenses > 0
                ? Number(((Number(r.total_amount) / currentExpenses) * 100).toFixed(1))
                : 0,
    }));

    // Top spending category
    const highestExpenseCategory = categoryBreakdown.length > 0 ? categoryBreakdown[0] : null;

    // 4. Largest individual expenses in the current month
    const largestExpensesRes = await pool.query(
        `SELECT id, amount, category, description, date, payment_method
         FROM transactions
         WHERE user_id = $1
           AND type = 'expense'
           AND date >= DATE_TRUNC('month', CURRENT_DATE)::date
           AND date < (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::date
         ORDER BY amount DESC
         LIMIT 5`,
        [userId]
    );

    const largestExpenses = largestExpensesRes.rows.map((r) => ({
        description: r.description,
        amount: Number(r.amount),
        category: r.category,
        date: r.date,
        paymentMethod: r.payment_method || "cash",
    }));

    // 5. Active monthly budgets and compliance status
    const now = new Date();
    const currentMonthNum = now.getMonth() + 1;
    const currentYearNum = now.getFullYear();

    const budgetsRes = await pool.query(
        `SELECT b.category, b.amount AS limit_amount
         FROM budgets b
         WHERE b.user_id = $1
           AND b.month = $2
           AND b.year = $3`,
        [userId, currentMonthNum, currentYearNum]
    );

    const budgetStatus = budgetsRes.rows.map((b) => {
        const limitAmount = Number(b.limit_amount);
        const matchCat = categoryBreakdown.find(
            (c) => c.category.toLowerCase() === b.category.toLowerCase()
        );
        const spent = matchCat ? matchCat.amount : 0;
        const remaining = limitAmount - spent;
        const pctUsed = limitAmount > 0 ? Number(((spent / limitAmount) * 100).toFixed(1)) : 0;

        return {
            category: b.category,
            limit: limitAmount,
            spent,
            remaining,
            percentageUsed: pctUsed,
            isExceeded: spent > limitAmount,
        };
    });

    // 6. Recent 5 transactions across income & expense
    const recentTxRes = await pool.query(
        `SELECT type, amount, category, description, date, payment_method
         FROM transactions
         WHERE user_id = $1
         ORDER BY date DESC, id DESC
         LIMIT 5`,
        [userId]
    );

    const recentTransactions = recentTxRes.rows.map((r) => ({
        type: r.type,
        amount: Number(r.amount),
        category: r.category,
        description: r.description,
        date: r.date,
        paymentMethod: r.payment_method || "cash",
    }));

    // 7. Overall lifetime totals
    const lifetimeRes = await pool.query(
        `SELECT
            COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0) AS lifetime_income,
            COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS lifetime_expenses,
            COUNT(id) AS total_count
         FROM transactions
         WHERE user_id = $1`,
        [userId]
    );

    const lifetimeIncome = Number(lifetimeRes.rows[0].lifetime_income);
    const lifetimeExpenses = Number(lifetimeRes.rows[0].lifetime_expenses);
    const lifetimeBalance = lifetimeIncome - lifetimeExpenses;
    const totalTxCount = parseInt(lifetimeRes.rows[0].total_count, 10);

    return {
        user,
        hasData: totalTxCount > 0,
        currency: "₹ (INR)",
        lifetime: {
            income: lifetimeIncome,
            expenses: lifetimeExpenses,
            balance: lifetimeBalance,
            totalTransactions: totalTxCount,
        },
        currentMonth: {
            monthName: now.toLocaleString("en-US", { month: "long", year: "numeric" }),
            income: currentIncome,
            expenses: currentExpenses,
            totalIncome: currentIncome,
            totalExpenses: currentExpenses,
            netSavings: currentNetSavings,
            savingsRate:
                currentIncome > 0
                    ? Number(((currentNetSavings / currentIncome) * 100).toFixed(1))
                    : 0,
            categoryBreakdown,
            highestExpenseCategory,
            largestExpenses,
        },
        previousMonth: {
            income: prevIncome,
            expenses: prevExpenses,
            netSavings: prevNetSavings,
            expenseDifference: currentExpenses - prevExpenses,
        },
        categories: categoryBreakdown,
        largestExpenses,
        budgets: budgetStatus,
        recentTransactions,
    };

}
