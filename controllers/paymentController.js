import Razorpay from "razorpay";
import crypto from "crypto";
import Order from "../models/Order.js";
import Transaction from "../models/Transaction.js";

// Initialize Razorpay with your keys
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_RodVKn7e19YNr8",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "C7nJuPKa0eAQUdAPp4z3n1C2"
});

// ==========================================
// 1. CREATE ORDER API (Step 1)
// ==========================================
// ==========================================
// 1. CREATE ORDER API (Updated)
// ==========================================
export const createRazorpayOrder = async (req, res) => {
  try {
    console.log("entered razorpayment create");
    
    // 👇 Get 'amount' and 'deliveryFee' from frontend
    const { orderId, amount, deliveryFee } = req.body; 

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Security Check: Only allow if pending
    if (order.status !== "pending_payment") {
      return res.status(400).json({ message: "Order is already paid or processed" });
    }

    // 👇 1. UPDATE THE ORDER DATABASE FIRST
    // We update the finalPrice to match the frontend calculation
    order.finalPrice = amount; 
    order.amountPaid=amount;
    order.farmer.walletBalance+=amount;
    
    // If your schema has a field for delivery fee, save it too:
    order.deliveryFee = deliveryFee; 
    
    await order.save(); // <--- Save the new price to DB

    // 👇 2. CREATE RAZORPAY ORDER
    const options = {
      amount: Math.round(order.finalPrice * 100), // Convert ₹ to paise
      currency: "INR",
      receipt: `receipt_${orderId}`,
    };

    const razorpayOrder = await razorpay.orders.create(options);

    res.json({
      success: true,
      id: razorpayOrder.id, 
      amount: razorpayOrder.amount,
      key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_RodVKn7e19YNr8"
    });

  } catch (error) {
    console.error("Create Order Error:", error);
    res.status(500).json({ message: "Failed to create Razorpay order", error });
  }
};

// ==========================================
// 2. VERIFY PAYMENT API (Step 2 - The Critical One)
// ==========================================
export const verifyRazorpayPayment = async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature, 
      orderId 
    } = req.body;

    // A. CRYPTOGRAPHIC VERIFICATION
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "C7nJuPKa0eAQUdAPp4z3n1C2")
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      // 🚨 HACKER ALERT: Signature didn't match
      return res.status(400).json({ success: false, message: "Invalid Signature" });
    }

    // B. FETCH ORDER
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // C. CREATE TRANSACTION RECORD
    const transaction = await Transaction.create({
      order: order._id,
      buyer: order.buyer,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      amount: order.finalPrice,
      status: "success"
    });

    // D. UPDATE ORDER STATUS (Only now do we touch the Order DB)
    order.paymentInfo = {
      method: "Online",
      transactionId: transaction._id, // Link to the Transaction model
      paidAt: new Date()
    };
    order.status = "paid";
    order.amountPaid = order.finalPrice;
    
    // E. UPDATE FARMER EARNING (If needed)
    // order.farmerEarning += ... (Your logic here)

    await order.save();

    res.json({ success: true, message: "Payment Verified & Order Updated" });

  } catch (error) {
    console.error("Verification Error", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
};