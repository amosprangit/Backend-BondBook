import {
  NotificationTypes,
  RelatedModels,
  getNotificationPriority,
  getNotificationCategory,
} from "./notificationTypes.js";

export const buildNotification = ({ type, sender = null, data = {} }) => {
  const senderName = sender?.username || "Someone";

  const notification = {
    type,

    title: "",

    body: "",

    relatedId: null,

    relatedModel: null,

    priority: getNotificationPriority(type),

    category: getNotificationCategory(type),

    extras: {},
  };

  switch (type) {
    case NotificationTypes.FOLLOW_REQUEST:
      notification.title = "👋 New Follow Request";

      notification.body = `${senderName} wants to follow you`;

      notification.relatedId = sender?._id;

      notification.relatedModel = RelatedModels.USER;

      break;

    case NotificationTypes.FOLLOW_ACCEPTED:
      notification.title = "✅ Follow Request Accepted";

      notification.body = `${senderName} accepted your request`;

      notification.relatedId = sender?._id;

      notification.relatedModel = RelatedModels.USER;

      break;

    case NotificationTypes.POST_LIKE:
      notification.title = "❤️ Post Liked";

      notification.body = `${senderName} liked your post`;

      notification.relatedId = data.postId;

      notification.relatedModel = RelatedModels.POST;

      break;

    case NotificationTypes.POST_COMMENT:
      notification.title = "💬 New Comment";

      notification.body = `${senderName} commented on your post`;

      notification.relatedId = data.postId;

      notification.relatedModel = RelatedModels.POST;

      notification.extras.commentId = data.commentId;

      break;

    case NotificationTypes.COMMENT_LIKE:
      notification.title = "❤️ Comment Liked";

      notification.body = `${senderName} liked your comment`;

      notification.relatedId = data.commentId;

      notification.relatedModel = RelatedModels.COMMENT;

      break;

    case NotificationTypes.STORY_LIKE:
      notification.title = "❤️ Story Liked";

      notification.body = `${senderName} liked your story`;

      notification.relatedId = data.storyId;

      notification.relatedModel = RelatedModels.STORY;

      break;

    case NotificationTypes.STORY_COMMENT:
      notification.title = "💬 Story Comment";

      notification.body = `${senderName} commented on your story`;

      notification.relatedId = data.storyId;

      notification.relatedModel = RelatedModels.STORY;

      break;

    case NotificationTypes.NEW_MESSAGE:
      notification.title = senderName;

      notification.body = data.content || "Sent you a message";

      notification.relatedId = data.mutualConnectionId;

      notification.relatedModel = RelatedModels.MESSAGE;

      notification.extras.messageId = data.messageId;

      notification.extras.content = data.content;

      break;

    case NotificationTypes.MERGE_REQUEST:
      notification.title = "🔗 Connection Request";

      notification.body = `${senderName} wants to connect`;

      notification.relatedId = data.mergeRequestId;

      notification.relatedModel = RelatedModels.MERGE_REQUEST;

      break;

    case NotificationTypes.MERGE_REQUEST_ACCEPTED:
      notification.title = "✅ Connection Accepted";

      notification.body = `${senderName} accepted your request`;

      notification.relatedId = data.connectionId;

      notification.relatedModel = RelatedModels.USER;

      break;
    case NotificationTypes.MERGE_REQUEST_REJECTED:
      notification.title = "❌ Connection Declined";

      notification.body = `${senderName} declined your request`;

      notification.relatedId = data.mergeRequestId;

      notification.relatedModel = RelatedModels.MERGE_REQUEST;

      break;

    case NotificationTypes.PROFILE_MENTION:
      notification.title = "📢 You were mentioned";

      notification.body = `${senderName} mentioned you`;

      notification.relatedId = data.postId;

      notification.relatedModel = RelatedModels.POST;

      break;

    case NotificationTypes.SYSTEM:
      notification.title = data.title || "System";

      notification.body = data.body || "";

      notification.relatedModel = RelatedModels.SYSTEM;

      break;

    default:
      notification.title = "BondBook";

      notification.body = "You have a new notification";

      notification.relatedModel = RelatedModels.SYSTEM;

      break;
  }

  return notification;
};
