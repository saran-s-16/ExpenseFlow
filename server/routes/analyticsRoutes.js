import express from "express";
import { getAnalytics, exportCsv } from "../controllers/analyticsController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(verifyToken);
router.get("/", getAnalytics);
router.get("/export", exportCsv);

export default router;
