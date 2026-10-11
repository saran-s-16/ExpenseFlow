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

// Protected routes
router.get("/me", verifyToken, getMe);
router.put("/profile", verifyToken, updateProfile);
router.put("/change-password", verifyToken, changePassword);

export default router;
