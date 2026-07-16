import express from "express";
import {
  getNotifications,
  getUnreadNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  getNotificationCount,
  getNotificationsByType,
  getLatestNotifications,
} from "../controllers/notificationController.js";
import userAuth from "../middleware/userAuth.js";
import { sendNotificationWithType } from "../utils/senderNotification.js";

const notificationRouter = express.Router();

// ✅ All routes require authentication
notificationRouter.get("/", userAuth, getNotifications);
notificationRouter.get("/unread", userAuth, getUnreadNotifications);
notificationRouter.get("/count", userAuth, getNotificationCount);
notificationRouter.get("/latest", userAuth, getLatestNotifications);
notificationRouter.get("/type/:type", userAuth, getNotificationsByType);

notificationRouter.put("/:notificationId/read", userAuth, markAsRead);
notificationRouter.put("/read-all", userAuth, markAllAsRead);

notificationRouter.delete("/:notificationId", userAuth, deleteNotification);
notificationRouter.delete("/", userAuth, deleteAllNotifications);

// ✅ TEST ROUTE: Send a single notification (Updated with ALL types)
notificationRouter.post("/test", userAuth, async (req, res) => {
  try {
    const {
      type,
      recipientId,
      senderId,
      postId,
      storyId,
      commentId,
      messageId,
      mutualConnectionId,
      mergeRequestId,
      userId, // for follow/merge requests
    } = req.body;

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

    // ✅ UPDATED: Complete list of all notification types
    const validTypes = [
      // Post & Story
      "post_like",
      "story_like",
      "comment",
      "comment_like",
      "mention",
      "new_post",
      "new_story",

      // Follow
      "follow",
      "follow_request",
      "follow_accepted",

      // Merge Request
      "merge_request",
      "merge_request_accepted",
      "merge_request_rejected",

      // Chat
      "new_message",

      // Profile
      "profile_update",

      // Reminder
      "reminder_due",
    ];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `❌ Invalid notification type. Must be one of: ${validTypes.join(", ")}`,
      });
    }

    // Build data object based on notification type
    let data = {};
    let notificationMessage = "";

    const sender = senderId || req.user.userId;

    switch (type) {
      // Post & Story Types
      case "post_like":
        if (!postId) {
          return res.status(400).json({
            success: false,
            error: "❌ postId is required for post_like notification",
          });
        }
        data = { postId };
        notificationMessage = "Someone liked your post";
        break;

      case "story_like":
        if (!storyId) {
          return res.status(400).json({
            success: false,
            error: "❌ storyId is required for story_like notification",
          });
        }
        data = { storyId };
        notificationMessage = "Someone liked your story";
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
        notificationMessage = "Someone commented on your post";
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
        notificationMessage = "Someone liked your comment";
        break;

      case "mention":
        if (!postId) {
          return res.status(400).json({
            success: false,
            error: "❌ postId is required for mention notification",
          });
        }
        data = { postId };
        notificationMessage = "Someone mentioned you in a post";
        break;

      case "new_post":
        if (!postId) {
          return res.status(400).json({
            success: false,
            error: "❌ postId is required for new_post notification",
          });
        }
        data = { postId };
        notificationMessage = "Someone created a new post";
        break;

      case "new_story":
        if (!storyId) {
          return res.status(400).json({
            success: false,
            error: "❌ storyId is required for new_story notification",
          });
        }
        data = { storyId };
        notificationMessage = "Someone created a new story";
        break;

      // Follow Types
      case "follow":
        data = { userId: userId || sender };
        notificationMessage = "Started following you";
        break;

      case "follow_request":
        data = { userId: userId || sender };
        notificationMessage = "Sent you a follow request";
        break;

      case "follow_accepted":
        data = { userId: userId || sender };
        notificationMessage = "Accepted your follow request";
        break;

      // Merge Request Types
      case "merge_request":
        if (!mergeRequestId) {
          return res.status(400).json({
            success: false,
            error:
              "❌ mergeRequestId is required for merge_request notification",
          });
        }
        data = { mergeRequestId, userId: userId || sender };
        notificationMessage = "Wants to connect with you";
        break;

      case "merge_request_accepted":
        if (!mergeRequestId) {
          return res.status(400).json({
            success: false,
            error:
              "❌ mergeRequestId is required for merge_request_accepted notification",
          });
        }
        data = { mergeRequestId, userId: userId || sender };
        notificationMessage = "Accepted your connection request";
        break;

      case "merge_request_rejected":
        if (!mergeRequestId) {
          return res.status(400).json({
            success: false,
            error:
              "❌ mergeRequestId is required for merge_request_rejected notification",
          });
        }
        data = { mergeRequestId, userId: userId || sender };
        notificationMessage = "Declined your connection request";
        break;

      // Chat Types
      case "new_message":
        if (!mutualConnectionId) {
          return res.status(400).json({
            success: false,
            error:
              "❌ mutualConnectionId is required for new_message notification",
          });
        }
        if (!messageId) {
          return res.status(400).json({
            success: false,
            error: "❌ messageId is required for new_message notification",
          });
        }
        data = {
          mutualConnectionId,
          messageId,
          senderId: sender,
        };
        notificationMessage = "Sent you a message";
        break;

      case "profile_update":
        data = { userId: userId || sender };
        notificationMessage = "Updated their profile";
        break;

      case "reminder_due":
        data = {};
        notificationMessage = "You have a reminder due";
        break;

      default:
        data = {};
        notificationMessage = "You have a new notification";
    }

    // Send the notification
    console.log("📤 Sending test notification...");
    console.log("  - Type:", type);
    console.log("  - Recipient:", recipientId);
    console.log("  - Sender:", sender);
    console.log("  - Data:", data);

    const result = await sendNotificationWithType(
      recipientId,
      type,
      data,
      sender,
    );

    res.json({
      success: true,
      message: `✅ ${type} notification sent successfully`,
      recipientId,
      senderId: sender,
      type,
      data,
      notificationMessage,
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

// ✅ TEST ROUTE: Send all notification types (Updated)
notificationRouter.post("/test-all", userAuth, async (req, res) => {
  try {
    const {
      recipientId,
      senderId,
      postId,
      storyId,
      commentId,
      messageId,
      mutualConnectionId,
      mergeRequestId,
      userId,
    } = req.body;

    if (!recipientId) {
      return res.status(400).json({
        success: false,
        error: "❌ recipientId is required",
      });
    }

    const sender = senderId || req.user.userId;
    const results = [];

    // ✅ ALL notification types
    const testCases = [
      // Post & Story
      { type: "post_like", data: { postId } },
      { type: "story_like", data: { storyId } },
      { type: "comment", data: { postId, commentId } },
      { type: "comment_like", data: { postId, commentId } },
      { type: "mention", data: { postId } },
      { type: "new_post", data: { postId } },
      { type: "new_story", data: { storyId } },

      // Follow
      { type: "follow", data: { userId: userId || sender } },
      { type: "follow_request", data: { userId: userId || sender } },
      { type: "follow_accepted", data: { userId: userId || sender } },

      // Merge Request
      {
        type: "merge_request",
        data: { mergeRequestId, userId: userId || sender },
      },
      {
        type: "merge_request_accepted",
        data: { mergeRequestId, userId: userId || sender },
      },
      {
        type: "merge_request_rejected",
        data: { mergeRequestId, userId: userId || sender },
      },

      // Chat
      {
        type: "new_message",
        data: { mutualConnectionId, messageId, senderId: sender },
      },

      // Profile
      { type: "profile_update", data: { userId: userId || sender } },

      // Reminder
      { type: "reminder_due", data: {} },
    ];

    // Send each notification
    for (const testCase of testCases) {
      // Skip if required data is missing
      if (testCase.type === "post_like" && !postId) continue;
      if (testCase.type === "story_like" && !storyId) continue;
      if (
        (testCase.type === "comment" || testCase.type === "comment_like") &&
        (!postId || !commentId)
      )
        continue;
      if (
        (testCase.type === "mention" || testCase.type === "new_post") &&
        !postId
      )
        continue;
      if (testCase.type === "new_story" && !storyId) continue;
      if (
        (testCase.type === "merge_request" ||
          testCase.type === "merge_request_accepted" ||
          testCase.type === "merge_request_rejected") &&
        !mergeRequestId
      )
        continue;
      if (
        testCase.type === "new_message" &&
        (!mutualConnectionId || !messageId)
      )
        continue;

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
