// routes/authRoutes.js
import express from 'express';
import axios from 'axios';
import { registerUser, loginUser } from '../controllers/authController.js';

const router = express.Router();

// POST /api/auth/signup
router.post('/signup', registerUser);
router.get('/hi',(req,res)=>{
    console.log("hi")
})
// POST /api/auth/login
// body should have { identifier: "email or phone", password: "123456" }
router.post('/login', loginUser);
router.get('/location', async (req, res) => {
    console.log("entered api")
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: "Missing latitude or longitude" });
  }

  const address = await getAddressFromLatLng(lat, lng);
  console.log(address);

  res.json({ address });
});

export const getAddressFromLatLng = async (lat, lng) => {
  try {
    const url =`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;

    const response = await axios.get(url, {
      headers: { "User-Agent": "Node.js Application" }
    });

    return response.data.display_name;
  } catch (error) {
    console.error("Reverse geocoding error:", error.message);
    return null;
  }
};

// ⭐ Top-level await

export default router;
