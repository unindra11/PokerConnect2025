
"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BellRing, UserPlus, MessageSquareText, ThumbsUp, Share2, UserCheck, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { app, auth } from "@/lib/firebase";
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
  orderBy // Added orderBy
} from "firebase/firestore";
import type { User as FirebaseUser } from "firebase/auth";
import { formatDistanceToNow } from 'date-fns';

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
  read?: boolean;
  senderId?: string; 
  senderUsername?: string;
  senderAvatar?: string;
  // For accepted/declined requests to be processed by the sender
  receiverId?: string;
  receiverUsername?: string;
  receiverAvatar?: string;
}

interface LoggedInUserFromStorage {
  uid: string;
  username: string;
  fullName?: string;
  avatar?: string;
}


const staticNotifications: AppNotification[] = [
  {
    id: "static2",
    type: "comment",
    user: { name: "StraightSue", avatar: "https://placehold.co/100x100.png?n=2", username: "sue_straight" },
    message: "commented on your post: \"Great analysis on that river bet!\"",
    timestamp: "1h ago",
  },
  {
    id: "static3",
    type: "like",
    user: { name: "FullHouseFred", avatar: "https://placehold.co/100x100.png?n=3", username: "fred_full" },
    message: "liked your post about your tournament win.",
    timestamp: "3h ago",
  },
  {
    id: "static4",
    type: "system",
    user: null,
    message: "Welcome to PokerConnect! Complete your profile for better suggestions.",
    timestamp: "1d ago",
  },
];


