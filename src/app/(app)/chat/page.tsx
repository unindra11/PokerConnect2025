'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { app, auth } from "@/lib/firebase";
import {
  getFirestore,
  collection,
  query,
  where,
  getDoc,
  doc,
  onSnapshot,
  getDocs,
} from "firebase/firestore";
import type { User as FirebaseUser } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MessageCircle } from "lucide-react";

interface Chat {
  id: string;
  participants: string[];
  lastMessage: {
    text: string;
    senderId: string;
    timestamp: any;
  };
  unreadCounts: { [key: string]: number };
  otherUser: {
    uid: string;
    username: string;
    fullName: string;
    avatar: string;
  };
}

export default function ChatsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUserAuth, setCurrentUserAuth] = useState<FirebaseUser | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const db = getFirestore(app, "poker");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUserAuth(user);
      if (!user) {
        router.push("/login");
        setChats([]);
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!currentUserAuth) return;

    const fetchChats = async () => {
      try {
        setIsLoading(true);
        console.log("ChatsPage: Fetching chats for user:", currentUserAuth.uid);
        currentUserAuth.getIdToken().then(token => {
          console.log("ChatsPage: Current user token:", token);
        }).catch(error => {
          console.error("ChatsPage: Error fetching user token:", error);
        });
        await currentUserAuth.getIdToken(true);
        console.log("ChatsPage: Token refreshed successfully");

        // Step 1: Fetch chat IDs where the user is a participant
        const chatsQuery = query(
          collection(db, "chats"),
          where("participants", "array-contains", currentUserAuth.uid)
        );

        let chatDocs = [];
        try {
          const snapshot = await getDocs(chatsQuery);
          chatDocs = snapshot.docs;
        } catch (error) {
          console.error("ChatsPage: Initial query failed:", error);
          // If the query fails due to permissions, proceed to fetch documents individually
        }

        const chatsData: Chat[] = [];
        // Step 2: Fetch each chat document individually
        for (const chatDoc of chatDocs) {
          try {
            const chatData = chatDoc.data();
            if (!chatData.participants || !Array.isArray(chatData.participants)) {
              console.warn(`ChatsPage: Invalid participants for chat ${chatDoc.id}`, chatData);
              continue;
            }

            const otherUserId = chatData.participants.find(
              (uid: string) => uid !== currentUserAuth.uid
            );

            if (!otherUserId) {
              console.warn(`ChatsPage: No other user found in participants for chat ${chatDoc.id}`, chatData);
              continue;
            }

            // Check friendship status
            const friendshipRef1 = doc(db, "users", currentUserAuth.uid, "friends", otherUserId);
            const friendshipRef2 = doc(db, "users", otherUserId, "friends", currentUserAuth.uid);

            const [friendshipSnap1, friendshipSnap2] = await Promise.all([
              getDoc(friendshipRef1),
              getDoc(friendshipRef2),
            ]);

            console.log(`ChatsPage: Debug for chat ${chatDoc.id} - Are friends: ${friendshipSnap1.exists()} && ${friendshipSnap2.exists()}`);

            const areFriends = friendshipSnap1.exists() && friendshipSnap2.exists();

            if (!areFriends) {
              console.warn(
                `ChatsPage: Skipping chat ${chatDoc.id} - Are friends: ${areFriends}`
              );
              continue;
            }

            const userDocRef = doc(db, "users", otherUserId);
            const userDoc = await getDoc(userDocRef);
            if (!userDoc.exists()) {
              console.warn(`ChatsPage: User ${otherUserId} not found for chat ${chatDoc.id}`);
              continue;
            }

            const userData = userDoc.data();

            chatsData.push({
              id: chatDoc.id,
              participants: chatData.participants,
              lastMessage: chatData.lastMessage || { text: "", senderId: "", timestamp: null },
              unreadCounts: chatData.unreadCounts || { [currentUserAuth.uid]: 0 },
              otherUser: {
                uid: otherUserId,
                username: userData.username || "Unknown",
                fullName: userData.fullName || userData.username || "Unknown",
                avatar: userData.avatar || "",
              },
            });
          } catch (error) {
            console.warn(`ChatsPage: Failed to fetch chat ${chatDoc.id}:`, error);
            continue; // Skip chats that fail due to permissions
          }
        }

        chatsData.sort((a, b) => {
          const aTimestamp = a.lastMessage?.timestamp?.toMillis() || 0;
          const bTimestamp = b.lastMessage?.timestamp?.toMillis() || 0;
          return bTimestamp - aTimestamp;
        });

        setChats(chatsData);
        setIsLoading(false);

        // Set up a listener for real-time updates
        const unsubscribe = onSnapshot(chatsQuery, async (snapshot) => {
          const updatedChats: Chat[] = [];
          for (const chatDoc of snapshot.docs) {
            try {
              const chatData = chatDoc.data();
              if (!chatData.participants || !Array.isArray(chatData.participants)) {
                console.warn(`ChatsPage: Invalid participants for chat ${chatDoc.id}`, chatData);
                continue;
              }

              const otherUserId = chatData.participants.find(
                (uid: string) => uid !== currentUserAuth.uid
              );

              if (!otherUserId) {
                console.warn(`ChatsPage: No other user found in participants for chat ${chatDoc.id}`, chatData);
                continue;
              }

              const friendshipRef1 = doc(db, "users", currentUserAuth.uid, "friends", otherUserId);
              const friendshipRef2 = doc(db, "users", otherUserId, "friends", currentUserAuth.uid);

              const [friendshipSnap1, friendshipSnap2] = await Promise.all([
                getDoc(friendshipRef1),
                getDoc(friendshipRef2),
              ]);

              const areFriends = friendshipSnap1.exists() && friendshipSnap2.exists();

              if (!areFriends) {
                console.warn(`ChatsPage: Skipping chat ${chatDoc.id} - Are friends: ${areFriends}`);
                continue;
              }

              const userDocRef = doc(db, "users", otherUserId);
              const userDoc = await getDoc(userDocRef);
              if (!userDoc.exists()) {
                console.warn(`ChatsPage: User ${otherUserId} not found for chat ${chatDoc.id}`);
                continue;
              }

              const userData = userDoc.data();

              updatedChats.push({
                id: chatDoc.id,
                participants: chatData.participants,
                lastMessage: chatData.lastMessage || { text: "", senderId: "", timestamp: null },
                unreadCounts: chatData.unreadCounts || { [currentUserAuth.uid]: 0 },
                otherUser: {
                  uid: otherUserId,
                  username: userData.username || "Unknown",
                  fullName: userData.fullName || userData.username || "Unknown",
                  avatar: userData.avatar || "",
                },
              });
            } catch (error) {
              console.warn(`ChatsPage: Failed to fetch updated chat ${chatDoc.id}:`, error);
              continue;
            }
          }

          updatedChats.sort((a, b) => {
            const aTimestamp = a.lastMessage?.timestamp?.toMillis() || 0;
            const bTimestamp = b.lastMessage?.timestamp?.toMillis() || 0;
            return bTimestamp - aTimestamp;
          });

          setChats(updatedChats);
        }, (error) => {
          console.error("ChatsPage: Error in listener:", error);
          // Listener errors are logged but don't affect the initial load
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("ChatsPage: Error setting up chats listener:", error);
        toast({
          title: "Error",
          description: "Could not load chats.",
          variant: "destructive",
        });
        setChats([]);
        setIsLoading(false);
      }
    };

    fetchChats();
  }, [currentUserAuth, toast, db]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-lg">Loading chats...</p>
        </div>
      </div>
    );
  }

  if (!currentUserAuth) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-lg">Please log in to view your chats.</p>
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
          <CardTitle className="text-2xl">Chats</CardTitle>
        </CardHeader>
        <CardContent>
          {chats.length === 0 ? (
            <p className="text-center text-muted-foreground">
              No chats yet. Start a conversation with a friend!
            </p>
          ) : (
            <div className="space-y-4">
              {chats.map((chat) => (
                <Link key={chat.id} href={`/chat/${chat.id}`}>
                  <div className="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-100 transition-colors">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={chat.otherUser.avatar} alt={chat.otherUser.fullName} />
                      <AvatarFallback>{chat.otherUser.fullName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold">{chat.otherUser.fullName}</p>
                      <p className="text-sm text-muted-foreground">@{chat.otherUser.username}</p>
                      <p className="text-sm">
                        {chat.lastMessage?.text || "No messages yet"}
                      </p>
                    </div>
                    {chat.unreadCounts[currentUserAuth.uid] > 0 && (
                      <span className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        {chat.unreadCounts[currentUserAuth.uid]}
                      </span>
                    )}
                  </div>
                  <Separator />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}