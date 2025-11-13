// src/config/firebaseAdmin.js
import admin from "firebase-admin";

let app;
if (!admin.apps.length) {
  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey    = process.env.FIREBASE_PRIVATE_KEY;

  // handle \n in env
  if (privateKey && privateKey.includes("\\n")) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
} else {
  app = admin.app();
}

export const fcm = admin.messaging();
export default app;
