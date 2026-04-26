
import { initializeApp, getApp, getApps } from "firebase/app";
import { initializeFirestore, CACHE_SIZE_UNLIMITED } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { firebaseConfig } from "./config";

// Initialize Firebase only if it hasn't been initialized yet
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

/**
 * Initialize Firestore with specific settings for Cloud Workstation compatibility.
 * experimentalForceLongPolling: true is critical for avoiding connection issues in 
 * restricted network environments. 
 * Note: Cannot be used with experimentalAutoDetectLongPolling.
 */
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

const auth = getAuth(app);

export { app, db, auth };
