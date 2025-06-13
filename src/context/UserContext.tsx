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
  location?: { country: string; state: string; city: string };
  locationCoords?: { lat: number; lng: number } | null;
}

interface NotificationUser {
  name: string;
  avatar?: string;
  username: string;
  uid?: string;
}

interface AppNotification {
  id: string;
  type: string;
  user: NotificationUser | null;
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
  unreadMessagesCount: number;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUserAuth, setCurrentUserAuth] = useState<FirebaseUser | null>(null);
  const [loggedInUserDetails, setLoggedInUserDetails] = useState<LoggedInUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingUserDetails, setIsLoadingUserDetails] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);

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
            setLoggedInUserDetails((prev) => {
              if (prev && JSON.stringify(prev) === JSON.stringify(details)) {
                return prev;
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
        setNotifications([]);
        setUnreadMessagesCount(0);
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
      const notificationsRef = collection(db, "users", currentUserAuth.uid, "notifications");
      const notificationsQuery = query(
        notificationsRef,
        where("type", "in", [
          "friend_request",
          "friend_request_firestore",
          "like_post",
          "comment_post",
          "share_post",
          "friend_request_accepted",
          "friend_request_declined"
        ]),
        orderBy("createdAt", "desc")
      );

      const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
        const allNotifications: AppNotification[] = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          let messageText = "";
          switch (data.type) {
            case "friend_request":
            case "friend_request_firestore":
              messageText = "sent you a friend request.";
              break;
            case "like_post":
              messageText = "liked your post.";
              break;
            case "comment_post":
              messageText = `commented on your post: "${data.commentText || ""}"`;
              break;
            case "share_post":
              messageText = `shared your post: "${data.caption || ""}"`;
              break;
            case "friend_request_accepted":
              messageText = "accepted your friend request.";
              break;
            case "friend_request_declined":
              messageText = "declined your friend request.";
              break;
            default:
              messageText = "interacted with your content.";
          }

          return {
            id: docSnap.id,
            type: data.type,
            user: {
              name: data.senderUsername || "Unknown User",
              avatar: data.senderAvatar || `https://placehold.co/100x100.png?text=${(data.senderUsername || "U").substring(0,1)}`,
              username: data.senderUsername || "unknown_user",
              uid: data.senderId,
            },
            message: messageText,
            timestamp: data.createdAt || new Date(),
            read: data.read || false,
            senderId: data.senderId,
            senderUsername: data.senderUsername,
            senderAvatar: data.senderAvatar,
            receiverId: data.receiverId,
            postId: data.postId,
            commentText: data.type === "comment_post" ? data.commentText : undefined,
            caption: data.type === "share_post" ? data.caption : undefined,
          };
        });

        setNotifications(allNotifications.sort((a, b) => {
          const timeA = a.timestamp instanceof Timestamp ? a.timestamp.toMillis() : new Date(a.timestamp as string | Date).getTime();
          const timeB = b.timestamp instanceof Timestamp ? b.timestamp.toMillis() : new Date(b.timestamp as string | Date).getTime();
          return timeB - timeA;
        }));
      }, (error) => {
        console.error("UserContext: Error listening to notifications:", error);
        setNotifications([]);
      });

      return unsubscribe;
    };

    const unsubscribeNotifications = fetchNotifications();

    return () => {
      unsubscribeNotifications && unsubscribeNotifications();
    };
  }, [currentUserAuth, loggedInUserDetails, db]);

  useEffect(() => {
    const count = notifications.reduce((acc, notification) => {
      if (
        ["friend_request", "friend_request_firestore", "like_post", "comment_post", "share_post", "friend_request_accepted", "friend_request_declined"].includes(notification.type) &&
        !notification.read
      ) {
        return acc + 1;
      }
      return acc;
    }, 0);
    setUnreadNotificationsCount(count);
  }, [notifications]);

  useEffect(() => {
    if (!currentUserAuth || !loggedInUserDetails) {
      setUnreadMessagesCount(0);
      return;
    }

    const chatsQuery = query(
      collection(db, "chats"),
      where("participants", "array-contains", currentUserAuth.uid)
    );

    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
      let totalUnread = 0;
      snapshot.forEach((doc) => {
        const chatData = doc.data();
        const unreadCount = chatData.unreadCounts?.[currentUserAuth.uid] || 0;
        totalUnread += unreadCount;
      });
      setUnreadMessagesCount(totalUnread);
    }, (error) => {
      console.error("UserContext: Error fetching unread messages count:", error);
      setUnreadMessagesCount(0);
    });

    return () => unsubscribe();
  }, [currentUserAuth, loggedInUserDetails, db]);

  const contextValue = useMemo(
    () => ({
      currentUserAuth,
      loggedInUserDetails,
      isLoadingAuth,
      isLoadingUserDetails,
      setLoggedInUserDetails,
      notifications,
      unreadNotificationsCount,
      unreadMessagesCount,
    }),
    [currentUserAuth, loggedInUserDetails, isLoadingAuth, isLoadingUserDetails, notifications, unreadNotificationsCount, unreadMessagesCount]
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