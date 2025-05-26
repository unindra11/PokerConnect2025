
// src/lib/firebase.ts
import { initializeApp, getApp, getApps, type FirebaseOptions, type FirebaseApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const APP_NAME = "PokerConnectApp"; // Define a unique name for your app

let app: FirebaseApp;

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.warn(
    "Firebase.ts: Firebase API Key or Project ID is missing in environment variables. Firebase features might not work. Check your .env file and ensure it's loaded correctly."
  );
}

try {
  // Attempt to get an existing app with this name
  app = getApp(APP_NAME);
  console.log(`Firebase.ts: Retrieved existing Firebase app: ${APP_NAME}`);
} catch (e) {
  // If app doesn't exist, initialize it
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error("Firebase.ts: Cannot initialize Firebase - missing API Key or Project ID in config. App will not function correctly.");
    // Create a placeholder to prevent crashes if services are called, but log the severe error.
    app = {} as FirebaseApp; 
  } else {
    try {
      app = initializeApp(firebaseConfig, APP_NAME);
      console.log(`Firebase.ts: Initialized new Firebase app: ${APP_NAME}`);
    } catch (initError) {
      console.error(`Firebase.ts: Critical error initializing Firebase app '${APP_NAME}':`, initError);
      console.error("Firebase.ts: Firebase config used:", firebaseConfig);
      app = {} as FirebaseApp; // Placeholder on error
    }
  }
}


let auth: ReturnType<typeof getAuth>;
let firestore: ReturnType<typeof getFirestore>;
let storage: ReturnType<typeof getStorage>;

// Initialize services, guarding against app initialization failure
if (app && app.name === APP_NAME) { // Check if app was successfully initialized or retrieved
  try {
    auth = getAuth(app);
    console.log("Firebase.ts: Auth instance initialized from app:", APP_NAME);
  } catch (e) {
    console.error(`Firebase.ts: Error initializing Auth for app '${APP_NAME}':`, e);
    auth = {} as any; // Placeholder
  }

  try {
    firestore = getFirestore(app);
    console.log("Firebase.ts: Firestore instance initialized:", firestore); // Log instance
  } catch (e) {
    console.error(`Firebase.ts: Error initializing Firestore for app '${APP_NAME}':`, e);
    firestore = {} as any; // Placeholder
  }

  try {
    storage = getStorage(app);
    console.log("Firebase.ts: Storage instance initialized from app:", APP_NAME);
  } catch (e) {
    console.error(`Firebase.ts: Error initializing Storage for app '${APP_NAME}':`, e);
    storage = {} as any; // Placeholder
  }
} else {
  console.error(`Firebase.ts: Firebase app '${APP_NAME}' not available. Services (Auth, Firestore, Storage) cannot be initialized.`);
  auth = {} as any;
  firestore = {} as any;
  storage = {} as any;
}


export { app, storage, auth, firestore };

