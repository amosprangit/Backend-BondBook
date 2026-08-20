import mongoose from "mongoose";
import User from "../models/userModel.js";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

// Initialize Google OAuth client
const googleClient = new OAuth2Client(
  process.env.GOOGLE_WEB_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
);

// Generate JWT token (matching your existing token generation)
const generateToken = (userId) => {
  return jwt.sign(
    { userId: userId },
    process.env.JWT_SECRET || "fallback_secret_key",
    { expiresIn: "90d" },
  );
};

// Google authentication with Expo Auth Session
export const googleAuth = async (req, res) => {
  try {
    const { idToken, accessToken, userInfo } = req.body;

    // Validate required fields
    if (!idToken && !accessToken) {
      return res.status(400).json({
        success: false,
        message: "idToken or accessToken is required",
      });
    }

    let googleUserInfo = userInfo;

    // If we have idToken, verify it
    if (idToken) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: idToken,
          audience: process.env.GOOGLE_WEB_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        googleUserInfo = {
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
          sub: payload.sub, // Google's unique user ID
          email_verified: payload.email_verified,
        };
      } catch (verifyError) {
        console.error("❌ ID Token verification failed:", verifyError);
        return res.status(401).json({
          success: false,
          message: "Invalid ID token",
        });
      }
    }
    // If we have accessToken but no idToken, use accessToken to get user info
    else if (accessToken && !userInfo) {
      try {
        const response = await fetch(
          `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`,
        );
        const data = await response.json();

        if (data.error) {
          throw new Error(data.error_description || "Failed to get user info");
        }

        googleUserInfo = {
          email: data.email,
          name: data.name,
          picture: data.picture,
          sub: data.sub,
          email_verified: data.email_verified,
        };
      } catch (error) {
        console.error("❌ Failed to get user info from access token:", error);
        return res.status(401).json({
          success: false,
          message: "Failed to get user info from access token",
        });
      }
    }

    // Validate user info
    if (!googleUserInfo || !googleUserInfo.email) {
      return res.status(400).json({
        success: false,
        message: "Failed to get user information from Google",
      });
    }

    console.log(`🔍 Google user info: ${googleUserInfo.email}`);

    // Check if user already exists
    let user = await User.findOne({
      $or: [
        { googleId: googleUserInfo.sub },
        { email: googleUserInfo.email.toLowerCase() },
      ],
    });

    if (user) {
      // User exists - update Google ID if not linked yet
      console.log(`✅ Existing user found: ${user.email}`);

      if (!user.googleId) {
        user.googleId = googleUserInfo.sub;
        user.provider = "google";
        user.isVerified = true;

        // Update profile picture if not set
        if (!user.profilePicture && googleUserInfo.picture) {
          user.profilePicture = googleUserInfo.picture;
        }

        await user.save();
        console.log(`🔗 Google account linked to existing user: ${user.email}`);
      }
    } else {
      // Create new user
      console.log(`🆕 Creating new Google user: ${googleUserInfo.email}`);

      // Generate a unique username
      let username = googleUserInfo.name || googleUserInfo.email.split("@")[0];
      let baseUsername = username.replace(/\s/g, "").toLowerCase();
      let finalUsername = baseUsername;
      let counter = 1;

      // Check if username already exists
      let existingUser = await User.findOne({ username: finalUsername });
      while (existingUser) {
        finalUsername = `${baseUsername}${counter}`;
        existingUser = await User.findOne({ username: finalUsername });
        counter++;
      }

      user = new User({
        googleId: googleUserInfo.sub,
        email: googleUserInfo.email.toLowerCase(),
        username: finalUsername,
        provider: "google",
        isVerified: true,
        profilePicture: googleUserInfo.picture || "",
        password: null, // Google users don't have passwords
      });

      await user.save();
      console.log(`✅ New Google user created: ${user.email}`);
    }

    // Generate JWT token
    const token = generateToken(user._id);

    // Set cookie for web clients
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
    });

    // Calculate followers and following counts
    const followersCount = user.followers ? user.followers.length : 0;
    const followingCount = user.following ? user.following.length : 0;

    // Return user data and token
    const userResponse = {
      _id: user._id,
      username: user.username,
      email: user.email,
      profilePicture: user.profilePicture || "",
      bio: user.bio || "",
      provider: user.provider,
      isVerified: user.isVerified,
      followersCount: followersCount,
      followingCount: followingCount,
      postsCount: user.postsCount || 0,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return res.status(200).json({
      success: true,
      message: "Google authentication successful",
      user: userResponse,
      token: token,
    });
  } catch (error) {
    console.error("❌ Google auth error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during Google authentication",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get current authenticated user
export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId).select(
      "-password -otp -otpExpires -resetPasswordOTP -resetPasswordExpires -__v",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Ensure postsCount exists
    let postsCount = user.postsCount || 0;
    if (!user.postsCount || user.postsCount === undefined) {
      // Import Post model dynamically to avoid circular dependency
      try {
        const Post = (await import("../models/postModel.js")).default;
        postsCount = await Post.countDocuments({ user: userId });
        if (postsCount > 0) {
          user.postsCount = postsCount;
          await user.save();
        }
      } catch (error) {
        console.error("Error counting posts:", error);
      }
    }

    const followersCount = user.followers ? user.followers.length : 0;
    const followingCount = user.following ? user.following.length : 0;

    const userResponse = {
      _id: user._id,
      username: user.username,
      email: user.email,
      profilePicture: user.profilePicture || "",
      bio: user.bio || "",
      followersCount: followersCount,
      followingCount: followingCount,
      postsCount: postsCount,
      isVerified: user.isVerified,
      provider: user.provider,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return res.status(200).json({
      success: true,
      user: userResponse,
    });
  } catch (error) {
    console.error("❌ Get current user error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Refresh token endpoint
export const refreshToken = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const newToken = generateToken(user._id);

    res.cookie("token", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
    });

    return res.status(200).json({
      success: true,
      token: newToken,
    });
  } catch (error) {
    console.error("❌ Refresh token error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Logout user (clear cookie)
export const logoutUser = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("❌ Logout error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during logout",
    });
  }
};
