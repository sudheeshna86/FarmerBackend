// routes/offerRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import {
  getFarmerOffers,
  acceptOffer,
  rejectOffer,
  counterOffer,
  getMyOffers,
  acceptCounterByBuyer,
  rejectCounterByBuyer,buyerCounterOffer,
  deleteOffer
} from "../controllers/offerController.js";

const router = express.Router();

// ✅ Put buyer routes FIRST
router.patch("/buyer/counter", protect, requireRole("buyer"), buyerCounterOffer);
router.get("/my", protect, requireRole("buyer"), getMyOffers);
router.patch("/:id/buyer-accept", protect, requireRole("buyer"), acceptCounterByBuyer);
router.patch("/:id/buyer-reject", protect, requireRole("buyer"), rejectCounterByBuyer);
router.delete("/:id", protect, requireRole("buyer"), deleteOffer);

// 🧩 Then farmer routes (with :id)
router.get("/farmer", protect, requireRole("farmer"), getFarmerOffers);
router.patch("/:id/accept", protect, requireRole("farmer"), acceptOffer);
router.patch("/:id/reject", protect, requireRole("farmer"), rejectOffer);
router.patch("/:id/counter", protect, requireRole("farmer"), counterOffer);


export default router;
