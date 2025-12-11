import Listing from '../models/FarmerListing.js';
import Offer from '../models/offerModel.js';
import Order from '../models/Order.js';

// ✅ Get all active listings
export const getAllListings = async (req, res) => {
  try {
    const listings = await Listing.find().populate('farmer', 'name phone');
    res.status(200).json(listings);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch listings', error: error.message });
  }
};

// ✅ Get one listing by ID
export const getListingById = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).populate('farmer', 'name phone');
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    res.status(200).json(listing);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching listing', error: error.message });
  }
};

// ✅ Make an offer
// ✅ Make an offer (or buyer counter)
export const makeOffer = async (req, res) => {
  try {
    const { listingId, quantity, offeredPrice, isCounter } = req.body;

    // Validate listing
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // Create new offer
    const newOffer = await Offer.create({
      listing: listingId,
      buyer: req.user._id,
      quantity,
      offeredPrice,
      status: isCounter ? "countered" : "pending", // key difference here
    });
    console.log(newOffer)
    res.status(201).json({
      message: isCounter
        ? "Counter Offer created successfully"
        : "Offer created successfully",
      offer: newOffer,
    });
  } catch (error) {
    console.error("❌ Error creating offer:", error);
    res.status(500).json({
      message: "Failed to create offer",
      error: error.message,
    });
  }
};

// ✅ Get all offers made by the logged-in buyer
// export const getMyOffers = async (req, res) => {
//   try {
//     const offers = await Offer.find({ buyer: req.user._id })
//       .populate({
//         path: "listing",
//         select: "cropName category imageUrl pricePerKg location farmer",
//         populate: {
//           path: "farmer",
//           model: "User", // ✅ Ensure mongoose knows the reference
//           select: "name phone email", // Include farmer name & phone
//         },
//       })
//       .populate("buyer", "name email");

//     res.status(200).json(offers);
//   } catch (error) {
//     console.error("❌ Error fetching buyer offers:", error.message);
//     res.status(500).json({ message: "Error fetching offers", error: error.message });
//   }
// };

export const getBuyerDashboard = async (req, res) => {
  try {
    const buyerId = req.user._id;

    // 1. Fetch ALL orders for this buyer
    // Sorted by newest first so we can easily grab the recent ones
    const allOrders = await Order.find({ buyer: buyerId })
      .sort({ createdAt: -1 })
      .populate("farmer", "name email phone") // Get Farmer Details
      .populate("listing", "cropName imageUrl") // Get Product Details
      .lean();

    // 2. Define Status Categories
    const ongoingStatuses = [
      "pending_payment",
      "paid",
      "awaiting_driver_accept",
      "driver_assigned",
      "in_transit",
      "otp_verified"
    ];
    
    const completedStatuses = ["delivered", "completed"];
    const cancelledStatuses = ["cancelled"];

    // 3. Process Data
    let totalSpend = 0;
    const ongoingOrdersRaw = [];
    const historyOrdersRaw = [];

    allOrders.forEach((order) => {
      // Calculate Spend: Only add if the order is paid/active (exclude cancelled/pending_payment)
      if (
        [...completedStatuses, ...ongoingStatuses].includes(order.status) && 
        order.status !== "pending_payment"
      ) {
        totalSpend += (order.finalPrice || 0);
      }

      // Categorize Order
      if (ongoingStatuses.includes(order.status)) {
        ongoingOrdersRaw.push(order);
      } else {
        historyOrdersRaw.push(order); // Includes delivered, completed, cancelled
      }
    });

    // 4. Format for Frontend
    // Map to a clean structure matching your UI components
    const formatOrder = (order) => ({
      id: order._id,
      product: order.listing ? order.listing.cropName : "Unknown Crop",
      farmer: order.farmer ? order.farmer.name : "Unknown Seller",
      amount: order.finalPrice || 0,
      status: order.status,
      date: order.createdAt,
      // Add specific fields if needed
      deliveryOTP: order.deliveryOTP, 
      imageUrl: order.listing?.imageUrl || ""
    });

    const ongoingOrders = ongoingOrdersRaw.map(formatOrder);
    const recentHistory = historyOrdersRaw.map(formatOrder);

    // 5. Calculate Saved Suppliers (Mock logic or Count Unique Farmers)
    // Here we just count how many unique farmers this buyer has bought from
    const uniqueFarmers = new Set(allOrders.map(o => o.farmer?._id?.toString()));
    const savedSuppliersCount = uniqueFarmers.size;

    // 6. Send Response
    res.json({
      stats: {
        totalOrders: allOrders.length,
        ongoingOrders: ongoingOrders.length,
        totalSpend, 
        savedSuppliers: savedSuppliersCount
      },
      ongoingOrders,
      recentHistory
    });

  } catch (error) {
    console.error("Error in getBuyerDashboard:", error);
    res.status(500).json({ message: "Server Error fetching dashboard" });
  }
};