import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { UserPlus, MessageSquare, UserMinus } from "lucide-react";

const friends = [
  { id: "1", name: "Alice PokerFace", avatar: "https://placehold.co/100x100.png?f=1", online: true, mutualFriends: 5 },
  { id: "2", name: "Bob TheBluffer", avatar: "https://placehold.co/100x100.png?f=2", online: false, mutualFriends: 2 },
  { id: "3", name: "Charlie Chips", avatar: "https://placehold.co/100x100.png?f=3", online: true, mutualFriends: 8 },
  { id: "4", name: "Diana Dealer", avatar: "https://placehold.co/100x100.png?f=4", online: false, mutualFriends: 1 },
];

export default function FriendsPage() {
  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold mb-6">Friends</h1>
      
      <Card className="mb-6 shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle>Add New Friend</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input type="text" placeholder="Enter username or email" className="flex-grow" />
          <Button>
            <UserPlus className="mr-2 h-5 w-5" /> Add Friend
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {friends.map((friend) => (
          <Card key={friend.id} className="shadow-lg rounded-xl overflow-hidden">
            <CardHeader className="p-4 flex flex-row items-center space-x-4 bg-card">
              <Avatar className="h-16 w-16 border-2 border-primary">
                <AvatarImage src={friend.avatar} alt={friend.name} data-ai-hint="profile picture" />
                <AvatarFallback>{friend.name.substring(0, 1)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle className="text-lg">{friend.name}</CardTitle>
                <p className={`text-sm ${friend.online ? 'text-green-500' : 'text-muted-foreground'}`}>
                  {friend.online ? "Online" : "Offline"}
                </p>
                <p className="text-xs text-muted-foreground">{friend.mutualFriends} mutual friends</p>
              </div>
            </CardHeader>
            <CardContent className="p-4 flex justify-end gap-2 border-t">
              <Button variant="outline" size="sm">
                <MessageSquare className="mr-1 h-4 w-4" /> Message
              </Button>
              <Button variant="destructive" size="sm">
                <UserMinus className="mr-1 h-4 w-4" /> Unfriend
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
       {friends.length === 0 && (
          <Card className="text-center p-8 col-span-full shadow-lg rounded-xl">
            <CardTitle className="text-xl mb-2">No Friends Yet!</CardTitle>
            <CardContent>
                <p className="mb-4 text-muted-foreground">Connect with other poker players to build your network.</p>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
