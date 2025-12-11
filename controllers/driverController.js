// controllers/driverController.js
import Order from "../models/Order.js";
import User from "../models/User.js";
import { sendOTP } from "../utils/sendOTP.js";
import FarmerListing from "../models/FarmerListing.js";

/* ======================================================
   GET /driver/available
   Show orders where:
   - driver was invited
   - no one has accepted yet
   - status = awaiting_driver_accept
=======================================================*/
// export const acceptDelivery = async (req, res) => {
//   try {
//     const driverId = req.user._id;
//     const order = await Order.findById(req.params.id);

//     if (!order) return res.status(404).json({ message: "Order not found" });

//     if (!order.invitedDrivers.includes(driverId)) {
//       return res.status(403).json({ message: "You are not invited for this order" });
//     }

//     if (order.driver) {
//       return res.status(400).json({ message: "Another driver already accepted" });
//     }

//     order.driver = driverId;
//     order.status = "driver_assigned";

//     // Generate OTP
//     const otp = Math.floor(1000 + Math.random() * 9000);
//     order.deliveryOTP = otp;
//     order.otpGeneratedAt = new Date();

//     await order.save();

//     // Optionally send OTP to buyer phone
//     // await sendOTP(order.buyer.phone, otp);

//     res.json({ message: "Order accepted successfully", order });
//   } catch (err) {
//     res.status(500).json({
//       message: "Failed to accept order",
//       error: err.message,
//     });
//   }
// };


/* ======================================================
   GET /driver/my-deliveries
   Show orders where:
   - driver = current driver
   - driver already accepted
=======================================================*/
export const getMyDeliveries = async (req, res) => {
  try {
    const driverId = req.user._id;

    const my = await Order.find({
      driver: driverId,
      status: { $in: ["driver_assigned", "in_transit", "otp_verified", "delivered"] },
    })
      // 👇 THIS WAS MISSING OR INCOMPLETE IN YOUR PREVIOUS CODE
      .populate("listing", "cropName location imageUrl")
      .populate("buyer", "name phone address") // ✅ Added address
      .populate("farmer", "name phone address") // ✅ Added address
      .sort({ updatedAt: -1 });

    res.json(my);
  } catch (err) {
    console.error("❌ getMyDeliveries:", err);
    res.status(500).json({ message: "Failed to load your deliveries" });
  }
};


/* ======================================================
   PATCH /driver/:id/driver-accept
   Driver accepts delivery ⇒ becomes official driver
=======================================================*/
export const driverAcceptDelivery = async (req, res) => {
  try {
    const driverId = req.user._id;

    // We need buyer phone to send the OTP
    let order = await Order.findById(req.params.id)
      .populate("buyer", "name phone")
      .populate("listing", "cropName location imageUrl")
      .populate("invitedDrivers", "name phone");

    if (!order) return res.status(404).json({ message: "Order not found" });

    // --- Validations ---
    const isInvited = order.invitedDrivers.some(
      (d) => (d._id ? d._id.toString() : d.toString()) === driverId.toString()
    );

    if (!isInvited) {
      return res.status(403).json({ message: "You are not invited for this order" });
    }

    if (order.driver && order.driver.toString() !== driverId.toString()) {
      return res.status(400).json({ message: "Another driver already accepted" });
    }

    if (order.status !== "awaiting_driver_accept") {
      return res.status(400).json({ message: "Order is not awaiting driver acceptance" });
    }

    // --- Update Order State ---
    order.driver = driverId;
    order.status = "driver_assigned";
    order.driverAcceptedAt = new Date();
    order.invitedDrivers = []; // Clear invites
    
    // REMOVED: Manual OTP generation logic (Math.random)
    // REMOVED: order.deliveryOTP = ...

    await order.save();

    // --- Send OTP via Twilio ---
    try {
      if (order.buyer && order.buyer.phone) {
        console.log("otp is being sent")
        await sendOTP(`+91${order.buyer.phone}`);
        console.log(`✅ OTP sent to buyer: ${order.buyer.phone}`);
      } else {
        console.warn("⚠️ Buyer has no phone number, OTP not sent.");
      }
    } catch (e) {
      console.error("❌ Twilio sendOTP failed:", e.message);
      // Optional: You might want to return an error here, but usually, 
      // we don't block the acceptance if SMS fails (driver can resend later).
    }

    const populated = await Order.findById(order._id)
      .populate("buyer", "name phone")
      .populate("listing", "cropName location imageUrl")
      .populate("driver", "name phone");

    res.status(200).json({
      message: "Delivery accepted! OTP sent to buyer.",
      order: populated,
    });

  } catch (error) {
    console.error("❌ driverAcceptDelivery error:", error.message);
    res.status(500).json({
      message: "Driver acceptance failed",
      error: error.message,
    });
  }
};

