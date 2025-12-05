// controllers/offerController.js
import Offer from "../models/offerModel.js";
import FarmerListing from "../models/FarmerListing.js";
import Order from "../models/Order.js";
/* -------------------------------------------------------------------------- */
/*                          FARMER-SIDE CONTROLLERS                           */
/* -------------------------------------------------------------------------- */

// ✅ Get all offers received for this farmer’s listings
export const getFarmerOffers = async (req, res) => {
  try {
    // find all listings owned by logged-in farmer
    const listings = await FarmerListing.find({ farmer: req.user._id }).select("_id");
    if (!listings.length) return res.status(200).json([]);

    const listingIds = listings.map((l) => l._id);

    // find all offers linked to those listings
    const offers = await Offer.find({ listing: { $in: listingIds } })
      .populate("buyer", "name phone email")
      .populate({
        path: "listing",
        select: "cropName category imageUrl pricePerKg location farmer",
        populate: { path: "farmer", select: "name phone" },
      })
      .sort({ createdAt: -1 });

    res.status(200).json(offers);
  } catch (error) {
    console.error("❌ Error fetching farmer offers:", error.message);
    res.status(500).json({ message: "Failed to fetch offers", error: error.message });
  }
};

export const acceptOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id)
      .populate("buyer")
      .populate({
        path: "listing",
        populate: { path: "farmer", model: "User" },
      });

    if (!offer) return res.status(404).json({ message: "Offer not found" });
    if (offer.listing.farmer._id.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Unauthorized" });

    // ✅ Mark offer as accepted
    offer.status = "accepted";
    await offer.save();

    // ✅ Check if order already exists
    let order = await Order.findOne({ offer: offer._id });
    if (!order) {
      order = new Order({
        offer: offer._id,
        listing: offer.listing._id,
        farmer: offer.listing.farmer._id,
        buyer: offer.buyer._id,
        finalPrice: offer.offeredPrice,
        quantity: offer.quantity,
        status: "pending_payment",
      });
      await order.save();
    }

    res.status(200).json({
      message: "✅ Offer accepted — Order created (Payment Pending)",
      offer,
      order,
    });
  } catch (error) {
    console.error("❌ acceptOffer error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Farmer rejects an offer
export const rejectOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).populate("listing");
    if (!offer) return res.status(404).json({ message: "Offer not found" });
    if (offer.listing.farmer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to reject this offer" });
    }

    offer.status = "rejected";
    await offer.save();

    res.status(200).json({ message: "Offer rejected successfully", offer });
  } catch (error) {
    res.status(500).json({ message: "Failed to reject offer", error: error.message });
  }
};

// ✅ Farmer sends a counter offer
export const counterOffer = async (req, res) => {
  try {
    const { counterOfferPrice, notes } = req.body;
    const offer = await Offer.findById(req.params.id).populate("listing");
    if (!offer) return res.status(404).json({ message: "Offer not found" });

    // Authorization check
    if (offer.listing.farmer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to counter this offer" });
    }

    offer.status = "countered";
    offer.counterOfferPrice = counterOfferPrice;
    offer.notes = notes || "";
    offer.lastActionBy = "farmer"; // 👈 Add this line

    await offer.save();

    res.status(200).json({
      message: "Counter offer sent successfully by farmer",
      offer,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to send counter offer",
      error: error.message,
    });
  }
};


/* -------------------------------------------------------------------------- */
/*                           BUYER-SIDE CONTROLLERS                           */
/* -------------------------------------------------------------------------- */

