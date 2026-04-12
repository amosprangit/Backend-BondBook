import admin from "../config/firebaseAdmin.js";

export const sendPushNotification = async (token, title, body, data = {}) => {
  const message = {
    token: token,
    notification: {
      title,
      body,
    },
    data,
  };

  try {
    await admin.messaging().send(message);
    console.log("Notification sent successfully");
  } catch (error) {
    console.error("Notification error:", error);
  }
};
