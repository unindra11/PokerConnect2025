
"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BellRing, CircleUserRound, MessageSquareText, ThumbsUp, Share2, UserCheck, UserPlus, Users } from "lucide-react"; // Added UserPlus, Users

// Define a common structure for notifications
interface NotificationUser {
  name: string;
  avatar: string;
  handle: string; // Usually @username
  username?: string; // raw username for linking
}

interface AppNotification {
  id: string;
  type: string; // 'friend_request', 'comment', 'like', 'system', 'share', 'friend_accept', 'friend_request_sent_confirmation'
  user: NotificationUser | null; // User associated with the notification (sender, target, etc.)
  message: string;
  timestamp: string;
  // icon prop is removed, will be derived from type
}

const staticNotifications: AppNotification[] = [
  {
    id: "static1",
    type: "friend_request", // This implies INCOMING
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
  {
    id: "static5",
    type: "share",
    user: { name: "BluffingBetty", avatar: "https://placehold.co/100x100.png?n=4", handle: "@bettybluffs", username: "bettybluffs" },
    message: "shared your post on bankroll management.",
    timestamp: "2d ago",
  },
  {
    id: "static6",
    type: "friend_accept",
    user: { name: "AceHighAlex", avatar: "https://placehold.co/100x100.png?n=5", handle: "@alex_ace", username: "alex_ace" },
    message: "accepted your friend request.",
    timestamp: "3d ago",
  },
];

export default function NotificationsPage() {
  const [displayedNotifications, setDisplayedNotifications] = useState<AppNotification[]>(staticNotifications);
  const [loggedInUsername, setLoggedInUsername] = useState<string | null>(null);

  useEffect(() => {
    try {
      const loggedInUserString = localStorage.getItem("loggedInUser");
      if (loggedInUserString) {
        const loggedInUser = JSON.parse(loggedInUserString);
        setLoggedInUsername(loggedInUser.username);
        
        const notificationsKey = `pokerConnectNotifications_${loggedInUser.username}`;
        const storedNotificationsString = localStorage.getItem(notificationsKey);
        if (storedNotificationsString) {
          const dynamicNotifications: AppNotification[] = JSON.parse(storedNotificationsString);
          // Prepend dynamic notifications to static ones, ensuring newest are first overall
          setDisplayedNotifications([...dynamicNotifications, ...staticNotifications].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime() ));
        } else {
          setDisplayedNotifications([...staticNotifications].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime() ));
        }
      } else {
         setDisplayedNotifications([...staticNotifications].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime() ));
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
      setDisplayedNotifications([...staticNotifications].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime() ));
    }
  }, []);

  const getNotificationIcon = (type: string, message: string) => {
    switch (type) {
      case "friend_request": return <CircleUserRound className="h-5 w-5 text-primary" />;
      case "comment": return <MessageSquareText className="h-5 w-5 text-accent" />;
      case "like": return <ThumbsUp className="h-5 w-5 text-red-500" />;
      case "share": return <Share2 className="h-5 w-5 text-green-500" />;
      case "friend_accept": return <UserCheck className="h-5 w-5 text-blue-500" />;
      case "friend_request_sent_confirmation": return <UserPlus className="h-5 w-5 text-blue-500" />; // Icon for sent request
      case "system": return <BellRing className="h-5 w-5 text-yellow-500" />;
      default: return <BellRing className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const handleMarkAllAsRead = () => {
    // Simulate marking all as read
    // In a real app, this would also update localStorage or backend
    setDisplayedNotifications(displayedNotifications.map(n => ({ ...n, read: true }))); // Example: add a 'read' property
    // For prototype, we can clear dynamic notifications from localStorage and reset to static
    if (loggedInUsername) {
      localStorage.removeItem(`pokerConnectNotifications_${loggedInUsername}`);
      setDisplayedNotifications([...staticNotifications].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime() ));
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
          <Card key={notification.id} className="shadow-md rounded-lg overflow-hidden hover:shadow-xl transition-shadow duration-200">
            <CardContent className="p-4 flex items-start space-x-4">
              <div className="flex-shrink-0 mt-1">
                {notification.user && notification.type !== "friend_request_sent_confirmation" && notification.type !== "system" ? (
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={notification.user.avatar} alt={notification.user.name} data-ai-hint="profile picture" />
                    <AvatarFallback>{notification.user.name.substring(0,1)}</AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-10 w-10 flex items-center justify-center rounded-full bg-muted">
                     {getNotificationIcon(notification.type, notification.message)}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm">
                  {notification.user && notification.type !== "friend_request_sent_confirmation" && notification.type !== "system" && (
                    <span className="font-semibold text-primary">{notification.user.name}</span>
                  )}
                  {' '}
                  {notification.message}
                  {notification.type === "friend_request_sent_confirmation" && notification.user && (
                    <> to <span className="font-semibold text-primary">{notification.user.name}</span>.</>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">{notification.timestamp}</p>
              </div>
              {notification.type === "friend_request" && (
                <div className="flex gap-2 ml-auto">
                  <Button size="sm">Accept</Button>
                  <Button variant="outline" size="sm">Decline</Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

