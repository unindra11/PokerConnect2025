"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, collection, query, orderBy, getDoc, getDocs, setDoc, updateDoc, onSnapshot, serverTimestamp, getFirestore, writeBatch, increment, where } from "firebase/firestore";
import { app, auth } from "@/lib/firebase";
import type { User as FirebaseUser } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Send, ArrowLeft, Trash2 } from "lucide-react";

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: any; // Firestore Timestamp
  read: boolean;
  deleted?: boolean; // Added to track deleted messages
}

interface Chat {
  id: string;
  participants: string[];
  otherParticipant: {
    uid: string;
    name: string;
    username: string;
    avatar: string;
  };
}

export default function ChatConversationPage() {
  const params = useParams();
  const chatId = params?.chatId as string;
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const db = getFirestore(app, "poker");

  // Monitor authentication state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (!user) {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Check if two users are mutual friends
  const checkFriendship = async (userId1: string, userId2: string): Promise<boolean> => {
    try {
      const friendshipQuery1 = query(
        collection(db, "users", userId1, "friends"),
        where("friendUserId", "==", userId2)
      );
      const friendshipQuery2 = query(
        collection(db, "users", userId2, "friends"),
        where("friendUserId", "==", userId1)
      );
      const [friendshipSnapshot1, friendshipSnapshot2] = await Promise.all([
        getDocs(friendshipQuery1),
        getDocs(friendshipQuery2),
      ]);
      return !friendshipSnapshot1.empty && !friendshipSnapshot2.empty;
    } catch (error) {
      console.error(`ChatConversationPage: Error checking friendship between ${userId1} and ${userId2}:`, error);
      return false;
    }
  };

  // Fetch chat details and validate access
  useEffect(() => {
    if (!currentUser || !chatId) {
      setIsLoading(false);
      return;
    }

    const fetchChat = async () => {
      setIsLoading(true);
      try {
        const chatRef = doc(db, "chats", chatId);
        const chatSnap = await getDoc(chatRef);

        if (!chatSnap.exists()) {
          toast({
            title: "Chat Not Found",
            description: "This conversation does not exist.",
            variant: "destructive",
          });
          router.push("/chat");
          return;
        }

        const chatData = chatSnap.data();
        if (!chatData.participants.includes(currentUser.uid)) {
          toast({
            title: "Access Denied",
            description: "You are not a participant in this chat.",
            variant: "destructive",
          });
          router.push("/chat");
          return;
        }

        // Verify mutual friendship
        const otherParticipantId = chatData.participants.find((uid: string) => uid !== currentUser.uid);
        const areFriends = await checkFriendship(currentUser.uid, otherParticipantId);
        if (!areFriends) {
          toast({
            title: "Access Denied",
            description: "You can only chat with mutual friends.",
            variant: "destructive",
          });
          router.push("/chat");
          return;
        }

        // Fetch other participant's data
        const userRef = doc(db, "users", otherParticipantId);
        const userSnap = await getDoc(userRef);
        let otherParticipant;
        if (!userSnap.exists()) {
          otherParticipant = {
            uid: otherParticipantId,
            name: "Unknown User",
            username: "unknown",
            avatar: `https://placehold.co/100x100.png?text=U`,
          };
        } else {
          const userData = userSnap.data();
          otherParticipant = {
            uid: otherParticipantId,
            name: userData.fullName || userData.username || "Unknown User",
            username: userData.username || "unknown",
            avatar: userData.avatar || `https://placehold.co/100x100.png?text=${(userData.username || "U").substring(0, 1).toUpperCase()}`,
          };
        }

        setChat({
          id: chatId,
          participants: chatData.participants,
          otherParticipant,
        });
      } catch (error) {
        console.error("ChatConversationPage: Error fetching chat:", error);
        toast({
          title: "Error",
          description: "Could not load the chat. Please try again.",
          variant: "destructive",
        });
        router.push("/chat");
      } finally {
        setIsLoading(false);
      }
    };

    fetchChat();
  }, [currentUser, chatId, toast, router, db]);

  // Fetch messages in real-time
  useEffect(() => {
    if (!chat || !currentUser) return;

    const messagesQuery = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
      const messagesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];

      setMessages(messagesData);

      // Mark messages as read if they were sent by the other participant
      const unreadMessages = messagesData.filter(
        (msg) => msg.senderId !== currentUser.uid && !msg.read
      );
      if (unreadMessages.length > 0) {
        const batch = writeBatch(db);
        unreadMessages.forEach((msg) => {
          const msgRef = doc(db, "chats", chatId, "messages", msg.id);
          batch.update(msgRef, { read: true });
        });

        // Reset unread count for the current user
        const chatRef = doc(db, "chats", chatId);
        batch.update(chatRef, {
          [`unreadCounts.${currentUser.uid}`]: 0,
        });

        await batch.commit();
      }
    }, (error) => {
      console.error("ChatConversationPage: Error fetching messages:", error);
      toast({
        title: "Error",
        description: "Could not load messages due to permission issues.",
        variant: "destructive",
      });
    });

    return () => unsubscribe();
  }, [chat, currentUser, chatId, toast, db]);

  // Scroll to the bottom of messages when they update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !chat || !currentUser) return;

    try {
      const messageRef = doc(collection(db, "chats", chatId, "messages"));
      const messageData = {
        senderId: currentUser.uid,
        text: newMessage.trim(),
        timestamp: serverTimestamp(),
        read: false,
        deleted: false, // Initialize deleted as false
      };

      const chatRef = doc(db, "chats", chatId);
      const batch = writeBatch(db);

      // Add the new message
      batch.set(messageRef, messageData);

      // Update the last message and unread count in the chat
      batch.update(chatRef, {
        lastMessage: {
          text: newMessage.trim(),
          senderId: currentUser.uid,
          timestamp: serverTimestamp(),
        },
        [`unreadCounts.${chat.otherParticipant.uid}`]: increment(1),
        [`unreadCounts.${currentUser.uid}`]: 0,
      });

      await batch.commit();

      setNewMessage("");
    } catch (error) {
      console.error("ChatConversationPage: Error sending message:", error);
      toast({
        title: "Error",
        description: "Could not send the message. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle message deletion
  const handleDeleteMessage = async (messageId: string) => {
    try {
      const messageRef = doc(db, "chats", chatId, "messages", messageId);
      const chatRef = doc(db, "chats", chatId);
      const batch = writeBatch(db);

      // Mark the message as deleted
      batch.update(messageRef, {
        deleted: true,
        text: "",
      });

      // Check if this message was the last message in the chat
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.id === messageId) {
        // Find the previous non-deleted message to set as the last message
        const previousMessages = messages.slice(0, -1).reverse();
        const lastNonDeletedMessage = previousMessages.find((msg) => !msg.deleted);

        if (lastNonDeletedMessage) {
          batch.update(chatRef, {
            lastMessage: {
              text: lastNonDeletedMessage.text,
              senderId: lastNonDeletedMessage.senderId,
              timestamp: lastNonDeletedMessage.timestamp,
            },
          });
        } else {
          batch.update(chatRef, {
            lastMessage: {
              text: "This message was deleted",
              senderId: currentUser!.uid,
              timestamp: serverTimestamp(),
            },
          });
        }
      }

      await batch.commit();
      toast({
        title: "Message Deleted",
        description: "The message has been deleted for both users.",
      });
    } catch (error) {
      console.error("ChatConversationPage: Error deleting message:", error);
      toast({
        title: "Error",
        description: "Could not delete the message. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Format timestamp for display
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

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <Card className="shadow-xl rounded-xl">
          <CardContent className="text-center py-10">
            <p className="text-lg text-muted-foreground">Loading chat...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!chat) {
    return null; // Redirects are handled in useEffect
  }

  return (
    <div className="container mx-auto p-4">
      <Card className="shadow-xl rounded-xl">
        <CardHeader className="flex flex-row items-center border-b pb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/chat")}
            className="mr-4"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back to chats</span>
          </Button>
          <Avatar className="h-10 w-10 mr-3">
            <AvatarImage
              src={chat.otherParticipant.avatar}
              alt={chat.otherParticipant.name}
            />
            <AvatarFallback>
              {chat.otherParticipant.name.substring(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-xl">{chat.otherParticipant.name}</CardTitle>
            <p className="text-sm text-muted-foreground">
              @{chat.otherParticipant.username}
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[400px] overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <p className="text-center text-muted-foreground">
                No messages yet. Start the conversation!
              </p>
            ) : (
              messages.map((message, index) => {
                const isCurrentUser = message.senderId === currentUser?.uid;
                const showDateSeparator =
                  index === 0 ||
                  (messages[index - 1].timestamp &&
                    message.timestamp &&
                    messages[index - 1].timestamp.toDate().toDateString() !==
                      message.timestamp.toDate().toDateString());

                return (
                  <div key={message.id}>
                    {showDateSeparator && (
                      <div className="text-center my-4">
                        <Separator className="mb-2" />
                        <span className="text-xs text-muted-foreground">
                          {message.timestamp?.toDate?.().toLocaleDateString()}
                        </span>
                        <Separator className="mt-2" />
                      </div>
                    )}
                    <div
                      className={`flex ${
                        isCurrentUser ? "justify-end" : "justify-start"
                      } mb-2 items-center`}
                    >
                      {message.deleted ? (
                        <div
                          className={`max-w-[70%] rounded-lg p-3 italic text-muted-foreground ${
                            isCurrentUser ? "bg-primary/10" : "bg-muted"
                          }`}
                        >
                          <p>This message was deleted</p>
                          <div className="flex justify-end mt-1">
                            <span className="text-xs opacity-70">
                              {formatTimestamp(message.timestamp)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              isCurrentUser
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            <p>{message.text}</p>
                            <div className="flex justify-end mt-1">
                              <span className="text-xs opacity-70">
                                {formatTimestamp(message.timestamp)}
                              </span>
                            </div>
                          </div>
                          {isCurrentUser && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="ml-2 h-6 w-6"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                  <span className="sr-only">Delete message</span>
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80">
                                <div className="space-y-4">
                                  <h4 className="font-medium">Delete Message</h4>
                                  <p className="text-sm text-muted-foreground">
                                    Are you sure you want to delete this message? This action cannot be undone and will be deleted for both users.
                                  </p>
                                  <Button
                                    variant="destructive"
                                    className="w-full"
                                    onClick={() => handleDeleteMessage(message.id)}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </PopoverContent>
                            </Popover>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </CardContent>
        <CardFooter className="border-t p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex w-full items-center gap-2"
          >
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1"
            />
            <Button type="submit" disabled={!newMessage.trim()}>
              <Send className="h-5 w-5" />
              <span className="sr-only">Send message</span>
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}