import User from "../models/User.js";

// 📌 Utility to build full address string
const formatAddress = (a) => {
  return `${a.addressLine}, ${a.locality}, ${a.city}, ${a.state}, ${a.pincode}, India`;
};


// ================================================================
// 1️⃣ Get User Profile
// ================================================================
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// ================================================================
// 2️⃣ Update User Profile Fields
// ================================================================
export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.name = req.body.name || user.name;
    user.phone = req.body.phone || user.phone;

    const updatedUser = await user.save();
    res.json(updatedUser);

  } catch (error) {
    res.status(500).json({ message: "Update failed", error: error.message });
  }
};


// ================================================================
// 3️⃣ Add a New Address → Push to alladdress + update main address
// ================================================================
// ================================================================
// 3️⃣ Add a New Address (Fixed Array Name)
// ================================================================
export const addAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { addressLine, city, state, pincode } = req.body;
    if (!addressLine || !city || !state || !pincode) {
      return res.status(400).json({ message: "Address, City, State, and Pincode are required" });
    }

    const newAddress = {
      pincode: req.body.pincode,
      locality: req.body.locality || "",
      addressLine: req.body.addressLine,
      city: req.body.city,
      state: req.body.state,
      type: req.body.type || "Home",
      
    };

    // 🛡️ Ensure array exists
    if (!user.alladdress) { // 👈 Use 'alladdress' here
      user.alladdress = [];
    }

    // 🟢 CORRECT: Push to 'alladdress' (matches your Schema)
    user.alladdress.push(newAddress);

    // Update main address string
    user.address = `${newAddress.addressLine}, ${newAddress.city}, ${newAddress.state} - ${newAddress.pincode}`;
    // user.alladdress = [...user.alladdress, newAddress];
    user.markModified('alladdress');

    await user.save();

    res.json({
      message: "Address added successfully",
      alladdress: user.alladdress, // 👈 Return 'alladdress'
      mainAddress: user.address,
    });

  } catch (error) {
    console.error("❌ Add Address Error:", error);
    res.status(500).json({ message: "Failed to add address", error: error.message });
  }
};
// ================================================================
// 4️⃣ Update Existing Address → update in array + refresh main address
// ================================================================
export const updateAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const { id } = req.params;

    // Enhanced address lookup supporting _id and id
    const address = user.alladdress.find(
      (a) => a._id?.toString() === id || a.id?.toString() === id
    );

    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    // Fields update
    address.pincode = req.body.pincode;
    address.locality = req.body.locality;
    address.addressLine = req.body.addressLine;
    address.city = req.body.city;
    address.state = req.body.state;
    address.type = req.body.type;

    // Update main address string
    user.address = formatAddress(address);

    await user.save();

    res.json({
      message: "Address updated successfully",
      alladdress: user.alladdress,
      mainAddress: user.address,
    });

  } catch (error) {
    console.error("❌ updateAddress Error:", error);
    res.status(500).json({ message: "Failed to update address", error: error.message });
  }
};



// ================================================================
// 5️⃣ Delete Address → remove + reassign main address automatically
// ================================================================
export const deleteAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { id } = req.params;

    // Find the address to delete safely (_id or id both supported)
    const toDelete = user.alladdress.find(
      (addr) => addr._id?.toString() === id || addr.id?.toString() === id
    );

    if (!toDelete) {
      return res.status(404).json({ message: "Address not found" });
    }

    // Remove the address from the array
    user.alladdress = user.alladdress.filter(
      (addr) => addr._id?.toString() !== id && addr.id?.toString() !== id
    );

    // Format deleted address string for comparison
    const deletedFormatted = formatAddress(toDelete);

    // If deleted address was main → assign new main address automatically
    if (user.address === deletedFormatted) {
      if (user.alladdress.length > 0) {
        const last = user.alladdress[user.alladdress.length - 1];
        user.address = formatAddress(last);
      } else {
        user.address = ""; // No addresses left
      }
    }

    await user.save();

    res.json({
      message: "Address deleted successfully",
      alladdress: user.alladdress,
      mainAddress: user.address,
    });

  } catch (error) {
    console.error("❌ Delete Address Error:", error);
    res.status(500).json({
      message: "Failed to delete address",
      error: error.message,
    });
  }
};
