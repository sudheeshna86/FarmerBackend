import Listing from '../models/FarmerListing.js';
import Offer from '../models/offerModel.js';

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

