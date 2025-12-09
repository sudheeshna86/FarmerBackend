import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { 
  getUserProfile, 
  updateUserProfile, 
  addAddress, 
  updateAddress, 
  deleteAddress 
} from "../controllers/userController.js";

const router = express.Router();

// Profile Routes
router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, updateUserProfile);

// Address Routes
router.post("/address", protect, addAddress);
router.put("/address/:id", protect, updateAddress);
router.delete("/address/:id", protect, deleteAddress);

export default router;