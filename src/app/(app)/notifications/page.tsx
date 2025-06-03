
"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BellRing, UserPlus, MessageSquareText, ThumbsUp, Share2, UserCheck, CheckCircle, XCircle, Loader2 } from "lucide-react";
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
  orderBy
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
    timestamp: new Date("2025-06-03T13:55:00+05:30"), // 1 hour ago from 02:55 PM IST
  },
  {
    id: "static3",
    type: "like",
    user: { name: "FullHouseFred", avatar: "https://placehold.co/100x100.png?n=3", username: "fred_full" },
    message: "liked your post about your tournament win.",
    timestamp: new Date("2025-06-03T11:55:00+05:30"), // 3 hours ago from 02:55 PM IST
  },
  {
    id: "static4",
    type: "system",
    user: null,
    message: "Welcome to PokerConnect! Complete your profile for better suggestions.",
    timestamp: new Date("2025-06-02T14:55:00+05:30"), // 1 day ago from 02:55 PM IST
  },
];


export default function NotificationsPage() {
  const [displayedNotifications, setDisplayedNotifications] = useState<AppNotification[]>(staticNotifications);
  const [loggedInUser, setLoggedInUser] = useState<LoggedInUserFromStorage | null>(null);
  const [currentUserAuth, setCurrentUserAuth] = useState<FirebaseUser | null>(null); 
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUserAuth(user); 
      if (user) {
        const storedUserString = localStorage.getItem("loggedInUser");
        if (storedUserString) {
          try {
            const parsedUser: LoggedInUserFromStorage = JSON.parse(storedUserString);
            if (parsedUser.uid === user.uid) {
              setLoggedInUser(parsedUser);
              console.log("NotificationsPage (Auth Effect): LoggedInUserFromStorage successfully set from localStorage:", parsedUser);
            } else {
              console.warn("NotificationsPage (Auth Effect): localStorage UID mismatch with auth UID. Clearing local.");
              localStorage.removeItem("loggedInUser");
              setLoggedInUser(null);
            }
          } catch (e) {
            console.error("NotificationsPage (Auth Effect): Error parsing loggedInUser from localStorage", e);
            localStorage.removeItem("loggedInUser");
            setLoggedInUser(null);
          }
        } else {
          console.log("NotificationsPage (Auth Effect): No loggedInUser in localStorage for auth user:", user.uid);
          setLoggedInUser(null); 
        }
      } else {
        console.log("NotificationsPage (Auth Effect): No Firebase auth user found (user is null).");
        setLoggedInUser(null);
      }
      setIsLoading(false); 
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (loggedInUser && loggedInUser.uid) {
      console.log("NotificationsPage (Data Fetch Effect): loggedInUser is available, calling fetchFriendRequests for UID:", loggedInUser.uid);
      fetchFriendRequests(loggedInUser.uid);
    } else if (!isLoading && !currentUserAuth) { // Only if initial auth check is done and no user
      console.log("NotificationsPage (Data Fetch Effect): No authenticated user to fetch requests for. Displaying static notifications.");
      setDisplayedNotifications(staticNotifications);
    } else if (!isLoading && currentUserAuth && !loggedInUser) {
        console.log("NotificationsPage (Data Fetch Effect): Auth user exists, but profile details (loggedInUser) still loading or missing. Displaying static for now.");
        setDisplayedNotifications(staticNotifications);
    }
  }, [loggedInUser, currentUserAuth, isLoading]);

  const fetchFriendRequests = async (currentUserId: string) => {
    setIsLoading(true); 
    const db = getFirestore(app, "poker");
    try {
      console.log(`NotificationsPage (fetchFriendRequests): CALLED for receiverId: ${currentUserId}`);
      const requestsRef = collection(db, "friendRequests");
      const q = query(requestsRef, where("receiverId", "==", currentUserId), where("status", "==", "pending"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      
      console.log(`NotificationsPage (fetchFriendRequests): Firestore query executed. Number of requests found: ${querySnapshot.docs.length} for user ${currentUserId}`);

      if (querySnapshot.empty) {
          console.log(`NotificationsPage (fetchFriendRequests): No pending friend requests found in Firestore for user ${currentUserId}.`);
      }

      const fetchedRequests: AppNotification[] = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        console.log(`NotificationsPage (fetchFriendRequests): Processing Firestore doc ID: ${docSnap.id}, Data:`, JSON.stringify(data));
        if (!data.senderId) {
            console.warn(`NotificationsPage (fetchFriendRequests): Firestore doc ID: ${docSnap.id} is missing senderId. This request might not be actionable.`);
        }
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
          senderId: data.senderId,
          senderUsername: data.senderUsername,
          senderAvatar: data.senderAvatar,
        };
      });
      
      console.log("NotificationsPage (fetchFriendRequests): Parsed fetchedRequests from Firestore:", fetchedRequests.map(r => ({id: r.id, sender: r.user?.username, timestamp: r.timestamp })));
      
      setDisplayedNotifications([...fetchedRequests, ...staticNotifications.filter(n => n.type !== "friend_request" && n.type !== "friend_request_firestore")].sort((a, b) => {
        let dateA: Date, dateB: Date;
      
        if (a.timestamp instanceof Timestamp) {
          dateA = a.timestamp.toDate();
        } else if (a.timestamp instanceof Date) {
          dateA = a.timestamp;
        } else {
          console.warn("NotificationsPage: Invalid timestamp for 'a':", a.timestamp);
          dateA = new Date(0); 
        }
      
        if (b.timestamp instanceof Timestamp) {
          dateB = b.timestamp.toDate();
        } else if (b.timestamp instanceof Date) {
          dateB = b.timestamp;
        } else {
          console.warn("NotificationsPage: Invalid timestamp for 'b':", b.timestamp);
          dateB = new Date(0); 
        }
      
        return dateB.getTime() - dateA.getTime();
      }));

    } catch (error) {
      console.error("NotificationsPage (fetchFriendRequests): Error fetching friend requests from Firestore:", error);
      toast({ title: "Error Loading Notifications", description: `Could not retrieve friend requests. Error: ${error instanceof Error ? error.message : String(error)}`, variant: "destructive" });
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
    console.log("NotificationsPage (handleAccept): Initiated for notification ID:", notification.id);
    if (!loggedInUser || !notification.user?.uid || !notification.user.username || !notification.user.name) {
      toast({ title: "Error", description: "Missing current user or sender data for action.", variant: "destructive" });
      console.error("NotificationsPage (handleAccept): Aborted - missing user data. LoggedInUser:", loggedInUser, "Notification User:", notification.user);
      return;
    }

    const acceptorUid = loggedInUser.uid;
    const senderUid = notification.user.uid;
    console.log(`NotificationsPage (handleAccept): Acceptor UID: ${acceptorUid}, Sender UID: ${senderUid}`);

    const db = getFirestore(app, "poker");
    const batch = writeBatch(db);

    // 1. Update friendRequests document
    const requestRef = doc(db, "friendRequests", notification.id);
    const requestUpdateData = { status: "accepted", updatedAt: serverTimestamp() };
    console.log(`NotificationsPage (handleAccept): Batching update for path: ${requestRef.path}, Data:`, requestUpdateData);
    batch.update(requestRef, requestUpdateData);

    // 2. Add sender to acceptor's friends list
    const acceptorFriendsRef = doc(db, "users", acceptorUid, "friends", senderUid);
    const acceptorFriendData = {
      friendUserId: senderUid, // Storing the UID of the friend
      username: notification.user.username,
      name: notification.user.name,
      avatar: notification.user.avatar || `https://placehold.co/40x40.png?text=${(notification.user.name || "F").substring(0,1)}`,
      since: serverTimestamp()
    };
    console.log(`NotificationsPage (handleAccept): Batching set for path: ${acceptorFriendsRef.path}, Data:`, acceptorFriendData);
    batch.set(acceptorFriendsRef, acceptorFriendData);

    // 3. Add acceptor to sender's friends list
    const senderFriendsRef = doc(db, "users", senderUid, "friends", acceptorUid);
    const senderFriendData = {
      friendUserId: acceptorUid, // Storing the UID of the friend
      username: loggedInUser.username,
      name: loggedInUser.fullName || loggedInUser.username,
      avatar: loggedInUser.avatar || `https://placehold.co/40x40.png?text=${(loggedInUser.fullName || "U").substring(0,1)}`,
      since: serverTimestamp()
    };
    console.log(`NotificationsPage (handleAccept): Batching set for path: ${senderFriendsRef.path}, Data:`, senderFriendData);
    batch.set(senderFriendsRef, senderFriendData);

    try {
      console.log("NotificationsPage (handleAccept): Attempting batch.commit()...");
      await batch.commit();
      console.log("NotificationsPage (handleAccept): batch.commit() successful!");
      toast({ title: "Friend Request Accepted!", description: `You are now friends with ${notification.user.name}.` });
      setDisplayedNotifications(prev => prev.filter(n => n.id !== notification.id));
    } catch (error) {
      console.error("NotificationsPage (handleAccept): Error accepting friend request in Firestore (batch.commit failed):", error);
      toast({ 
        title: "Firestore Error", 
        description: `Could not accept friend request. Check console for Firestore permission details. Error: ${error instanceof Error ? error.message : String(error)}`, 
        variant: "destructive",
        duration: 10000 
      });
    }
  };

  const handleDeclineFirestoreRequest = async (notificationId: string) => {
     if (!loggedInUser) return;
    const db = getFirestore(app, "poker");
    const requestRef = doc(db, "friendRequests", notificationId);
    console.log(`NotificationsPage (handleDecline): Attempting to decline request ID: ${notificationId}, Path: ${requestRef.path}`);
    try {
      await updateDoc(requestRef, { status: "declined", updatedAt: serverTimestamp() });
      console.log(`NotificationsPage (handleDecline): Successfully declined request ID: ${notificationId}`);
      toast({ title: "Friend Request Declined", variant: "destructive" });
      setDisplayedNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
       console.error("NotificationsPage (handleDecline): Error declining friend request in Firestore:", error);
       toast({ 
         title: "Error", 
         description: `Could not decline friend request. Error: ${error instanceof Error ? error.message : String(error)}`, 
         variant: "destructive" 
        });
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
      } else { 
          return timestamp; 
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
    return typeof timestamp === 'string' ? timestamp : new Date().toLocaleString(); 
  };


  const handleMarkAllAsRead = () => {
    // This function currently only removes dynamic (Firestore) friend requests from view
    // and resets to static. This can be expanded to actually mark Firestore docs as read.
    setDisplayedNotifications(staticNotifications.sort((a, b) => {
      let dateA: Date, dateB: Date;
  
      if (a.timestamp instanceof Date) {
        dateA = a.timestamp;
      } else if (a.timestamp instanceof Timestamp) {
        dateA = a.timestamp.toDate();
      } else {
        dateA = new Date(0); 
      }
  
      if (b.timestamp instanceof Date) {
        dateB = b.timestamp;
      } else if (b.timestamp instanceof Timestamp) {
        dateB = b.timestamp.toDate();
      } else {
        dateB = new Date(0);
      }
  
      return dateB.getTime() - dateA.getTime();
    }));
    toast({ title: "Notifications Cleared", description: "All dynamic friend request notifications have been cleared from view." });
  };

  if (isLoading && !loggedInUser && !currentUserAuth) { 
    return (
      <div className="container mx-auto max-w-2xl text-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-2">Loading user session...</p>
      </div>
    );
  }
  
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
              {notification.type === "friend_request_firestore" && notification.user && loggedInUser && (
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
    
