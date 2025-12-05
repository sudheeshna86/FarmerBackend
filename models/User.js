import mongoose from "mongoose";
import bcrypt from "bcryptjs";

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
    address: {
  type: String,
  required: true
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

    // Optional fields for profile completion
    address: {
      type: String,
      default: "",
    },
    profileImage: {
      type: String, // URL of profile picture
    },
  },
  { timestamps: true }
);

//
// 🔒 Middleware: Hash password before saving
//
userSchema.pre("save", async function (next) {
  // Only hash password if modified or new
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});


userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// //
// // 🧾 Virtual field for full transaction summary (optional usage)
// //
// userSchema.virtual("transactionCount").get(function () {
//   return this.transactions.length;
// });

const User = mongoose.model("User", userSchema);
export default User;
