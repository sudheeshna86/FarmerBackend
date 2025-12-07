import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    offer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Offer",
      required: true,
    },

    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FarmerListing",
      required: true,
    },

    finalPrice: {
      type: Number,
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
    },

    // Order lifecycle
   
     status: {
      type: String,
      enum: [
        "pending_payment",
        "paid",
        "awaiting_driver_accept",
        "driver_assigned",
        "in_transit",
        "otp_verified",
        "delivered",
        "completed",
      ],
      default: "pending_payment",
    },

    // Delivery address
    deliveryAddress: String,

    // Multiple invited drivers
    invitedDrivers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Driver who finally accepts
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // OTP & Delivery info
    deliveryOTP: { type: String },

    isDelivered: {
      type: Boolean,
      default: false,
    },

    deliveredAt: {
      type: Date,
    },

    // Store acceptance timestamp
    driverAcceptedAt: {
      type: Date,
    },

    // ⭐ NEW (optional, but useful for tracking)
    otpVerifiedAt: {
      type: Date,
    },

    // Payment details
    paymentInfo: {
      method: { type: String, enum: ["COD", "Online"], default: "Online" },
      transactionId: { type: String },
      paidAt: { type: Date },
    },

    amountPaid: {
      type: Number,
      default: 0,
    },
    deliveryFee: {
      type: Number,
      default: 0,
    },

    paymentDate: {
      type: Date,
    },

    donationTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NGO",
    },
    farmerEarning: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);
export default Order;
