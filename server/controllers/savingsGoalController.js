import pool from "../config/db.js";

/**
 * Controller for Savings Goals management.
 * Strictly scoped to authenticated req.user.id.
 */

export async function getSavingsGoals(req, res) {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            `SELECT id, user_id, name, target_amount, current_amount, target_date, category, notes, created_at, updated_at
             FROM savings_goals
             WHERE user_id = $1
             ORDER BY target_date ASC, id ASC`,
            [userId]
        );

        const now = new Date();

        const goals = result.rows.map((row) => {
            const targetAmount = Number(row.target_amount);
            const currentAmount = Number(row.current_amount);
            const remaining = Math.max(0, targetAmount - currentAmount);
            const progress = targetAmount > 0 ? Number(((currentAmount / targetAmount) * 100).toFixed(1)) : 0;

            // Calculate months remaining
            const targetDate = new Date(row.target_date);
            const diffMonths =
                (targetDate.getFullYear() - now.getFullYear()) * 12 +
                (targetDate.getMonth() - now.getMonth());
            const monthsLeft = Math.max(1, diffMonths);

            // Monthly contribution needed to hit target
            const requiredMonthlyContribution =
                remaining > 0 ? Number((remaining / monthsLeft).toFixed(2)) : 0;

            return {
                id: row.id,
                userId: row.user_id,
                name: row.name,
                targetAmount,
                currentAmount,
                remaining,
                progress: Math.min(100, progress),
                targetDate: row.target_date,
                category: row.category || "General",
                notes: row.notes || "",
                monthsLeft,
                requiredMonthlyContribution,
                isCompleted: currentAmount >= targetAmount,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
            };
        });

        const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
        const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
        const totalRequiredMonthly = goals.reduce(
            (sum, g) => sum + (g.isCompleted ? 0 : g.requiredMonthlyContribution),
            0
        );

        return res.json({
            success: true,
            summary: {
                totalGoals: goals.length,
                totalTarget,
                totalSaved,
                totalRemaining: Math.max(0, totalTarget - totalSaved),
                overallProgress:
                    totalTarget > 0 ? Number(((totalSaved / totalTarget) * 100).toFixed(1)) : 0,
                totalRequiredMonthly,
            },
            goals,
        });
    } catch (error) {
        console.error("getSavingsGoals error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to retrieve savings goals",
        });
    }
}

export async function createSavingsGoal(req, res) {
    try {
        const userId = req.user.id;
        const { name, targetAmount, currentAmount = 0, targetDate, category, notes } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Goal name is required",
            });
        }

        const target = Number(targetAmount);
        if (!target || target <= 0) {
            return res.status(400).json({
                success: false,
                message: "Target amount must be greater than 0",
            });
        }

        const current = Number(currentAmount) || 0;
        if (current < 0) {
            return res.status(400).json({
                success: false,
                message: "Current amount cannot be negative",
            });
        }

        if (!targetDate) {
            return res.status(400).json({
                success: false,
                message: "Target date is required",
            });
        }

        const result = await pool.query(
            `INSERT INTO savings_goals (user_id, name, target_amount, current_amount, target_date, category, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [userId, name.trim(), target, current, targetDate, category || "General", notes || ""]
        );

        return res.status(201).json({
            success: true,
            message: "Savings goal created successfully",
            goal: result.rows[0],
        });
    } catch (error) {
        console.error("createSavingsGoal error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create savings goal",
        });
    }
}

export async function updateSavingsGoal(req, res) {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { name, targetAmount, currentAmount, targetDate, category, notes } = req.body;

        const checkRes = await pool.query(
            "SELECT id FROM savings_goals WHERE id = $1 AND user_id = $2",
            [id, userId]
        );

        if (checkRes.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Savings goal not found",
            });
        }

        const updates = [];
        const params = [id, userId];
        let pIdx = 3;

        if (name !== undefined) {
            updates.push(`name = $${pIdx}`);
            params.push(name.trim());
            pIdx++;
        }

        if (targetAmount !== undefined) {
            const target = Number(targetAmount);
            if (!target || target <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Target amount must be greater than 0",
                });
            }
            updates.push(`target_amount = $${pIdx}`);
            params.push(target);
            pIdx++;
        }

        if (currentAmount !== undefined) {
            const current = Number(currentAmount);
            if (current < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Current amount cannot be negative",
                });
            }
            updates.push(`current_amount = $${pIdx}`);
            params.push(current);
            pIdx++;
        }

        if (targetDate !== undefined) {
            updates.push(`target_date = $${pIdx}`);
            params.push(targetDate);
            pIdx++;
        }

        if (category !== undefined) {
            updates.push(`category = $${pIdx}`);
            params.push(category);
            pIdx++;
        }

        if (notes !== undefined) {
            updates.push(`notes = $${pIdx}`);
            params.push(notes);
            pIdx++;
        }

        updates.push("updated_at = CURRENT_TIMESTAMP");

        const updateSql = `
            UPDATE savings_goals
            SET ${updates.join(", ")}
            WHERE id = $1 AND user_id = $2
            RETURNING *
        `;

        const result = await pool.query(updateSql, params);

        return res.json({
            success: true,
            message: "Savings goal updated successfully",
            goal: result.rows[0],
        });
    } catch (error) {
        console.error("updateSavingsGoal error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update savings goal",
        });
    }
}

export async function contributeToGoal(req, res) {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { amount } = req.body;

        const numAmount = Number(amount);
        if (!numAmount || numAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Contribution amount must be greater than 0",
            });
        }

        const checkRes = await pool.query(
            "SELECT id, current_amount, target_amount, name FROM savings_goals WHERE id = $1 AND user_id = $2",
            [id, userId]
        );

        if (checkRes.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Savings goal not found",
            });
        }

        const goal = checkRes.rows[0];
        const updatedAmount = Number(goal.current_amount) + numAmount;

        const updateRes = await pool.query(
            `UPDATE savings_goals
             SET current_amount = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2 AND user_id = $3
             RETURNING *`,
            [updatedAmount, id, userId]
        );

        return res.json({
            success: true,
            message: `Contributed ₹${numAmount.toLocaleString("en-IN")} towards ${goal.name}`,
            goal: updateRes.rows[0],
        });
    } catch (error) {
        console.error("contributeToGoal error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to record contribution to goal",
        });
    }
}

export async function deleteSavingsGoal(req, res) {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const result = await pool.query(
            "DELETE FROM savings_goals WHERE id = $1 AND user_id = $2 RETURNING id",
            [id, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Savings goal not found",
            });
        }

        return res.json({
            success: true,
            message: "Savings goal deleted successfully",
        });
    } catch (error) {
        console.error("deleteSavingsGoal error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete savings goal",
        });
    }
}
