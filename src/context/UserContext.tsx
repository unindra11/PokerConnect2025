'use client';

import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { getFirestore, doc, getDoc, collection, query, where, onSnapshot, Timestamp, orderBy } from "firebase/firestore";
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

interface AppNotification {
  id: string;
  type: string;
  user: { name: string; avatar?: string; username: string; uid?: string } | null;
  message: string;
  timestamp: string | Timestamp | Date;
  read: boolean;
  senderId?: string;
  senderUsername?: string;
  senderAvatar?: string;
  receiverId?: string;
  receiverUsername?: string;
  receiverAvatar?: string;
  postId?: string;
  commentText?: string;
  caption?: string;
}

interface UserContextType {
  currentUserAuth: FirebaseUser | null;
  loggedInUserDetails: LoggedInUser | null;
  isLoadingAuth: boolean;
  isLoadingUserDetails: boolean;
  setLoggedInUserDetails: (details: LoggedInUser | null) => void;
  notifications: AppNotification[];
  unreadNotificationsCount: number;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUserAuth, setCurrentUserAuth] = useState<FirebaseUser | null>(null);
  const [loggedInUserDetails, setLoggedInUserDetails] = useState<LoggedInUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingUserDetails, setIsLoadingUserDetails] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);

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

  useEffect(() => {
    if (!currentUserAuth || !loggedInUserDetails) {
      setNotifications([]);
      return;
    }

    const fetchNotifications = () => {
      // Fetch friend requests
      const requestsRef = collection(db, "friendRequests");
      const friendRequestQuery = query(
        requestsRef,
        where("receiverId", "==", currentUserAuth.uid),
        where("status", "==", "pending"),
        orderBy("createdAt", "desc")
      );
      const unsubscribeFriendRequests = onSnapshot(friendRequestQuery, (snapshot) => {
        const friendRequestNotifications: AppNotification[] = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            type: "friend_request_firestore",
            user: {
              name: data.senderUsername || "Unknown Sender",
              avatar: data.senderAvatar || `https://placehold.co/100x100.png?text=${(data.senderUsername || "S").substring(0,1)}`,
              username: data.senderUsername || "unknown_sender",
              uid: data.senderId,
            },
            message: "sent you a friend request.",
            timestamp: data.createdAt,
            read: false,
            senderId: data.senderId,
            senderUsername: data.senderUsername,
            senderAvatar: data.senderAvatar,
          };
        });

        // Fetch like_post, comment_post, and share_post notifications
        const notificationsRef = collection(db, "users", currentUserAuth.uid, "notifications");
        const notificationsQuery = query(
          notificationsRef,
          where("type", "in", ["like_post", "comment_post", "share_post"]),
          orderBy("createdAt", "desc")
        );
        const unsubscribeActivity = onSnapshot(notificationsQuery, (notificationsSnapshot) => {
          const activityNotifications: AppNotification[] = notificationsSnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              type: data.type,
              user: {
                name: data.senderUsername || "Unknown User",
                avatar: data.senderAvatar || `https://placehold.co/100x100.png?text=${(data.senderUsername || "U").substring(0,1)}`,
                username: data.senderUsername || "unknown_user",
                uid: data.senderId,
              },
              message: data.type === "like_post"
                ? "liked your post."
                : data.type === "comment_post"
                ? `commented on your post: "${data.commentText}"`
                : `shared your post: "${data.caption}"`,
              timestamp: data.createdAt,
              read: data.read || false,
              senderId: data.senderId,
              senderUsername: data.senderUsername,
              senderAvatar: data.senderAvatar,
              postId: data.postId,
              commentText: data.type === "comment_post" ? data.commentText : undefined,
              caption: data.type === "share_post" ? data.caption : undefined,
            };
          });

          // Combine notifications
          const combinedNotifications = [...friendRequestNotifications, ...activityNotifications];
          setNotifications(combinedNotifications);
        }, (error) => {
          console.error("UserContext: Error listening to activity notifications:", error);
        });

        return () => unsubscribeActivity();
      }, (error) => {
        console.error("UserContext: Error listening to friend requests:", error);
      });

      return () => unsubscribeFriendRequests();
    };

    const unsubscribe = fetchNotifications();
    return () => unsubscribe && unsubscribe();
  }, [currentUserAuth, loggedInUserDetails, db]);

  useEffect(() => {
    const count = notifications.reduce((acc, notification) => {
      if (
        ["friend_request_firestore", "like_post", "comment_post", "share_post"].includes(notification.type) &&
        !notification.read
      ) {
        return acc + 1;
      }
      return acc;
    }, 0);
    setUnreadNotificationsCount(count);
  }, [notifications]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      currentUserAuth,
      loggedInUserDetails,
      isLoadingAuth,
      isLoadingUserDetails,
      setLoggedInUserDetails,
      notifications,
      unreadNotificationsCount,
    }),
    [currentUserAuth, loggedInUserDetails, isLoadingAuth, isLoadingUserDetails, notifications, unreadNotificationsCount]
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