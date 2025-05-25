
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BellRing, CircleUserRound, MessageSquareText, ThumbsUp, Share2, UserCheck } from "lucide-react"; // Added Share2, UserCheck

const notifications = [
  {
    id: "1",
    type: "friend_request",
    user: { name: "RoyalFlushRoy", avatar: "https://placehold.co/100x100.png?n=1", handle: "@royflush" },
    message: "sent you a friend request.",
    timestamp: "15m ago",
    icon: <CircleUserRound className="h-5 w-5 text-primary" />,
  },
  {
    id: "2",
    type: "comment",
    user: { name: "StraightSue", avatar: "https://placehold.co/100x100.png?n=2", handle: "@sue_straight" },
    message: "commented on your post: \"Great analysis on that river bet!\"",
    timestamp: "1h ago",
    icon: <MessageSquareText className="h-5 w-5 text-accent" />,
  },
  {
    id: "3",
    type: "like",
    user: { name: "FullHouseFred", avatar: "https://placehold.co/100x100.png?n=3", handle: "@fred_full" },
    message: "liked your post about your tournament win.",
    timestamp: "3h ago",
    icon: <ThumbsUp className="h-5 w-5 text-red-500" />, // Example specific color
  },
  {
    id: "4",
    type: "system",
    user: null,
    message: "Welcome to PokerConnect! Complete your profile for better suggestions.",
    timestamp: "1d ago",
    icon: <BellRing className="h-5 w-5 text-yellow-500" />,
  },
  {
    id: "5",
    type: "share",
    user: { name: "BluffingBetty", avatar: "https://placehold.co/100x100.png?n=4", handle: "@bettybluffs" },
    message: "shared your post on bankroll management.",
    timestamp: "2d ago",
    icon: <Share2 className="h-5 w-5 text-green-500" />,
  },
  {
    id: "6",
    type: "friend_accept",
    user: { name: "AceHighAlex", avatar: "https://placehold.co/100x100.png?n=5", handle: "@alex_ace" },
    message: "accepted your friend request.",
    timestamp: "3d ago",
    icon: <UserCheck className="h-5 w-5 text-blue-500" />,
  },
];

export default function NotificationsPage() {
  return (
    <div className="container mx-auto max-w-2xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Notifications</h1>
        <Button variant="outline" size="sm">Mark all as read</Button>
      </div>

      {notifications.length === 0 && (
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
        {notifications.map((notification) => (
          <Card key={notification.id} className="shadow-md rounded-lg overflow-hidden hover:shadow-xl transition-shadow duration-200">
            <CardContent className="p-4 flex items-start space-x-4">
              <div className="flex-shrink-0 mt-1">
                {notification.user ? (
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={notification.user.avatar} alt={notification.user.name} data-ai-hint="profile picture" />
                    <AvatarFallback>{notification.user.name.substring(0,1)}</AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-10 w-10 flex items-center justify-center rounded-full bg-muted">
                     {notification.icon}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm">
                  {notification.user && <span className="font-semibold text-primary">{notification.user.name}</span>}
                  {' '}{notification.message}
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
