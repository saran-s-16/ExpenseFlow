import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import {
    getSavingsGoals,
    createSavingsGoal,
    updateSavingsGoal,
    contributeToGoal,
    deleteSavingsGoal,
} from "../controllers/savingsGoalController.js";

const router = express.Router();

router.use(authenticate);

router.get("/", getSavingsGoals);
router.post("/", createSavingsGoal);
router.put("/:id", updateSavingsGoal);
router.post("/:id/contribute", contributeToGoal);
router.delete("/:id", deleteSavingsGoal);

export default router;
