import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
// import { addListing } from '../controllers/listingController.js';

const router = express.Router();

// router.post('/add', protect, addListing);
router.get('/check', protect, (req, res) => {
  res.json({
    message: 'Token verified successfully ✅',
    user: req.user, // you’ll see your user details here (except password)
  });
});

export default router;
