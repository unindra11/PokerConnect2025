
"use client"; // For potential future interactivity and useToast

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageSquareText, Trash2, Eraser, MoreVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


interface MockChat {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unreadCount?: number;
}

const initialMockChats: MockChat[] = [
  {
    id: "chat1",
    name: "Alice PokerFace",
    avatar: "https://placehold.co/100x100.png?c=a1",
    lastMessage: "Sure, let's play tomorrow!",
    timestamp: "10:30 AM",
    unreadCount: 2,
  },
  {
    id: "chat2",
    name: "Bob TheBluffer",
    avatar: "https://placehold.co/100x100.png?c=b2",
    lastMessage: "Did you see that hand? Crazy river.",
    timestamp: "Yesterday",
  },
  {
    id: "chat3",
    name: "Charlie Chips",
    avatar: "https://placehold.co/100x100.png?c=c3",
    lastMessage: "Thanks for the tip on strategy!",
    timestamp: "Mon",
    unreadCount: 0,
  },
  {
    id: "chat4",
    name: "StrategySteve",
    avatar: "https://placehold.co/100x100.png?c=s4",
    lastMessage: "Let's discuss 3-betting ranges.",
    timestamp: "Sun",
  },
];

export default function ChatPage() {
  const { toast } = useToast();
  const [mockChats, setMockChats] = useState<MockChat[]>(initialMockChats);

  const handleViewChat = (chatId: string, chatName: string) => {
    toast({
      title: "Opening Chat (Simulated)",
      description: `Displaying messages for ${chatName}. Full message view is coming soon!`,
    });
    // In a real app, this would navigate to a specific chat view or update a message panel.
  };

  const handleDeleteChat = (chatId: string, chatName: string) => {
    // Simulate deletion by filtering the chat out of the local state
    setMockChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
    toast({
      title: "Chat Deleted (Simulated)",
      description: `Conversation with ${chatName} has been removed.`,
      variant: "destructive",
    });
  };

  const handleClearChat = (chatId: string, chatName: string) => {
    // Simulate clearing by updating the last message for that chat
    setMockChats(prevChats => prevChats.map(chat => 
      chat.id === chatId ? { ...chat, lastMessage: "Chat history cleared.", unreadCount: 0 } : chat
    ));
    toast({
      title: "Chat Cleared (Simulated)",
      description: `Messages with ${chatName} have been cleared.`,
    });
  };


  return (
    <div className="container mx-auto">
      <Card className="shadow-xl rounded-xl">
        <CardHeader className="text-center border-b pb-4">
          <div className="flex justify-center items-center mb-2">
            <MessageSquareText className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Chat Central</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Your conversations will appear here. Full chat functionality is coming soon!
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {mockChats.length === 0 && (
            <div className="text-center py-10">
              <p className="text-lg text-muted-foreground">No active chats.</p>
              <p className="text-sm text-muted-foreground">Start a conversation from a friend's profile!</p>
            </div>
          )}
          <ul className="divide-y divide-border">
            {mockChats.map((chat) => (
              <li key={chat.id} className="flex items-center p-4 hover:bg-muted/50 transition-colors">
                <button 
                  onClick={() => handleViewChat(chat.id, chat.name)} 
                  className="flex items-center flex-grow text-left focus:outline-none focus:ring-2 focus:ring-primary rounded-md -m-1 p-1"
                  aria-label={`View chat with ${chat.name}`}
                >
                  <Avatar className="h-12 w-12 mr-4">
                    <AvatarImage src={chat.avatar} alt={chat.name} data-ai-hint="profile picture" />
                    <AvatarFallback>{chat.name.substring(0, 1)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <p className="font-semibold text-foreground truncate">{chat.name}</p>
                      <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">{chat.timestamp}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
                      {chat.unreadCount && chat.unreadCount > 0 && (
                        <span className="ml-2 bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="ml-2 flex-shrink-0 h-8 w-8">
                      <MoreVertical className="h-5 w-5" />
                      <span className="sr-only">Chat options for {chat.name}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleClearChat(chat.id, chat.name)}>
                      <Eraser className="mr-2 h-4 w-4" />
                      Clear Chat
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDeleteChat(chat.id, chat.name)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Chat
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            ))}
          </ul>
        </CardContent>
         {mockChats.length > 0 && (
            <CardFooter className="text-center py-4 border-t">
                <p className="text-xs text-muted-foreground w-full">
                Full message viewing and sending functionality is under development.
                </p>
            </CardFooter>
        )}
      </Card>
    </div>
  );
}
