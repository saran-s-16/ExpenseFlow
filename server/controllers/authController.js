import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";

const JWT_SECRET = process.env.JWT_SECRET || "expenseflow_super_secret_jwt_key_2026_x98f2a";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// Standard default categories created for newly registered users
const DEFAULT_CATEGORIES = [
    { name: "Salary", type: "income" },
    { name: "Freelance", type: "income" },
    { name: "Investments", type: "income" },
    { name: "Other Income", type: "income" },
    { name: "Food", type: "expense" },
    { name: "Transport", type: "expense" },
    { name: "Shopping", type: "expense" },
    { name: "Bills", type: "expense" },
    { name: "Rent", type: "expense" },
    { name: "Entertainment", type: "expense" },
    { name: "Health", type: "expense" },
    { name: "Education", type: "expense" },
    { name: "Subscriptions", type: "expense" },
    { name: "Other", type: "expense" },
];

export async function register(req, res) {
    const client = await pool.connect();
    try {
        const { name, email, password, confirmPassword } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Full name is required",
            });
        }

        if (!email || !email.trim()) {
            return res.status(400).json({
                success: false,
                message: "Email address is required",
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address",
            });
        }

        if (!password || password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long",
            });
        }

        if (confirmPassword !== undefined && password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Passwords do not match",
            });
        }

        // Check for existing user
        const existing = await client.query(
            "SELECT id FROM users WHERE LOWER(email) = LOWER($1)",
            [normalizedEmail]
        );

        if (existing.rowCount > 0) {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists",
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        await client.query("BEGIN");

        const insertUserRes = await client.query(
            `INSERT INTO users (name, email, password_hash)
             VALUES ($1, $2, $3)
             RETURNING id, name, email, created_at`,
            [name.trim(), normalizedEmail, passwordHash]
        );

        const newUser = insertUserRes.rows[0];

        // Seed default categories for this user
        for (const cat of DEFAULT_CATEGORIES) {
            await client.query(
                `INSERT INTO categories (user_id, name, type)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (user_id, name, type) DO NOTHING`,
                [newUser.id, cat.name, cat.type]
            );
        }

        await client.query("COMMIT");

        const token = jwt.sign(
            { id: newUser.id, email: newUser.email, name: newUser.name },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        return res.status(201).json({
            success: true,
            message: "Account created successfully",
            token,
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
            },
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Register error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to complete registration. Please try again.",
        });
    } finally {
        client.release();
    }
}

export async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const userRes = await pool.query(
            "SELECT id, name, email, password_hash FROM users WHERE LOWER(email) = LOWER($1)",
            [normalizedEmail]
        );

        if (userRes.rowCount === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        const user = userRes.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, name: user.name },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        return res.json({
            success: true,
            message: "Logged in successfully",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
        });
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to log in. Please try again.",
        });
    }
}

export async function getMe(req, res) {
    try {
        const userRes = await pool.query(
            "SELECT id, name, email, created_at FROM users WHERE id = $1",
            [req.user.id]
        );

        if (userRes.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        return res.json({
            success: true,
            user: userRes.rows[0],
        });
    } catch (error) {
        console.error("getMe error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to retrieve user profile",
        });
    }
}

export async function updateProfile(req, res) {
    try {
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Name cannot be empty",
            });
        }

        const updateRes = await pool.query(
            `UPDATE users
             SET name = $1, updated_at = NOW()
             WHERE id = $2
             RETURNING id, name, email, updated_at`,
            [name.trim(), req.user.id]
        );

        return res.json({
            success: true,
            message: "Profile updated successfully",
            user: updateRes.rows[0],
        });
    } catch (error) {
        console.error("updateProfile error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to update profile",
        });
    }
}

export async function changePassword(req, res) {
    try {
        const { currentPassword, newPassword, confirmNewPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Current and new password are required",
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "New password must be at least 6 characters long",
            });
        }

        if (confirmNewPassword !== undefined && newPassword !== confirmNewPassword) {
            return res.status(400).json({
                success: false,
                message: "New passwords do not match",
            });
        }

        const userRes = await pool.query(
            "SELECT password_hash FROM users WHERE id = $1",
            [req.user.id]
        );

        if (userRes.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        const isMatch = await bcrypt.compare(
            currentPassword,
            userRes.rows[0].password_hash
        );

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Current password is incorrect",
            });
        }

        const newHash = await bcrypt.hash(newPassword, 10);

        await pool.query(
            "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
            [newHash, req.user.id]
        );

        return res.json({
            success: true,
            message: "Password changed successfully",
        });
    } catch (error) {
        console.error("changePassword error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to change password",
        });
    }
}

export async function logout(req, res) {
    return res.json({
        success: true,
        message: "Logged out successfully",
    });
}
