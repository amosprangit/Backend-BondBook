import Notification from "../models/notificationModel.js";
import User from "../models/userModel.js";
import { sendNotificationWithType } from "../utils/senderNotification.js";

// Helper function to create a notification
export const createNotification = async (
  userId,
  fromUserId,
  type,
  title,
  message,
  category,
  priority,
  relatedId,
  relatedModel,
  extras,
) => {
  try {
    // Don't create notification if user is trying to notify themselves
    if (userId.toString() === fromUserId?.toString()) {
      return null;
    }

    // Generate a title if not provided
    const notificationTitle = title || getDefaultTitle(type);

    const notification = await Notification.create({
      user: userId,
      fromUser: fromUserId,
      type,
      title: notificationTitle, // ✅ ADDED: Include title field
      message,
      category: category || "general",
      priority: priority || "normal",
      relatedId,
      relatedModel,
      isRead: false,
      createdAt: new Date(),
      ...extras, // Include any extra fields
    });

    // Populate fromUser before returning (if needed for real-time)
    await notification.populate("fromUser", "username profilePicture");

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null; // Don't throw, just log the error
  }
};

// Helper function to get default title based on type
function getDefaultTitle(type) {
  const titleMap = {
    follow_request: "New Follow Request",
    follow: "New Follower",
    like: "New Like",
    comment: "New Comment",
    reply: "New Reply",
    mention: "New Mention",
    reminder: "Reminder",
    message: "New Message",
    system: "System Notification",
    alert: "Alert",
    invitation: "New Invitation",
    friend_request: "New Friend Request",
    friend_accept: "Friend Request Accepted",
    post: "New Post",
    share: "New Share",
    reaction: "New Reaction",
    achievement: "Achievement Unlocked",
    level_up: "Level Up",
    badge: "New Badge",
  };
  return titleMap[type] || "New Notification";
}

// ✅ NEW: Create notification and send push notification
export const createNotificationWithPush = async (
  recipientId,
  senderId,
  type,
  message,
  relatedId = null,
  relatedModel = null,
  additionalData = {},
) => {
  try {
    if (recipientId.toString() === senderId?.toString()) {
      return null;
    }

    // Ensure title is included in additionalData
    const dataWithTitle = {
      ...additionalData,
      message,
      relatedId,
      relatedModel,
      title: additionalData.title || getDefaultTitle(type), // Add title if missing
    };

    return await sendNotificationWithType(
      recipientId,
      type,
      dataWithTitle,
      senderId,
    );
  } catch (error) {
    console.error("Error creating notification with push:", error);
    return null;
  }
};

// Get all notifications for a user
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 50, page = 1 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get all notifications, including those with null fromUser (reminder notifications)
    const notifications = await Notification.find({ user: userId })
      .populate({
        path: "fromUser",
        select: "username profilePicture",
        options: { strictPopulate: false }, // Don't fail if fromUser is null
      })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    // Get unread count
    const unreadCount = await Notification.countDocuments({
      user: userId,
      isRead: false,
    });

    // Get total count
    const totalCount = await Notification.countDocuments({ user: userId });

    return res.status(200).json({
      success: true,
      notifications,
      unreadCount,
      totalCount,
      page: parseInt(page),
      limit: parseInt(limit),
      hasMore: totalCount > skip + notifications.length,
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get unread notifications only
export const getUnreadNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 20 } = req.query;

    // Get unread notifications, including those with null fromUser (reminder notifications)
    const notifications = await Notification.find({
      user: userId,
      isRead: false,
    })
      .populate({
        path: "fromUser",
        select: "username profilePicture",
        options: { strictPopulate: false }, // Don't fail if fromUser is null
      })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    const unreadCount = await Notification.countDocuments({
      user: userId,
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("Get unread notifications error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { notificationId } = req.params;

    const notification = await Notification.findOne({
      _id: notificationId,
      user: userId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    console.error("Mark notification as read error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await Notification.updateMany(
      { user: userId, isRead: false },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      },
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
      updatedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Mark all notifications as read error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Delete a notification
export const deleteNotification = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { notificationId } = req.params;

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      user: userId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Delete notification error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Delete all notifications
export const deleteAllNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await Notification.deleteMany({ user: userId });

    return res.status(200).json({
      success: true,
      message: "All notifications deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Delete all notifications error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get notification count (unread)
export const getNotificationCount = async (req, res) => {
  try {
    const userId = req.user.userId;

    const unreadCount = await Notification.countDocuments({
      user: userId,
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    console.error("Get notification count error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ✅ NEW: Get notification by type (for filtering)
export const getNotificationsByType = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type } = req.params;
    const { limit = 20, page = 1 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const notifications = await Notification.find({
      user: userId,
      type: type,
    })
      .populate({
        path: "fromUser",
        select: "username profilePicture",
        options: { strictPopulate: false },
      })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const totalCount = await Notification.countDocuments({
      user: userId,
      type: type,
    });

    return res.status(200).json({
      success: true,
      notifications,
      totalCount,
      page: parseInt(page),
      limit: parseInt(limit),
      hasMore: totalCount > skip + notifications.length,
    });
  } catch (error) {
    console.error("Get notifications by type error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ✅ NEW: Get latest notifications (for real-time updates)
export const getLatestNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { since } = req.query;

    let query = { user: userId };

    if (since) {
      const sinceDate = new Date(parseInt(since));
      query.createdAt = { $gt: sinceDate };
    }

    const notifications = await Notification.find(query)
      .populate({
        path: "fromUser",
        select: "username profilePicture",
        options: { strictPopulate: false },
      })
      .sort({ createdAt: -1 })
      .limit(20);

    return res.status(200).json({
      success: true,
      notifications,
      count: notifications.length,
    });
  } catch (error) {
    console.error("Get latest notifications error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
