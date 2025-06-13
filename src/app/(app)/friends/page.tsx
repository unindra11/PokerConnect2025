'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { app, auth } from "@/lib/firebase";
import {
  getFirestore,
  collection,
  query,
  getDoc,
  getDocs,
  doc,
  onSnapshot,
  deleteDoc,
  setDoc,
  runTransaction,
} from "firebase/firestore";
import type { User as FirebaseUser } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { MoreHorizontal, UserMinus } from "lucide-react";

interface Friend {
  friendUserId: string;
  username: string;
  name: string;
  avatar: string;
  since: any;
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

    const fetchFriends = async () => {
      try {
        setIsLoading(true);
        console.log("FriendsPage: Fetching friends for user", currentUserAuth.uid);
        const friendsRef = collection(db, "users", currentUserAuth.uid, "friends");
        const friendsQuery = query(friendsRef);
        const friendsSnapshot = await getDocs(friendsQuery);

        const friendsList: Friend[] = [];
        for (const docSnap of friendsSnapshot.docs) {
          const friendData = docSnap.data();
          friendsList.push({
            friendUserId: friendData.friendUserId,
            username: friendData.username,
            name: friendData.name,
            avatar: friendData.avatar,
            since: friendData.since,
          });
        }

        console.log(`FriendsPage: Found ${friendsList.length} friends`, friendsList);
        setFriends(friendsList);
        setIsLoading(false);

        const unsubscribe = onSnapshot(friendsQuery, (snapshot) => {
          const updatedFriends: Friend[] = [];
          snapshot.forEach((docSnap) => {
            const friendData = docSnap.data();
            updatedFriends.push({
              friendUserId: friendData.friendUserId,
              username: friendData.username,
              name: friendData.name,
              avatar: friendData.avatar,
              since: friendData.since,
            });
          });
          setFriends(updatedFriends);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("FriendsPage: Error fetching friends:", error);
        toast({
          title: "Error",
          description: "Could not load friends. Please try again later.",
          variant: "destructive",
        });
        setFriends([]);
        setIsLoading(false);
      }
    };

    fetchFriends();
  }, [currentUserAuth, toast, db]);

