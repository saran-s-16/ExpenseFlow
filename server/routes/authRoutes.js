import express from "express";
import {
    register,
    login,
    getMe,
    updateProfile,
    changePassword,
    logout,
} from "../controllers/authController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);

// Informational handlers for GET requests to auth action endpoints
router.get("/login", (req, res) => {
    res.status(405).json({
        success: false,
        message: "Method Not Allowed. Login endpoint expects HTTP POST with JSON body: { email, password }",
    });
});

router.get("/register", (req, res) => {
    res.status(405).json({
        success: false,
        message: "Method Not Allowed. Register endpoint expects HTTP POST with JSON body: { name, email, password }",
    });
});

// Protected routes
router.get("/me", verifyToken, getMe);
router.put("/profile", verifyToken, updateProfile);
router.put("/change-password", verifyToken, changePassword);

export default router;
