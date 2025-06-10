import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig, "PokerConnectApp");
console.log("Firebase app initialized:", app.name);

// Initialize App Check
const appCheckSiteKey = process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY;
if (appCheckSiteKey) {
  console.log("Firebase.ts: Attempting to initialize App Check with reCAPTCHA site key:", appCheckSiteKey);
  try {
    const appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
    console.log("Firebase.ts: App Check initialized successfully with ReCaptchaV3Provider for app:", app.name);
  } catch (error) {
    console.error("Firebase.ts: Failed to initialize App Check:", error.message);
  }
} else {
  console.error("Firebase.ts: App Check site key not found. App Check will not be initialized.");
}

// Initialize Firebase services
const auth = getAuth(app);
const firestore = getFirestore(app, "poker");
const storage = getStorage(app);

console.log("Firebase.ts: Storage instance initialized from app:", app.name);

export { app, auth, firestore, storage };