  const handleUnfriend = async (friendId: string, friendUsername: string) => {
    if (!currentUserAuth) return;

    try {
      const friendRef = doc(db, "users", currentUserAuth.uid, "friends", friendId);
      const userFriendRef = doc(db, "users", friendId, "friends", currentUserAuth.uid);

      const chatId = [currentUserAuth.uid, friendId].sort().join("_");
      const chatRef = doc(db, "chats", chatId);
      const chatSnap = await getDoc(chatRef);

      await Promise.all([
        deleteDoc(friendRef),
        deleteDoc(userFriendRef),
        chatSnap.exists() ? deleteDoc(chatRef) : Promise.resolve(),
      ]);

      setFriends(friends.filter((friend) => friend.friendUserId !== friendId));
      toast({
        title: "Friend Removed",
        description: `You have unfriended ${friendUsername}.`,
      });
    } catch (error) {
      console.error("FriendsPage: Error unfriending user:", error);
      toast({
        title: "Error",
        description: "Could not unfriend the user. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleMessage = async (friendId: string, friendUsername: string) => {
    if (!currentUserAuth || !friendId) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to send messages.",
        variant: "destructive",
      });
      return;
    }

    const maxRetries = 3;
    let attempt = 0;
    let success = false;
    const chatId = [currentUserAuth.uid, friendId].sort().join("_");
    const chatRef = doc(db, "chats", chatId);

    while (attempt < maxRetries && !success) {
      try {
        const friendshipRef1 = doc(db, "users", currentUserAuth.uid, "friends", friendId);
        const friendshipRef2 = doc(db, "users", friendId, "friends", currentUserAuth.uid);
        const [friendshipSnap1, friendshipSnap2] = await Promise.all([
          getDoc(friendshipRef1),
          getDoc(friendshipRef2),
        ]);

        console.log(`FriendsPage (handleMessage): Debug - Are friends: ${friendshipSnap1.exists()} && ${friendshipSnap2.exists()}`);

        if (!friendshipSnap1.exists() || !friendshipSnap2.exists()) {
          toast({
            title: "Cannot Start Chat",
            description: `You must be mutual friends with ${friendUsername} to start a chat.`,
            variant: "destructive",
          });
          return;
        }

        console.log(`FriendsPage (handleMessage): Debug - Current user UID: ${currentUserAuth.uid}`);
        const chatSnap = await getDoc(chatRef);
        console.log(`FriendsPage (handleMessage): Debug - Chat exists: ${chatSnap.exists()}`);
        if (!chatSnap.exists()) {
          await runTransaction(db, async (transaction) => {
            const [finalCheck1, finalCheck2] = await Promise.all([
              transaction.get(friendshipRef1),
              transaction.get(friendshipRef2),
            ]);

            if (!finalCheck1.exists() || !finalCheck2.exists()) {
              throw new Error("Friendship status changed before creating chat");
            }

            const chatData = {
              participants: [currentUserAuth.uid, friendId],
              lastMessage: {
                text: "",
                senderId: "",
                timestamp: null,
              },
              unreadCounts: {
                [currentUserAuth.uid]: 0,
                [friendId]: 0,
              },
            };
            transaction.set(chatRef, chatData);
          });

          console.log(`FriendsPage (handleMessage): Created new chat with ID ${chatId}`);
        }

        success = true;
        router.push(`/chat/${chatId}`);
        toast({
          title: "Starting Chat",
          description: `Opening conversation with ${friendUsername}.`,
        });
      } catch (error) {
        attempt++;
        console.error(`FriendsPage (handleMessage): Attempt ${attempt} failed:`, error);

        if (error.message === "Friendship status changed before creating chat") {
          toast({
            title: "Cannot Start Chat",
            description: `Friendship status with ${friendUsername} changed. Please try again.`,
            variant: "destructive",
          });
          return;
        }

        if (attempt === maxRetries) {
          console.error("FriendsPage (handleMessage): Max retries reached. Failing operation.");
          toast({
            title: "Error",
            description: "Could not start the chat: " + error.message,
            variant: "destructive",
          });
          return;
        }

        const delay = Math.pow(2, attempt) * 1000;
        console.log(`FriendsPage (handleMessage): Retrying after ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-lg">Loading friends...</p>
        </div>
      </div>
    );
  }

  if (!currentUserAuth) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-lg">Please log in to view your friends.</p>
          <Link href="/login" className="text-blue-500 underline">
            Log In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Friends</CardTitle>
        </CardHeader>
        <CardContent>
          {friends.length === 0 ? (
            <p className="text-center text-muted-foreground">
              No friends yet. Add some friends to start chatting!
            </p>
          ) : (
            <div className="space-y-4">
              {friends.map((friend) => (
                <div key={friend.friendUserId}>
                  <div className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-100 transition-colors">
                    <Link
                      href={`/profile/${friend.username}`}
                      className="flex items-center gap-4 flex-1"
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={friend.avatar} alt={friend.name} />
                        <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{friend.name}</p>
                        <p className="text-sm text-muted-foreground">@{friend.username}</p>
                        <p className="text-sm text-muted-foreground">
                          Friends since{" "}
                          {friend.since
                            ? new Date(friend.since.toDate()).toLocaleDateString()
                            : "Unknown"}
                        </p>
                      </div>
                    </Link>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMessage(friend.friendUserId, friend.username)}
                      >
                        Message
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() => handleUnfriend(friend.friendUserId, friend.username)}
                            className="text-red-500"
                          >
                            <UserMinus className="mr-2 h-4 w-4" />
                            Unfriend
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <Separator />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}