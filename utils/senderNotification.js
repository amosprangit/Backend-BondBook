import admin from "../config/firebaseAdmin.js";
import mongoose from "mongoose";
import User from "../models/userModel.js";
import { createNotification } from "../controllers/notificationController.js";
import { NotificationTypes } from "./notificationTypes.js";
import { buildNotification } from "./notificationFactory.js";

const toSafeString = (value) => {
  if (value === null || value === undefined) return "";

  if (typeof value === "string") return value;

  if (typeof value === "number") return String(value);

  if (typeof value === "boolean") return String(value);

  if (value instanceof mongoose.Types.ObjectId) {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }

  return String(value);
};

const convertToStrings = (obj = {}) => {
  const converted = {};

  Object.entries(obj).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    converted[key] = toSafeString(value);
  });

  return converted;
};

const logger = {
  info(message, data = null) {
    if (data) {
      console.log(`✅ ${message}`, data);
    } else {
      console.log(`✅ ${message}`);
    }
  },

  warn(message, data = null) {
    if (data) {
      console.warn(`⚠️ ${message}`, data);
    } else {
      console.warn(`⚠️ ${message}`);
    }
  },

  error(message, error = null) {
    if (error) {
      console.error(`❌ ${message}`, error);
    } else {
      console.error(`❌ ${message}`);
    }
  },
};

const createPayload = ({ notification, sender }) => {
  return convertToStrings({
    notificationId: notification?._id,
    type: notification?.type,
    title: notification?.title,
    body: notification?.message || notification?.body,

    senderId: sender?._id,
    senderName: sender?.username,
    senderAvatar: sender?.profilePicture,

    relatedId: notification?.relatedId,
    relatedModel: notification?.relatedModel,

    category: notification?.category,
    priority: notification?.priority,

    createdAt: notification?.createdAt,

    ...(notification?.extras || {}),
  });
};

const sendPushNotification = async ({ recipient, notification, sender }) => {
  try {
    if (!recipient) {
      logger.warn("Recipient not found.");
      return false;
    }

    if (!recipient.fcmToken) {
      logger.warn(`User ${recipient._id} has no FCM token.`);
      return false;
    }

    const message = {
      token: recipient.fcmToken,

      notification: {
        title: notification.title || "Notification",
        body:
          notification.message ||
          notification.body ||
          "You have a new notification",
      },

      data: createPayload({
        notification,
        sender,
      }),

      android: {
        priority: "high",

        notification: {
          channelId: "bondbook",
          priority: "high",
          sound: "default",
          defaultSound: true,
          defaultVibrateTimings: true,
          visibility: "public",
        },
      },

      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
            contentAvailable: true,
          },
        },
      },
    };

    const response = await admin.messaging().send(message);

    logger.info("Push notification sent.", response);

    return true;
  } catch (error) {
    logger.error("Failed to send push notification.", error);

    if (
      error.code === "messaging/registration-token-not-registered" ||
      error.code === "messaging/invalid-registration-token"
    ) {
      logger.warn("Removing invalid FCM token.");

      await User.findByIdAndUpdate(recipient._id, {
        $unset: {
          fcmToken: "",
        },
      });
    }

    return false;
  }
};

const saveNotification = async ({ recipient, sender, type, data = {} }) => {
  try {
    // Build notification from the factory
    const notificationData = buildNotification({
      type,
      sender,
      data,
    });

    // Log what we're about to create for debugging
    logger.info("Building notification with data:", {
      type: notificationData.type,
      title: notificationData.title,
      body: notificationData.body,
      category: notificationData.category,
      priority: notificationData.priority,
    });

    // ✅ FIXED: Call createNotification with correct parameters
    const notification = await createNotification(
      recipient._id, // userId
      sender?._id, // fromUserId
      notificationData.type, // type
      notificationData.title, // title ✅ Now properly passed
      notificationData.body, // message (maps to message field)
      notificationData.category || "general", // category
      notificationData.priority || "normal", // priority
      notificationData.relatedId || null, // relatedId
      notificationData.relatedModel || null, // relatedModel
      notificationData.extras || {}, // extras
    );

    if (!notification) {
      throw new Error("Failed to create notification.");
    }

    logger.info("Notification saved successfully.", {
      id: notification._id,
      title: notification.title,
      type: notification.type,
    });

    return notification;
  } catch (error) {
    logger.error("Failed to save notification.", error);
    throw error;
  }
};

const sendNotificationWithType = async (
  recipientId,
  type,
  data = {},
  senderId = null,
) => {
  try {
    // Validate notification type
    if (!Object.values(NotificationTypes).includes(type)) {
      throw new Error(`Unsupported notification type: ${type}`);
    }

    // Get recipient
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      throw new Error(`Recipient ${recipientId} not found.`);
    }

    // Get sender if provided
    let sender = null;
    if (senderId) {
      sender = await User.findById(senderId);
      if (!sender) {
        logger.warn(`Sender ${senderId} not found.`);
      }
    }

    // Don't notify yourself
    if (sender && sender._id.toString() === recipient._id.toString()) {
      logger.info("Skipping self notification.");
      return null;
    }

    // Save notification to database
    const notification = await saveNotification({
      recipient,
      sender,
      type,
      data,
    });

    // Send push notification in background (don't await)
    if (recipient.fcmToken) {
      sendPushNotification({
        recipient,
        sender,
        notification,
      }).catch((error) => {
        logger.error("Background push notification failed:", error);
      });
    }

    logger.info("Notification processed successfully.", {
      recipient: recipient._id,
      sender: sender?._id,
      type,
      notificationId: notification._id,
    });

    return notification;
  } catch (error) {
    logger.error("sendNotificationWithType failed.", error);
    throw error;
  }
};

const sendBulkNotifications = async ({
  recipientIds = [],
  type,
  data = {},
  senderId = null,
}) => {
  if (!Array.isArray(recipientIds)) {
    throw new Error("recipientIds must be an array.");
  }

  if (recipientIds.length === 0) {
    logger.warn("No recipients supplied.");
    return {
      total: 0,
      success: 0,
      failed: 0,
      results: [],
    };
  }

  logger.info(`Sending ${type} notification to ${recipientIds.length} users.`);

  const results = [];

  for (const recipientId of recipientIds) {
    try {
      const notification = await sendNotificationWithType(
        recipientId,
        type,
        data,
        senderId,
      );

      results.push({
        recipientId,
        success: true,
        notification: notification?._id || null,
      });
    } catch (error) {
      logger.error(`Failed notification for recipient ${recipientId}`, error);

      results.push({
        recipientId,
        success: false,
        error: error.message,
      });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const failedCount = results.length - successCount;

  logger.info("Bulk notification completed.", {
    total: results.length,
    success: successCount,
    failed: failedCount,
  });

  return {
    total: results.length,
    success: successCount,
    failed: failedCount,
    results,
  };
};

export {
  sendPushNotification,
  sendNotificationWithType,
  sendBulkNotifications,
};
