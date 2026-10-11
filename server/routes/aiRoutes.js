import express from "express";
import {
    chatWithAi,
    getUsage,
    getHistory,
    clearHistory,
} from "../controllers/aiController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// All AI endpoints require a verified authenticated session
router.use(verifyToken);

router.post("/chat", chatWithAi);
router.get("/usage", getUsage);
router.get("/history", getHistory);
router.delete("/history", clearHistory);

export default router;
