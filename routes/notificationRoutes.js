import express from "express";
import {
  getNotifications,
  getUnreadNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  getNotificationCount,
} from "../controllers/notificationController.js";
import userAuth from "../middleware/userAuth.js";
import { sendNotificationWithType } from "../utils/senderNotification.js";

const notificationRouter = express.Router();

// All routes require authentication
notificationRouter.get("/", userAuth, getNotifications);
notificationRouter.get("/unread", userAuth, getUnreadNotifications);
notificationRouter.get("/count", userAuth, getNotificationCount);
notificationRouter.put("/:notificationId/read", userAuth, markAsRead);
notificationRouter.put("/read-all", userAuth, markAllAsRead);
notificationRouter.delete("/:notificationId", userAuth, deleteNotification);
notificationRouter.delete("/", userAuth, deleteAllNotifications);

// ============================================
// 📱 TEST ROUTES FOR NOTIFICATIONS
// ============================================

/**
 * @route   POST /api/notifications/test
 * @desc    Test all notification types
 * @access  Private (requires auth token)
 * @body    {
 *            type: 'post_like' | 'story_like' | 'comment' | 'comment_like' | 'follow_request' | 'follow_accepted' | 'mention',
 *            recipientId: 'USER_ID_TO_RECEIVE',
 *            senderId: 'USER_ID_TRIGGERING' (optional),
 *            postId: 'POST_ID' (for post/comment related),
 *            storyId: 'STORY_ID' (for story related),
 *            commentId: 'COMMENT_ID' (for comment related)
 *          }
 */
notificationRouter.post("/test", userAuth, async (req, res) => {
  try {
    const { type, recipientId, senderId, postId, storyId, commentId } =
      req.body;

    // Validate required fields
    if (!type) {
      return res.status(400).json({
        success: false,
        error: "❌ Notification type is required",
      });
    }

    if (!recipientId) {
      return res.status(400).json({
        success: false,
        error: "❌ recipientId is required",
      });
    }

    // Validate notification type
    const validTypes = [
      "post_like",
      "story_like",
      "comment",
      "comment_like",
      "follow_request",
      "follow_accepted",
      "mention",
    ];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `❌ Invalid notification type. Must be one of: ${validTypes.join(", ")}`,
      });
    }

    // Build data object based on notification type
    let data = {};

    switch (type) {
      case "post_like":
        if (!postId) {
          return res.status(400).json({
            success: false,
            error: "❌ postId is required for post_like notification",
          });
        }
        data = { postId };
        break;

      case "story_like":
        if (!storyId) {
          return res.status(400).json({
            success: false,
            error: "❌ storyId is required for story_like notification",
          });
        }
        data = { storyId };
        break;

      case "comment":
        if (!postId || !commentId) {
          return res.status(400).json({
            success: false,
            error:
              "❌ postId and commentId are required for comment notification",
          });
        }
        data = { postId, commentId };
        break;

      case "comment_like":
        if (!postId || !commentId) {
          return res.status(400).json({
            success: false,
            error:
              "❌ postId and commentId are required for comment_like notification",
          });
        }
        data = { postId, commentId };
        break;

      case "follow_request":
        data = {};
        break;

      case "follow_accepted":
        data = {};
        break;

      case "mention":
        if (!postId) {
          return res.status(400).json({
            success: false,
            error: "❌ postId is required for mention notification",
          });
        }
        data = { postId };
        break;
    }

    // Send the notification
    console.log("📤 Sending test notification...");
    console.log("  - Type:", type);
    console.log("  - Recipient:", recipientId);
    console.log("  - Sender:", senderId || req.user.userId);
    console.log("  - Data:", data);

    const result = await sendNotificationWithType(
      recipientId,
      type,
      data,
      senderId || req.user.userId, // Use senderId if provided, otherwise use the authenticated user
    );

    res.json({
      success: true,
      message: `✅ ${type} notification sent successfully`,
      recipientId,
      senderId: senderId || req.user.userId,
      type,
      data,
      result,
    });
  } catch (error) {
    console.error("❌ Test notification error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/notifications/test-all
 * @desc    Send all notification types at once
 * @access  Private (requires auth token)
 * @body    {
 *            recipientId: 'USER_ID_TO_RECEIVE',
 *            senderId: 'USER_ID_TRIGGERING' (optional),
 *            postId: 'POST_ID',
 *            storyId: 'STORY_ID',
 *            commentId: 'COMMENT_ID'
 *          }
 */
notificationRouter.post("/test-all", userAuth, async (req, res) => {
  try {
    const { recipientId, senderId, postId, storyId, commentId } = req.body;

    if (!recipientId) {
      return res.status(400).json({
        success: false,
        error: "❌ recipientId is required",
      });
    }

    const sender = senderId || req.user.userId;
    const results = [];

    // Define all notification types with their data
    const testCases = [
      { type: "post_like", data: { postId } },
      { type: "story_like", data: { storyId } },
      { type: "comment", data: { postId, commentId } },
      { type: "comment_like", data: { postId, commentId } },
      { type: "follow_request", data: {} },
      { type: "follow_accepted", data: {} },
      { type: "mention", data: { postId } },
    ];

    // Send each notification
    for (const testCase of testCases) {
      try {
        console.log(`📤 Sending ${testCase.type}...`);
        const result = await sendNotificationWithType(
          recipientId,
          testCase.type,
          testCase.data,
          sender,
        );
        results.push({
          type: testCase.type,
          success: true,
          data: testCase.data,
        });
      } catch (error) {
        results.push({
          type: testCase.type,
          success: false,
          error: error.message,
          data: testCase.data,
        });
      }
    }

    res.json({
      success: true,
      message: "✅ All test notifications sent",
      recipientId,
      senderId: sender,
      results,
    });
  } catch (error) {
    console.error("❌ Test-all error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default notificationRouter;
