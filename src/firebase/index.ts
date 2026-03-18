
import { initializeApp, getApp, getApps } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { firebaseConfig } from "./config";

// Initialize Firebase only if it hasn't been initialized yet
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

/**
 * Initialize Firestore with specific settings.
 * experimentalForceLongPolling: true is critical for avoiding "client is offline" 
 * errors in restricted network environments like Cloud Workstations or behind certain proxies.
 */
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

const auth = getAuth(app);

export { app, db, auth };
