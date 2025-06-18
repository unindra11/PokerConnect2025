import { initializeApp, FirebaseApp } from "firebase/app";
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

let app: FirebaseApp;
let auth: ReturnType<typeof getAuth>;
let firestore: ReturnType<typeof getFirestore>;
let storage: ReturnType<typeof getStorage>;

const initializeFirebase = () => {
  if (!app) {
    if (!firebaseConfig.apiKey) {
      console.error("Firebase API key is missing in environment variables.");
      throw new Error("Firebase configuration is incomplete.");
    }
    app = initializeApp(firebaseConfig, "PokerConnectApp");
    console.log("Firebase app initialized:", app.name);

    // Initialize App Check
    const appCheckSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
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
      console.warn("Firebase.ts: App Check site key not found. App Check will not be initialized.");
    }

    // Initialize Firebase services
    auth = getAuth(app);
    firestore = getFirestore(app, "poker");
    storage = getStorage(app);

    console.log("Firebase.ts: Storage instance initialized from app:", app.name);
  }
  return { app, auth, firestore, storage };
};

export default initializeFirebase;