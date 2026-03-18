
// Your web app's Firebase configuration
// The apiKey is provided by the user. Other values are derived from environment variables or sensible defaults.
const firebaseConfig = {
  apiKey: "AIzaSyDyqnjYWu8dnHAzLYcqyjpLDWZNlA_txN0",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "aec-fsp.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "aec-fsp",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "aec-fsp.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

export { firebaseConfig };
