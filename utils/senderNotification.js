import admin from "../config/firebaseAdmin.js";
import User from "../models/userModel.js";
import { createNotification } from "../controllers/notificationController.js";

// ✅ Helper function to convert all values to strings
const convertToStrings = (obj) => {
  const result = {};
  if (!obj) return result;

  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined) {
      // Convert non-string values to strings
      result[key] = typeof value === "string" ? value : String(value);
    }
  }
  return result;
};

// ✅ FIXED: sendPushNotification with better error handling
export const sendPushNotification = async (token, title, body, data = {}) => {
  try {
    if (!token) {
      console.log("❌ No FCM token provided");
      return { success: false, error: "No token provided" };
    }

    // ✅ Convert all data values to strings for Firebase
    const stringData = convertToStrings(data);
    // Add timestamp as string
    stringData.timestamp = Date.now().toString();

    const message = {
      token,
      notification: {
        title,
        body,
      },
      data: stringData, // ✅ All values are now strings
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
    console.log("📨 Data payload:", stringData);

    const response = await admin.messaging().send(message);
    console.log("✅ Notification sent successfully:", response);
    return { success: true, response };
  } catch (error) {
    console.error("❌ Notification error:", error);

    // Handle invalid token
    if (error.code === "messaging/registration-token-not-registered") {
      console.log("🗑️ Removing invalid token from database");

      try {
        await User.findOneAndUpdate(
          { fcmToken: token },
          { $unset: { fcmToken: "" } },
        );
        console.log("✅ Invalid token removed from database");
      } catch (dbError) {
        console.error("❌ Failed to remove invalid token:", dbError);
      }
    }

    return { success: false, error };
  }
};

// ✅ FIXED: sendNotificationWithType with proper notification creation
export const sendNotificationWithType = async (
  recipientId,
  type,
  data,
  senderId,
) => {
  try {
    console.log(`📨 Sending notification with type: ${type}`);
    console.log(`📨 Recipient: ${recipientId}, Sender: ${senderId}`);

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      console.log("❌ Recipient user not found");
      return { success: false, error: "Recipient not found" };
    }

    let sender = null;
    let senderName = "Someone";
    if (senderId) {
      sender = await User.findById(senderId);
      if (sender) {
        senderName = sender.username;
      }
    }

    // ✅ Build notification data with all string values
    let title = "";
    let body = "";

    // ✅ Start with base data and ensure all values are strings
    let notificationData = {
      type: type, // Already a string
    };

    // ✅ Add data with proper string conversion
    if (data) {
      for (const [key, value] of Object.entries(data)) {
        if (value !== null && value !== undefined) {
          notificationData[key] =
            typeof value === "string" ? value : String(value);
        }
      }
    }

    switch (type) {
      case "story_like":
        title = "❤️ Someone liked your story!";
        body = sender
          ? `${senderName} liked your story`
          : "Someone liked your story";
        notificationData.storyId = data.storyId ? String(data.storyId) : "";
        break;

      case "story_comment":
        title = "💬 Someone commented on your story!";
        body = sender
          ? `${senderName} commented on your story`
          : "Someone commented on your story";
        notificationData.storyId = data.storyId ? String(data.storyId) : "";
        break;

      case "follow_request":
        title = "👋 New follow request!";
        body = sender
          ? `${senderName} wants to follow you`
          : "Someone wants to follow you";
        notificationData.userId = senderId ? String(senderId) : "";
        break;

      case "follow_accepted":
        title = "✅ Follow request accepted!";
        body = sender
          ? `${senderName} accepted your follow request`
          : "Your follow request was accepted";
        notificationData.userId = senderId ? String(senderId) : "";
        break;

      case "comment":
        title = "💬 New comment!";
        body = sender
          ? `${senderName} commented on your post`
          : "Someone commented on your post";
        notificationData.postId = data.postId ? String(data.postId) : "";
        notificationData.commentId = data.commentId
          ? String(data.commentId)
          : "";
        break;

      case "post_like":
        title = "❤️ Someone liked your post!";
        body = sender
          ? `${senderName} liked your post`
          : "Someone liked your post";
        notificationData.postId = data.postId ? String(data.postId) : "";
        break;

      case "merge_request":
        title = "🔗 New connection request!";
        body = sender
          ? `${senderName} wants to connect with you`
          : "Someone wants to connect with you";
        notificationData.mergeRequestId = data.mergeRequestId
          ? String(data.mergeRequestId)
          : "";
        notificationData.userId = senderId ? String(senderId) : "";
        break;

      case "merge_request_accepted":
        title = "✅ Connection request accepted!";
        body = sender
          ? `${senderName} accepted your connection request`
          : "Your connection request was accepted";
        notificationData.mergeRequestId = data.mergeRequestId
          ? String(data.mergeRequestId)
          : "";
        notificationData.connectionId = data.connectionId
          ? String(data.connectionId)
          : "";
        break;

      case "merge_request_rejected":
        title = "❌ Connection request declined";
        body = sender
          ? `${senderName} declined your connection request`
          : "Your connection request was declined";
        notificationData.mergeRequestId = data.mergeRequestId
          ? String(data.mergeRequestId)
          : "";
        break;

      case "new_message":
        title = `💬 ${senderName}`;
        body = data.content || "Sent you a message";
        notificationData.mutualConnectionId = data.mutualConnectionId
          ? String(data.mutualConnectionId)
          : "";
        notificationData.messageId = data.messageId
          ? String(data.messageId)
          : "";
        notificationData.senderId = senderId ? String(senderId) : "";
        notificationData.content = data.content || "";
        break;

      default:
        title = "📱 New Notification";
        body = sender
          ? `${senderName} interacted with you`
          : "You have a new notification";
    }

    // ✅ STEP 1: Save notification to database
    let savedNotification = null;
    try {
      savedNotification = await createNotification(
        recipientId,
        senderId,
        type,
        body,
        data.storyId || data.postId || data.commentId || null,
        type.includes("story") ? "Story" : "Post",
      );
      console.log("✅ Notification saved to database:", savedNotification?._id);
    } catch (dbError) {
      console.error("❌ Failed to save notification to database:", dbError);
    }

    // ✅ STEP 2: Send push notification if user has FCM token
    let pushResult = null;
    if (recipient.fcmToken) {
      try {
        pushResult = await sendPushNotification(
          recipient.fcmToken,
          title,
          body,
          notificationData, // ✅ All values are now strings
        );
        console.log("✅ Push notification sent:", pushResult);
      } catch (pushError) {
        console.error("❌ Push notification failed:", pushError);
      }
    } else {
      console.log(`ℹ️ User ${recipientId} has no FCM token`);
    }

    return {
      success: true,
      notification: savedNotification,
      pushNotification: pushResult,
    };
  } catch (error) {
    console.error("❌ Error sending notification with type:", error);
    return {
      success: false,
      error: error.message,
      notification: null,
    };
  }
};

// ✅ Helper function to send bulk notifications
export const sendBulkNotifications = async (
  recipientIds,
  type,
  data,
  senderId,
) => {
  const results = [];
  for (const recipientId of recipientIds) {
    try {
      const result = await sendNotificationWithType(
        recipientId,
        type,
        data,
        senderId,
      );
      results.push({ recipientId, success: true, result });
    } catch (error) {
      results.push({ recipientId, success: false, error: error.message });
    }
  }
  return results;
};
