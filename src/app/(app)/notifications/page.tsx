'use client';

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BellRing, UserPlus, MessageSquareText, ThumbsUp, Share2, UserCheck, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { app } from "@/lib/firebase";
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  serverTimestamp,
  writeBatch,
  Timestamp,
  orderBy
} from "firebase/firestore";
import { useUser } from "@/context/UserContext";
import { formatDistanceToNow } from 'date-fns';
import Link from "next/link";

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
}

const staticNotifications: AppNotification[] = [
  {
    id: "static2",
    type: "comment",
    user: { name: "StraightSue", avatar: "https://placehold.co/100x100.png?n=2", username: "sue_straight" },
    message: "commented on your post: \"Great analysis on that river bet!\"",
    timestamp: new Date("2025-06-03T13:55:00+05:30"), 
    read: false,
  },
  {
    id: "static3",
    type: "like",
    user: { name: "FullHouseFred", avatar: "https://placehold.co/100x100.png?n=3", username: "fred_full" },
    message: "liked your post about your tournament win.",
    timestamp: new Date("2025-06-03T11:55:00+05:30"), 
    read: false,
  },
  {
    id: "static4",
    type: "system",
    user: null,
    message: "Welcome to PokerConnect! Complete your profile for better suggestions.",
    timestamp: new Date("2025-06-02T14:55:00+05:30"), 
    read: false,
  },
];

