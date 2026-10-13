import pool from "../config/db.js";

export async function getAnalytics(req, res) {
    try {
        const userId = req.user.id;
        const { range = "last_6_months", startDate, endDate, category, type } = req.query;

        const conditions = ["user_id = $1"];
        const params = [userId];
        let pIdx = 2;

        if (type && (type === "income" || type === "expense")) {
            conditions.push(`type = $${pIdx}`);
            params.push(type);
            pIdx++;
        }

        if (category && category !== "all") {
            conditions.push(`LOWER(category) = LOWER($${pIdx})`);
            params.push(category);
            pIdx++;
        }

        if (startDate) {
            conditions.push(`date >= $${pIdx}::date`);
            params.push(startDate);
            pIdx++;
        } else {
            // Apply preset range
            if (range === "demo_month" || range === "september_2026") {
                conditions.push("date >= '2026-09-01'::date AND date <= '2026-09-30'::date");
            } else if (range === "this_month") {
                conditions.push("date >= DATE_TRUNC('month', CURRENT_DATE)::date");
            } else if (range === "last_3_months") {
                conditions.push("date >= (CURRENT_DATE - INTERVAL '3 months')::date");
            } else if (range === "this_year") {
                conditions.push("date >= DATE_TRUNC('year', CURRENT_DATE)::date");
            } else if (range === "all") {
                // No lower bound
            } else {
                // Default last 6 months
                conditions.push("date >= (CURRENT_DATE - INTERVAL '6 months')::date");
            }
        }

        if (endDate) {
            conditions.push(`date <= $${pIdx}::date`);
            params.push(endDate);
            pIdx++;
        }

        const whereSql = conditions.join(" AND ");

        // 1. Summary totals
        const totalsRes = await pool.query(
            `SELECT
                COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0) AS total_income,
                COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS total_expenses,
                COALESCE(COUNT(*), 0) AS total_count,
                COALESCE(AVG(amount) FILTER (WHERE type = 'expense'), 0) AS avg_expense,
                COALESCE(MAX(amount) FILTER (WHERE type = 'expense'), 0) AS max_expense
             FROM transactions
             WHERE ${whereSql}`,
            params
        );

        const totalIncome = Number(totalsRes.rows[0].total_income);
        const totalExpenses = Number(totalsRes.rows[0].total_expenses);
        const totalCount = parseInt(totalsRes.rows[0].total_count, 10);
        const netSavings = totalIncome - totalExpenses;
        const savingsRate =
            totalIncome > 0 ? Number(((netSavings / totalIncome) * 100).toFixed(1)) : 0;
        const avgExpense = Number(Number(totalsRes.rows[0].avg_expense).toFixed(2));
        const maxExpense = Number(totalsRes.rows[0].max_expense);

        // 2. Highest expense transaction details
        let highestExpense = null;
        if (maxExpense > 0) {
            const highRes = await pool.query(
                `SELECT id, category, description, amount, date
                 FROM transactions
                 WHERE ${whereSql} AND type = 'expense'
                 ORDER BY amount DESC, date DESC
                 LIMIT 1`,
                params
            );
            if (highRes.rowCount > 0) {
                highestExpense = {
                    ...highRes.rows[0],
                    amount: Number(highRes.rows[0].amount),
                };
            }
        }

        // 3. Category Breakdown (Expenses)
        const catRes = await pool.query(
            `SELECT
                category,
                SUM(amount) AS amount,
                COUNT(id) AS count
             FROM transactions
             WHERE ${whereSql} AND type = 'expense'
             GROUP BY category
             ORDER BY SUM(amount) DESC`,
            params
        );

        const categoryBreakdown = catRes.rows.map((r) => {
            const amt = Number(r.amount);
            return {
                category: r.category,
                amount: amt,
                count: parseInt(r.count, 10),
                percentage:
                    totalExpenses > 0 ? Number(((amt / totalExpenses) * 100).toFixed(1)) : 0,
            };
        });

        // 4. Monthly Trend (Income vs Expense over time)
        const trendRes = await pool.query(
            `SELECT
                TO_CHAR(DATE_TRUNC('month', date), 'Mon YYYY') AS month,
                DATE_TRUNC('month', date) AS month_date,
                COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0) AS income,
                COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS expense
             FROM transactions
             WHERE ${whereSql}
             GROUP BY DATE_TRUNC('month', date)
             ORDER BY DATE_TRUNC('month', date) ASC`,
            params
        );

        const monthlyTrends = trendRes.rows.map((r) => ({
            month: r.month,
            income: Number(r.income),
            expense: Number(r.expense),
            net: Number(r.income) - Number(r.expense),
        }));

        // 5. Daily expense trends (for detailed visualization)
        const dailyRes = await pool.query(
            `SELECT
                TO_CHAR(date, 'DD Mon') AS display_date,
                date,
                COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS expense,
                COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0) AS income
             FROM transactions
             WHERE ${whereSql}
             GROUP BY date
             ORDER BY date ASC`,
            params
        );

        const dailyTrends = dailyRes.rows.map((r) => ({
            date: r.display_date,
            fullDate: r.date,
            expense: Number(r.expense),
            income: Number(r.income),
        }));

        // 6. Weekly Spending Comparison
        const weeklyRes = await pool.query(
            `SELECT
                'Week ' || TO_CHAR(date, 'W') AS week,
                COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS expense,
                COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0) AS income
             FROM transactions
             WHERE ${whereSql}
             GROUP BY TO_CHAR(date, 'W')
             ORDER BY TO_CHAR(date, 'W') ASC`,
            params
        );

        const weeklyTrends = weeklyRes.rows.map((r) => ({
            week: r.week,
            expense: Number(r.expense),
            income: Number(r.income),
        }));

        // 7. Payment Method Breakdown
        const pmRes = await pool.query(
            `SELECT
                COALESCE(payment_method, 'cash') AS payment_method,
                SUM(amount) AS amount,
                COUNT(id) AS count
             FROM transactions
             WHERE ${whereSql}
             GROUP BY payment_method
             ORDER BY SUM(amount) DESC`,
            params
        );

        const paymentMethodBreakdown = pmRes.rows.map((r) => ({
            method: r.payment_method,
            amount: Number(r.amount),
            count: parseInt(r.count, 10),
        }));

        // 8. Insights generated strictly from real computed data
        const insights = [];
        if (totalIncome > 0 && totalExpenses > 0) {
            if (savingsRate >= 20) {
                insights.push({
                    type: "positive",
                    text: `Great savings rate of ${savingsRate}% for this period.`,
                });
            } else if (savingsRate > 0) {
                insights.push({
                    type: "neutral",
                    text: `Savings rate is currently ${savingsRate}%. Aim for 20% or higher.`,
                });
            } else {
                insights.push({
                    type: "warning",
                    text: `Expenses exceed income by ₹${Math.abs(netSavings).toLocaleString("en-IN")}.`,
                });
            }
        }

        if (categoryBreakdown.length > 0) {
            const topCat = categoryBreakdown[0];
            insights.push({
                type: "info",
                text: `"${topCat.category}" is your top expense category accounting for ${topCat.percentage}% of spending (₹${topCat.amount.toLocaleString("en-IN")}).`,
            });
        }

        return res.json({
            success: true,
            summary: {
                totalIncome,
                totalExpenses,
                netSavings,
                savingsRate,
                totalCount,
                avgExpense,
                highestExpense,
            },
            categoryBreakdown,
            monthlyTrends,
            dailyTrends,
            weeklyTrends,
            paymentMethodBreakdown,
            insights,
        });
    } catch (error) {
        console.error("getAnalytics error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to load analytics data",
        });
    }
}

