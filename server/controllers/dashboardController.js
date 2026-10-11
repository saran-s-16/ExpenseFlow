import pool from "../config/db.js";

export async function getDashboard(req, res) {
    try {
        const userId = req.user.id;
        const period = req.query.period || "month"; // "week", "month", "year", "all"

        // 1. All-time / Lifetime totals for the user
        const lifetimeRes = await pool.query(
            `SELECT
                COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0) AS total_income,
                COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS total_expenses
             FROM transactions
             WHERE user_id = $1`,
            [userId]
        );

        const allTimeIncome = Number(lifetimeRes.rows[0].total_income);
        const allTimeExpenses = Number(lifetimeRes.rows[0].total_expenses);
        const allTimeBalance = allTimeIncome - allTimeExpenses;

        // 2. Period date filtering condition
        let periodFilterSql = "";
        let periodParams = [userId];

        if (period === "week") {
            periodFilterSql = " AND date >= DATE_TRUNC('week', CURRENT_DATE)::date";
        } else if (period === "year") {
            periodFilterSql = " AND date >= DATE_TRUNC('year', CURRENT_DATE)::date";
        } else if (period === "all") {
            periodFilterSql = "";
        } else {
            // Default: month
            periodFilterSql = `
                AND date >= DATE_TRUNC('month', CURRENT_DATE)::date
                AND date < (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::date
            `;
        }

        // Period totals
        const periodTotalsRes = await pool.query(
            `SELECT
                COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0) AS period_income,
                COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS period_expenses
             FROM transactions
             WHERE user_id = $1 ${periodFilterSql}`,
            periodParams
        );

        const periodIncome = Number(periodTotalsRes.rows[0].period_income);
        const periodExpenses = Number(periodTotalsRes.rows[0].period_expenses);

        // 3. Category spending breakdown for the chosen period
        const categoriesResult = await pool.query(
            `SELECT
                category,
                SUM(amount) AS amount,
                COUNT(id) AS transaction_count
             FROM transactions
             WHERE user_id = $1
               AND type = 'expense'
               ${periodFilterSql}
             GROUP BY category
             ORDER BY SUM(amount) DESC`,
            periodParams
        );

        const totalExpenseForPeriod = categoriesResult.rows.reduce(
            (sum, row) => sum + Number(row.amount),
            0
        );

        const categories = categoriesResult.rows.map((row) => {
            const amount = Number(row.amount);
            return {
                category: row.category,
                amount,
                transactionCount: parseInt(row.transaction_count, 10),
                percentage:
                    totalExpenseForPeriod > 0
                        ? Number(((amount / totalExpenseForPeriod) * 100).toFixed(1))
                        : 0,
            };
        });

        // 4. Latest 5 recent transactions
        const recentResult = await pool.query(
            `SELECT id, type, amount, category, description, date, payment_method, notes
             FROM transactions
             WHERE user_id = $1
             ORDER BY date DESC, id DESC
             LIMIT 5`,
            [userId]
        );

        // 5. Chart overview data (Past 6 months trend of income & expense)
        const trendResult = await pool.query(
            `SELECT
                TO_CHAR(DATE_TRUNC('month', date), 'Mon YYYY') AS month_label,
                DATE_TRUNC('month', date) AS month_date,
                COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0) AS income,
                COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS expense
             FROM transactions
             WHERE user_id = $1
               AND date >= (CURRENT_DATE - INTERVAL '6 months')::date
             GROUP BY DATE_TRUNC('month', date)
             ORDER BY DATE_TRUNC('month', date) ASC`,
            [userId]
        );

        const chartData = trendResult.rows.map((r) => ({
            name: r.month_label,
            income: Number(r.income),
            expense: Number(r.expense),
            savings: Number(r.income) - Number(r.expense),
        }));

        return res.json({
            success: true,
            user: {
                id: req.user.id,
                name: req.user.name,
                email: req.user.email,
            },
            period,
            summary: {
                // Lifetime / actual balance
                balance: allTimeBalance,
                totalIncome: allTimeIncome,
                totalExpenses: allTimeExpenses,
                totalSavings: allTimeBalance,
                // Period specific
                periodIncome,
                periodExpenses,
                periodSavings: periodIncome - periodExpenses,
            },
            categories,
            recentTransactions: recentResult.rows.map((row) => ({
                ...row,
                amount: Number(row.amount),
            })),
            chartData,
        });
    } catch (error) {
        console.error("Dashboard controller error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to load dashboard data",
        });
    }
}
