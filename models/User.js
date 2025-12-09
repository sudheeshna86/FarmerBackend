import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// --------------------------------
// Address SubSchema
// --------------------------------
const addressSchema = new mongoose.Schema({
  pincode: {
    type: String,
    required: true,
  },
  locality: {
    type: String,
    // required: true,
  },
  addressLine: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["Home", "Work", "Other"],
    default: "Home",
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
});

// --------------------------------
// User Schema
// --------------------------------
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },

    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      match: [/^\d{10}$/, "Phone number must be 10 digits"],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },

    role: {
      type: String,
      enum: ["farmer", "buyer", "driver"],
      default: "buyer",
    },

    // ⭐ Array of all saved addresses
    alladdress: {
      type: [addressSchema],
      default: [],
    },

    // ⭐ Main Address (single formatted string)
    address: {
      type: String,
      default: "",
    },

    walletBalance: {
      type: Number,
      default: 0,
      min: 0,
    },

    transactions: [
      {
        type: {
          type: String,
          enum: ["credit", "debit"],
        },
        amount: Number,
        description: String,
        date: { type: Date, default: Date.now },
      },
    ],

    verified: {
      type: Boolean,
      default: false,
    },

    profileImage: {
      type: String,
    },
  },
  { timestamps: true }
);

// --------------------------------
// Password Hash Middleware
// --------------------------------
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// --------------------------------
// Compare Password Method
// --------------------------------
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;
