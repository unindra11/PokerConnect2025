'use client';

import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { app, auth } from "@/lib/firebase";

interface LoggedInUser {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  username?: string;
  fullName?: string;
  bio?: string;
  avatar?: string;
  coverImage?: string;
  location?: string;
  locationCoords?: { lat: number; lng: number } | null;
}

interface UserContextType {
  currentUserAuth: FirebaseUser | null;
  loggedInUserDetails: LoggedInUser | null;
  isLoadingAuth: boolean;
  isLoadingUserDetails: boolean;
  setLoggedInUserDetails: (details: LoggedInUser | null) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUserAuth, setCurrentUserAuth] = useState<FirebaseUser | null>(null);
  const [loggedInUserDetails, setLoggedInUserDetails] = useState<LoggedInUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingUserDetails, setIsLoadingUserDetails] = useState(true);

  const router = useRouter();
  const db = getFirestore(app, "poker");

  useEffect(() => {
    console.log("UserProvider: Setting up auth state listener");
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("UserProvider: Auth state changed", user?.uid);
      setIsLoadingAuth(true);
      setIsLoadingUserDetails(true);

      if (user) {
        setCurrentUserAuth(user);

        // Fetch user details from Firestore
        const userDocRef = doc(db, "users", user.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const profileData = userDocSnap.data();
            const details: LoggedInUser = {
              uid: user.uid,
              email: user.email,
              displayName: profileData.fullName || profileData.username || user.email || "User",
              username: profileData.username,
              fullName: profileData.fullName,
              bio: profileData.bio,
              avatar: profileData.avatar,
              coverImage: profileData.coverImage,
              location: profileData.location,
              locationCoords: profileData.locationCoords,
            };
            // Only update if the data has actually changed
            setLoggedInUserDetails((prev) => {
              if (prev && JSON.stringify(prev) === JSON.stringify(details)) {
                return prev; // Avoid updating if the data is the same
              }
              return details;
            });
            console.log("UserProvider: Fetched user details from Firestore:", details);
          } else {
            console.warn("UserProvider: No such profile document in Firestore for UID:", user.uid);
            setLoggedInUserDetails(null);
            router.push("/setup-profile");
          }
        } catch (error) {
          console.error("UserProvider: Error fetching user document from Firestore:", error);
          setLoggedInUserDetails(null);
          router.push("/login");
        }
      } else {
        setCurrentUserAuth(null);
        setLoggedInUserDetails(null);
        router.push("/login");
      }

      setIsLoadingAuth(false);
      setIsLoadingUserDetails(false);
      console.log(
        "UserProvider: Current state - loggedInUserDetails:",
        loggedInUserDetails,
        "isLoadingUserDetails:",
        isLoadingUserDetails
      );
    });

    return () => unsubscribe();
  }, [router, db]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      currentUserAuth,
      loggedInUserDetails,
      isLoadingAuth,
      isLoadingUserDetails,
      setLoggedInUserDetails,
    }),
    [currentUserAuth, loggedInUserDetails, isLoadingAuth, isLoadingUserDetails]
  );

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}