// ✅ Get all offers made by the logged-in buyer
export const getMyOffers = async (req, res) => {
  try {
    const offers = await Offer.find({ buyer: req.user._id, status: { $ne: "accepted" } })
      .populate({
        path: "listing",
        select: "cropName category imageUrl pricePerKg location farmer",
        populate: {
          path: "farmer",
          model: "User",
          select: "name phone email",
        },
      })
      .populate("buyer", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(offers);
  } catch (error) {
    console.error("❌ Error fetching buyer offers:", error.message);
    res.status(500).json({ message: "Error fetching offers", error: error.message });
  }
};

// ✅ Get all accepted offers (Orders) for this buyer
// export const getMyOrders = async (req, res) => {
//   try {
//     const orders = await Offer.find({
//       buyer: req.user._id,
//       status: "accepted",
//     })
//       .populate({
//         path: "listing",
//         select: "cropName category imageUrl pricePerKg location farmer",
//         populate: { path: "farmer", select: "name phone" },
//       })
//       .sort({ createdAt: -1 });

//     res.status(200).json(orders);
//   } catch (error) {
//     console.error("❌ Error fetching buyer orders:", error.message);
//     res.status(500).json({ message: "Error fetching orders", error: error.message });
//   }
// };
// ✅ Delete (remove) an offer by buyer
export const deleteOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ message: "Offer not found" });

    if (offer.buyer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this offer" });
    }

    await offer.deleteOne();
    res.status(200).json({ message: "Offer removed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete offer", error: error.message });
  }
};


// ✅ Buyer accepts a farmer's counter offer
export const acceptCounterByBuyer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id)
      .populate("buyer")
      .populate({
        path: "listing",
        populate: { path: "farmer", model: "User" },
      });

    if (!offer) return res.status(404).json({ message: "Offer not found" });
    if (offer.buyer._id.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Unauthorized" });

    // ✅ Finalize offer
    offer.status = "accepted";
    offer.offeredPrice = offer.counterOfferPrice || offer.offeredPrice;
    offer.counterOfferPrice = null;
    await offer.save();

    // ✅ Create order if missing
    let order = await Order.findOne({ offer: offer._id });
    if (!order) {
      order = new Order({
        offer: offer._id,
        listing: offer.listing._id,
        farmer: offer.listing.farmer._id,
        buyer: offer.buyer._id,
        finalPrice: offer.offeredPrice,
        quantity: offer.quantity,
        status: "pending_payment",
      });
      await order.save();
    }

    res.status(200).json({
      message: "✅ Buyer accepted counter — Order created (Payment Pending)",
      offer,
      order,
    });
  } catch (error) {
    console.error("❌ acceptCounterByBuyer error:", error);
    res.status(500).json({ message: "Error accepting counter", error: error.message });
  }
};


// ✅ Buyer rejects a farmer's counter offer
export const rejectCounterByBuyer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ message: "Offer not found" });
    if (offer.buyer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only reject your own offers" });
    }
    if (offer.status !== "countered") {
      return res.status(400).json({ message: "No counter offer to reject" });
    }

    offer.status = "rejected";
    await offer.save();

    res.status(200).json({ message: "Counter offer rejected by buyer", offer });
  } catch (error) {
    res.status(500).json({ message: "Failed to reject counter offer", error: error.message });
  }
};
// ✅ Buyer sends a counter offer to the farmer
// ✅ Buyer sends a counter offer (even if first time)
export const buyerCounterOffer = async (req, res) => {
  try {
    const { listingId, counterOfferPrice, quantity } = req.body;

    if (!listingId || !counterOfferPrice) {
      return res.status(400).json({ message: "Listing ID and counter offer price are required" });
    }

    // ✅ Find existing offer (if any)
    let offer = await Offer.findOne({
      buyer: req.user._id,
      listing: listingId,
    });

    // 🆕 Create new if not found
    if (!offer) {
      offer = new Offer({
        listing: listingId,
        buyer: req.user._id,
        quantity: quantity || 1,
        offeredPrice: counterOfferPrice,
        counterOfferPrice,
        status: "countered",
        lastActionBy: "buyer",
      });
      await offer.save();
      return res.status(201).json({
        message: "New counter offer created successfully",
        offer,
      });
    }

    // ♻️ Update existing offer
    offer.counterOfferPrice = counterOfferPrice;
    offer.status = "countered";
    offer.lastActionBy = "buyer";
    await offer.save();

    res.status(200).json({
      message: "Counter offer updated successfully by buyer",
      offer,
    });
  } catch (error) {
    console.error("❌ Error in buyerCounterOffer:", error.message);
    res.status(500).json({
      message: "Failed to send buyer counter offer",
      error: error.message,
    });
  }
};

