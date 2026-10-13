import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import {
    getRecurringPayments,
    createRecurringPayment,
    updateRecurringPayment,
    deleteRecurringPayment,
} from "../controllers/recurringPaymentController.js";

const router = express.Router();

router.use(authenticate);

router.get("/", getRecurringPayments);
router.post("/", createRecurringPayment);
router.put("/:id", updateRecurringPayment);
router.delete("/:id", deleteRecurringPayment);

export default router;
