import admin from "../config/firebaseAdmin.js";
import User from "../models/userModel.js";
import { createNotification } from "../controllers/notificationController.js";

// ✅ FIXED: sendPushNotification with better error handling
export const sendPushNotification = async (token, title, body, data = {}) => {
  try {
    if (!token) {
      console.log("❌ No FCM token provided");
      return { success: false, error: "No token provided" };
    }

    const message = {
      token,
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        timestamp: Date.now().toString(),
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

    // ✅ FIXED: Handle invalid token - use import, not require
    if (error.code === "messaging/registration-token-not-registered") {
      console.log("🗑️ Removing invalid token from database");
      
      try {
        // ✅ FIXED: Use the imported User model directly
        await User.findOneAndUpdate(
          { fcmToken: token }, 
          { $unset: { fcmToken: "" } } // Remove the token field
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
  recipientId,  // The user who should receive the notification
  type,
  data,
  senderId,     // The user who triggered the notification
) => {
  try {
    console.log(`📨 Sending notification with type: ${type}`);
    console.log(`📨 Recipient: ${recipientId}, Sender: ${senderId}`);

    // Get recipient user
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      console.log("❌ Recipient user not found");
      return { success: false, error: "Recipient not found" };
    }

    // Get sender info if provided
    let sender = null;
    let senderName = "Someone";
    if (senderId) {
      sender = await User.findById(senderId);
      if (sender) {
        senderName = sender.username;
      }
    }

    // ✅ Create notification message
    let title = "";
    let body = "";
    let notificationData = { type, ...data };

    // ✅ Customize based on notification type
    switch (type) {
      case "story_like":
        title = "❤️ Someone liked your story!";
        body = sender ? `${senderName} liked your story` : "Someone liked your story";
        notificationData.storyId = data.storyId;
        break;

      case "story_comment":
        title = "💬 Someone commented on your story!";
        body = sender ? `${senderName} commented on your story` : "Someone commented on your story";
        notificationData.storyId = data.storyId;
        break;

      case "follow_request":
        title = "👋 New follow request!";
        body = sender ? `${senderName} wants to follow you` : "Someone wants to follow you";
        notificationData.userId = senderId;
        break;

      case "follow_accepted":
        title = "✅ Follow request accepted!";
        body = sender ? `${senderName} accepted your follow request` : "Your follow request was accepted";
        notificationData.userId = senderId;
        break;

      case "comment":
        title = "💬 New comment!";
        body = sender ? `${senderName} commented on your post` : "Someone commented on your post";
        notificationData.postId = data.postId;
        notificationData.commentId = data.commentId;
        break;

      case "post_like":
        title = "❤️ Someone liked your post!";
        body = sender ? `${senderName} liked your post` : "Someone liked your post";
        notificationData.postId = data.postId;
        break;

      case "merge_request":
        title = "🔗 New connection request!";
        body = sender ? `${senderName} wants to connect with you` : "Someone wants to connect with you";
        notificationData.userId = senderId;
        break;

      case "merge_request_accepted":
        title = "✅ Connection request accepted!";
        body = sender ? `${senderName} accepted your connection request` : "Your connection request was accepted";
        notificationData.userId = senderId;
        break;

      default:
        title = "📱 New Notification";
        body = sender ? `${senderName} interacted with you` : "You have a new notification";
    }

    // ✅ STEP 1: Save notification to database
    let savedNotification = null;
    try {
      savedNotification = await createNotification(
        recipientId,          // recipient
        senderId,            // sender
        type,                // type
        body,                // message
        data.storyId || data.postId || data.commentId || null, // relatedId
        type.includes('story') ? 'Story' : 'Post' // relatedModel
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
          {
            type,
            notificationId: savedNotification?._id?.toString() || '',
            ...notificationData,
          }
        );
        console.log("✅ Push notification sent:", pushResult);
      } catch (pushError) {
        console.error("❌ Push notification failed:", pushError);
        // Don't fail the whole operation - notification is already saved
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
      notification: null 
    };
  }
};

// ✅ Helper function to send bulk notifications
export const sendBulkNotifications = async (recipientIds, type, data, senderId) => {
  const results = [];
  for (const recipientId of recipientIds) {
    try {
      const result = await sendNotificationWithType(recipientId, type, data, senderId);
      results.push({ recipientId, success: true, result });
    } catch (error) {
      results.push({ recipientId, success: false, error: error.message });
    }
  }
  return results;
};