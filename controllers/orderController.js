// controllers/orderController.js
import Offer from "../models/offerModel.js";
import Order from "../models/Order.js";
import mongoose from "mongoose";
import { verifyOTP } from "../utils/sendOTP.js";   // required
import User from "../models/User.js";
import FarmerListing from "../models/FarmerListing.js";
/* ----------------------------------------------------
   BUYER: Get My Orders
-----------------------------------------------------*/
export const cancelOrder = async (req, res) => {
  try {
    const { reason } = req.body; // Get reason from frontend
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ message: "Order not found" });

    // 1. Validation: Can only cancel if pending_payment
    if (order.status !== "pending_payment") {
      return res.status(400).json({ message: "Cannot cancel a paid or processed order." });
    }

    // 2. RESTORE STOCK to the listing
    const listing = await FarmerListing.findById(order.listing);
    if (listing) {
      listing.quantity += order.quantity; // Add quantity back
      await listing.save();
    }

    // 3. Update Order
    order.status = "cancelled";
    order.cancellationReason = reason || "No reason provided";
    await order.save();

    res.status(200).json({ message: "Order cancelled successfully", order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to cancel order", error: error.message });
  }
};
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ buyer: req.user._id })
      .populate({
        path: "listing",
        populate: { path: "farmer", model: "User", select: "name phone address" },
      })
      .populate("farmer", "name phone address")
      .populate("buyer", "name phone address")  // ⭐ Added buyer details
      .populate("offer")
      .populate("driver", "name phone")
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch buyer orders",
      error: err.message,
    });
  }
};


/* ----------------------------------------------------
   FARMER: Get My Orders
-----------------------------------------------------*/
export const getMyFarmerOrders = async (req, res) => {
  try {
    const orders = await Order.find({ farmer: req.user._id })
      .populate({
        path: "listing",
        populate: { path: "farmer", model: "User", select: "name phone address" }
      })
      .populate("buyer", "name phone address")
      .populate("farmer", "name phone address")   // ⭐ Added farmer populate
      .populate("offer")
      .populate("driver", "name phone")
      .populate("invitedDrivers", "name phone")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch farmer orders",
      error: err.message,
    });
  }
};

/* ----------------------------------------------------
   🧾 Get order receipt
-----------------------------------------------------*/


export const getOrderReceipt = async (req, res) => {
  try {
    console.log("hii receipt")
    const order = await Order.findById(req.params.id)
      .populate("buyer", "_id name phone address")
      .populate("farmer", "_id name phone address")
      .populate("listing", "cropName pricePerKg location");

    if (!order)
      return res.status(404).json({ message: "Order not found" });

    if (order.status !== "paid" && order.status !== "completed" && order.status !== "pending_payment"&& order.status !== "delivered" && order.status !== "awaiting_driver_accept") {
      return res.status(400).json({ message: "Receipt not available yet" });
    }

    const receipt = {
      orderId: order._id,
      paidAt: order.paymentInfo?.paidAt,
      transactionId: order.paymentInfo?.transactionId,
      paymentMethod: order.paymentInfo?.method || "Online",

      // PRODUCT
      crop: order.listing.cropName,
      quantity: order.quantity,
      pricePerKg: order.finalPrice,

      // FLATTENED FARMER
      farmerId: order.farmer._id,
      farmerName: order.farmer.name,
      farmerPhone: order.farmer.phone,
      farmerAddress: order.farmer.address,

      // FLATTENED BUYER
      buyerId: order.buyer._id,
      buyerName: order.buyer.name,
      buyerPhone: order.buyer.phone,
      buyerAddress: order.buyer.address,
    };

    res.json(receipt);
  } catch (err) {
    console.error("getOrderReceipt Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


/* ----------------------------------------------------
   Create Order (Offer Accepted)
-----------------------------------------------------*/
export const createOrderFromOffer = async (req, res) => {
  try {
    const offerId = req.params.id;

    const offer = await Offer.findById(offerId)
      .populate("buyer")
      .populate({
        path: "listing",
        populate: { path: "farmer", model: "User" },
      });

    if (!offer) return res.status(404).json({ message: "Offer not found" });
    if (offer.status !== "accepted")
      return res.status(400).json({ message: "Offer not accepted yet" });

    const exists = await Order.findOne({ offer: offerId });
    if (exists)
      return res.status(400).json({ message: "Order already exists" });

    const order = new Order({
      offer: offer._id,
      farmer: offer.listing.farmer._id,
      buyer: offer.buyer._id,
      listing: offer.listing._id,
      finalPrice: offer.offeredPrice,
      quantity: offer.quantity,
      status: "pending_payment",
    });

    await order.save();

    res.status(201).json({ message: "Order created", order });
  } catch (err) {
    res.status(500).json({
      message: "Error creating order",
      error: err.message,
    });
  }
};

/* ----------------------------------------------------
   Get Order by ID
-----------------------------------------------------*/
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "farmer buyer listing offer driver invitedDrivers",
      "name phone"
    );

    if (!order) return res.status(404).json({ message: "Order not found" });

    res.status(200).json(order);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching order", error: err.message });
  }
};

