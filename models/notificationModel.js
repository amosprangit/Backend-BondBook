import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        return this.type !== "reminder_due";
      },
      default: null,
    },

    type: {
      type: String,
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
    },

    message: {
      type: String,
      required: true,
    },

    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "relatedModel",
      default: null,
    },

    relatedModel: {
      type: String,
      enum: [
        "Post",
        "Story",
        "User",
        "FollowRequest",
        "MergeRequest",
        "MutualConnection",
        "Reminder",
        "Message",
        null,
      ],
      default: null,
    },

    category: {
      type: String,
      default: "social",
      index: true,
    },

    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
    },

    extras: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Read Status
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

notificationSchema.index({
  user: 1,
  isRead: 1,
  createdAt: -1,
});

// All notifications
notificationSchema.index({
  user: 1,
  createdAt: -1,
});

// Notifications by type
notificationSchema.index({
  user: 1,
  type: 1,
  createdAt: -1,
});

// Notifications by category
notificationSchema.index({
  user: 1,
  category: 1,
  createdAt: -1,
});

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
