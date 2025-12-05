// controllers/authController.js
import User from '../models/User.js';
import jwt from 'jsonwebtoken';

// Generate JWT
export const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

// ✅ Register new user
export const registerUser = async (req, res) => {
  const { name, email, phone, password, role, address } = req.body;

  try {
    const exists = await User.findOne({
      $or: [{ email }, { phone }],
    });

    if (exists) {
      return res.status(400).json({ message: "Email or phone already registered" });
    }

    const user = await User.create({
      name,
      email,
      phone,
      password,
      role,
      address,
    });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      address: user.address,
      token,
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// ✅ Login user with email OR phone
export const loginUser = async (req, res) => {
  const { identifier, password, role } = req.body; // identifier = email OR phone

  try {
    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });

    if (!user)
      return res.status(401).json({ message: "Invalid user credentials" });

    const isMatch = await user.matchPassword(password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    // 🧠 Ensure login matches selected role
    if (user.role !== role) {
      return res.status(401).json({ message: "Invalid role" });
    }

    // ✅ FIX: Include role in token
    const token = generateToken(user._id, user.role);


    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      token,
    });
  } catch (err) {
    console.error("❌ Login error:", err.message);
    res.status(500).json({ message: "Server error during login" });
  }
};