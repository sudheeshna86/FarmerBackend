import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    // Link to the main Order
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    // Link to the Buyer
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Razorpay Details (The most important part)
    razorpayOrderId: { type: String, required: true },
    razorpayPaymentId: { type: String, required: true },
    razorpaySignature: { type: String, required: true },
    
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    status: { type: String, enum: ["success", "failed"], default: "success" },
    
    // Optional: Capture extra Razorpay info if needed
    paymentMethod: { type: String }, // card, netbanking, upi
  },
  { timestamps: true }
);

const Transaction = mongoose.model("Transaction", transactionSchema);
export default Transaction;