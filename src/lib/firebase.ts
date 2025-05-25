// src/lib/firebase.ts
import { initializeApp, getApp, getApps, type FirebaseOptions } from "firebase/app";
import { getStorage } from "firebase/storage";
// import { getAuth } from "firebase/auth";
// import { getFirestore } from "firebase/firestore";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
let app;
if (!getApps().length) {
  if (!firebaseConfig.apiKey) {
    console.warn("Firebase API Key is missing. Firebase features might not work.");
    // You might want to throw an error or handle this case more gracefully
    // depending on whether Firebase is critical for your app's core functionality.
  }
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const storage = getStorage(app);
// export const auth = getAuth(app); // Uncomment if you use Firebase Auth
// export const firestore = getFirestore(app); // Uncomment if you use Firestore

export { app, storage };
