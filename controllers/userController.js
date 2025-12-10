import User from "../models/User.js";

// 📌 Utility to build full address string in format: locality, city (area), state - pincode
const formatAddress = (a) => {
  const areaPart = a.area ? ` (${a.area})` : "";
  return `${a.locality}, ${a.city}${areaPart}, ${a.state} - ${a.pincode}`;
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
    res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

// ================================================================
// 6️⃣ Set Primary Address (select an existing address as main)
// ================================================================
export const setPrimaryAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user)
      return res.status(404).json({ message: "User not found" });

    const { id } = req.params;

    const address = user.alladdress.find(
      (a) => a._id?.toString() === id || a.id?.toString() === id
    );

    if (!address)
      return res.status(404).json({ message: "Address not found" });

    // Mark selected address as default
    user.alladdress = user.alladdress.map((a) => {
      a.isDefault = a._id?.toString() === address._id?.toString();
      return a;
    });

    // Update main formatted address
    user.address = formatAddress(address);

    await user.save();

    res.json({
      message: "Primary address set",
      alladdress: user.alladdress,
      mainAddress: user.address,
    });
  } catch (error) {
    console.error("❌ setPrimaryAddress Error:", error);
    res.status(500).json({
      message: "Failed to set primary address",
      error: error.message,
    });
  }
};

// ================================================================
// 2️⃣ Update User Profile Fields
// ================================================================
export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user)
      return res.status(404).json({ message: "User not found" });

    user.name = req.body.name || user.name;
    user.phone = req.body.phone || user.phone;
    if (user.role === "driver") {
      user.vehicleNumber = req.body.vehicleNumber || user.vehicleNumber;
      user.licenseNumber = req.body.licenseNumber || user.licenseNumber;
    }

    const updatedUser = await user.save();

    res.json(updatedUser);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Update failed", error: error.message });
  }
};

// ================================================================
// 3️⃣ Add a New Address → Push to alladdress + update main address
// ================================================================
export const addAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user)
      return res.status(404).json({ message: "User not found" });

    const { addressLine, city, state, pincode } = req.body;
    if (!addressLine || !city || !state || !pincode) {
      return res.status(400).json({
        message:
          "Address, City, State, and Pincode are required",
      });
    }

    const newAddress = {
      pincode: req.body.pincode,
      locality: req.body.locality || "",
      addressLine: req.body.addressLine,
      city: req.body.city,
      state: req.body.state,
      area: req.body.area || "",
      type: req.body.type || "Home",
    };

    // Ensure array exists
    if (!user.alladdress) {
      user.alladdress = [];
    }

    // Push new address
    user.alladdress.push(newAddress);

    // Mark last address as default
    user.alladdress = user.alladdress.map((a, idx) => {
      a.isDefault = idx === user.alladdress.length - 1;
      return a;
    });

    // Format main address
    user.address = formatAddress(newAddress);

    user.markModified("alladdress");

    await user.save();

    res.json({
      message: "Address added successfully",
      alladdress: user.alladdress,
      mainAddress: user.address,
    });
  } catch (error) {
    console.error("❌ Add Address Error:", error);
    res.status(500).json({
      message: "Failed to add address",
      error: error.message,
    });
  }
};

// ================================================================
// 4️⃣ Update Existing Address → update in array + refresh main address
// ================================================================
export const updateAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const { id } = req.params;

    const address = user.alladdress.find(
      (a) => a._id?.toString() === id || a.id?.toString() === id
    );

    if (!address)
      return res.status(404).json({ message: "Address not found" });

    // Update fields
    address.pincode = req.body.pincode;
    address.locality = req.body.locality;
    address.addressLine = req.body.addressLine;
    address.city = req.body.city;
    address.state = req.body.state;
    address.area = req.body.area || "";
    address.type = req.body.type;

    // Mark updated address as default
    user.alladdress = user.alladdress.map((a) => {
      a.isDefault = a._id?.toString() === address._id?.toString();
      return a;
    });

    // Update main address
    user.address = formatAddress(address);

    await user.save();

    res.json({
      message: "Address updated successfully",
      alladdress: user.alladdress,
      mainAddress: user.address,
    });
  } catch (error) {
    console.error("❌ updateAddress Error:", error);
    res.status(500).json({
      message: "Failed to update address",
      error: error.message,
    });
  }
};

// ================================================================
// 5️⃣ Delete Address → remove + reassign main address automatically
// ================================================================
export const deleteAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user)
      return res.status(404).json({ message: "User not found" });

    const { id } = req.params;

    const toDelete = user.alladdress.find(
      (addr) => addr._id?.toString() === id || addr.id?.toString() === id
    );

    if (!toDelete)
      return res.status(404).json({ message: "Address not found" });

    // Remove address
    user.alladdress = user.alladdress.filter(
      (addr) =>
        addr._id?.toString() !== id &&
        addr.id?.toString() !== id
    );

    // Get formatted deleted address
    const deletedFormatted = formatAddress(toDelete);

    // If deleted was main address → assign new main
    if (user.address === deletedFormatted) {
      if (user.alladdress.length > 0) {
        const last = user.alladdress[user.alladdress.length - 1];
        user.address = formatAddress(last);
      } else {
        user.address = "";
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
