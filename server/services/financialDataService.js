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

    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();

    // 1. Current calendar month summary
    const currentMonthRes = await pool.query(
        `SELECT
            COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0) AS current_income,
            COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS current_expenses,
            COUNT(id) AS tx_count
         FROM transactions
         WHERE user_id = $1
           AND EXTRACT(MONTH FROM date) = $2
           AND EXTRACT(YEAR FROM date) = $3`,
        [userId, curMonth, curYear]
    );

    const currentIncome = Number(currentMonthRes.rows[0].current_income);
    const currentExpenses = Number(currentMonthRes.rows[0].current_expenses);
    const currentNetSavings = currentIncome - currentExpenses;

    // 2. September 2026 (Dedicated Demonstration Month) Data
    const septRes = await pool.query(
        `SELECT
            COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0) AS sept_income,
            COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS sept_expenses,
            COUNT(id) AS sept_tx_count
         FROM transactions
         WHERE user_id = $1
           AND EXTRACT(MONTH FROM date) = 9
           AND EXTRACT(YEAR FROM date) = 2026`,
        [userId]
    );

    const septIncome = Number(septRes.rows[0].sept_income);
    const septExpenses = Number(septRes.rows[0].sept_expenses);
    const septNetSavings = septIncome - septExpenses;
    const septSavingsRate = septIncome > 0 ? Number(((septNetSavings / septIncome) * 100).toFixed(1)) : 0;
    const septTxCount = parseInt(septRes.rows[0].sept_tx_count, 10);

    // September category breakdown
    const septCatRes = await pool.query(
        `SELECT
            category,
            SUM(amount) AS total_amount,
            COUNT(id) AS count
         FROM transactions
         WHERE user_id = $1
           AND type = 'expense'
           AND EXTRACT(MONTH FROM date) = 9
           AND EXTRACT(YEAR FROM date) = 2026
         GROUP BY category
         ORDER BY SUM(amount) DESC`,
        [userId]
    );

    const septCategoryBreakdown = septCatRes.rows.map((r) => ({
        category: r.category,
        amount: Number(r.total_amount),
        count: parseInt(r.count, 10),
        percentageOfExpenses:
            septExpenses > 0
                ? Number(((Number(r.total_amount) / septExpenses) * 100).toFixed(1))
                : 0,
    }));

    // September largest expenses
    const septLargestRes = await pool.query(
        `SELECT id, amount, category, description, date, payment_method
         FROM transactions
         WHERE user_id = $1
           AND type = 'expense'
           AND EXTRACT(MONTH FROM date) = 9
           AND EXTRACT(YEAR FROM date) = 2026
         ORDER BY amount DESC
         LIMIT 5`,
        [userId]
    );

    const septLargestExpenses = septLargestRes.rows.map((r) => ({
        description: r.description,
        amount: Number(r.amount),
        category: r.category,
        date: r.date,
        paymentMethod: r.payment_method || "cash",
    }));

    // September Budgets and Compliance Status
    const septBudgetsRes = await pool.query(
        `SELECT b.category, b.amount AS limit_amount
         FROM budgets b
         WHERE b.user_id = $1 AND b.month = 9 AND b.year = 2026
         ORDER BY b.amount DESC`,
        [userId]
    );

    const septBudgets = septBudgetsRes.rows.map((b) => {
        const limitAmount = Number(b.limit_amount);
        const matchCat = septCategoryBreakdown.find(
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
            isWarning: pctUsed >= 85 && spent <= limitAmount,
        };
    });

    const exceededBudgets = septBudgets.filter((b) => b.isExceeded);
    const warningBudgets = septBudgets.filter((b) => b.isWarning);

    // 3. Savings Goals
    const goalsRes = await pool.query(
        `SELECT id, name, target_amount, current_amount, target_date, category
         FROM savings_goals
         WHERE user_id = $1
         ORDER BY target_date ASC`,
        [userId]
    );

    const savingsGoals = goalsRes.rows.map((g) => ({
        name: g.name,
        targetAmount: Number(g.target_amount),
        currentAmount: Number(g.current_amount),
        targetDate: g.target_date,
        progress: Number(((Number(g.current_amount) / Number(g.target_amount)) * 100).toFixed(1)),
    }));

    // 4. Recurring Payments
    const recurringRes = await pool.query(
        `SELECT title, amount, category, frequency, next_due_date, payment_method
         FROM recurring_payments
         WHERE user_id = $1 AND is_active = TRUE
         ORDER BY next_due_date ASC`,
        [userId]
    );

    const recurringPayments = recurringRes.rows.map((r) => ({
        title: r.title,
        amount: Number(r.amount),
        category: r.category,
        frequency: r.frequency,
        nextDueDate: r.next_due_date,
    }));

    const totalMonthlyRecurring = recurringPayments.reduce((sum, r) => sum + r.amount, 0);

    // 5. Stock Portfolio summary
    const stockTxRes = await pool.query(
        `SELECT
            COALESCE(SUM(quantity * price_per_share + brokerage_charges) FILTER (WHERE transaction_type = 'BUY'), 0) AS total_invested,
            COUNT(DISTINCT symbol) AS count
         FROM stock_transactions
         WHERE user_id = $1`,
        [userId]
    );

    const portfolioSummary = {
        totalInvested: Number(stockTxRes.rows[0].total_invested || 0),
        stocksCount: parseInt(stockTxRes.rows[0].count || 0, 10),
    };

    // 6. Overall lifetime totals
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

    // Determine primary display month: if current month has 0 tx and sept has tx, use September as primary
    const isSeptActive = septTxCount > 0 && currentIncome === 0 && currentExpenses === 0;
    const activeMonthData = isSeptActive
        ? {
              monthName: "September 2026 (Demonstration Month)",
              income: septIncome,
              expenses: septExpenses,
              netSavings: septNetSavings,
              savingsRate: septSavingsRate,
              categoryBreakdown: septCategoryBreakdown,
              highestExpenseCategory: septCategoryBreakdown[0] || null,
              largestExpenses: septLargestExpenses,
              budgets: septBudgets,
              exceededBudgets,
              warningBudgets,
          }
        : {
              monthName: `${now.toLocaleString("en-US", { month: "long" })} ${curYear}`,
              income: currentIncome,
              expenses: currentExpenses,
              netSavings: currentNetSavings,
              savingsRate:
                  currentIncome > 0
                      ? Number(((currentNetSavings / currentIncome) * 100).toFixed(1))
                      : 0,
              categoryBreakdown: [],
              highestExpenseCategory: null,
              largestExpenses: [],
              budgets: [],
              exceededBudgets: [],
              warningBudgets: [],
          };

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
        currentMonth: activeMonthData,
        september2026: {
            income: septIncome,
            expenses: septExpenses,
            netSavings: septNetSavings,
            savingsRate: septSavingsRate,
            categoryBreakdown: septCategoryBreakdown,
            highestExpenseCategory: septCategoryBreakdown[0] || null,
            largestExpenses: septLargestExpenses,
            budgets: septBudgets,
            exceededBudgets,
            warningBudgets,
        },
        savingsGoals,
        recurringPayments,
        totalMonthlyRecurring,
        portfolioSummary,
    };
}
