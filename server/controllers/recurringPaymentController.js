import pool from "../config/db.js";

/**
 * Controller for Recurring Payments & Fixed Obligations.
 * Strictly scoped to authenticated req.user.id.
 */

export async function getRecurringPayments(req, res) {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            `SELECT id, user_id, title, amount, category, frequency, next_due_date, payment_method, is_active, notes, created_at, updated_at
             FROM recurring_payments
             WHERE user_id = $1
             ORDER BY next_due_date ASC, id ASC`,
            [userId]
        );

        const items = result.rows.map((r) => {
            const amount = Number(r.amount);
            // Calculate normalized monthly obligation
            let monthlyEstimated = amount;
            if (r.frequency === "yearly") {
                monthlyEstimated = Number((amount / 12).toFixed(2));
            } else if (r.frequency === "weekly") {
                monthlyEstimated = Number((amount * 4.33).toFixed(2));
            } else if (r.frequency === "quarterly") {
                monthlyEstimated = Number((amount / 3).toFixed(2));
            }

            return {
                id: r.id,
                userId: r.user_id,
                title: r.title,
                amount,
                category: r.category,
                frequency: r.frequency,
                nextDueDate: r.next_due_date,
                paymentMethod: r.payment_method || "upi",
                isActive: r.is_active,
                notes: r.notes || "",
                monthlyEstimated,
                createdAt: r.created_at,
                updatedAt: r.updated_at,
            };
        });

        // Summary of fixed expenses
        const activeItems = items.filter((i) => i.isActive);
        const totalEstimatedMonthly = activeItems.reduce((sum, i) => sum + i.monthlyEstimated, 0);

        return res.json({
            success: true,
            summary: {
                totalCount: items.length,
                activeCount: activeItems.length,
                totalEstimatedMonthly,
            },
            recurringPayments: items,
        });
    } catch (error) {
        console.error("getRecurringPayments error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to retrieve recurring payments",
        });
    }
}

export async function createRecurringPayment(req, res) {
    try {
        const userId = req.user.id;
        const { title, amount, category, frequency = "monthly", nextDueDate, paymentMethod = "upi", notes } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({
                success: false,
                message: "Title is required",
            });
        }

        const numAmount = Number(amount);
        if (!numAmount || numAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Amount must be greater than 0",
            });
        }

        if (!category || !category.trim()) {
            return res.status(400).json({
                success: false,
                message: "Category is required",
            });
        }

        if (!nextDueDate) {
            return res.status(400).json({
                success: false,
                message: "Next due date is required",
            });
        }

        const validFrequencies = ["monthly", "yearly", "weekly", "quarterly"];
        const selectedFrequency = validFrequencies.includes(frequency) ? frequency : "monthly";

        const result = await pool.query(
            `INSERT INTO recurring_payments (user_id, title, amount, category, frequency, next_due_date, payment_method, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [userId, title.trim(), numAmount, category.trim(), selectedFrequency, nextDueDate, paymentMethod, notes || ""]
        );

        return res.status(201).json({
            success: true,
            message: "Recurring payment added successfully",
            recurringPayment: result.rows[0],
        });
    } catch (error) {
        console.error("createRecurringPayment error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create recurring payment",
        });
    }
}

export async function updateRecurringPayment(req, res) {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { title, amount, category, frequency, nextDueDate, paymentMethod, isActive, notes } = req.body;

        const checkRes = await pool.query(
            "SELECT id FROM recurring_payments WHERE id = $1 AND user_id = $2",
            [id, userId]
        );

        if (checkRes.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Recurring payment not found",
            });
        }

        const updates = [];
        const params = [id, userId];
        let pIdx = 3;

        if (title !== undefined) {
            updates.push(`title = $${pIdx}`);
            params.push(title.trim());
            pIdx++;
        }

        if (amount !== undefined) {
            const num = Number(amount);
            if (!num || num <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Amount must be greater than 0",
                });
            }
            updates.push(`amount = $${pIdx}`);
            params.push(num);
            pIdx++;
        }

        if (category !== undefined) {
            updates.push(`category = $${pIdx}`);
            params.push(category.trim());
            pIdx++;
        }

        if (frequency !== undefined) {
            updates.push(`frequency = $${pIdx}`);
            params.push(frequency);
            pIdx++;
        }

        if (nextDueDate !== undefined) {
            updates.push(`next_due_date = $${pIdx}`);
            params.push(nextDueDate);
            pIdx++;
        }

        if (paymentMethod !== undefined) {
            updates.push(`payment_method = $${pIdx}`);
            params.push(paymentMethod);
            pIdx++;
        }

        if (isActive !== undefined) {
            updates.push(`is_active = $${pIdx}`);
            params.push(Boolean(isActive));
            pIdx++;
        }

        if (notes !== undefined) {
            updates.push(`notes = $${pIdx}`);
            params.push(notes);
            pIdx++;
        }

        updates.push("updated_at = CURRENT_TIMESTAMP");

        const updateSql = `
            UPDATE recurring_payments
            SET ${updates.join(", ")}
            WHERE id = $1 AND user_id = $2
            RETURNING *
        `;

        const result = await pool.query(updateSql, params);

        return res.json({
            success: true,
            message: "Recurring payment updated successfully",
            recurringPayment: result.rows[0],
        });
    } catch (error) {
        console.error("updateRecurringPayment error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update recurring payment",
        });
    }
}

export async function deleteRecurringPayment(req, res) {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const result = await pool.query(
            "DELETE FROM recurring_payments WHERE id = $1 AND user_id = $2 RETURNING id",
            [id, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Recurring payment not found",
            });
        }

        return res.json({
            success: true,
            message: "Recurring payment deleted successfully",
        });
    } catch (error) {
        console.error("deleteRecurringPayment error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete recurring payment",
        });
    }
}
