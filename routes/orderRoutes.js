import express from "express";
import axios from "axios";
import User from "../models/User.js";
import { protect } from "../middleware/authMiddleware.js";
import {
  getAvailableDrivers,
  createOrderFromOffer,
  getOrderById,
  payForOrder,
  assignDriver,
  verifyDeliveryOTP,
  releasePayment,
  getMyOrders,
  getOrderReceipt,
  getMyFarmerOrders,
  cancelOrder
} from "../controllers/orderController.js";

const router = express.Router();

/* ----------------------------------------------
    Haversine DISTANCE
---------------------------------------------- */
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // KM
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/* ----------------------------------------------
    Free Nominatim Geocoder
---------------------------------------------- */
async function geocodeAddress(address) {
  try {
    console.log("entered geo")
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      address
    )}&format=json&limit=1`;

    const res = await axios.get(url, {
      headers: { "User-Agent": "AgriConnect/1.0" },
    });
    console.log(res.data[0].lat,res.data[0].lon);
    if (!res.data[0]) return null;

    return {
      lat: parseFloat(res.data[0].lat),
      lng: parseFloat(res.data[0].lon),
    };
  } catch (err) {
    console.log("Geocode Error:", err.message);
    return null;
  }
}

/* ----------------------------------------------
    Delivery Fee API
---------------------------------------------- */
router.get("/delivery-fee", protect, async (req, res) => {
  try {
    const { farmerId, buyerId } = req.query;

    console.log("🚚 Delivery Fee API hit:", farmerId, buyerId);

    if (!farmerId || !buyerId)
      return res.status(400).json({ error: "farmerId & buyerId required" });

    const farmer = await User.findById(farmerId);
    const buyer = await User.findById(buyerId);

    if (!farmer || !buyer)
      return res.status(404).json({ error: "Users not found" });
    
    if (!farmer.address || !buyer.address)
      return res.status(400).json({ error: "Users must have addresses" });
    
    // Get GPS coords
    const farmerGeo = await geocodeAddress(farmer.address);
    console.log(farmerGeo)
    const buyerGeo = await geocodeAddress(buyer.address);
    console.log(buyerGeo)
    if (!farmerGeo || !buyerGeo)
      return res.status(400).json({ error: "Failed to geocode address" });

    // Distance KM
    const distanceKm = getDistance(
      farmerGeo.lat,
      farmerGeo.lng,
      buyerGeo.lat,
      buyerGeo.lng
    );

    // Fee formula
    const baseFee = 10;
    const perKm = 4;
    const fee = baseFee + distanceKm * perKm;
res.json({
  distance: Number(distanceKm.toFixed(2)),
  deliveryFee: Number(fee.toFixed(2)),
});

  } catch (err) {
    console.log("Delivery Fee API Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ----------------------------------------------
 OTHER ROUTES
---------------------------------------------- */

router.post("/create/:id", protect, createOrderFromOffer);
router.get("/my-orders", protect, getMyOrders);
router.get("/my-farmer-orders", protect, getMyFarmerOrders);
router.get("/drivers", protect, getAvailableDrivers);

router.get("/:id", protect, getOrderById);
router.get("/:id/receipt", protect, getOrderReceipt);
router.put("/:id/cancel", protect, cancelOrder);
router.patch("/:id/pay", protect, payForOrder);

router.patch("/:id/assign-driver", protect, assignDriver);
router.patch("/:id/verify-otp", protect, verifyDeliveryOTP);
router.patch("/:id/release-payment", protect, releasePayment);

export default router;
