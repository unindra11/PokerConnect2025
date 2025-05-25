
"use client";

import { useState } from "react";
import { GoogleMap, LoadScript, Marker, InfoWindow } from "@react-google-maps/api";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const containerStyle = {
  width: "100%",
  height: "600px", // Adjust as needed
};

// Example center, replace with a more suitable default or dynamic calculation
const center = {
  lat: 34.0522,
  lng: -118.2437, // Los Angeles
};

interface MockUserPin {
  id: string;
  username: string;
  name: string;
  avatar: string;
  position: { lat: number; lng: number };
  aiHint?: string;
}

const mockUsersOnMap: MockUserPin[] = [
  {
    id: "mapuser1",
    username: "globalgamer",
    name: "Global Gamer",
    avatar: "https://placehold.co/40x40.png?m=1",
    position: { lat: 34.0522, lng: -118.2437 }, // LA
    aiHint: "gamer avatar",
  },
  {
    id: "mapuser2",
    username: "casinoking",
    name: "Casino King",
    avatar: "https://placehold.co/40x40.png?m=2",
    position: { lat: 40.7128, lng: -74.0060 }, // New York
    aiHint: "king avatar",
  },
  {
    id: "mapuser3",
    username: "pokerninja",
    name: "Poker Ninja",
    avatar: "https://placehold.co/40x40.png?m=3",
    position: { lat: 51.5074, lng: -0.1278 }, // London
    aiHint: "ninja avatar",
  },
];

// IMPORTANT: Ensure this environment variable is set in your .env.local or .env file
// Example: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_ACTUAL_API_KEY
const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// COMMON ERROR: RefererNotAllowedMapError
// If you see this error in the console, it means your Google Maps API key
// is not authorized for the current URL (HTTP referrer).
// To fix this:
// 1. Go to Google Cloud Console > APIs & Services > Credentials.
// 2. Select your API key.
// 3. Under "Application restrictions", choose "HTTP referrers (web sites)".
// 4. Add the current development URL (e.g., https://your-dev-domain.com/*) to the list.
// 5. Save changes. It might take a few minutes to propagate.

export default function MapPage() {
  const [selectedUser, setSelectedUser] = useState<MockUserPin | null>(null);

  if (!googleMapsApiKey) {
    return (
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold mb-6">Player Map</h1>
        <Card className="shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle>Google Maps API Key Missing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">
              The Google Maps API key is not configured. Please set the{" "}
              <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> environment variable.
            </p>
            <p className="mt-2 text-muted-foreground">
              For now, this map feature cannot be displayed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold mb-6">Player Map</h1>
      <Card className="shadow-lg rounded-xl overflow-hidden">
        <CardHeader>
          <CardTitle>Interactive Player Map</CardTitle>
        </CardHeader>
        <CardContent>
          <LoadScript googleMapsApiKey={googleMapsApiKey}>
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={center}
              zoom={2} // Adjust zoom level as needed
            >
              {mockUsersOnMap.map((user) => (
                <Marker
                  key={user.id}
                  position={user.position}
                  onClick={() => setSelectedUser(user)}
                  // You can customize the marker icon here using the 'icon' prop
                  // Example: icon={{ url: user.avatar, scaledSize: typeof window !== 'undefined' ? new window.google.maps.Size(30, 30) : undefined }}
                />
              ))}

              {selectedUser && (
                <InfoWindow
                  position={selectedUser.position}
                  onCloseClick={() => setSelectedUser(null)}
                >
                  <div className="p-2 flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedUser.avatar} alt={selectedUser.name} data-ai-hint={selectedUser.aiHint || "profile picture"} />
                      <AvatarFallback>{selectedUser.name.substring(0,1)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{selectedUser.name}</p>
                      <Link href={`/profile/${selectedUser.username}`} className="text-sm text-primary hover:underline">
                        View Profile
                      </Link>
                    </div>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          </LoadScript>
          <p className="text-sm text-muted-foreground mt-4">
            This map shows approximate locations of PokerConnect users. Click on a marker to see more details.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