export default function NotificationsPage() {
  const { currentUserAuth, loggedInUserDetails, isLoadingAuth, isLoadingUserDetails } = useUser();
  const [displayedNotifications, setDisplayedNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (isLoadingAuth || isLoadingUserDetails) {
      setIsLoading(true);
      return;
    }

    if (loggedInUserDetails && loggedInUserDetails.uid) {
      console.log("NotificationsPage: loggedInUserDetails available, calling fetchNotifications for UID:", loggedInUserDetails.uid);
      fetchNotifications(loggedInUserDetails.uid);
    } else if (!currentUserAuth) {
      console.log("NotificationsPage: No authenticated user. Displaying static notifications only.");
      setDisplayedNotifications(staticNotifications.sort((a, b) => getEpochMillis(b.timestamp) - getEpochMillis(a.timestamp)));
      setIsLoading(false);
    } else if (currentUserAuth && !loggedInUserDetails) {
      console.log("NotificationsPage: Auth user exists, but profile details not loaded. Displaying static notifications for now.");
      setDisplayedNotifications(staticNotifications.sort((a, b) => getEpochMillis(b.timestamp) - getEpochMillis(a.timestamp)));
      setIsLoading(false);
    }
  }, [currentUserAuth, loggedInUserDetails, isLoadingAuth, isLoadingUserDetails]);

  const getEpochMillis = (timestamp: AppNotification['timestamp']): number => {
    if (timestamp instanceof Timestamp) {
      return timestamp.toMillis();
    } else if (timestamp instanceof Date) {
      return timestamp.getTime();
    } else if (typeof timestamp === 'string') {
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        return date.getTime();
      }
    }
    console.warn("NotificationsPage: Could not parse timestamp, returning 0:", timestamp);
    return 0;
  };

  const fetchNotifications = async (currentUserId: string) => {
    if (!isLoading) setIsLoading(true);
    const db = getFirestore(app, "poker");
    try {
      // Fetch friend requests
      const requestsRef = collection(db, "friendRequests");
      const friendRequestQuery = query(
        requestsRef,
        where("receiverId", "==", currentUserId),
        where("status", "==", "pending"),
        orderBy("createdAt", "desc")
      );
      const friendRequestSnapshot = await getDocs(friendRequestQuery);
      console.log(`NotificationsPage: Found ${friendRequestSnapshot.docs.length} friend requests for user ${currentUserId}`);

      const friendRequestNotifications: AppNotification[] = friendRequestSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          type: "friend_request_firestore",
          user: { 
            name: data.senderUsername || "Unknown Sender",
            avatar: data.senderAvatar || `https://placehold.co/100x100.png?text=${(data.senderUsername || "S").substring(0,1)}`,
            username: data.senderUsername || "unknown_sender",
            uid: data.senderId 
          },
          message: "sent you a friend request.",
          timestamp: data.createdAt,
          read: false,
          senderId: data.senderId,
          senderUsername: data.senderUsername,
          senderAvatar: data.senderAvatar,
        };
      });

      // Fetch like_post and comment_post notifications
      const notificationsRef = collection(db, "users", currentUserId, "notifications");
      const notificationsQuery = query(
        notificationsRef,
        where("type", "in", ["like_post", "comment_post"]),
        orderBy("createdAt", "desc")
      );
      const notificationsSnapshot = await getDocs(notificationsQuery);
      console.log(`NotificationsPage: Found ${notificationsSnapshot.docs.length} like/comment notifications for user ${currentUserId}`);

      const likeCommentNotifications: AppNotification[] = notificationsSnapshot.docs.map(docSnap => {
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
            : `commented on your post: "${data.commentText}"`,
          timestamp: data.createdAt,
          read: data.read || false,
          senderId: data.senderId,
          senderUsername: data.senderUsername,
          senderAvatar: data.senderAvatar,
          postId: data.postId,
          commentText: data.commentText,
        };
      });

      // Combine notifications
      const combinedNotifications = [
        ...friendRequestNotifications,
        ...likeCommentNotifications,
        ...staticNotifications.filter(n => n.type !== "friend_request" && n.type !== "friend_request_firestore"),
      ];

      combinedNotifications.sort((a, b) => getEpochMillis(b.timestamp) - getEpochMillis(a.timestamp));
      setDisplayedNotifications(combinedNotifications);
    } catch (error) {
      console.error("NotificationsPage: Error fetching notifications from Firestore:", error);
      toast({ 
        title: "Error Loading Notifications", 
        description: `Could not retrieve notifications. Error: ${error instanceof Error ? error.message : String(error)}`, 
        variant: "destructive" 
      });
      setDisplayedNotifications(staticNotifications.sort((a, b) => getEpochMillis(b.timestamp) - getEpochMillis(a.timestamp)));
    } finally {
      setIsLoading(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "friend_request": return <UserPlus className="h-5 w-5 text-primary" />;
      case "friend_request_firestore": return <UserPlus className="h-5 w-5 text-primary" />;
      case "comment": return <MessageSquareText className="h-5 w-5 text-accent" />;
      case "comment_post": return <MessageSquareText className="h-5 w-5 text-accent" />;
      case "like": return <ThumbsUp className="h-5 w-5 text-red-500" />;
      case "like_post": return <ThumbsUp className="h-5 w-5 text-red-500" />;
      case "share": return <Share2 className="h-5 w-5 text-green-500" />;
      case "friend_accept": return <UserCheck className="h-5 w-5 text-blue-500" />;
      case "friend_accept_confirmation": return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "friend_request_sent_confirmation": return <UserPlus className="h-5 w-5 text-blue-500" />;
      case "system": return <BellRing className="h-5 w-5 text-yellow-500" />;
      default: return <BellRing className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const handleAcceptFirestoreRequest = async (notification: AppNotification) => {
    if (!loggedInUserDetails || !notification.user?.uid || !notification.user.username || !notification.user.name) {
      toast({ title: "Error", description: "Missing current user or sender data for action.", variant: "destructive" });
      console.error("NotificationsPage: Aborted accept - missing user data. loggedInUserDetails:", loggedInUserDetails, "Notification User:", notification.user);
      return;
    }

    const acceptorUid = loggedInUserDetails.uid;
    const senderUid = notification.user.uid;
    const db = getFirestore(app, "poker");
    const batch = writeBatch(db);

    const requestRef = doc(db, "friendRequests", notification.id);
    batch.update(requestRef, { status: "accepted", updatedAt: serverTimestamp() });

    const acceptorFriendsRef = doc(db, "users", acceptorUid, "friends", senderUid);
    const acceptorFriendData = {
      friendUserId: senderUid, 
      username: notification.user.username,
      name: notification.user.name,
      avatar: notification.user.avatar || `https://placehold.co/40x40.png?text=${(notification.user.name || "F").substring(0,1)}`,
      since: serverTimestamp()
    };
    batch.set(acceptorFriendsRef, acceptorFriendData);

    const senderFriendsRef = doc(db, "users", senderUid, "friends", acceptorUid);
    const senderFriendData = {
      friendUserId: acceptorUid, 
      username: loggedInUserDetails.username,
      name: loggedInUserDetails.fullName || loggedInUserDetails.username,
      avatar: loggedInUserDetails.avatar || `https://placehold.co/40x40.png?text=${(loggedInUserDetails.fullName || "U").substring(0,1)}`,
      since: serverTimestamp()
    };
    batch.set(senderFriendsRef, senderFriendData);

    try {
      await batch.commit();
      toast({ title: "Friend Request Accepted!", description: `You are now friends with ${notification.user.name}.` });
      setDisplayedNotifications(prev => prev.filter(n => n.id !== notification.id));
    } catch (error) {
      console.error("NotificationsPage: Error accepting friend request in Firestore:", error);
      toast({ 
        title: "Firestore Error", 
        description: `Could not accept friend request. Error: ${error instanceof Error ? error.message : String(error)}`, 
        variant: "destructive",
        duration: 10000 
      });
    }
  };

  const handleDeclineFirestoreRequest = async (notificationId: string) => {
    if (!loggedInUserDetails) return;
    const db = getFirestore(app, "poker");
    const requestRef = doc(db, "friendRequests", notificationId);
    try {
      await updateDoc(requestRef, { status: "declined", updatedAt: serverTimestamp() });
      toast({ title: "Friend Request Declined", variant: "destructive" });
      setDisplayedNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error("NotificationsPage: Error declining friend request in Firestore:", error);
      toast({ 
        title: "Error", 
        description: `Could not decline friend request. Error: ${error instanceof Error ? error.message : String(error)}`, 
        variant: "destructive" 
      });
    }
  };

  const handleMarkAsRead = async (notification: AppNotification) => {
    if (notification.read || !loggedInUserDetails || !["like_post", "comment_post"].includes(notification.type)) return;

    const db = getFirestore(app, "poker");
    const notificationRef = doc(db, "users", loggedInUserDetails.uid, "notifications", notification.id);
    try {
      await updateDoc(notificationRef, { read: true });
      setDisplayedNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error("NotificationsPage: Error marking notification as read:", error);
      toast({
        title: "Error",
        description: `Could not mark notification as read. Error: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!loggedInUserDetails) return;
    const db = getFirestore(app, "poker");
    const unreadNotifications = displayedNotifications.filter(n =>
      ["like_post", "comment_post"].includes(n.type) && !n.read
    );
    if (unreadNotifications.length === 0) {
      toast({ title: "No Unread Notifications", description: "All notifications are already read." });
      return;
    }

    const batch = writeBatch(db);
    unreadNotifications.forEach(notification => {
      const notificationRef = doc(db, "users", loggedInUserDetails.uid, "notifications", notification.id);
      batch.update(notificationRef, { read: true });
    });

    try {
      await batch.commit();
      setDisplayedNotifications(prev =>
        prev.map(n => unreadNotifications.some(un => un.id === n.id) ? { ...n, read: true } : n)
      );
      toast({ title: "Notifications Marked as Read", description: "All unread notifications have been marked as read." });
    } catch (error) {
      console.error("NotificationsPage: Error marking all notifications as read:", error);
      toast({
        title: "Error",
        description: `Could not mark notifications as read. Error: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    }
  };

  const getTimestampString = (timestampInput: AppNotification['timestamp']): string => {
    const epochMillis = getEpochMillis(timestampInput);
    if (epochMillis === 0 && timestampInput) {
      console.warn("NotificationsPage: Fallback for invalid timestamp:", timestampInput);
      return "Invalid date";
    }
    if (epochMillis === 0) return 'Just now';

    try {
      return formatDistanceToNow(new Date(epochMillis), { addSuffix: true });
    } catch (e) {
      console.error("NotificationsPage: Error formatting date with formatDistanceToNow:", e, "Epoch was:", epochMillis);
      return new Date(epochMillis).toLocaleString();
    }
  };

  if (isLoading) { 
    return (
      <div className="container mx-auto max-w-2xl text-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Notifications</h1>
        {displayedNotifications.some(n => ["friend_request_firestore", "like_post", "comment_post"].includes(n.type) && !n.read) && (
          <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>Mark All as Read</Button>
        )}
      </div>

      {displayedNotifications.length === 0 && !isLoading && (
        <Card className="text-center p-8 shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle className="text-xl mb-2">No New Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">You're all caught up!</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {displayedNotifications.map((notification) => (
          <Card 
            key={notification.id} 
            className={`shadow-md rounded-lg overflow-hidden hover:shadow-xl transition-shadow duration-200 ${notification.read ? 'opacity-70' : ''}`}
            onClick={() => handleMarkAsRead(notification)}
          >
            <CardContent className="p-4 flex items-start space-x-4">
              <div className="flex-shrink-0 mt-1">
                {notification.user && notification.type !== "system" ? (
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={notification.user.avatar || `https://placehold.co/40x40.png?text=${(notification.user.name || "U").substring(0,1)}`} alt={notification.user.name} data-ai-hint="profile picture" />
                    <AvatarFallback>{notification.user.name.substring(0,1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-10 w-10 flex items-center justify-center rounded-full bg-muted">
                    {getNotificationIcon(notification.type)}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm">
                  {notification.user && notification.type !== "system" && (
                    <span className="font-semibold text-primary">{notification.user.name}</span>
                  )}
                  {' '}
                  {["like_post", "comment_post"].includes(notification.type) && notification.postId ? (
                    <Link href={`/post/${notification.postId}`} className="text-primary hover:underline">
                      {notification.message}
                    </Link>
                  ) : (
                    notification.message
                  )}
                </p>
                <p className="text-xs text-muted-foreground">{getTimestampString(notification.timestamp)}</p>
              </div>
              {notification.type === "friend_request_firestore" && notification.user && loggedInUserDetails && (
                <div className="flex gap-2 ml-auto">
                  <Button size="sm" onClick={(e) => { e.stopPropagation(); handleAcceptFirestoreRequest(notification); }}>Accept</Button>
                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleDeclineFirestoreRequest(notification.id); }}>Decline</Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}