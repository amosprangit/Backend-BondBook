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
      title: notificationTitle,
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
    return null;
  }
};

// Helper function to get default title based on type
function getDefaultTitle(type) {
  const titleMap = {
    // Post & Story
    post_like: "New Like",
    story_like: "New Story Like",
    comment: "New Comment",
    comment_like: "New Comment Like",
    mention: "New Mention",
    new_post: "New Post",
    new_story: "New Story",

    // Follow
    follow: "New Follower",
    follow_request: "New Follow Request",
    follow_accepted: "Follow Request Accepted",

    // Merge Request
    merge_request: "New Connection Request",
    merge_request_accepted: "Connection Request Accepted",
    merge_request_rejected: "Connection Request Declined",

    // Chat
    new_message: "New Message",

    // Profile
    profile_update: "Profile Update",

    // Reminder
    reminder_due: "Reminder Due",
  };
  return titleMap[type] || "New Notification";
}

// Helper function to build notification message based on type
function buildNotificationMessage(type, fromUser, data) {
  const username = fromUser?.username || "Someone";

  const messageMap = {
    // Post & Story
    post_like: `${username} liked your post`,
    story_like: `${username} liked your story`,
    comment: `${username} commented on your post`,
    comment_like: `${username} liked your comment`,
    mention: `${username} mentioned you in a post`,
    new_post: `${username} created a new post`,
    new_story: `${username} created a new story`,

    // Follow
    follow: `${username} started following you`,
    follow_request: `${username} sent you a follow request`,
    follow_accepted: `${username} accepted your follow request`,

    // Merge Request
    merge_request: `${username} wants to connect with you`,
    merge_request_accepted: `${username} accepted your connection request`,
    merge_request_rejected: `${username} declined your connection request`,

    // Chat
    new_message: `${username} sent you a message`,

    // Profile
    profile_update: `${username} updated their profile`,

    // Reminder
    reminder_due: "You have a reminder due",
  };

  return messageMap[type] || "You have a new notification";
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

    // Get sender info for building message
    let sender = null;
    if (senderId) {
      sender = await User.findById(senderId).select("username profilePicture");
    }

    // Build the notification message if not provided
    const notificationMessage =
      message || buildNotificationMessage(type, sender, additionalData);

    // Get title
    const title = additionalData.title || getDefaultTitle(type);

    // Create the notification in database
    const notification = await createNotification(
      recipientId,
      senderId,
      type,
      title,
      notificationMessage,
      additionalData.category || "general",
      additionalData.priority || "normal",
      relatedId,
      relatedModel,
      {
        ...additionalData,
        // Add any type-specific data to extras
        ...(type === "post_like" && { postId: additionalData.postId }),
        ...(type === "story_like" && { storyId: additionalData.storyId }),
        ...(type === "comment" && {
          postId: additionalData.postId,
          commentId: additionalData.commentId,
        }),
        ...(type === "comment_like" && {
          postId: additionalData.postId,
          commentId: additionalData.commentId,
        }),
        ...(type === "mention" && { postId: additionalData.postId }),
        ...(type === "new_post" && { postId: additionalData.postId }),
        ...(type === "new_story" && { storyId: additionalData.storyId }),
        ...(type === "follow" && { userId: additionalData.userId }),
        ...(type === "follow_request" && { userId: additionalData.userId }),
        ...(type === "follow_accepted" && { userId: additionalData.userId }),
        ...(type === "merge_request" && {
          mergeRequestId: additionalData.mergeRequestId,
          userId: additionalData.userId,
        }),
        ...(type === "merge_request_accepted" && {
          mergeRequestId: additionalData.mergeRequestId,
          userId: additionalData.userId,
        }),
        ...(type === "merge_request_rejected" && {
          mergeRequestId: additionalData.mergeRequestId,
          userId: additionalData.userId,
        }),
        ...(type === "new_message" && {
          mutualConnectionId: additionalData.mutualConnectionId,
          messageId: additionalData.messageId,
        }),
        ...(type === "profile_update" && { userId: additionalData.userId }),
      },
    );

    if (!notification) {
      return null;
    }

    // Send push notification
    const result = await sendNotificationWithType(
      recipientId,
      type,
      {
        ...additionalData,
        notificationId: notification._id,
        title,
        message: notificationMessage,
        relatedId,
        relatedModel,
      },
      senderId,
    );

    return {
      notification,
      pushResult: result,
    };
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

    const notifications = await Notification.find({ user: userId })
      .populate({
        path: "fromUser",
        select: "username profilePicture",
        options: { strictPopulate: false },
      })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const unreadCount = await Notification.countDocuments({
      user: userId,
      isRead: false,
    });

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

    const notifications = await Notification.find({
      user: userId,
      isRead: false,
    })
      .populate({
        path: "fromUser",
        select: "username profilePicture",
        options: { strictPopulate: false },
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

// Get notification by type (for filtering)
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

// Get latest notifications (for real-time updates)
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
