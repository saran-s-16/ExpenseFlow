import pool from "../config/db.js";

export async function getCategories(req, res) {
    try {
        const userId = req.user.id;
        const { type } = req.query;

        let query = `
            SELECT c.id, c.user_id, c.name, c.type, c.created_at,
                   COALESCE(COUNT(t.id), 0)::integer AS transaction_count,
                   COALESCE(SUM(t.amount), 0)::numeric AS total_spent
            FROM categories c
            LEFT JOIN transactions t 
              ON t.user_id = c.user_id 
             AND LOWER(t.category) = LOWER(c.name)
             AND t.type = c.type
            WHERE c.user_id = $1
        `;
        const params = [userId];

        if (type && (type === "income" || type === "expense")) {
            query += " AND c.type = $2";
            params.push(type);
        }

        query += " GROUP BY c.id ORDER BY c.type DESC, c.name ASC";

        const result = await pool.query(query, params);

        return res.json({
            success: true,
            categories: result.rows.map((row) => ({
                id: row.id,
                userId: row.user_id,
                name: row.name,
                type: row.type,
                createdAt: row.created_at,
                transactionCount: row.transaction_count,
                totalSpent: Number(row.total_spent),
            })),
        });
    } catch (error) {
        console.error("getCategories error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to retrieve categories",
        });
    }
}

export async function createCategory(req, res) {
    try {
        const userId = req.user.id;
        const { name, type } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Category name is required",
            });
        }

        if (!type || (type !== "income" && type !== "expense")) {
            return res.status(400).json({
                success: false,
                message: "Category type must be 'income' or 'expense'",
            });
        }

        const trimmedName = name.trim();

        // Check for duplicate category name & type for this user
        const existing = await pool.query(
            "SELECT id FROM categories WHERE user_id = $1 AND LOWER(name) = LOWER($2) AND type = $3",
            [userId, trimmedName, type]
        );

        if (existing.rowCount > 0) {
            return res.status(409).json({
                success: false,
                message: `A ${type} category named "${trimmedName}" already exists`,
            });
        }

        const insertRes = await pool.query(
            `INSERT INTO categories (user_id, name, type)
             VALUES ($1, $2, $3)
             RETURNING id, user_id, name, type, created_at`,
            [userId, trimmedName, type]
        );

        return res.status(201).json({
            success: true,
            message: "Category created successfully",
            category: insertRes.rows[0],
        });
    } catch (error) {
        console.error("createCategory error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to create category",
        });
    }
}

export async function updateCategory(req, res) {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { name, type } = req.body;

        const currentRes = await client.query(
            "SELECT * FROM categories WHERE id = $1 AND user_id = $2",
            [id, userId]
        );

        if (currentRes.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Category not found or unauthorized",
            });
        }

        const current = currentRes.rows[0];
        const newName = name !== undefined ? name.trim() : current.name;
        const newType = type !== undefined ? type : current.type;

        if (!newName) {
            return res.status(400).json({
                success: false,
                message: "Category name cannot be empty",
            });
        }

        if (newType !== "income" && newType !== "expense") {
            return res.status(400).json({
                success: false,
                message: "Type must be 'income' or 'expense'",
            });
        }

        // Check if name/type collision with another category
        const dupRes = await client.query(
            "SELECT id FROM categories WHERE user_id = $1 AND LOWER(name) = LOWER($2) AND type = $3 AND id != $4",
            [userId, newName, newType, id]
        );

        if (dupRes.rowCount > 0) {
            return res.status(409).json({
                success: false,
                message: `Another ${newType} category named "${newName}" already exists`,
            });
        }

        await client.query("BEGIN");

        // If category name has changed, update matching transactions and budgets as well to keep them consistent
        if (current.name !== newName) {
            await client.query(
                "UPDATE transactions SET category = $1 WHERE user_id = $2 AND LOWER(category) = LOWER($3)",
                [newName, userId, current.name]
            );
            await client.query(
                "UPDATE budgets SET category = $1 WHERE user_id = $2 AND LOWER(category) = LOWER($3)",
                [newName, userId, current.name]
            );
        }

        const updateRes = await client.query(
            `UPDATE categories
             SET name = $1, type = $2
             WHERE id = $3 AND user_id = $4
             RETURNING id, user_id, name, type, created_at`,
            [newName, newType, id, userId]
        );

        await client.query("COMMIT");

        return res.json({
            success: true,
            message: "Category updated successfully",
            category: updateRes.rows[0],
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("updateCategory error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to update category",
        });
    } finally {
        client.release();
    }
}

export async function deleteCategory(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const currentRes = await pool.query(
            "SELECT * FROM categories WHERE id = $1 AND user_id = $2",
            [id, userId]
        );

        if (currentRes.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Category not found or unauthorized",
            });
        }

        const current = currentRes.rows[0];

        // Check if transactions exist using this category
        const txCheck = await pool.query(
            "SELECT COUNT(*) FROM transactions WHERE user_id = $1 AND LOWER(category) = LOWER($2)",
            [userId, current.name]
        );

        const txCount = parseInt(txCheck.rows[0].count, 10);
        if (txCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete category "${current.name}" because it is currently used by ${txCount} transaction(s). Reassign or delete those transactions first.`,
            });
        }

        // Check if budgets exist using this category
        const bCheck = await pool.query(
            "SELECT COUNT(*) FROM budgets WHERE user_id = $1 AND LOWER(category) = LOWER($2)",
            [userId, current.name]
        );
        const bCount = parseInt(bCheck.rows[0].count, 10);
        if (bCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete category "${current.name}" because it is currently used by a monthly budget.`,
            });
        }

        await pool.query(
            "DELETE FROM categories WHERE id = $1 AND user_id = $2",
            [id, userId]
        );

        return res.json({
            success: true,
            message: "Category deleted successfully",
            id: current.id,
        });
    } catch (error) {
        console.error("deleteCategory error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to delete category",
        });
    }
}