export default function NotificationsPage() {
  const [displayedNotifications, setDisplayedNotifications] = useState<AppNotification[]>(staticNotifications);
  const [loggedInUser, setLoggedInUser] = useState<LoggedInUserFromStorage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const storedUserString = localStorage.getItem("loggedInUser");
        if (storedUserString) {
          try {
            const parsedUser: LoggedInUserFromStorage = JSON.parse(storedUserString);
            if (parsedUser.uid === user.uid) {
              setLoggedInUser(parsedUser);
              console.log("NotificationsPage: Logged in user:", parsedUser);
              await fetchFriendRequests(parsedUser.uid);
            } else {
              localStorage.removeItem("loggedInUser");
              setLoggedInUser(null);
              setDisplayedNotifications(staticNotifications); 
            }
          } catch (e) {
            console.error("NotificationsPage: Error parsing loggedInUser from localStorage", e);
            localStorage.removeItem("loggedInUser");
            setLoggedInUser(null);
            setDisplayedNotifications(staticNotifications);
          }
        } else {
          setLoggedInUser(null); 
          setDisplayedNotifications(staticNotifications);
        }
      } else {
        setLoggedInUser(null);
        setDisplayedNotifications(staticNotifications); 
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchFriendRequests = async (currentUserId: string) => {
    setIsLoading(true);
    const db = getFirestore(app, "poker");
    try {
      console.log(`NotificationsPage: Fetching friend requests for receiverId: ${currentUserId}`);
      const requestsRef = collection(db, "friendRequests");
      const q = query(requestsRef, where("receiverId", "==", currentUserId), where("status", "==", "pending"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      
      const fetchedRequests: AppNotification[] = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        console.log("NotificationsPage: Fetched request data:", data);
        return {
          id: docSnap.id,
          type: "friend_request_firestore",
          user: { 
            name: data.senderUsername || "Unknown User",
            avatar: data.senderAvatar || `https://placehold.co/100x100.png?text=${(data.senderUsername || "U").substring(0,1)}`,
            username: data.senderUsername || "unknown",
            uid: data.senderId 
          },
          message: "sent you a friend request.",
          timestamp: data.createdAt,
          senderId: data.senderId,
          senderUsername: data.senderUsername,
          senderAvatar: data.senderAvatar,
        };
      });
      
      console.log("NotificationsPage: Fetched friend requests from Firestore:", fetchedRequests);
      
      setDisplayedNotifications([...fetchedRequests, ...staticNotifications.filter(n => n.type !== "friend_request" && n.type !== "friend_request_firestore")].sort((a,b) => {
        const dateA = a.timestamp instanceof Timestamp ? a.timestamp.toDate() : (typeof a.timestamp === 'string' ? new Date(a.timestamp) : (a.timestamp instanceof Date ? a.timestamp : new Date()));
        const dateB = b.timestamp instanceof Timestamp ? b.timestamp.toDate() : (typeof b.timestamp === 'string' ? new Date(b.timestamp) : (b.timestamp instanceof Date ? b.timestamp : new Date()));
        return dateB.getTime() - dateA.getTime();
      }));

    } catch (error) {
      console.error("NotificationsPage: Error fetching friend requests from Firestore:", error);
      toast({ title: "Error Loading Notifications", description: "Could not retrieve friend requests.", variant: "destructive" });
      setDisplayedNotifications(staticNotifications); 
    } finally {
      setIsLoading(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "friend_request": return <UserPlus className="h-5 w-5 text-primary" />;
      case "friend_request_firestore": return <UserPlus className="h-5 w-5 text-primary" />;
      case "comment": return <MessageSquareText className="h-5 w-5 text-accent" />;
      case "like": return <ThumbsUp className="h-5 w-5 text-red-500" />;
      case "share": return <Share2 className="h-5 w-5 text-green-500" />;
      case "friend_accept": return <UserCheck className="h-5 w-5 text-blue-500" />;
      case "friend_accept_confirmation": return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "friend_request_sent_confirmation": return <UserPlus className="h-5 w-5 text-blue-500" />;
      case "system": return <BellRing className="h-5 w-5 text-yellow-500" />;
      default: return <BellRing className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const handleAcceptFirestoreRequest = async (notification: AppNotification) => {
    if (!loggedInUser || !notification.user?.uid || !notification.user.username || !notification.user.name) {
      toast({ title: "Error", description: "Missing user data for action.", variant: "destructive" });
      return;
    }

    const db = getFirestore(app, "poker");
    const batch = writeBatch(db);
    const requestRef = doc(db, "friendRequests", notification.id);
    batch.update(requestRef, { status: "accepted", updatedAt: serverTimestamp() });

    const currentUserFriendsRef = doc(db, "users", loggedInUser.uid, "friends", notification.user.uid);
    batch.set(currentUserFriendsRef, {
      friendUserId: notification.user.uid,
      username: notification.user.username,
      name: notification.user.name,
      avatar: notification.user.avatar || `https://placehold.co/40x40.png?text=${(notification.user.name || "F").substring(0,1)}`,
      since: serverTimestamp()
    });

    const senderFriendsRef = doc(db, "users", notification.user.uid, "friends", loggedInUser.uid);
    batch.set(senderFriendsRef, {
      friendUserId: loggedInUser.uid,
      username: loggedInUser.username,
      name: loggedInUser.fullName || loggedInUser.username,
      avatar: loggedInUser.avatar || `https://placehold.co/40x40.png?text=${(loggedInUser.fullName || "U").substring(0,1)}`,
      since: serverTimestamp()
    });

    try {
      await batch.commit();
      toast({ title: "Friend Request Accepted!", description: `You are now friends with ${notification.user.name}.` });
      setDisplayedNotifications(prev => prev.filter(n => n.id !== notification.id));
    } catch (error) {
      console.error("Error accepting friend request in Firestore:", error);
      toast({ title: "Error", description: "Could not accept friend request.", variant: "destructive" });
    }
  };

  const handleDeclineFirestoreRequest = async (notificationId: string) => {
     if (!loggedInUser) return;
    const db = getFirestore(app, "poker");
    const requestRef = doc(db, "friendRequests", notificationId);
    try {
      await updateDoc(requestRef, { status: "declined", updatedAt: serverTimestamp() });
      toast({ title: "Friend Request Declined", variant: "destructive" });
      setDisplayedNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
       console.error("Error declining friend request in Firestore:", error);
       toast({ title: "Error", description: "Could not decline friend request.", variant: "destructive" });
    }
  };

  const getTimestampString = (timestamp: AppNotification['timestamp']): string => {
    if (!timestamp) return 'Just now';
    let date: Date | null = null;
    if (timestamp instanceof Timestamp) { 
      date = timestamp.toDate();
    } else if (typeof timestamp === 'string') {
      const parsedDate = new Date(timestamp);
      if (!isNaN(parsedDate.getTime())) {
        date = parsedDate;
      }
    } else if (timestamp instanceof Date) {
      date = timestamp;
    }
    
    if (date) {
      try {
        return formatDistanceToNow(date, { addSuffix: true });
      } catch (e) {
        console.warn("Error formatting date:", e, "Timestamp was:", timestamp);
        return new Date(timestamp as any).toLocaleString(); 
      }
    }
    return new Date().toLocaleString(); 
  };


  const handleMarkAllAsRead = () => {
    
    setDisplayedNotifications(staticNotifications.sort((a,b) => new Date(b.timestamp as string).getTime() - new Date(a.timestamp as string).getTime() ));
    toast({ title: "Notifications Cleared", description: "All dynamic notifications have been cleared from view." });
  };

  if (isLoading && loggedInUser === null) {
    return (
      <div className="container mx-auto max-w-2xl text-center py-10">
          <p>Loading user session...</p>
      </div>
    );
  }
  
  if (isLoading) {
     return (
      <div className="container mx-auto max-w-2xl text-center py-10">
          <p>Loading notifications...</p>
      </div>
    );
  }


  return (
    <div className="container mx-auto max-w-2xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Notifications</h1>
        {displayedNotifications.some(n => n.type === "friend_request_firestore") && (
          <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>Clear Dynamic Notifications</Button>
        )}
      </div>

      {displayedNotifications.length === 0 && (
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
          <Card key={notification.id} className={`shadow-md rounded-lg overflow-hidden hover:shadow-xl transition-shadow duration-200 ${notification.read ? 'opacity-70' : ''}`}>
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
                  {notification.message}
                </p>
                <p className="text-xs text-muted-foreground">{getTimestampString(notification.timestamp)}</p>
              </div>
              {notification.type === "friend_request_firestore" && notification.user && (
                <div className="flex gap-2 ml-auto">
                  <Button size="sm" onClick={() => handleAcceptFirestoreRequest(notification)}>Accept</Button>
                  <Button variant="outline" size="sm" onClick={() => handleDeclineFirestoreRequest(notification.id)}>Decline</Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
    
