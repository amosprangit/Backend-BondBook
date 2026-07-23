export const NotificationTypes = Object.freeze({
  FOLLOW_REQUEST: "follow_request",
  FOLLOW_ACCEPTED: "follow_accepted",
  POST_LIKE: "post_like",
  POST_COMMENT: "comment",
  COMMENT_LIKE: "comment_like",
  STORY_LIKE: "story_like",
  STORY_COMMENT: "story_comment",
  NEW_MESSAGE: "new_message",
  MERGE_REQUEST: "merge_request",
  MERGE_REQUEST_ACCEPTED: "merge_request_accepted",
  MERGE_REQUEST_REJECTED: "merge_request_rejected",
  PROFILE_MENTION: "mention",
  SYSTEM: "system",
  ANNOUNCEMENT: "announcement",
  REMINDER: "reminder",
  EVENT_INVITE: "event_invite",
  EVENT_REMINDER: "event_reminder",

  REEL_LIKE: "reel_like",
  REEL_COMMENT: "reel_comment",

  LIVE_STARTED: "live_started",

  GROUP_INVITE: "group_invite",

  FRIEND_SUGGESTION: "friend_suggestion",

  ACCOUNT_WARNING: "account_warning",

  ACCOUNT_VERIFIED: "account_verified",
});

export const RelatedModels = Object.freeze({
  USER: "User",

  POST: "Post",

  COMMENT: "Comment",

  STORY: "Story",

  MESSAGE: "Message",

  MERGE_REQUEST: "MergeRequest",

  EVENT: "Event",

  REEL: "Reel",

  SYSTEM: "System",
});

export const NotificationPriority = Object.freeze({
  LOW: "low",

  NORMAL: "normal",

  HIGH: "high",

  URGENT: "urgent",
});

export const NotificationCategory = Object.freeze({
  SOCIAL: "social",

  CHAT: "chat",

  CONTENT: "content",

  SYSTEM: "system",

  EVENT: "event",
});

export const NotificationCategoryMap = Object.freeze({
  [NotificationTypes.FOLLOW_REQUEST]: NotificationCategory.SOCIAL,

  [NotificationTypes.FOLLOW_ACCEPTED]: NotificationCategory.SOCIAL,

  [NotificationTypes.POST_LIKE]: NotificationCategory.CONTENT,

  [NotificationTypes.POST_COMMENT]: NotificationCategory.CONTENT,

  [NotificationTypes.COMMENT_LIKE]: NotificationCategory.CONTENT,

  [NotificationTypes.STORY_LIKE]: NotificationCategory.CONTENT,

  [NotificationTypes.STORY_COMMENT]: NotificationCategory.CONTENT,

  [NotificationTypes.NEW_MESSAGE]: NotificationCategory.CHAT,

  [NotificationTypes.MERGE_REQUEST]: NotificationCategory.SOCIAL,

  [NotificationTypes.MERGE_REQUEST_ACCEPTED]: NotificationCategory.SOCIAL,

  [NotificationTypes.MERGE_REQUEST_REJECTED]: NotificationCategory.SOCIAL,

  [NotificationTypes.PROFILE_MENTION]: NotificationCategory.CONTENT,

  [NotificationTypes.SYSTEM]: NotificationCategory.SYSTEM,

  [NotificationTypes.ANNOUNCEMENT]: NotificationCategory.SYSTEM,

  [NotificationTypes.REMINDER]: NotificationCategory.SYSTEM,
});

export const NotificationPriorityMap = Object.freeze({
  [NotificationTypes.NEW_MESSAGE]: NotificationPriority.HIGH,

  [NotificationTypes.FOLLOW_REQUEST]: NotificationPriority.NORMAL,

  [NotificationTypes.FOLLOW_ACCEPTED]: NotificationPriority.NORMAL,

  [NotificationTypes.POST_LIKE]: NotificationPriority.NORMAL,

  [NotificationTypes.POST_COMMENT]: NotificationPriority.NORMAL,

  [NotificationTypes.COMMENT_LIKE]: NotificationPriority.NORMAL,

  [NotificationTypes.STORY_LIKE]: NotificationPriority.NORMAL,

  [NotificationTypes.STORY_COMMENT]: NotificationPriority.NORMAL,

  [NotificationTypes.MERGE_REQUEST]: NotificationPriority.HIGH,

  [NotificationTypes.MERGE_REQUEST_ACCEPTED]: NotificationPriority.HIGH,

  [NotificationTypes.MERGE_REQUEST_REJECTED]: NotificationPriority.NORMAL,

  [NotificationTypes.SYSTEM]: NotificationPriority.HIGH,

  [NotificationTypes.ANNOUNCEMENT]: NotificationPriority.HIGH,

  [NotificationTypes.REMINDER]: NotificationPriority.NORMAL,
});
export const isValidNotificationType = (type) => {
  return Object.values(NotificationTypes).includes(type);
};

export const getNotificationCategory = (type) => {
  return NotificationCategoryMap[type] || NotificationCategory.SYSTEM;
};

export const getNotificationPriority = (type) => {
  return NotificationPriorityMap[type] || NotificationPriority.NORMAL;
};

export const isChatNotification = (type) =>
  type === NotificationTypes.NEW_MESSAGE;

export const isSocialNotification = (type) =>
  getNotificationCategory(type) === NotificationCategory.SOCIAL;

export const isContentNotification = (type) =>
  getNotificationCategory(type) === NotificationCategory.CONTENT;

export const isSystemNotification = (type) =>
  getNotificationCategory(type) === NotificationCategory.SYSTEM;
