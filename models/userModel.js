import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    // Make username optional for Google users
    username: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple null values
      required: false,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    // Make password optional for Google users
    password: {
      type: String,
      required: false,
      default: null,
    },
    // Add Google-specific fields
    googleId: {
      type: String,
      sparse: true,
      unique: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    // Keep existing fields
    profilePicture: { type: String, default: "" },
    bio: { type: String, default: "" },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    postsCount: { type: Number, default: 0 },
    isVerified: { type: Boolean, default: false },
    otp: { type: String },
    otpExpires: { type: Date },
    resetPasswordOTP: { type: String },
    resetPasswordExpires: { type: Date },
    resetPasswordVerifiedUntil: { type: Date },
    fcmToken: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

// Pre-save middleware to generate username for Google users
userSchema.pre("save", async function (next) {
  if (this.provider === "google" && !this.username) {
    // Generate username from email or use a default
    this.username = this.email.split("@")[0] + Math.floor(Math.random() * 1000);
  }
  next();
});

const User = mongoose.model("User", userSchema);

export default User;
