import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { 
  getUserProfile, 
  updateUserProfile, 
  addAddress, 
  updateAddress, 
  deleteAddress, 
  setPrimaryAddress
} from "../controllers/userController.js";

const router = express.Router();

// Profile Routes
router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, updateUserProfile);

// Address Routes
router.post("/address", protect, addAddress);
router.put("/address/:id", protect, updateAddress);
router.put("/address/:id/select", protect, setPrimaryAddress);
router.delete("/address/:id", protect, deleteAddress);

export default router;