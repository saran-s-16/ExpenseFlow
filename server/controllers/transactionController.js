import pool from "../config/db.js";

export async function getTransactions(req, res) {
    try {
        const userId = req.user.id;
        const {
            type,
            category,
            paymentMethod,
            startDate,
            endDate,
            month,
            year,
            search,
            sortBy = "date",
            sortOrder = "DESC",
            page = 1,
            limit = 20,
        } = req.query;

        const conditions = ["user_id = $1"];
        const params = [userId];
        let paramIndex = 2;

        if (month && !startDate && !endDate) {
            let mNum, yNum;
            if (typeof month === "string" && month.includes("-")) {
                const parts = month.split("-");
                yNum = parseInt(parts[0], 10);
                mNum = parseInt(parts[1], 10);
            } else {
                mNum = parseInt(month, 10);
                yNum = parseInt(year, 10) || new Date().getFullYear();
            }
            if (mNum >= 1 && mNum <= 12 && yNum > 2000) {
                conditions.push(`EXTRACT(MONTH FROM date) = $${paramIndex}`);
                params.push(mNum);
                paramIndex++;
                conditions.push(`EXTRACT(YEAR FROM date) = $${paramIndex}`);
                params.push(yNum);
                paramIndex++;
            }
        }

        if (type && (type === "income" || type === "expense")) {
            conditions.push(`type = $${paramIndex}`);
            params.push(type);
            paramIndex++;
        }

        if (category && category !== "all") {
            conditions.push(`LOWER(category) = LOWER($${paramIndex})`);
            params.push(category);
            paramIndex++;
        }

        if (paymentMethod && paymentMethod !== "all") {
            conditions.push(`LOWER(payment_method) = LOWER($${paramIndex})`);
            params.push(paymentMethod);
            paramIndex++;
        }

        if (startDate) {
            conditions.push(`date >= $${paramIndex}::date`);
            params.push(startDate);
            paramIndex++;
        }

        if (endDate) {
            conditions.push(`date <= $${paramIndex}::date`);
            params.push(endDate);
            paramIndex++;
        }

        if (search && search.trim()) {
            conditions.push(
                `(LOWER(description) LIKE $${paramIndex} OR LOWER(category) LIKE $${paramIndex} OR LOWER(COALESCE(notes, '')) LIKE $${paramIndex})`
            );
            params.push(`%${search.trim().toLowerCase()}%`);
            paramIndex++;
        }

        const whereClause = conditions.join(" AND ");

        // Validate sort column to prevent SQL injection
        const allowedSortColumns = {
            date: "date",
            amount: "amount",
            created_at: "created_at",
            category: "category",
        };
        const sortColumn = allowedSortColumns[sortBy] || "date";
        const orderDirection =
            sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

        // Count total matching rows
        const countRes = await pool.query(
            `SELECT COUNT(*) FROM transactions WHERE ${whereClause}`,
            params
        );
        const total = parseInt(countRes.rows[0].count, 10);

        // Pagination
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const offset = (pageNum - 1) * limitNum;

        const queryText = `
            SELECT id, user_id, type, amount, category, description, date, payment_method, notes, created_at, updated_at
            FROM transactions
            WHERE ${whereClause}
            ORDER BY ${sortColumn} ${orderDirection}, id ${orderDirection}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        params.push(limitNum, offset);

        const result = await pool.query(queryText, params);

        return res.json({
            success: true,
            transactions: result.rows.map((r) => ({
                ...r,
                amount: Number(r.amount),
            })),
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum) || 1,
            },
        });
    } catch (error) {
        console.error("getTransactions error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to retrieve transactions",
        });
    }
}

export async function getTransactionById(req, res) {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT id, user_id, type, amount, category, description, date, payment_method, notes, created_at, updated_at
             FROM transactions
             WHERE id = $1 AND user_id = $2`,
            [id, req.user.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Transaction not found",
            });
        }

        const row = result.rows[0];
        return res.json({
            success: true,
            transaction: {
                ...row,
                amount: Number(row.amount),
            },
        });
    } catch (error) {
        console.error("getTransactionById error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to load transaction",
        });
    }
}

