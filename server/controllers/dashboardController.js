import pool from "../config/db.js";

/**
 * Premium Financial Dashboard Controller.
 * Aggregates authentic PostgreSQL data scoped to req.user.id.
 */

export async function getDashboard(req, res) {
    try {
        const userId = req.user.id;
        const requestedPeriod = req.query.period || "month"; // "week", "month", "year", "all", "demo_month"
        let targetMonth = req.query.month ? parseInt(req.query.month, 10) : null;
        let targetYear = req.query.year ? parseInt(req.query.year, 10) : null;

        // 1. All-time / Lifetime totals for the user
        const lifetimeRes = await pool.query(
            `SELECT
                COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0) AS total_income,
                COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS total_expenses,
                COUNT(id) AS total_transactions
             FROM transactions
             WHERE user_id = $1`,
            [userId]
        );

        const allTimeIncome = Number(lifetimeRes.rows[0].total_income);
        const allTimeExpenses = Number(lifetimeRes.rows[0].total_expenses);
        const allTimeBalance = allTimeIncome - allTimeExpenses;
        const allTimeTxCount = parseInt(lifetimeRes.rows[0].total_transactions, 10);
        const allTimeSavingsRate =
            allTimeIncome > 0 ? Number(((allTimeBalance / allTimeIncome) * 100).toFixed(1)) : 0;

        // 2. Intelligent Default Month Detection:
        // If period is "month" and no specific month/year is provided:
        // Check if current calendar month has transactions.
        // If 0, check the latest month that contains transactions (e.g. September 2026 for demo account).
        const now = new Date();
        const currentCalMonth = now.getMonth() + 1;
        const currentCalYear = now.getFullYear();

        if (requestedPeriod === "demo_month" || requestedPeriod === "september_2026") {
            targetMonth = 9;
            targetYear = 2026;
        } else if (requestedPeriod === "month" && (!targetMonth || !targetYear)) {
            // Check current month transactions count
            const checkCurMonth = await pool.query(
                `SELECT COUNT(id) AS cnt
                 FROM transactions
                 WHERE user_id = $1
                   AND EXTRACT(MONTH FROM date) = $2
                   AND EXTRACT(YEAR FROM date) = $3`,
                [userId, currentCalMonth, currentCalYear]
            );

            if (parseInt(checkCurMonth.rows[0].cnt, 10) > 0) {
                targetMonth = currentCalMonth;
                targetYear = currentCalYear;
            } else {
                // Find latest month with transactions
                const latestTxRes = await pool.query(
                    `SELECT EXTRACT(MONTH FROM date)::int AS m, EXTRACT(YEAR FROM date)::int AS y
                     FROM transactions
                     WHERE user_id = $1
                     ORDER BY date DESC
                     LIMIT 1`,
                    [userId]
                );

                if (latestTxRes.rowCount > 0) {
                    targetMonth = latestTxRes.rows[0].m;
                    targetYear = latestTxRes.rows[0].y;
                } else {
                    targetMonth = currentCalMonth;
                    targetYear = currentCalYear;
                }
            }
        }

        // 3. Period date filtering condition
        let periodFilterSql = "";
        let periodParams = [userId];
        let periodLabel = "This Month";

        if (requestedPeriod === "week") {
            periodFilterSql = " AND date >= DATE_TRUNC('week', CURRENT_DATE)::date";
            periodLabel = "This Week";
        } else if (requestedPeriod === "year") {
            periodFilterSql = " AND date >= DATE_TRUNC('year', CURRENT_DATE)::date";
            periodLabel = "This Year";
        } else if (requestedPeriod === "all") {
            periodFilterSql = "";
            periodLabel = "All Time";
        } else {
            // Month period
            const monthP = targetMonth || currentCalMonth;
            const yearP = targetYear || currentCalYear;
            periodFilterSql = " AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3";
            periodParams = [userId, monthP, yearP];
            const monthNames = [
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ];
            periodLabel = `${monthNames[monthP - 1]} ${yearP}`;
        }

        // Period totals
        const periodTotalsRes = await pool.query(
            `SELECT
                COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0) AS period_income,
                COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS period_expenses,
                COUNT(id) AS period_count,
                COALESCE(AVG(amount) FILTER (WHERE type = 'expense'), 0) AS avg_expense,
                COALESCE(MAX(amount) FILTER (WHERE type = 'expense'), 0) AS max_expense
             FROM transactions
             WHERE user_id = $1 ${periodFilterSql}`,
            periodParams
        );

        const periodIncome = Number(periodTotalsRes.rows[0].period_income);
        const periodExpenses = Number(periodTotalsRes.rows[0].period_expenses);
        const periodSavings = periodIncome - periodExpenses;
        const periodSavingsRate =
            periodIncome > 0 ? Number(((periodSavings / periodIncome) * 100).toFixed(1)) : 0;
        const periodCount = parseInt(periodTotalsRes.rows[0].period_count, 10);
        const avgExpense = Number(Number(periodTotalsRes.rows[0].avg_expense).toFixed(2));
        const maxExpense = Number(periodTotalsRes.rows[0].max_expense);

        // 4. Previous Period Comparison (Preceding month)
        let prevMonth = (targetMonth || currentCalMonth) - 1;
        let prevYear = targetYear || currentCalYear;
        if (prevMonth === 0) {
            prevMonth = 12;
            prevYear -= 1;
        }

        const prevPeriodRes = await pool.query(
            `SELECT
                COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0) AS prev_income,
                COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS prev_expenses
             FROM transactions
             WHERE user_id = $1
               AND EXTRACT(MONTH FROM date) = $2
               AND EXTRACT(YEAR FROM date) = $3`,
            [userId, prevMonth, prevYear]
        );

        const prevIncome = Number(prevPeriodRes.rows[0].prev_income);
        const prevExpenses = Number(prevPeriodRes.rows[0].prev_expenses);
        const expenseChangeDiff = periodExpenses - prevExpenses;
        const expenseChangePercent =
            prevExpenses > 0
                ? Number((((periodExpenses - prevExpenses) / prevExpenses) * 100).toFixed(1))
                : 0;

        // 5. Category spending breakdown for chosen period
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

        // 6. Largest individual expense
        let largestExpense = null;
        if (maxExpense > 0) {
            const largestRes = await pool.query(
                `SELECT id, category, description, amount, date, payment_method
                 FROM transactions
                 WHERE user_id = $1
                   AND type = 'expense'
                   ${periodFilterSql}
                 ORDER BY amount DESC, date DESC
                 LIMIT 1`,
                periodParams
            );
            if (largestRes.rowCount > 0) {
                largestExpense = {
                    ...largestRes.rows[0],
                    amount: Number(largestRes.rows[0].amount),
                };
            }
        }

        // 7. Daily spending trend for the selected period
        const dailyTrendRes = await pool.query(
            `SELECT
                TO_CHAR(date, 'DD') AS day,
                date,
                COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS expense,
                COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0) AS income
             FROM transactions
             WHERE user_id = $1 ${periodFilterSql}
             GROUP BY date
             ORDER BY date ASC`,
            periodParams
        );

        const dailyTrends = dailyTrendRes.rows.map((r) => ({
            day: r.day,
            date: r.date,
            expense: Number(r.expense),
            income: Number(r.income),
        }));

        // 8. Latest 10 recent transactions
        const recentResult = await pool.query(
            `SELECT id, type, amount, category, description, date, payment_method, notes
             FROM transactions
             WHERE user_id = $1
             ORDER BY date DESC, id DESC
             LIMIT 10`,
            [userId]
        );

        // 9. 6-Month Income vs Expense Trend
        const trendResult = await pool.query(
            `SELECT
                TO_CHAR(DATE_TRUNC('month', date), 'Mon YYYY') AS month_label,
                DATE_TRUNC('month', date) AS month_date,
                COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0) AS income,
                COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS expense
             FROM transactions
             WHERE user_id = $1
             GROUP BY DATE_TRUNC('month', date)
             ORDER BY DATE_TRUNC('month', date) ASC
             LIMIT 6`,
            [userId]
        );

        const chartData = trendResult.rows.map((r) => ({
            name: r.month_label,
            income: Number(r.income),
            expense: Number(r.expense),
            savings: Number(r.income) - Number(r.expense),
        }));

        // 10. Budget status for the active month
        const activeMonthNum = targetMonth || currentCalMonth;
        const activeYearNum = targetYear || currentCalYear;

        const budgetRes = await pool.query(
            `SELECT b.id, b.category, b.amount AS limit_amount
             FROM budgets b
             WHERE b.user_id = $1 AND b.month = $2 AND b.year = $3`,
            [userId, activeMonthNum, activeYearNum]
        );

        let totalBudget = 0;
        let totalBudgetSpent = 0;
        const budgetAlerts = [];

        budgetRes.rows.forEach((b) => {
            const limit = Number(b.limit_amount);
            totalBudget += limit;
            const match = categories.find(
                (c) => c.category.toLowerCase() === b.category.toLowerCase()
            );
            const spent = match ? match.amount : 0;
            totalBudgetSpent += spent;
            const pct = limit > 0 ? (spent / limit) * 100 : 0;

            if (pct >= 100) {
                budgetAlerts.push({
                    category: b.category,
                    limit,
                    spent,
                    percentage: Number(pct.toFixed(1)),
                    type: "danger",
                    message: `Over budget by ₹${(spent - limit).toLocaleString("en-IN")}`,
                });
            } else if (pct >= 85) {
                budgetAlerts.push({
                    category: b.category,
                    limit,
                    spent,
                    percentage: Number(pct.toFixed(1)),
                    type: "warning",
                    message: `${Number(pct.toFixed(1))}% of limit utilized`,
                });
            }
        });

        // 11. Smart Financial Insights
        const insights = [];
        const daysInMonth = new Date(activeYearNum, activeMonthNum, 0).getDate();
        const activeDaysElapsed = Math.min(daysInMonth, dailyTrends.length > 0 ? dailyTrends.length : 30);
        const dailyAvgSpend =
            activeDaysElapsed > 0 ? Number((periodExpenses / activeDaysElapsed).toFixed(2)) : 0;
        const estimatedMonthEndExpense = Number((dailyAvgSpend * daysInMonth).toFixed(2));
        const remainingBudget = Math.max(0, totalBudget - totalBudgetSpent);
        const remainingDays = Math.max(1, daysInMonth - activeDaysElapsed);
        const suggestedDailyAllowance =
            remainingBudget > 0 ? Number((remainingBudget / remainingDays).toFixed(2)) : 0;

        if (categories.length > 0) {
            insights.push({
                title: "Top Spending Category",
                value: `${categories[0].category} (₹${categories[0].amount.toLocaleString("en-IN")})`,
                subtitle: `${categories[0].percentage}% of total period spending`,
                type: "info",
            });
        }

        if (largestExpense) {
            insights.push({
                title: "Biggest Individual Expense",
                value: `₹${largestExpense.amount.toLocaleString("en-IN")}`,
                subtitle: `"${largestExpense.description}" (${largestExpense.category})`,
                type: "neutral",
            });
        }

        if (periodExpenses > 0) {
            insights.push({
                title: "Daily Average Spending",
                value: `₹${dailyAvgSpend.toLocaleString("en-IN")}/day`,
                subtitle: `Across ${activeDaysElapsed} active recorded days`,
                type: "neutral",
            });

            if (totalBudget > 0) {
                insights.push({
                    title: "Suggested Daily Allowance",
                    value: `₹${suggestedDailyAllowance.toLocaleString("en-IN")}/day`,
                    subtitle: `To remain within ₹${totalBudget.toLocaleString("en-IN")} total budget`,
                    type: remainingBudget > 0 ? "positive" : "warning",
                });
            }
        }

        // 12. Portfolio Summary Preview (if any stock holdings)
        const stockTxRes = await pool.query(
            `SELECT
                COALESCE(SUM(quantity * price_per_share + brokerage_charges) FILTER (WHERE transaction_type = 'BUY'), 0) -
                COALESCE(SUM(quantity * price_per_share - brokerage_charges) FILTER (WHERE transaction_type = 'SELL'), 0) AS net_invested,
                COUNT(DISTINCT symbol) AS active_stocks
             FROM stock_transactions
             WHERE user_id = $1`,
            [userId]
        );

        const portfolioSummary = {
            netInvested: Math.max(0, Number(stockTxRes.rows[0].net_invested || 0)),
            activeStocks: parseInt(stockTxRes.rows[0].active_stocks || 0, 10),
        };

        return res.json({
            success: true,
            user: {
                id: req.user.id,
                name: req.user.name,
                email: req.user.email,
            },
            period: requestedPeriod,
            periodLabel,
            filter: {
                month: activeMonthNum,
                year: activeYearNum,
            },
            summary: {
                // Lifetime figures
                balance: allTimeBalance,
                totalIncome: allTimeIncome,
                totalExpenses: allTimeExpenses,
                totalSavings: allTimeBalance,
                savingsRate: allTimeSavingsRate,
                totalTransactions: allTimeTxCount,
                // Period specific figures
                periodIncome,
                periodExpenses,
                periodSavings,
                periodSavingsRate,
                periodCount,
                avgExpense,
            },
            comparison: {
                prevIncome,
                prevExpenses,
                expenseChangeDiff,
                expenseChangePercent,
            },
            categories,
            dailyTrends,
            recentTransactions: recentResult.rows.map((row) => ({
                ...row,
                amount: Number(row.amount),
            })),
            chartData,
            budgetOverview: {
                totalBudget,
                totalSpent: totalBudgetSpent,
                remaining: totalBudget - totalBudgetSpent,
                percentage: totalBudget > 0 ? Number(((totalBudgetSpent / totalBudget) * 100).toFixed(1)) : 0,
                alerts: budgetAlerts,
            },
            insights: {
                metrics: insights,
                dailyAvgSpend,
                suggestedDailyAllowance,
                estimatedMonthEndExpense,
                largestExpense,
            },
            portfolioSummary,
        });
    } catch (error) {
        console.error("Dashboard controller error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to load dashboard data",
        });
    }
}
