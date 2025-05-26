
// src/lib/firebase.ts
import { initializeApp, getApp, getApps, type FirebaseOptions, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check"; // Changed import path

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
  app = {} as FirebaseApp; 
} else {
  if (!getApps().find(existingApp => existingApp.name === APP_NAME)) {
    try {
      app = initializeApp(firebaseConfig, APP_NAME);
      console.log(`Firebase.ts: Initialized new Firebase app: ${APP_NAME}`);
    } catch (initError) {
      console.error(`Firebase.ts: Critical error initializing Firebase app '${APP_NAME}':`, initError);
      console.error("Firebase.ts: Firebase config used:", firebaseConfig);
      app = {} as FirebaseApp;
    }
  } else {
    app = getApp(APP_NAME); 
    console.log(`Firebase.ts: Retrieved existing Firebase app: ${APP_NAME}`);
  }
}

let authInstance: ReturnType<typeof getAuth>;
let firestoreInstance: ReturnType<typeof getFirestore>;
let storageInstance: ReturnType<typeof getStorage>;
let appCheckInstance;

if (app && app.name) { 
  try {
    const reCaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (reCaptchaSiteKey && typeof window !== 'undefined') { // Ensure App Check is initialized only on client
        appCheckInstance = initializeAppCheck(app, {
            provider: new ReCaptchaV3Provider(reCaptchaSiteKey),
            isTokenAutoRefreshEnabled: true 
        });
        console.log(`Firebase.ts: App Check initialized with ReCaptchaV3Provider for app: ${app.name}`);
    } else if (typeof window !== 'undefined') { // Only log warning on client
        console.warn("Firebase.ts: NEXT_PUBLIC_RECAPTCHA_SITE_KEY is not set or window is not defined. App Check with reCAPTCHA is not initialized. For local development with a debug token, set window.FIREBASE_APPCHECK_DEBUG_TOKEN in the browser console.");
    }
  } catch(e) {
    console.error(`Firebase.ts: Error initializing App Check for app '${app.name}':`, e);
  }

  try {
    authInstance = getAuth(app);
    console.log(`Firebase.ts: Auth instance initialized from app: ${app.name}`);
  } catch (e) {
    console.error(`Firebase.ts: Error initializing Auth for app '${app.name}':`, e);
    authInstance = {} as any;
  }

  try {
    firestoreInstance = getFirestore(app);
    console.log(`Firebase.ts: Firestore instance initialized from app: ${app.name}`, firestoreInstance);
  } catch (e) {
    console.error(`Firebase.ts: Error initializing Firestore for app '${app.name}':`, e);
    firestoreInstance = {} as any;
  }

  try {
    storageInstance = getStorage(app);
    console.log(`Firebase.ts: Storage instance initialized from app: ${app.name}`);
  } catch (e) {
    console.error(`Firebase.ts: Error initializing Storage for app '${app.name}':`, e);
    storageInstance = {} as any;
  }
} else {
  console.error("Firebase.ts: Firebase app not available or not correctly initialized. Services (Auth, Firestore, Storage, App Check) cannot be initialized.");
  authInstance = {} as any;
  firestoreInstance = {} as any;
  storageInstance = {} as any;
}

export { app, storageInstance as storage, authInstance as auth, firestoreInstance as firestore, appCheckInstance as appCheck };
