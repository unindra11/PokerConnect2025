
"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BellRing, CircleUserRound, MessageSquareText, ThumbsUp, Share2, UserCheck, UserPlus, Users, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Define a common structure for notifications
interface NotificationUser {
  name: string;
  avatar: string;
  handle: string; 
  username: string; // Made username mandatory for targeting localStorage keys
}

interface AppNotification {
  id: string;
  type: string; 
  user: NotificationUser | null; 
  message: string;
  timestamp: string;
  read?: boolean; // For Mark all as read functionality
}

const staticNotifications: AppNotification[] = [
  {
    id: "static1",
    type: "friend_request",
    user: { name: "RoyalFlushRoy", avatar: "https://placehold.co/100x100.png?n=1", handle: "@royflush", username: "royflush" },
    message: "sent you a friend request.",
    timestamp: "15m ago",
  },
  {
    id: "static2",
    type: "comment",
    user: { name: "StraightSue", avatar: "https://placehold.co/100x100.png?n=2", handle: "@sue_straight", username: "sue_straight" },
    message: "commented on your post: \"Great analysis on that river bet!\"",
    timestamp: "1h ago",
  },
  {
    id: "static3",
    type: "like",
    user: { name: "FullHouseFred", avatar: "https://placehold.co/100x100.png?n=3", handle: "@fred_full", username: "fred_full" },
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

interface LoggedInUserFromStorage {
  username: string;
  fullName?: string;
  avatar?: string;
}


export default function NotificationsPage() {
  const [displayedNotifications, setDisplayedNotifications] = useState<AppNotification[]>([]);
  const [loggedInUser, setLoggedInUser] = useState<LoggedInUserFromStorage | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const loggedInUserString = localStorage.getItem("loggedInUser");
      if (loggedInUserString) {
        const user: LoggedInUserFromStorage = JSON.parse(loggedInUserString);
        setLoggedInUser(user);
        
        const notificationsKey = `pokerConnectNotifications_${user.username}`;
        const storedNotificationsString = localStorage.getItem(notificationsKey);
        let dynamicNotifications: AppNotification[] = [];
        if (storedNotificationsString) {
          dynamicNotifications = JSON.parse(storedNotificationsString);
        }
        // Prepend dynamic notifications to static ones, ensuring newest are first overall
        setDisplayedNotifications([...dynamicNotifications, ...staticNotifications].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime() ));
      } else {
         setDisplayedNotifications([...staticNotifications].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime() ));
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
      setDisplayedNotifications([...staticNotifications].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime() ));
    }
  }, [toast]); // Re-run if toast changes (or on initial load)

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "friend_request": return <UserPlus className="h-5 w-5 text-primary" />;
      case "comment": return <MessageSquareText className="h-5 w-5 text-accent" />;
      case "like": return <ThumbsUp className="h-5 w-5 text-red-500" />;
      case "share": return <Share2 className="h-5 w-5 text-green-500" />;
      case "friend_accept": return <UserCheck className="h-5 w-5 text-blue-500" />; // For notification to sender
      case "friend_accept_confirmation": return <CheckCircle className="h-5 w-5 text-green-500" />; // For current user
      case "friend_request_sent_confirmation": return <UserPlus className="h-5 w-5 text-blue-500" />;
      case "system": return <BellRing className="h-5 w-5 text-yellow-500" />;
      default: return <BellRing className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const updateNotificationsInStorage = (username: string, updatedNotifications: AppNotification[]) => {
    try {
      localStorage.setItem(`pokerConnectNotifications_${username}`, JSON.stringify(updatedNotifications));
    } catch (error) {
      console.error(`Error updating notifications in localStorage for ${username}:`, error);
      toast({ title: "Storage Error", description: "Could not save notification changes.", variant: "destructive" });
    }
  };

  const handleAcceptFriendRequest = (notificationId: string, requestingUser: NotificationUser) => {
    if (!loggedInUser) return;

    // 1. Update current user's notifications
    const newCurrentUserNotifications = displayedNotifications.filter(n => n.id !== notificationId);
    const acceptanceConfirmation: AppNotification = {
      id: `accepted_${requestingUser.username}_${Date.now()}`,
      type: "friend_accept_confirmation",
      user: requestingUser,
      message: `You are now friends with ${requestingUser.name}.`,
      timestamp: new Date().toLocaleString(),
    };
    const updatedCurrentUserNotifs = [acceptanceConfirmation, ...newCurrentUserNotifications.filter(n=> staticNotifications.every(sn => sn.id !== n.id))];
    updateNotificationsInStorage(loggedInUser.username, updatedCurrentUserNotifs);

    // 2. Update requesting user's notifications
    const requesterNotificationsKey = `pokerConnectNotifications_${requestingUser.username}`;
    let requesterNotifications: AppNotification[] = [];
    const requesterStoredString = localStorage.getItem(requesterNotificationsKey);
    if (requesterStoredString) {
      try { requesterNotifications = JSON.parse(requesterStoredString); } catch (e) { console.error(e); }
    }
    const friendAcceptedNotif: AppNotification = {
      id: `request_accepted_by_${loggedInUser.username}_${Date.now()}`,
      type: "friend_accept",
      user: { name: loggedInUser.fullName || loggedInUser.username, avatar: loggedInUser.avatar || "", handle: `@${loggedInUser.username}`, username: loggedInUser.username },
      message: `accepted your friend request.`,
      timestamp: new Date().toLocaleString(),
    };
    const updatedRequesterNotifs = [friendAcceptedNotif, ...requesterNotifications];
    updateNotificationsInStorage(requestingUser.username, updatedRequesterNotifs);

    // 3. Update UI
    setDisplayedNotifications([acceptanceConfirmation, ...newCurrentUserNotifications].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime() ));
    toast({ title: "Friend Request Accepted!", description: `You are now friends with ${requestingUser.name}.` });
  };

  const handleDeclineFriendRequest = (notificationId: string, requestingUser: NotificationUser) => {
    if (!loggedInUser) return;
    const updatedNotifications = displayedNotifications.filter(n => n.id !== notificationId);
    const dynamicOnly = updatedNotifications.filter(n=> staticNotifications.every(sn => sn.id !== n.id));
    updateNotificationsInStorage(loggedInUser.username, dynamicOnly);
    
    setDisplayedNotifications(updatedNotifications.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime() ));
    toast({ title: "Friend Request Declined", description: `You declined the request from ${requestingUser.name}.`, variant: "destructive" });
  };


  const handleMarkAllAsRead = () => {
    if (loggedInUser) {
      // For prototype: Clear dynamic notifications, keep static ones
      localStorage.removeItem(`pokerConnectNotifications_${loggedInUser.username}`);
      setDisplayedNotifications([...staticNotifications].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime() ));
      toast({ title: "Notifications Cleared", description: "All dynamic notifications have been marked as read and cleared." });
    } else {
      // Fallback if loggedInUser is not set, though unlikely if page is viewed
      setDisplayedNotifications(staticNotifications.map(n => ({ ...n, read: true })).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime() ));
    }
  };


  return (
    <div className="container mx-auto max-w-2xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Notifications</h1>
        <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>Mark all as read</Button>
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
                    <AvatarImage src={notification.user.avatar} alt={notification.user.name} data-ai-hint="profile picture" />
                    <AvatarFallback>{notification.user.name.substring(0,1)}</AvatarFallback>
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
                <p className="text-xs text-muted-foreground">{notification.timestamp}</p>
              </div>
              {notification.type === "friend_request" && notification.user && (
                <div className="flex gap-2 ml-auto">
                  <Button size="sm" onClick={() => handleAcceptFriendRequest(notification.id, notification.user!)}>Accept</Button>
                  <Button variant="outline" size="sm" onClick={() => handleDeclineFriendRequest(notification.id, notification.user!)}>Decline</Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

    