export async function createTransaction(req, res) {
    try {
        const userId = req.user.id;
        const {
            type,
            amount,
            category,
            description,
            date,
            payment_method = "cash",
            notes = "",
        } = req.body;

        if (!type || (type !== "income" && type !== "expense")) {
            return res.status(400).json({
                success: false,
                message: "Transaction type must be 'income' or 'expense'",
            });
        }

        const numAmount = Number(amount);
        if (!numAmount || Number.isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Amount must be a positive number greater than 0",
            });
        }

        if (!category || !category.trim()) {
            return res.status(400).json({
                success: false,
                message: "Category is required",
            });
        }

        if (!description || !description.trim()) {
            return res.status(400).json({
                success: false,
                message: "Description is required",
            });
        }

        if (!date) {
            return res.status(400).json({
                success: false,
                message: "Date is required",
            });
        }

        const parsedDate = new Date(date);
        if (Number.isNaN(parsedDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Valid transaction date is required (YYYY-MM-DD)",
            });
        }

        const insertRes = await pool.query(
            `INSERT INTO transactions 
             (user_id, type, amount, category, description, date, payment_method, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, user_id, type, amount, category, description, date, payment_method, notes, created_at, updated_at`,
            [
                userId,
                type,
                numAmount,
                category.trim(),
                description.trim(),
                date,
                payment_method ? payment_method.trim() : "cash",
                notes ? notes.trim() : null,
            ]
        );

        const newTx = insertRes.rows[0];
        return res.status(201).json({
            success: true,
            message: "Transaction created successfully",
            transaction: {
                ...newTx,
                amount: Number(newTx.amount),
            },
        });
    } catch (error) {
        console.error("createTransaction error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to create transaction",
        });
    }
}

export async function updateTransaction(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const {
            type,
            amount,
            category,
            description,
            date,
            payment_method,
            notes,
        } = req.body;

        // Check if transaction exists and belongs to user
        const existing = await pool.query(
            "SELECT * FROM transactions WHERE id = $1 AND user_id = $2",
            [id, userId]
        );

        if (existing.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Transaction not found or unauthorized",
            });
        }

        const current = existing.rows[0];

        const updatedType = type !== undefined ? type : current.type;
        if (updatedType !== "income" && updatedType !== "expense") {
            return res.status(400).json({
                success: false,
                message: "Type must be 'income' or 'expense'",
            });
        }

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

        const updatedCategory =
            category !== undefined ? category.trim() : current.category;
        if (!updatedCategory) {
            return res.status(400).json({
                success: false,
                message: "Category cannot be empty",
            });
        }

        const updatedDesc =
            description !== undefined ? description.trim() : current.description;
        if (!updatedDesc) {
            return res.status(400).json({
                success: false,
                message: "Description cannot be empty",
            });
        }

        let updatedDate = current.date;
        if (date !== undefined) {
            const parsedDate = new Date(date);
            if (Number.isNaN(parsedDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid date format",
                });
            }
            updatedDate = date;
        }

        const updatedPaymentMethod =
            payment_method !== undefined
                ? payment_method
                : current.payment_method;
        const updatedNotes =
            notes !== undefined ? (notes ? notes.trim() : null) : current.notes;

        const updateRes = await pool.query(
            `UPDATE transactions
             SET type = $1, amount = $2, category = $3, description = $4, date = $5, payment_method = $6, notes = $7, updated_at = NOW()
             WHERE id = $8 AND user_id = $9
             RETURNING id, user_id, type, amount, category, description, date, payment_method, notes, created_at, updated_at`,
            [
                updatedType,
                updatedAmount,
                updatedCategory,
                updatedDesc,
                updatedDate,
                updatedPaymentMethod,
                updatedNotes,
                id,
                userId,
            ]
        );

        const row = updateRes.rows[0];
        return res.json({
            success: true,
            message: "Transaction updated successfully",
            transaction: {
                ...row,
                amount: Number(row.amount),
            },
        });
    } catch (error) {
        console.error("updateTransaction error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to update transaction",
        });
    }
}

export async function deleteTransaction(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const deleteRes = await pool.query(
            "DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id",
            [id, userId]
        );

        if (deleteRes.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Transaction not found or unauthorized",
            });
        }

        return res.json({
            success: true,
            message: "Transaction deleted successfully",
            id: deleteRes.rows[0].id,
        });
    } catch (error) {
        console.error("deleteTransaction error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to delete transaction",
        });
    }
}
