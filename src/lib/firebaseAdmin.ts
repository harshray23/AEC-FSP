
import admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

let db: admin.firestore.Firestore | undefined;
let auth: admin.auth.Auth | undefined;

try {
  if (!admin.apps.length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    if (!projectId || !clientEmail || !privateKey) {
      console.warn("Firebase Admin SDK credentials (PROJECT_ID, CLIENT_EMAIL, or PRIVATE_KEY) are missing from environment variables.");
    } else {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: projectId,
          clientEmail: clientEmail,
          // Handle potential newlines in the private key from environment variables
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
      console.log(`Firebase Admin SDK initialized successfully for project: ${projectId}`);
    }
  }

  if (admin.apps.length > 0) {
    db = admin.firestore();
    auth = admin.auth();
  }
} catch (error: any) {
  console.error("CRITICAL: Firebase Admin SDK setup failed:", error.message);
  db = undefined;
  auth = undefined;
}

export { db, auth, Timestamp };
