// controllers/farmerController.js
import fs from "fs";
import FarmerListing from "../models/FarmerListing.js";
import cloudinary from "../config/cloudinary.js";

// helper to upload local file to Cloudinary & optionally remove local file
const uploadToCloudinary = async (filePath) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: "agriconnect/farmer-listings",
    });

    // optional: delete local file after upload
    fs.unlink(filePath, (err) => {
      if (err) console.error("Failed to delete temp file:", err.message);
    });

    return result.secure_url; // this is the URL we store
  } catch (err) {
    console.error("Cloudinary upload error:", err.message);
    throw err;
  }
};

// ✅ Add a new listing
export const addListing = async (req, res) => {
  try {
    const {
      cropName,
      category,
      quantity,
      pricePerKg,
      location,
      description,
      imageUrl, // optional direct URL from frontend
    } = req.body;

    if (!cropName || !category || !quantity || !pricePerKg) {
      return res.status(400).json({ message: "Please fill all required fields" });
    }

    // Decide final image URL:
    // 1) if frontend sent imageUrl string, use that
    // 2) else if file uploaded, send to Cloudinary
    let finalImageUrl = imageUrl || null;

    if (req.file) {
      const filePath = req.file.path;
      const cloudUrl = await uploadToCloudinary(filePath);
      finalImageUrl = cloudUrl;
    }

    const listing = await FarmerListing.create({
      farmer: req.user._id,
      cropName,
      category,
      quantity,
      pricePerKg,
      location,
      description,
      imageUrl: finalImageUrl,
    });

    res.status(201).json({
      success: true,
      message: "Listing added successfully!",
      listing,
    });
  } catch (error) {
    console.error("❌ Error adding listing:", error.message);
    res
      .status(500)
      .json({ message: "Server error while adding listing", error: error.message });
  }
};

// ✅ Get all listings of logged-in farmer
export const getMyListings = async (req, res) => {
  try {
    const listings = await FarmerListing.find({ farmer: req.user._id });
    res.status(200).json(listings);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching your listings", error: error.message });
  }
};

// ✅ Delete a listing
export const deleteListing = async (req, res) => {
  try {
    const listing = await FarmerListing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: "Listing not found" });

    if (listing.farmer.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this listing" });
    }

    await listing.deleteOne();
    res.status(200).json({ message: "Listing deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting listing", error: error.message });
  }
};

// ✅ Update (Edit) a listing
export const updateListing = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      cropName,
      category,
      quantity,
      pricePerKg,
      location,
      description,
      imageUrl, // may contain existing Cloudinary URL
    } = req.body;

    const listing = await FarmerListing.findById(id);
    if (!listing) return res.status(404).json({ message: "Listing not found" });

    if (listing.farmer.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to edit this listing" });
    }

    let finalImageUrl = imageUrl || listing.imageUrl;

    // if new file uploaded, override with new Cloudinary image
    if (req.file) {
      const filePath = req.file.path;
      const cloudUrl = await uploadToCloudinary(filePath);
      finalImageUrl = cloudUrl;
    }

    listing.cropName = cropName || listing.cropName;
    listing.category = category || listing.category;
    listing.quantity = quantity || listing.quantity;
    listing.pricePerKg = pricePerKg || listing.pricePerKg;
    listing.location = location || listing.location;
    listing.description = description || listing.description;
    listing.imageUrl = finalImageUrl;

    await listing.save();

    res.json({
      success: true,
      message: "Listing updated successfully",
      listing,
    });
  } catch (error) {
    console.error("❌ Error updating listing:", error.message);
    res
      .status(500)
      .json({ message: "Server error while updating listing", error: error.message });
  }
};
