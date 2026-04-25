import admin from "../config/firebaseAdmin.js";

export const sendPushNotification = async (token, title, body, data = {}) => {
  try {
    if (!token) {
      console.log("❌ No FCM token provided");
      return;
    }

    const message = {
      token,

      notification: {
        title,
        body,
      },

      data: {
        ...data,
      },

      android: {
        priority: "high",
        notification: {
          sound: "default",
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

    console.log("📨 Sending notification to token:", token);

    const response = await admin.messaging().send(message);

    console.log("✅ Notification sent successfully:", response);
  } catch (error) {
    console.error("❌ Notification error:", error);
  }
};
