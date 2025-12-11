import express from 'express';
import { getAllListings, getListingById, makeOffer,getBuyerDashboard } from '../controllers/buyerController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';


const router = express.Router();

// 🛒 Anyone can view listings, but only buyers can make offers
router.get('/listings', getAllListings);
router.get('/listings/:id', getListingById);
router.post('/offers', protect, requireRole('buyer'), makeOffer);
router.get("/dashboard", protect, getBuyerDashboard);


export default router;
