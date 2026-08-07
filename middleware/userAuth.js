import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

const userAuth = async (req, res, next) => {
  try {
    // Extract token from cookies or Authorization header
    let token = req.cookies?.token;

    // Check Authorization header if no cookie token
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }
    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message:
          "Access denied. No authentication token provided. Please login again.",
      });
    }
    // Verify the token
    const tokenDecode = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback_secret_key",
    );
    // Check if token contains userId
    if (tokenDecode.userId) {
      // Verify user still exists in database
      const user = await User.findById(tokenDecode.userId).select("-password");

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User not found. Please login again.",
        });
      }

      // Add user info to request object (including full user object for convenience)
      req.user = {
        userId: tokenDecode.userId,
        ...tokenDecode,
        userDetails: user, // Optional: attach full user object
      };

      next(); // Continue to the next middleware/route handler
    } else {
      return res.status(401).json({
        success: false,
        message: "Invalid token. Please login again.",
      });
    }
  } catch (err) {
    console.error("❌ Authentication error:", err);

    // Handle different JWT errors
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired. Please login again.",
      });
    } else if (err.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token. Please login again.",
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Authentication error. Please try again.",
      });
    }
  }
};

export default userAuth;