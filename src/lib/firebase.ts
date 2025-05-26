
// src/lib/firebase.ts
import { initializeApp, getApp, getApps, type FirebaseOptions, type FirebaseApp } from "firebase/app";
import { getAuth, browserLocalPersistence, initializeAuth, type Auth } from "firebase/auth"; // Added Auth type
import { getFirestore, initializeFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
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
let authInstance: Auth; // Used Auth type
let firestoreInstance: Firestore;
let storageInstance: FirebaseStorage;
let appCheckInstance: AppCheck | undefined;

const APP_NAME = "PokerConnectApp"; // Explicitly named app

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error(
    "Firebase.ts: Critical Firebase API Key or Project ID is missing in environment variables. Firebase will not initialize correctly. Check your .env file."
  );
  // Assign dummy objects to prevent further runtime errors if Firebase doesn't initialize
  app = {} as FirebaseApp;
  authInstance = {} as Auth;
  firestoreInstance = {} as Firestore;
  storageInstance = {} as FirebaseStorage;
  appCheckInstance = undefined;

} else {
  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig, APP_NAME);
      console.log(`Firebase.ts: Initialized new Firebase app: ${APP_NAME}`);
    } catch (initError) {
      console.error(`Firebase.ts: Critical error initializing Firebase app '${APP_NAME}':`, initError);
      console.error("Firebase.ts: Firebase config used:", firebaseConfig);
      app = {} as FirebaseApp; // Assign dummy app on error
    }
  } else {
    try {
      app = getApp(APP_NAME);
      console.log(`Firebase.ts: Retrieved existing Firebase app: ${APP_NAME}`);
    } catch (e) {
      console.warn(`Firebase.ts: Could not get app named '${APP_NAME}', trying default app.`);
      app = getApps().length ? getApp() : initializeApp(firebaseConfig); // Fallback to default if named app retrieval fails or if no apps are initialized.
      console.log(`Firebase.ts: Using default Firebase app: ${app.name}`);
    }
  }

  // Initialize services only if app initialization was successful
  if (app && app.name) {
    try {
      // Use initializeAuth for modular SDK with persistence options
      authInstance = initializeAuth(app, { persistence: browserLocalPersistence });
      console.log(`Firebase.ts: Auth instance initialized from app: ${app.name}`);
    } catch (e) {
      console.error(`Firebase.ts: Error initializing Auth for app '${app.name}':`, e);
      authInstance = {} as Auth;
    }

    try {
      // Explicitly connect to the (default) database instance.
      // For the default database, the databaseId is "(default)".
      firestoreInstance = initializeFirestore(app, { databaseId: "(default)" });
      console.log(`Firebase.ts: Firestore instance initialized for databaseId '(default)' from app: ${app.name}:`, firestoreInstance);
    } catch (e) {
      console.error(`Firebase.ts: Error initializing Firestore for databaseId '(default)' from app '${app.name}':`, e);
      firestoreInstance = {} as Firestore;
    }

    try {
      storageInstance = getStorage(app);
      console.log(`Firebase.ts: Storage instance initialized from app: ${app.name}`);
    } catch (e) {
      console.error(`Firebase.ts: Error initializing Storage for app '${app.name}':`, e);
      storageInstance = {} as FirebaseStorage;
    }

    if (typeof window !== 'undefined') { // Ensure App Check is initialized only on client
      try {
        console.log("Firebase.ts: Attempting to initialize App Check...");
        const reCaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

        if (reCaptchaSiteKey) {
          appCheckInstance = initializeAppCheck(app, {
            provider: new ReCaptchaV3Provider(reCaptchaSiteKey),
            isTokenAutoRefreshEnabled: true
          });
          console.log(`Firebase.ts: App Check initialized successfully with ReCaptchaV3Provider for app: ${app.name}.`);
        } else {
          console.warn("Firebase.ts: NEXT_PUBLIC_RECAPTCHA_SITE_KEY is not set. App Check with reCAPTCHA is not initialized. For local development with a debug token, set window.FIREBASE_APPCHECK_DEBUG_TOKEN in the browser console BEFORE Firebase initializes.");
        }
      } catch(e: any) {
        console.error(`Firebase.ts: CRITICAL Error initializing App Check for app '${app.name}':`, e.message, e.stack, e);
        appCheckInstance = undefined;
      }
    } else {
      console.log("Firebase.ts: App Check initialization skipped (server-side or window not defined).");
    }

  } else {
    console.error("Firebase.ts: Firebase app object is not valid. Firebase services (Auth, Firestore, Storage, App Check) cannot be initialized.");
    // Ensure all instances are dummy objects if app is not valid
    authInstance = {} as Auth;
    firestoreInstance = {} as Firestore;
    storageInstance = {} as FirebaseStorage;
    appCheckInstance = undefined;
  }
}

export { app, storageInstance as storage, authInstance as auth, firestoreInstance as firestore, appCheckInstance as appCheck };
