"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { app, auth } from "@/lib/firebase";
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import type { User as FirebaseUser } from "firebase/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

interface ChatSummary {
  id: string;
  otherParticipant: {
    id: string;
    username: string;
    name: string;
    avatar: string;
  };
  lastMessage: {
    text: string;
    senderId: string;
    timestamp: any;
  };
  unreadCount: number;
}

export default function ChatsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const db = getFirestore(app, "poker");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (!user) {
        router.push("/login");
        setChats([]);
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!currentUser) return;

    setIsLoading(true);
    const chatsQuery = query(
      collection(db, "chats"),
      where("participants", "array-contains", currentUser.uid)
    );

    const unsubscribe = onSnapshot(chatsQuery, async (snapshot) => {
      const chatsData: ChatSummary[] = [];
      for (const chatDoc of snapshot.docs) {
        const chatData = chatDoc.data();
        const otherParticipantId = chatData.participants.find(
          (id: string) => id !== currentUser.uid
        );

        if (!otherParticipantId) continue;

        const friendDocRef = doc(db, "users", currentUser.uid, "friends", otherParticipantId);
        const friendDocSnap = await getDoc(friendDocRef);
        if (!friendDocSnap.exists()) {
          console.warn(`ChatsPage: Skipping chat ${chatDoc.id} - not friends with ${otherParticipantId}`);
          continue;
        }

        const otherUserRef = doc(db, "users", otherParticipantId);
        const otherUserSnap = await getDoc(otherUserRef);
        let otherParticipant;
        if (!otherUserSnap.exists()) {
          otherParticipant = {
            id: otherParticipantId,
            username: "unknown_user",
            name: "Unknown User",
            avatar: `https://placehold.co/40x40.png?text=U`,
          };
        } else {
          const otherUserData = otherUserSnap.data();
          otherParticipant = {
            id: otherParticipantId,
            username: otherUserData.username || "unknown_user",
            name: otherUserData.fullName || otherUserData.username || "Unknown User",
            avatar: otherUserData.avatar || `https://placehold.co/40x40.png?text=${(otherUserData.username || "U").substring(0, 1)}`,
          };
        }

        chatsData.push({
          id: chatDoc.id,
          otherParticipant,
          lastMessage: chatData.lastMessage,
          unreadCount: chatData.unreadCounts[currentUser.uid] || 0,
        });
      }

      setChats(chatsData.sort((a, b) => {
        const aTime = a.lastMessage.timestamp?.toDate?.() || new Date(0);
        const bTime = b.lastMessage.timestamp?.toDate?.() || new Date(0);
        return bTime - aTime;
      }));
      setIsLoading(false);
    }, (error) => {
      console.error("ChatsPage: Error fetching chats:", error);
      toast({
        title: "Error",
        description: "Could not load your chats. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, toast, db]);

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp || !timestamp.toDate) return "Unknown";
    const date = timestamp.toDate();
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffInDays === 1) {
      return "Yesterday";
    } else if (diffInDays < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="container mx-auto">
      <Card className="mb-8 shadow-lg rounded-xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            <CardTitle className="text-xl">Messages</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="text-center py-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="mt-2">Loading your chats...</p>
            </div>
          )}
          {!isLoading && chats.length === 0 && (
            <Card className="text-center p-6 shadow-md rounded-lg">
              <CardHeader>
                <CardTitle className="text-lg">No Chats Yet!</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-muted-foreground">
                  Start a conversation with a friend from the Friends page.
                </p>
              </CardContent>
            </Card>
          )}
          {!isLoading && chats.length > 0 && (
            <div className="space-y-4">
              {chats.map((chat) => (
                <Link href={`/chat/${chat.id}`} key={chat.id} passHref>
                  <Card className="p-4 flex items-center gap-3 hover:bg-accent transition-colors cursor-pointer">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={chat.otherParticipant.avatar} alt={chat.otherParticipant.name} />
                      <AvatarFallback>{chat.otherParticipant.name.substring(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex justify-between items-baseline">
                        <p className="font-semibold">{chat.otherParticipant.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTimestamp(chat.lastMessage.timestamp)}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {chat.lastMessage.text}
                      </p>
                    </div>
                    {chat.unreadCount > 0 && (
                      <span className="bg-primary text-primary-foreground rounded-full px-2 py-1 text-xs">
                        {chat.unreadCount}
                      </span>
                    )}
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}