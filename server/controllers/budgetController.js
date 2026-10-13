import pool from "../config/db.js";

export async function getBudgets(req, res) {
    try {
        const userId = req.user.id;
        const now = new Date();
        let month = req.query.month;
        let year = req.query.year;

        if (typeof month === "string" && month.includes("-")) {
            const parts = month.split("-");
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10);
        } else {
            month = parseInt(month, 10) || (now.getMonth() + 1);
            year = parseInt(year, 10) || now.getFullYear();
        }

        // Retrieve budgets for this user, month, and year
        const budgetRes = await pool.query(
            `SELECT b.id, b.user_id, b.category, b.amount, b.month, b.year, b.created_at, b.updated_at
             FROM budgets b
             WHERE b.user_id = $1 AND b.month = $2 AND b.year = $3
             ORDER BY b.amount DESC, b.category ASC`,
            [userId, month, year]
        );

        // Retrieve actual expense spending grouped by category for that month & year
        const spendingRes = await pool.query(
            `SELECT category, SUM(amount) AS spent
             FROM transactions
             WHERE user_id = $1
               AND type = 'expense'
               AND EXTRACT(MONTH FROM date) = $2
               AND EXTRACT(YEAR FROM date) = $3
             GROUP BY category`,
            [userId, month, year]
        );

        const spendingMap = {};
        for (const row of spendingRes.rows) {
            spendingMap[row.category.toLowerCase()] = Number(row.spent);
        }

        let totalBudget = 0;
        let totalSpent = 0;

        const budgets = budgetRes.rows.map((b) => {
            const limit = Number(b.amount);
            const spent = spendingMap[b.category.toLowerCase()] || 0;
            const remaining = limit - spent;
            const percentage = limit > 0 ? Number(((spent / limit) * 100).toFixed(1)) : 0;

            let status = "normal";
            if (percentage >= 100) {
                status = "exceeded";
            } else if (percentage >= 80) {
                status = "warning";
            }

            totalBudget += limit;
            totalSpent += spent;

            return {
                id: b.id,
                userId: b.user_id,
                category: b.category,
                amount: limit,
                spent,
                remaining,
                percentage,
                status,
                month: b.month,
                year: b.year,
                createdAt: b.created_at,
                updatedAt: b.updated_at,
            };
        });

        const overallRemaining = totalBudget - totalSpent;
        const overallPercentage =
            totalBudget > 0 ? Number(((totalSpent / totalBudget) * 100).toFixed(1)) : 0;

        return res.json({
            success: true,
            filter: { month, year },
            summary: {
                totalBudget,
                totalSpent,
                remaining: overallRemaining,
                percentage: overallPercentage,
                budgetCount: budgets.length,
            },
            budgets,
        });
    } catch (error) {
        console.error("getBudgets error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to retrieve budgets",
        });
    }
}

export async function createBudget(req, res) {
    try {
        const userId = req.user.id;
        const { category, amount, month, year } = req.body;

        if (!category || !category.trim()) {
            return res.status(400).json({
                success: false,
                message: "Category is required",
            });
        }

        const numAmount = Number(amount);
        if (!numAmount || Number.isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Budget limit amount must be greater than 0",
            });
        }

        const numMonth = parseInt(month, 10);
        if (!numMonth || numMonth < 1 || numMonth > 12) {
            return res.status(400).json({
                success: false,
                message: "Month must be between 1 and 12",
            });
        }

        const numYear = parseInt(year, 10);
        if (!numYear || numYear < 2000 || numYear > 2100) {
            return res.status(400).json({
                success: false,
                message: "Valid year is required",
            });
        }

        const trimmedCat = category.trim();

        // Check for duplicate budget
        const dupRes = await pool.query(
            "SELECT id FROM budgets WHERE user_id = $1 AND LOWER(category) = LOWER($2) AND month = $3 AND year = $4",
            [userId, trimmedCat, numMonth, numYear]
        );

        if (dupRes.rowCount > 0) {
            return res.status(409).json({
                success: false,
                message: `A budget for "${trimmedCat}" in ${numMonth}/${numYear} already exists. You can edit it instead.`,
            });
        }

        const insertRes = await pool.query(
            `INSERT INTO budgets (user_id, category, amount, month, year)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, user_id, category, amount, month, year, created_at, updated_at`,
            [userId, trimmedCat, numAmount, numMonth, numYear]
        );

        const row = insertRes.rows[0];
        return res.status(201).json({
            success: true,
            message: "Budget created successfully",
            budget: {
                ...row,
                amount: Number(row.amount),
            },
        });
    } catch (error) {
        console.error("createBudget error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to create budget",
        });
    }
}

export async function updateBudget(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { amount, category, month, year } = req.body;

        const currentRes = await pool.query(
            "SELECT * FROM budgets WHERE id = $1 AND user_id = $2",
            [id, userId]
        );

        if (currentRes.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Budget not found or unauthorized",
            });
        }

        const current = currentRes.rows[0];

        let updatedAmount = current.amount;
        if (amount !== undefined) {
            const numAmount = Number(amount);
            if (!numAmount || Number.isNaN(numAmount) || numAmount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Amount must be a positive number",
                });
            }
            updatedAmount = numAmount;
        }

        const updatedCategory = category !== undefined ? category.trim() : current.category;
        const updatedMonth = month !== undefined ? parseInt(month, 10) : current.month;
        const updatedYear = year !== undefined ? parseInt(year, 10) : current.year;

        // Check duplicate if category/month/year changed
        if (
            updatedCategory.toLowerCase() !== current.category.toLowerCase() ||
            updatedMonth !== current.month ||
            updatedYear !== current.year
        ) {
            const dup = await pool.query(
                "SELECT id FROM budgets WHERE user_id = $1 AND LOWER(category) = LOWER($2) AND month = $3 AND year = $4 AND id != $5",
                [userId, updatedCategory, updatedMonth, updatedYear, id]
            );
            if (dup.rowCount > 0) {
                return res.status(409).json({
                    success: false,
                    message: "A budget for this category and month/year already exists",
                });
            }
        }

        const updateRes = await pool.query(
            `UPDATE budgets
             SET amount = $1, category = $2, month = $3, year = $4, updated_at = NOW()
             WHERE id = $5 AND user_id = $6
             RETURNING id, user_id, category, amount, month, year, created_at, updated_at`,
            [updatedAmount, updatedCategory, updatedMonth, updatedYear, id, userId]
        );

        const row = updateRes.rows[0];
        return res.json({
            success: true,
            message: "Budget updated successfully",
            budget: {
                ...row,
                amount: Number(row.amount),
            },
        });
    } catch (error) {
        console.error("updateBudget error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to update budget",
        });
    }
}

export async function deleteBudget(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const deleteRes = await pool.query(
            "DELETE FROM budgets WHERE id = $1 AND user_id = $2 RETURNING id",
            [id, userId]
        );

        if (deleteRes.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Budget not found or unauthorized",
            });
        }

        return res.json({
            success: true,
            message: "Budget deleted successfully",
            id: deleteRes.rows[0].id,
        });
    } catch (error) {
        console.error("deleteBudget error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to delete budget",
        });
    }
}
