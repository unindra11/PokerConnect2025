
"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { UserPlus, MessageSquare, UserMinus, UserX, Flag } from "lucide-react";
import { useToast } from "@/hooks/use-toast"; // Import useToast

interface Friend {
  id: string;
  name: string;
  avatar: string;
  online: boolean;
  mutualFriends: number;
}

const initialFriendsData: Friend[] = [
  { id: "1", name: "Alice PokerFace", avatar: "https://placehold.co/100x100.png?f=1", online: true, mutualFriends: 5 },
  { id: "2", name: "Bob TheBluffer", avatar: "https://placehold.co/100x100.png?f=2", online: false, mutualFriends: 2 },
  { id: "3", name: "Charlie Chips", avatar: "https://placehold.co/100x100.png?f=3", online: true, mutualFriends: 8 },
  { id: "4", name: "Diana Dealer", avatar: "https://placehold.co/100x100.png?f=4", online: false, mutualFriends: 1 },
];

export default function FriendsPage() {
  const [friends, setFriends] = useState<Friend[]>(initialFriendsData);
  const [newFriendName, setNewFriendName] = useState("");
  const { toast } = useToast();

  const handleAddFriend = () => {
    if (!newFriendName.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter a name to add as a friend.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Friend Request Sent",
      description: `Friend request sent to ${newFriendName} (simulated).`,
    });
    setNewFriendName(""); // Clear input
  };

  const handleMessage = (name: string) => {
    toast({
      title: "Message",
      description: `Opening chat with ${name} (simulated).`,
    });
  };

  const handleUnfriend = (friendId: string, name: string) => {
    setFriends(friends.filter(friend => friend.id !== friendId));
    toast({
      title: "Unfriended",
      description: `${name} has been unfriended.`,
      variant: "destructive"
    });
  };

  const handleBlock = (name: string) => {
    toast({
      title: "User Blocked",
      description: `${name} has been blocked (simulated).`,
      variant: "destructive"
    });
    // Optionally, you might also unfriend or hide them from the list
  };

  const handleReport = (name: string) => {
    toast({
      title: "User Reported",
      description: `A report for ${name} has been submitted (simulated).`,
    });
  };


  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold mb-6">Manage Friends</h1>
      
      <Card className="mb-8 shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle>Add New Friend</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-2">
          <Input 
            type="text" 
            placeholder="Enter username or email" 
            className="flex-grow" 
            value={newFriendName}
            onChange={(e) => setNewFriendName(e.target.value)}
          />
          <Button onClick={handleAddFriend} className="w-full sm:w-auto">
            <UserPlus className="mr-2 h-5 w-5" /> Add Friend
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {friends.map((friend) => (
          <Card key={friend.id} className="shadow-lg rounded-xl overflow-hidden flex flex-col">
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
            <CardContent className="p-4 flex-grow flex flex-col justify-end border-t space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => handleMessage(friend.name)}>
                  <MessageSquare className="mr-1 h-4 w-4" /> Message
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleUnfriend(friend.id, friend.name)}>
                  <UserMinus className="mr-1 h-4 w-4" /> Unfriend
                </Button>
                 <Button variant="outline" size="sm" className="text-destructive-foreground bg-destructive/80 hover:bg-destructive" onClick={() => handleBlock(friend.name)}>
                  <UserX className="mr-1 h-4 w-4" /> Block
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleReport(friend.name)}>
                  <Flag className="mr-1 h-4 w-4" /> Report
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
       {friends.length === 0 && (
          <Card className="text-center p-8 col-span-full shadow-lg rounded-xl mt-6">
            <CardTitle className="text-xl mb-2">No Friends Yet!</CardTitle>
            <CardContent>
                <p className="mb-4 text-muted-foreground">Connect with other poker players to build your network.</p>
                <p className="text-sm text-muted-foreground">Use the 'Add New Friend' section above to start.</p>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
