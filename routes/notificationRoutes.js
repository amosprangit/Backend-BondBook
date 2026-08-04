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

// ✅ Helper function to validate required fields
const validateRequiredFields = (fields, res) => {
  for (const [field, value] of Object.entries(fields)) {
    if (!value) {
      return res.status(400).json({
        success: false,
        error: `❌ ${field} is required`,
      });
    }
  }
  return null;
};

// ✅ Helper function to send notification
const sendTestNotification = async (
  req,
  res,
  type,
  requiredFields,
  dataBuilder,
) => {
  try {
    const { recipientId, senderId } = req.body;

    // Validate recipientId
    const validationError = validateRequiredFields({ recipientId }, res);
    if (validationError) return validationError;

    // Validate type-specific required fields
    const fieldValidation = validateRequiredFields(requiredFields, res);
    if (fieldValidation) return fieldValidation;

    const sender = senderId || req.user.userId;
    const data = dataBuilder(req.body, sender);

    console.log(`📤 Sending ${type} notification...`);
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
      result,
    });
  } catch (error) {
    console.error(`❌ ${type} notification error:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// ============================================
// 📝 POST & STORY NOTIFICATIONS
// ============================================

// ✅ Post Like
notificationRouter.post("/test/post-like", userAuth, (req, res) => {
  sendTestNotification(
    req,
    res,
    "post_like",
    { postId: req.body.postId },
    (body) => ({ postId: body.postId }),
  );
});

// ✅ Story Like
notificationRouter.post("/test/story-like", userAuth, (req, res) => {
  sendTestNotification(
    req,
    res,
    "story_like",
    { storyId: req.body.storyId },
    (body) => ({ storyId: body.storyId }),
  );
});

// ✅ Comment
notificationRouter.post("/test/comment", userAuth, (req, res) => {
  sendTestNotification(
    req,
    res,
    "comment",
    { postId: req.body.postId, commentId: req.body.commentId },
    (body) => ({ postId: body.postId, commentId: body.commentId }),
  );
});

// ✅ Comment Like
notificationRouter.post("/test/comment-like", userAuth, (req, res) => {
  sendTestNotification(
    req,
    res,
    "comment_like",
    { postId: req.body.postId, commentId: req.body.commentId },
    (body) => ({ postId: body.postId, commentId: body.commentId }),
  );
});

// ✅ Mention
notificationRouter.post("/test/mention", userAuth, (req, res) => {
  sendTestNotification(
    req,
    res,
    "mention",
    { postId: req.body.postId },
    (body) => ({ postId: body.postId }),
  );
});

// ✅ New Post
notificationRouter.post("/test/new-post", userAuth, (req, res) => {
  sendTestNotification(
    req,
    res,
    "new_post",
    { postId: req.body.postId },
    (body) => ({ postId: body.postId }),
  );
});

// ✅ New Story
notificationRouter.post("/test/new-story", userAuth, (req, res) => {
  sendTestNotification(
    req,
    res,
    "new_story",
    { storyId: req.body.storyId },
    (body) => ({ storyId: body.storyId }),
  );
});

// ============================================
// 👥 FOLLOW NOTIFICATIONS
// ============================================

// ✅ Follow
notificationRouter.post("/test/follow", userAuth, (req, res) => {
  sendTestNotification(
    req,
    res,
    "follow",
    { userId: req.body.userId || req.user.userId },
    (body, sender) => ({ userId: body.userId || sender }),
  );
});

// ✅ Follow Request
notificationRouter.post("/test/follow-request", userAuth, (req, res) => {
  sendTestNotification(
    req,
    res,
    "follow_request",
    { userId: req.body.userId || req.user.userId },
    (body, sender) => ({ userId: body.userId || sender }),
  );
});

// ✅ Follow Accepted
notificationRouter.post("/test/follow-accepted", userAuth, (req, res) => {
  sendTestNotification(
    req,
    res,
    "follow_accepted",
    { userId: req.body.userId || req.user.userId },
    (body, sender) => ({ userId: body.userId || sender }),
  );
});

// ============================================
// 🔗 MERGE REQUEST NOTIFICATIONS
// ============================================

// ✅ Merge Request
notificationRouter.post("/test/merge-request", userAuth, (req, res) => {
  sendTestNotification(
    req,
    res,
    "merge_request",
    { mergeRequestId: req.body.mergeRequestId },
    (body, sender) => ({
      mergeRequestId: body.mergeRequestId,
      userId: body.userId || sender,
    }),
  );
});

// ✅ Merge Request Accepted
notificationRouter.post(
  "/test/merge-request-accepted",
  userAuth,
  (req, res) => {
    sendTestNotification(
      req,
      res,
      "merge_request_accepted",
      { mergeRequestId: req.body.mergeRequestId },
      (body, sender) => ({
        mergeRequestId: body.mergeRequestId,
        userId: body.userId || sender,
      }),
    );
  },
);

// ✅ Merge Request Rejected
notificationRouter.post(
  "/test/merge-request-rejected",
  userAuth,
  (req, res) => {
    sendTestNotification(
      req,
      res,
      "merge_request_rejected",
      { mergeRequestId: req.body.mergeRequestId },
      (body, sender) => ({
        mergeRequestId: body.mergeRequestId,
        userId: body.userId || sender,
      }),
    );
  },
);

// ============================================
// 💬 CHAT NOTIFICATIONS
// ============================================

// ✅ New Message
notificationRouter.post("/test/new-message", userAuth, (req, res) => {
  sendTestNotification(
    req,
    res,
    "new_message",
    {
      mutualConnectionId: req.body.mutualConnectionId,
      messageId: req.body.messageId,
    },
    (body, sender) => ({
      mutualConnectionId: body.mutualConnectionId,
      messageId: body.messageId,
      senderId: sender,
    }),
  );
});

// ============================================
// 👤 PROFILE NOTIFICATIONS
// ============================================

// ✅ Profile Update
notificationRouter.post("/test/profile-update", userAuth, (req, res) => {
  sendTestNotification(
    req,
    res,
    "profile_update",
    { userId: req.body.userId || req.user.userId },
    (body, sender) => ({ userId: body.userId || sender }),
  );
});

// ============================================
// ⏰ REMINDER NOTIFICATIONS
// ============================================

// ✅ Reminder Due
notificationRouter.post("/test/reminder-due", userAuth, (req, res) => {
  sendTestNotification(
    req,
    res,
    "reminder_due",
    {}, // No required fields
    () => ({}), // No data needed
  );
});

// ============================================
// 🧪 TEST ALL (Keep for convenience)
// ============================================

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

    // ✅ ALL notification types with their required data
    const testCases = [
      // Post & Story
      { type: "post_like", data: { postId }, required: !!postId },
      { type: "story_like", data: { storyId }, required: !!storyId },
      {
        type: "comment",
        data: { postId, commentId },
        required: !!(postId && commentId),
      },
      {
        type: "comment_like",
        data: { postId, commentId },
        required: !!(postId && commentId),
      },
      { type: "mention", data: { postId }, required: !!postId },
      { type: "new_post", data: { postId }, required: !!postId },
      { type: "new_story", data: { storyId }, required: !!storyId },

      // Follow
      { type: "follow", data: { userId: userId || sender }, required: true },
      {
        type: "follow_request",
        data: { userId: userId || sender },
        required: true,
      },
      {
        type: "follow_accepted",
        data: { userId: userId || sender },
        required: true,
      },

      // Merge Request
      {
        type: "merge_request",
        data: { mergeRequestId, userId: userId || sender },
        required: !!mergeRequestId,
      },
      {
        type: "merge_request_accepted",
        data: { mergeRequestId, userId: userId || sender },
        required: !!mergeRequestId,
      },
      {
        type: "merge_request_rejected",
        data: { mergeRequestId, userId: userId || sender },
        required: !!mergeRequestId,
      },

      // Chat
      {
        type: "new_message",
        data: { mutualConnectionId, messageId, senderId: sender },
        required: !!(mutualConnectionId && messageId),
      },

      // Profile
      {
        type: "profile_update",
        data: { userId: userId || sender },
        required: true,
      },

      // Reminder
      { type: "reminder_due", data: {}, required: true },
    ];

    // Send each notification if required data is present
    for (const testCase of testCases) {
      if (!testCase.required) continue;

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