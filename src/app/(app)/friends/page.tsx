"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { app, auth } from "@/lib/firebase";
import {
  getFirestore,
  collection,
  query,
  onSnapshot,
  doc,
  deleteDoc,
  getDoc,
  setDoc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import type { User as FirebaseUser } from "firebase/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, MoreHorizontal, User, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

interface Friend {
  friendUserId: string;
  username: string;
  name: string;
  avatar: string;
  since: { timestamp: string };
}

export default function FriendsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUserAuth, setCurrentUserAuth] = useState<FirebaseUser | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const db = getFirestore(app, "poker");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUserAuth(user);
      if (!user) {
        router.push("/login");
        setFriends([]);
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!currentUserAuth) return;

    const friendsQuery = query(collection(db, "users", currentUserAuth.uid, "friends"));
    const unsubscribe = onSnapshot(friendsQuery, (snapshot) => {
      const friendsData: Friend[] = snapshot.docs.map((doc) => ({
        friendUserId: doc.data().friendUserId,
        username: doc.data().username,
        name: doc.data().name,
        avatar: doc.data().avatar,
        since: doc.data().since,
      }));
      setFriends(friendsData);
      setIsLoading(false);
    }, (error) => {
      console.error("FriendsPage: Error fetching friends:", error);
      toast({
        title: "Error",
        description: "Could not load your friends. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUserAuth, toast, db]);

  const handleUnfriend = async (friendId: string, friendUsername: string) => {
    if (!currentUserAuth) return;

    const confirmUnfriend = window.confirm(
      `Are you sure you want to unfriend ${friendUsername}? This will also restrict access to any ongoing chats with them.`
    );
    if (!confirmUnfriend) return;

    try {
      const batch = writeBatch(db);
      const userFriendRef = doc(db, "users", currentUserAuth.uid, "friends", friendId);
      const friendUserFriendRef = doc(db, "users", friendId, "friends", currentUserAuth.uid);

      batch.delete(userFriendRef);
      batch.delete(friendUserFriendRef);

      await batch.commit();
      toast({
        title: "Success",
        description: `You have unfriended ${friendUsername}.`,
      });
    } catch (error) {
      console.error("FriendsPage (handleUnfriend): Error unfriending user:", error);
      toast({
        title: "Error",
        description: "Could not unfriend the user. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleMessage = async (friendId: string, friendUsername: string) => {
    if (!currentUserAuth || !friendId) {
      toast({ title: "Authentication Error", description: "You must be logged in to send messages.", variant: "destructive" });
      return;
    }

    try {
      const chatId = [currentUserAuth.uid, friendId].sort().join("_");
      const chatRef = doc(db, "chats", chatId);

      const chatSnap = await getDoc(chatRef);
      if (!chatSnap.exists()) {
        const chatData = {
          participants: [currentUserAuth.uid, friendId],
          lastMessage: {
            text: "Chat started!",
            senderId: currentUserAuth.uid,
            timestamp: serverTimestamp(),
          },
          unreadCounts: {
            [currentUserAuth.uid]: 0,
            [friendId]: 0,
          },
        };
        await setDoc(chatRef, chatData);
        console.log(`FriendsPage: Created new chat with ID ${chatId}`);
      }

      router.push(`/chat/${chatId}`);
      toast({
        title: "Starting Chat",
        description: `Opening conversation with ${friendUsername}.`,
      });
    } catch (error) {
      console.error("FriendsPage (handleMessage): Error starting chat:", error);
      toast({
        title: "Error",
        description: "Could not start the chat. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBlock = (friendId: string, friendUsername: string) => {
    toast({
      title: "Feature Not Implemented",
      description: `Blocking ${friendUsername} is not yet implemented.`,
      variant: "default",
    });
  };

  const handleReport = (friendId: string, friendUsername: string) => {
    toast({
      title: "Feature Not Implemented",
      description: `Reporting ${friendUsername} is not yet implemented.`,
      variant: "default",
    });
  };

  return (
    <div className="container mx-auto">
      <Card className="mb-8 shadow-lg rounded-xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-6 w-6 text-primary" />
            <CardTitle className="text-xl">Friends</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="text-center py-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="mt-2">Loading your friends...</p>
            </div>
          )}
          {!isLoading && friends.length === 0 && (
            <p className="text-center text-muted-foreground">
              You don’t have any friends yet. Add some friends to start chatting!
            </p>
          )}
          {!isLoading && friends.length > 0 && (
            <div className="grid gap-4">
              {friends.map((friend) => (
                <Card key={friend.friendUserId} className="p-4 flex items-center justify-between shadow-md rounded-lg">
                  <Link
                    href={`/profile/${friend.username}`}
                    className="flex items-center gap-3 hover:bg-gray-100 p-2 rounded-lg transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={friend.avatar} alt={friend.name} />
                      <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{friend.name}</p>
                      <p className="text-sm text-muted-foreground">@{friend.username}</p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMessage(friend.friendUserId, friend.username)}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Message
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">More options</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleUnfriend(friend.friendUserId, friend.username)}>
                          Unfriend
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBlock(friend.friendUserId, friend.username)}>
                          Block
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleReport(friend.friendUserId, friend.username)}>
                          Report
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}