export async function exportCsv(req, res) {
    try {
        const userId = req.user.id;
        const { type, category, startDate, endDate, range } = req.query;

        const conditions = ["user_id = $1"];
        const params = [userId];
        let pIdx = 2;

        if (type && (type === "income" || type === "expense")) {
            conditions.push(`type = $${pIdx}`);
            params.push(type);
            pIdx++;
        }

        if (category && category !== "all") {
            conditions.push(`LOWER(category) = LOWER($${pIdx})`);
            params.push(category);
            pIdx++;
        }

        if (startDate) {
            conditions.push(`date >= $${pIdx}::date`);
            params.push(startDate);
            pIdx++;
        } else if (range === "demo_month" || range === "september_2026") {
            conditions.push("date >= '2026-09-01'::date AND date <= '2026-09-30'::date");
        } else if (range === "this_month") {
            conditions.push("date >= DATE_TRUNC('month', CURRENT_DATE)::date");
        } else if (range === "last_3_months") {
            conditions.push("date >= (CURRENT_DATE - INTERVAL '3 months')::date");
        } else if (range === "this_year") {
            conditions.push("date >= DATE_TRUNC('year', CURRENT_DATE)::date");
        }

        if (endDate) {
            conditions.push(`date <= $${pIdx}::date`);
            params.push(endDate);
            pIdx++;
        }

        const whereSql = conditions.join(" AND ");

        const result = await pool.query(
            `SELECT date, type, category, description, amount, payment_method, notes
             FROM transactions
             WHERE ${whereSql}
             ORDER BY date DESC, id DESC`,
            params
        );

        // Escape helper for CSV
        const escapeCsv = (val) => {
            if (val === null || val === undefined) return '""';
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
        };

        const headers = [
            "Date",
            "Type",
            "Category",
            "Description",
            "Amount (INR)",
            "Payment Method",
            "Notes",
        ];

        let csvContent = headers.join(",") + "\n";

        for (const row of result.rows) {
            const formattedDate = row.date
                ? new Date(row.date).toISOString().split("T")[0]
                : "";
            csvContent += [
                escapeCsv(formattedDate),
                escapeCsv(row.type),
                escapeCsv(row.category),
                escapeCsv(row.description),
                escapeCsv(Number(row.amount).toFixed(2)),
                escapeCsv(row.payment_method || "cash"),
                escapeCsv(row.notes || ""),
            ].join(",") + "\n";
        }

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader(
            "Content-Disposition",
            'attachment; filename="expenseflow_transactions.csv"'
        );
        return res.status(200).send(csvContent);
    } catch (error) {
        console.error("exportCsv error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to export transactions to CSV",
        });
    }
}
