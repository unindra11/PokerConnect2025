
// src/lib/firebase.ts
import { initializeApp, getApp, getApps, type FirebaseOptions, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

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

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error(
    "Firebase.ts: Critical Firebase API Key or Project ID is missing in environment variables. Firebase will not initialize correctly. Check your .env file."
  );
  // Provide non-functional placeholders to prevent hard crashes if these are imported elsewhere.
  app = {} as FirebaseApp; // This app instance will not work.
} else {
  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
      console.log("Firebase.ts: Initialized new Firebase app (default instance).");
    } catch (initError) {
      console.error("Firebase.ts: Critical error initializing Firebase app:", initError);
      console.error("Firebase.ts: Firebase config used:", firebaseConfig);
      app = {} as FirebaseApp; // This app instance will not work.
    }
  } else {
    app = getApp(); // Get the default app if already initialized
    console.log("Firebase.ts: Retrieved existing Firebase app (default instance).");
  }
}

// Initialize services, guarding against app initialization failure
// Ensure services are initialized only if the app object is valid (i.e., has a name, indicating successful init)
let authInstance: ReturnType<typeof getAuth>;
let firestoreInstance: ReturnType<typeof getFirestore>;
let storageInstance: ReturnType<typeof getStorage>;

if (app && app.name) { // A successfully initialized app will have a name.
  try {
    authInstance = getAuth(app);
    console.log("Firebase.ts: Auth instance initialized from app:", app.name);
  } catch (e) {
    console.error(`Firebase.ts: Error initializing Auth for app '${app.name}':`, e);
    authInstance = {} as any;
  }

  try {
    firestoreInstance = getFirestore(app);
    console.log("Firebase.ts: Firestore instance initialized from app:", app.name, firestoreInstance);
  } catch (e) {
    console.error(`Firebase.ts: Error initializing Firestore for app '${app.name}':`, e);
    firestoreInstance = {} as any;
  }

  try {
    storageInstance = getStorage(app);
    console.log("Firebase.ts: Storage instance initialized from app:", app.name);
  } catch (e) {
    console.error(`Firebase.ts: Error initializing Storage for app '${app.name}':`, e);
    storageInstance = {} as any;
  }
} else {
  console.error("Firebase.ts: Firebase app not available or not correctly initialized. Services (Auth, Firestore, Storage) cannot be initialized.");
  authInstance = {} as any;
  firestoreInstance = {} as any;
  storageInstance = {} as any;
}

export { app, storageInstance as storage, authInstance as auth, firestoreInstance as firestore };
