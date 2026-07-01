// utils/senderNotification.js
import admin from "../config/firebaseAdmin.js";
import User from "../models/userModel.js";
export const sendPushNotification = async (token, title, body, data = {}) => {
  try {
    if (!token) {
      console.log("❌ No FCM token provided");
      return;
    }

    const message = {
      token,
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        timestamp: Date.now().toString(), // Add timestamp
      },
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "default",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
          },
        },
      },
    };

    console.log("📨 Sending notification:", { title, body, type: data.type });

    const response = await admin.messaging().send(message);
    console.log("✅ Notification sent successfully:", response);
    return { success: true, response };
  } catch (error) {
    console.error("❌ Notification error:", error);

    // Handle invalid token
    if (error.code === "messaging/registration-token-not-registered") {
      console.log("🗑️ Removing invalid token from database");
      const User = require("../models/User").default;
      await User.findOneAndUpdate({ fcmToken: token }, { fcmToken: null });
    }

    return { success: false, error };
  }
};

// Helper function to send notifications with proper formatting
export const sendNotificationWithType = async (
  userId,
  type,
  data,
  senderId,
) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.fcmToken) {
      console.log("❌ User has no FCM token");
      return;
    }

    // Get sender info if provided
    let sender = null;
    if (senderId) {
      sender = await User.findById(senderId);
    }

    // Customize title and body based on notification type
    let title = "";
    let body = "";
    let notificationData = { type, ...data };

    switch (type) {
      case "story_like":
        title = "❤️ Someone liked your story!";
        body = sender
          ? `${sender.username} liked your story`
          : "Someone liked your story";
        notificationData.storyId = data.storyId;
        break;

      case "follow_request":
        title = "👋 New follow request!";
        body = sender
          ? `${sender.username} wants to follow you`
          : "Someone wants to follow you";
        notificationData.userId = senderId;
        break;

      case "follow_accepted":
        title = "✅ Follow request accepted!";
        body = sender
          ? `${sender.username} accepted your follow request`
          : "Your follow request was accepted";
        notificationData.userId = senderId;
        break;

      case "comment":
        title = "💬 New comment!";
        body = sender
          ? `${sender.username} commented on your post`
          : "Someone commented on your post";
        notificationData.postId = data.postId;
        notificationData.commentId = data.commentId;
        break;

      case "comment_like":
        title = "❤️ Someone liked your comment!";
        body = sender
          ? `${sender.username} liked your comment`
          : "Someone liked your comment";
        notificationData.commentId = data.commentId;
        notificationData.postId = data.postId;
        break;

      case "mention":
        title = "📌 You were mentioned!";
        body = sender
          ? `${sender.username} mentioned you in a post`
          : "You were mentioned in a post";
        notificationData.postId = data.postId;
        break;

      case "post_like":
        title = "❤️ Someone liked your post!";
        body = sender
          ? `${sender.username} liked your post`
          : "Someone liked your post";
        notificationData.postId = data.postId;
        break;

      default:
        title = "📱 New Notification";
        body = "You have a new notification";
    }

    await sendPushNotification(user.fcmToken, title, body, notificationData);
  } catch (error) {
    console.error("❌ Error sending notification with type:", error);
  }
};
