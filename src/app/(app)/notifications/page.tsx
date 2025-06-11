'use client';

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BellRing, UserPlus, MessageSquareText, ThumbsUp, Share2, UserCheck, CheckCircle, Loader2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { app } from "@/lib/firebase";
import { 
  getFirestore, 
  collection, 
  query, 
  doc, 
  updateDoc, 
  serverTimestamp,
  writeBatch,
  Timestamp,
  addDoc,
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
  caption?: string;
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
  const { currentUserAuth, loggedInUserDetails, isLoadingAuth, isLoadingUserDetails, notifications: contextNotifications } = useUser();
  const [displayedNotifications, setDisplayedNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (isLoadingAuth || isLoadingUserDetails) {
      setIsLoading(true);
      return;
    }

    if (loggedInUserDetails && loggedInUserDetails.uid) {
      console.log("NotificationsPage: Using notifications from UserContext for UID:", loggedInUserDetails.uid);
      const combinedNotifications = [
        ...contextNotifications,
        ...staticNotifications.filter(n => !["friend_request", "friend_request_firestore", "like_post", "comment_post", "share_post", "friend_request_accepted", "friend_request_declined"].includes(n.type)),
      ];
      combinedNotifications.sort((a, b) => getEpochMillis(b.timestamp) - getEpochMillis(a.timestamp));
      setDisplayedNotifications(combinedNotifications);
      setIsLoading(false);
    } else if (!currentUserAuth) {
      console.log("NotificationsPage: No authenticated user. Displaying static notifications only.");
      setDisplayedNotifications(staticNotifications.sort((a, b) => getEpochMillis(b.timestamp) - getEpochMillis(a.timestamp)));
      setIsLoading(false);
    } else if (currentUserAuth && !loggedInUserDetails) {
      console.log("NotificationsPage: Auth user exists, but profile details not loaded. Displaying static notifications for now.");
      setDisplayedNotifications(staticNotifications.sort((a, b) => getEpochMillis(b.timestamp) - getEpochMillis(a.timestamp)));
      setIsLoading(false);
    }
  }, [currentUserAuth, loggedInUserDetails, isLoadingAuth, isLoadingUserDetails, contextNotifications]);

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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "friend_request": return <UserPlus className="h-5 w-5 text-primary" />;
      case "friend_request_firestore": return <UserPlus className="h-5 w-5 text-primary" />;
      case "comment": return <MessageSquareText className="h-5 w-5 text-accent" />;
      case "comment_post": return <MessageSquareText className="h-5 w-5 text-accent" />;
      case "like": return <ThumbsUp className="h-5 w-5 text-red-500" />;
      case "like_post": return <ThumbsUp className="h-5 w-5 text-red-500" />;
      case "share": return <Share2 className="h-5 w-5 text-green-500" />;
      case "share_post": return <Share2 className="h-5 w-5 text-green-500" />;
      case "friend_request_accepted": return <UserCheck className="h-5 w-5 text-green-500" />;
      case "friend_request_declined": return <XCircle className="h-5 w-5 text-red-500" />;
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
    
    // Create notification for the original sender (User A) that their request was accepted by User B
    const notificationForSenderRef = collection(db, "users", senderUid, "notifications");
    const notificationForSenderData = {
      type: "friend_request_accepted",
      senderId: acceptorUid,
      senderUsername: loggedInUserDetails.username || "Anonymous",
      senderAvatar: loggedInUserDetails.avatar || `https://placehold.co/40x40.png?text=${(loggedInUserDetails.username || "A").substring(0,1)}`,
      receiverId: senderUid,
      createdAt: serverTimestamp(),
      read: false,
    };
    const newNotificationDocRef = doc(notificationForSenderRef);
    batch.set(newNotificationDocRef, notificationForSenderData);
    console.log("NotificationsPage: Creating friend_request_accepted notification for senderUid:", senderUid, "with data:", notificationForSenderData);

    try {
      await batch.commit();
      console.log("NotificationsPage: Batch commit successful for friend request acceptance");
      toast({ title: "Friend Request Accepted!", description: `You are now friends with ${notification.user.name}. A notification has been sent to them.` });
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

  const handleDeclineFirestoreRequest = async (notification: AppNotification) => {
    if (!loggedInUserDetails || !notification.user?.uid) {
      toast({ title: "Error", description: "Missing user data for declining request.", variant: "destructive" });
      console.error("NotificationsPage: Aborted decline - missing user data. loggedInUserDetails:", loggedInUserDetails, "Notification User:", notification.user);
      return;
    }

    const declinerUid = loggedInUserDetails.uid;
    const senderUid = notification.user.uid;
    const db = getFirestore(app, "poker");
    const batch = writeBatch(db);

    // Update the friend request status to declined
    const requestRef = doc(db, "friendRequests", notification.id);
    batch.update(requestRef, { status: "declined", updatedAt: serverTimestamp() });

    // Create notification for the original sender (User A) that their request was declined by User B
    const notificationForSenderRef = collection(db, "users", senderUid, "notifications");
    const notificationForSenderData = {
      type: "friend_request_declined",
      senderId: declinerUid,
      senderUsername: loggedInUserDetails.username || "Anonymous",
      senderAvatar: loggedInUserDetails.avatar || `https://placehold.co/40x40.png?text=${(loggedInUserDetails.username || "A").substring(0,1)}`,
      receiverId: senderUid,
      createdAt: serverTimestamp(),
      read: false,
    };
    const newNotificationDocRef = doc(notificationForSenderRef);
    batch.set(newNotificationDocRef, notificationForSenderData);
    console.log("NotificationsPage: Creating friend_request_declined notification for senderUid:", senderUid, "with data:", notificationForSenderData);

    try {
      await batch.commit();
      console.log("NotificationsPage: Batch commit successful for friend request decline");
      toast({ title: "Friend Request Declined", description: `You have declined the friend request from ${notification.user.name}. A notification has been sent to them.`, variant: "destructive" });
      setDisplayedNotifications(prev => prev.filter(n => n.id !== notification.id));
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
    if (notification.read || !loggedInUserDetails || !["like_post", "comment_post", "share_post", "friend_request_accepted", "friend_request_declined"].includes(notification.type)) return;

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
    if (!loggedInUserDetails || !currentUserAuth) {
      toast({ title: "Error", description: "User not authenticated.", variant: "destructive" });
      return;
    }

    console.log("NotificationsPage: handleMarkAllAsRead - currentUserAuth.uid:", currentUserAuth.uid, "loggedInUserDetails.uid:", loggedInUserDetails.uid);
    if (currentUserAuth.uid !== loggedInUserDetails.uid) {
      console.error("NotificationsPage: UID mismatch between currentUserAuth and loggedInUserDetails");
      toast({ title: "Error", description: "User authentication mismatch.", variant: "destructive" });
      return;
    }

    const db = getFirestore(app, "poker");
    const unreadNotifications = displayedNotifications.filter(n =>
      ["like_post", "comment_post", "share_post", "friend_request_accepted", "friend_request_declined"].includes(n.type) && !n.read
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
        <Loader2 className="h-8 w-5 animate-spin text-primary" />
        <p className="mt-2">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Notifications</h1>
        {displayedNotifications.some(n => ["friend_request_firestore", "like_post", "comment_post", "share_post", "friend_request_accepted", "friend_request_declined"].includes(n.type) && !n.read) && (
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
                     <Link href={`/profile/${notification.user.username}`} className="font-semibold text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                        {notification.user.name}
                     </Link>
                  )}
                  {' '}
                  {["like_post", "comment_post", "share_post"].includes(notification.type) && notification.postId ? (
                    <Link href={`/post/${notification.postId}`} className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
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
                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleDeclineFirestoreRequest(notification); }}>Decline</Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}