/* ======================================================
   PATCH /driver/:id/driver-decline
   Driver declines ⇒ removed from invitedDrivers list
=======================================================*/
export const driverDeclineDelivery = async (req, res) => {
  try {
    const driverId = req.user._id;

    let order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ message: "Order not found" });

    // Must be invited to decline
    if (!order.invitedDrivers.some(id => id.toString() === driverId.toString()))
      return res.status(403).json({
        message: "You were not invited for this order",
      });

    // Remove only this driver from invited list
    order.invitedDrivers = order.invitedDrivers.filter(
      (id) => id.toString() !== driverId.toString()
    );

    await order.save();

    res.status(200).json({
      message: "You declined the delivery",
      orderId: order._id,
      remainingInvites: order.invitedDrivers.length,
    });
  } catch (error) {
    console.error("❌ driverDeclineDelivery error:", error.message);
    res.status(500).json({
      message: "Decline failed",
      error: error.message,
    });
  }
};

export const getAvailableDeliveries = async (req, res) => {
  try {
    console.log("helllo")
    const driverId = req.user._id || req.user._id;

    const available = await Order.find({
      status: "awaiting_driver_accept",
      invitedDrivers: { $in: [driverId] },
      driver: null,
    })
      .populate({
        path: "listing",
        select: "cropName imageUrl location"
      })
      .populate({
        path: "buyer",
        select: "name phone address"
      })
      .populate({
        path: "farmer",
        select: "name phone address"
      })
      .sort({ createdAt: -1 });

    res.json(available);

  } catch (err) {
    console.log(err.message)
    res.status(500).json({ message: "Failed to load", error: err.message });
  }
};

// NEW: Complete delivery after OTP verified
// controllers/driverController.js

export const completeDelivery = async (req, res) => {
  try {
    const orderId = req.params.id;
    const driverId = req.user._id;

    const order = await Order.findById(orderId)
      .populate("listing")
      .populate("farmer")
      .populate("buyer");

    if (!order) return res.status(404).json({ message: "Order not found" });

    if (!order.driver || order.driver.toString() !== driverId.toString())
      return res.status(403).json({ message: "Not your delivery" });

    // DELIVERY CAN ONLY COMPLETE AFTER OTP VERIFIED
    if (order.status !== "otp_verified") {
      return res.status(400).json({ message: "OTP not verified yet" });
    }

    // STEP 1️⃣ — MARK DELIVERY COMPLETE
    order.status = "delivered";
    order.isDelivered = true;
    order.deliveredAt = new Date();

    // STEP 2️⃣ — CALCULATE EARNING
    const earning = (order.quantity || 0) * (order.finalPrice || 0);
    order.farmerEarning = earning;

    // STEP 3️⃣ — CREDIT FARMER WALLET
    await User.findByIdAndUpdate(order.farmer._id, {
      $inc: { walletBalance: earning },
      $push: {
        transactions: {
          type: "credit",
          amount: earning,
          description: `Earning for delivering ${order.quantity} kg of ${order.listing.cropName}`,
          date: new Date(),
        },
      },
    });
const driverEarning = order.deliveryFee || 0;

    if (driverEarning > 0) {
      await User.findByIdAndUpdate(driverId, {
        $inc: { walletBalance: driverEarning }, // Increment driver balance
        $push: {
          transactions: {
            type: "credit",
            amount: driverEarning,
            description: `Delivery fee for Order #${String(order._id).slice(-6).toUpperCase()}`,
            date: new Date(),
          },
        },
      });
    }
    // STEP 4️⃣ — REDUCE FARMER LISTING QUANTITY
    if (order.listing) {
      const listing = await FarmerListing.findById(order.listing._id);
      if (listing) {
        listing.quantity = Math.max(
          listing.quantity - order.quantity,
          0
        );
        await listing.save();
      }
    }

    // STEP 5️⃣ — ORDER COMPLETED
    order.status = "completed";

    await order.save();

    res.json({
      message: "Delivery completed & payment released successfully!",
      order,
    });
  } catch (err) {
    console.error("❌ completeDelivery error:", err.message);
    res.status(500).json({
      message: "Failed to complete delivery",
      error: err.message,
    });
  }
};
export const getDriverEarnings = async (req, res) => {
  try {
    const driverId = req.user._id;

    // 1. Fetch only completed/delivered orders for this driver
    const orders = await Order.find({
      driver: driverId, 
      status: { $in: ["delivered", "completed"] }
    })
    .populate("buyer", "name address")   // Get Drop Location
    .populate("farmer", "name address")  // Get Pickup Location
    .sort({ updatedAt: -1 });            // Newest first

    // 2. Format data & Include Earning
    const formattedOrders = orders.map(order => ({
      id: order._id,
      pickupLocation: order.farmer ? order.farmer.address : "Unknown Pickup",
      dropLocation: order.deliveryAddress || (order.buyer ? order.buyer.address : "Unknown Drop"),
      date: order.updatedAt,
      // 💰 Driver earns the Delivery Fee
      earning: order.deliveryFee || 0 
    }));

    // 3. Calculate Total Earnings
    const totalEarnings = formattedOrders.reduce((sum, order) => sum + order.earning, 0);

    res.json({
      orders: formattedOrders,
      totalEarnings
    });

  } catch (error) {
    console.error("Error fetching driver earnings:", error);
    res.status(500).json({ message: "Error fetching earnings" });
  }
};