/* ----------------------------------------------------
   Buyer Payment
-----------------------------------------------------*/
export const payForOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.buyer.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not your order" });

    if (order.status !== "pending_payment")
      return res.status(400).json({
        message: "Order is not in pending payment stage",
      });

    order.paymentInfo = {
      method: req.body.method || "Online",
      transactionId: `TXN-${Date.now()}`,
      paidAt: new Date(),
    };

    order.status = "paid";
    order.amountPaid = order.finalPrice;
    await order.save();

    res.json({ message: "Payment success", order });
  } catch (error) {
    res.status(500).json({
      message: "Payment failed",
      error: error.message,
    });
  }
};

/* ----------------------------------------------------
   Farmer: Get All Drivers
-----------------------------------------------------*/
export const assignDriver = async (req, res) => {
  try {
    const { driverIds } = req.body; // ARRAY of IDs

    if (!Array.isArray(driverIds) || driverIds.length === 0) {
      return res.status(400).json({ message: "Driver list is empty" });
    }

    const order = await Order.findById(req.params.id);
  //  console.log("hehe",order)
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.farmer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not your order" });
    }

    if (order.status !== "paid") {
      return res.status(400).json({
        message: "Order not ready — buyer has not paid yet",
      });
    }

    // Save invited drivers
    order.invitedDrivers = driverIds;
    order.status = "awaiting_driver_accept";
    order.driver = null; // none selected yet
    
    await order.save();
   console.log("Saved invitedDrivers:", order.invitedDrivers);  
    res.json({
      message: "Drivers invited! Waiting for someone to accept.",
      order,
    });

  } catch (err) {
    res.status(500).json({
      message: "Assign driver failed",
      error: err.message,
    });
  }
};
/* ----------------------------------------------------
   MULTI DRIVER INVITATION
-----------------------------------------------------*/
export const getAvailableDrivers = async (req, res) => {
  try {
    // Get all users whose role = driver
    const drivers = await User.find({ role: "driver" })
      .select("name phone address email");

    res.json(drivers);

  } catch (err) {
    res.status(500).json({
      message: "Failed to load drivers",
      error: err.message,
    });
  }
};


/* ----------------------------------------------------
   Verify Delivery OTP
-----------------------------------------------------*/
export const verifyDeliveryOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    
    // IMPORTANT: We must populate 'buyer' to access the phone number for Twilio verification
    const order = await Order.findById(req.params.id).populate("buyer", "phone");

    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.status !== "driver_assigned") {
      return res.status(400).json({ message: "Order not in delivery stage" });
    }

    // --- Verify via Twilio ---
    if (!order.buyer || !order.buyer.phone) {
      return res.status(400).json({ message: "Buyer phone number missing" });
    }

    try {
      console.log(order.buyer.phone);
      console.log(otp)
      const verificationCheck = await verifyOTP(`+91${order.buyer.phone}`, otp);

      // Check if Twilio approved it
      if (verificationCheck.status !== "approved") {
        return res.status(400).json({ message: "Invalid OTP or Expired" });
      }
    } catch (err) {
      console.error("Twilio Verify Error:", err.message);
      return res.status(400).json({ message: "Invalid OTP", error: err.message });
    }

    // --- Success: Update Order ---
    order.isDelivered = true;
    order.deliveredAt = new Date();
    order.status = "delivered";
    
    // REMOVED: order.deliveryOTP = null (field no longer exists)

    await order.save();

    res.json({ message: "Delivery confirmed", order });

  } catch (error) {
    console.error("❌ verifyDeliveryOTP Error:", error);
    res.status(500).json({
      message: "Failed to verify OTP",
      error: error.message,
    });
  }
};

/* ----------------------------------------------------
   Release Payment
-----------------------------------------------------*/
export const releasePayment = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("farmer")
      .populate("buyer");

    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.status !== "delivered")
      return res.status(400).json({
        message: "Order not delivered yet",
      });

    const farmer = order.farmer;
    farmer.walletBalance += order.amountPaid;

    farmer.transactions.push({
      type: "credit",
      amount: order.amountPaid,
      description: `Payment released for order ${order._id}`,
    });

    await farmer.save();
    
    order.status = "completed";
    await order.save();

    res.json({ message: "Payment released", order });
  } catch (error) {
    res.status(500).json({
      message: "Failed to release payment",
      error: error.message,
    });
  }
};
