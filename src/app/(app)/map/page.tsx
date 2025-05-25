
"use client";

import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MapPin } from "lucide-react"; // Using a generic MapPin icon for now

interface MockUserPin {
  id: string;
  username: string;
  name: string;
  avatar: string;
  position: { top: string; left: string };
  aiHint?: string;
}

const mockUsersOnMap: MockUserPin[] = [
  {
    id: "mapuser1",
    username: "globalgamer",
    name: "Global Gamer",
    avatar: "https://placehold.co/40x40.png?m=1",
    position: { top: "30%", left: "25%" },
    aiHint: "gamer avatar",
  },
  {
    id: "mapuser2",
    username: "casinoking",
    name: "Casino King",
    avatar: "https://placehold.co/40x40.png?m=2",
    position: { top: "50%", left: "60%" },
    aiHint: "king avatar",
  },
  {
    id: "mapuser3",
    username: "pokerninja",
    name: "Poker Ninja",
    avatar: "https://placehold.co/40x40.png?m=3",
    position: { top: "65%", left: "40%" },
    aiHint: "ninja avatar",
  },
];

export default function MapPage() {
  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold mb-6">Player Map</h1>
      <Card className="shadow-lg rounded-xl overflow-hidden">
        <CardHeader>
          <CardTitle>Interactive Player Map Overview (Simulated)</CardTitle>
        </CardHeader>
        <CardContent>
          <TooltipProvider>
            <div className="relative aspect-[16/9] w-full bg-muted rounded-lg overflow-hidden border">
              <Image
                src="https://placehold.co/1200x675.png"
                alt="World map showing approximate player locations"
                layout="fill"
                objectFit="cover"
                className="w-full h-full"
                data-ai-hint="world map connections"
                priority
              />
              {mockUsersOnMap.map((user) => (
                <Tooltip key={user.id}>
                  <TooltipTrigger asChild>
                    <Link href={`/profile/${user.username}`} legacyBehavior>
                      <a
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer p-1 rounded-full bg-background/70 backdrop-blur-sm shadow-lg hover:scale-110 transition-transform"
                        style={{ top: user.position.top, left: user.position.left }}
                        aria-label={`View ${user.name}'s profile`}
                      >
                        <Avatar className="h-8 w-8 border-2 border-primary">
                          <AvatarImage src={user.avatar} alt={user.name} data-ai-hint={user.aiHint || "profile picture"} />
                          <AvatarFallback>{user.name.substring(0, 1)}</AvatarFallback>
                        </Avatar>
                      </a>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{user.name}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
          <p className="text-sm text-muted-foreground mt-4">
            Welcome to the Player Map! This feature (currently simulated) shows approximate locations of PokerConnect users.
            Click on a player's icon to view their profile. In a full version, this would be an interactive map.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
