// routes/farmerRoutes.js
import express from "express";
import multer from "multer";
import { protect } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import {
  addListing,
  getMyListings,
  deleteListing,
  updateListing,
  getFarmerStats,
  getRecentOrders
} from "../controllers/farmerController.js";

const router = express.Router();

/* ---------------------- MULTER CONFIGURATION ---------------------- */
// You can still store in "uploads" temporarily; Cloudinary will host final image
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // temp folder for images
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const upload = multer({ storage });

/* ---------------------- FARMER LISTING ROUTES ---------------------- */

// ✅ Add a new listing (with optional image upload)
router.post(
  "/add",
  protect,
  requireRole("farmer"),
  upload.single("image"),
  addListing
);

// ✅ Get all listings by logged-in farmer
router.get("/my-listings", protect, requireRole("farmer"), getMyListings);

// ✅ Update (Edit) a listing
router.put(
  "/update/:id",
  protect,
  requireRole("farmer"),
  upload.single("image"),
  updateListing
);

// ✅ Delete a listing
router.delete("/:id", protect, requireRole("farmer"), deleteListing);
router.get("/stats", protect, getFarmerStats);
router.get("/orders/recent", protect, getRecentOrders);

export default router;
