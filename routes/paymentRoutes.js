import express from "express";
import { createRazorpayOrder, verifyRazorpayPayment } from "../controllers/paymentController.js";
import { protect } from "../middleware/authMiddleware.js";  // if you want only logged-in users

const router = express.Router();


// 1️⃣ Create Razorpay Order (user clicks "Pay Now")
router.post("/create-order", protect, createRazorpayOrder);

// 2️⃣ Verify Razorpay Payment (called after popup success)
router.post("/verify", protect, verifyRazorpayPayment);

export default router;
