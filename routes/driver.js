import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

import {
  getAvailableDeliveries,
  getMyDeliveries,
  driverAcceptDelivery,
  driverDeclineDelivery,
  completeDelivery,
  // acceptDelivery
} from "../controllers/driverController.js";

const router = express.Router();

// 🟢 Driver sees available invited deliveries
router.get(
  "/available",
  protect,
  requireRole("driver"),
  getAvailableDeliveries
);

// 🟢 Driver sees deliveries that he already accepted
router.get(
  "/my-deliveries",
  protect,
  requireRole("driver"),
  getMyDeliveries
);

// 🟢 Driver accepts delivery
// 🔥 Final path: /driver/accept/:id (matches frontend)
router.patch(
  "/accept/:id",
  protect,
  requireRole("driver"),
  driverAcceptDelivery
);
// router.patch("/:id/accept", protect, requireRole("driver"), acceptDelivery);

// 🟡 Driver declines delivery
// 🔥 Final path: /driver/decline/:id (matches frontend)
router.patch(
  "/decline/:id",
  protect,
  requireRole("driver"),
  driverDeclineDelivery
);

router.patch(
  "/complete/:id",
  protect,
  requireRole("driver"),
  completeDelivery
);

export default router;
