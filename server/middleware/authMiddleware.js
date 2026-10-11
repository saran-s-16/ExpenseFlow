import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "expenseflow_super_secret_jwt_key_2026_x98f2a";

/**
 * Authentication Middleware
 * Validates JWT Bearer token and attaches decoded user to req.user.
 */
export function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Access denied. No authentication token provided.",
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Session expired. Please log in again.",
            });
        }
        return res.status(401).json({
            success: false,
            message: "Invalid authentication token.",
        });
    }
}
