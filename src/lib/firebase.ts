
// src/lib/firebase.ts
import { initializeApp, getApp, getApps, type FirebaseOptions, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { initializeAppCheck, ReCaptchaV3Provider, type AppCheck } from "firebase/app-check";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
};

let app: FirebaseApp;
const APP_NAME = "PokerConnectApp"; // Explicitly named app

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error(
    "Firebase.ts: Critical Firebase API Key or Project ID is missing in environment variables. Firebase will not initialize correctly. Check your .env file."
  );
  // To prevent further errors, we assign a dummy app, though services will fail.
  app = {} as FirebaseApp; 
} else {
  // Initialize Firebase
  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
      console.log("Firebase.ts: Initialized default Firebase app.");
    } catch (initError) {
      console.error("Firebase.ts: Critical error initializing default Firebase app:", initError);
      console.error("Firebase.ts: Firebase config used:", firebaseConfig);
      app = {} as FirebaseApp;
    }
  } else {
    app = getApp(); // Get default app
    console.log("Firebase.ts: Retrieved existing default Firebase app.");
  }
}

let authInstance: ReturnType<typeof getAuth>;
let firestoreInstance: ReturnType<typeof getFirestore>;
let storageInstance: ReturnType<typeof getStorage>;
let appCheckInstance: AppCheck | undefined;

if (app && app.name) { // Check if app was successfully initialized or retrieved
  try {
    console.log("Firebase.ts: Attempting to initialize App Check...");
    const reCaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

    if (typeof window !== 'undefined') { // Ensure App Check is initialized only on client
      if (reCaptchaSiteKey) {
        appCheckInstance = initializeAppCheck(app, {
            provider: new ReCaptchaV3Provider(reCaptchaSiteKey),
            isTokenAutoRefreshEnabled: true 
        });
        console.log(`Firebase.ts: App Check initialized successfully with ReCaptchaV3Provider for app: ${app.name}.`);
      } else {
        console.warn("Firebase.ts: NEXT_PUBLIC_RECAPTCHA_SITE_KEY is not set. App Check with reCAPTCHA is not initialized. For local development with a debug token, set window.FIREBASE_APPCHECK_DEBUG_TOKEN in the browser console BEFORE Firebase initializes.");
      }
    } else {
      console.log("Firebase.ts: App Check initialization skipped (server-side or window not defined).");
    }
  } catch(e: any) {
    console.error(`Firebase.ts: CRITICAL Error initializing App Check for app '${app.name}':`, e.message, e.stack, e);
    appCheckInstance = undefined;
  }

  try {
    authInstance = getAuth(app);
    console.log(`Firebase.ts: Auth instance initialized from app: ${app.name}`);
  } catch (e) {
    console.error(`Firebase.ts: Error initializing Auth for app '${app.name}':`, e);
    authInstance = {} as any; // Assign dummy to prevent further crashes
  }

  try {
    firestoreInstance = getFirestore(app);
    console.log(`Firebase.ts: Firestore instance initialized:`, firestoreInstance);
  } catch (e) {
    console.error(`Firebase.ts: Error initializing Firestore for app '${app.name}':`, e);
    firestoreInstance = {} as any; // Assign dummy
  }

  try {
    storageInstance = getStorage(app);
    console.log(`Firebase.ts: Storage instance initialized from app: ${app.name}`);
  } catch (e) {
    console.error(`Firebase.ts: Error initializing Storage for app '${app.name}':`, e);
    storageInstance = {} as any; // Assign dummy
  }
} else {
  console.error("Firebase.ts: Firebase app object is not valid. Firebase services (Auth, Firestore, Storage, App Check) cannot be initialized.");
  authInstance = {} as any;
  firestoreInstance = {} as any;
  storageInstance = {} as any;
  appCheckInstance = undefined;
}

export { app, storageInstance as storage, authInstance as auth, firestoreInstance as firestore, appCheckInstance as appCheck };
