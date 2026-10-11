import express from "express";
import { getDashboard } from "../controllers/dashboardController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(verifyToken);
router.get("/", getDashboard);

export default router;
