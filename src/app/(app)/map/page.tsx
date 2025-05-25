
"use client";

import { useState, useEffect } from "react";
import { GoogleMap, LoadScript, Marker, InfoWindow } from "@react-google-maps/api";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const containerStyle = {
  width: "100%",
  height: "600px", // Adjust as needed
};

// Centered on New Delhi, India
const center = {
  lat: 28.6139,
  lng: 77.2090,
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
    username: "delhipokerstar",
    name: "Delhi Poker Star",
    avatar: "https://placehold.co/40x40.png?m=1&text=DP",
    position: { lat: 28.6139, lng: 77.2090 }, // Delhi
    aiHint: "poker player avatar",
  },
  {
    id: "mapuser2",
    username: "mumbaigambler",
    name: "Mumbai Gambler",
    avatar: "https://placehold.co/40x40.png?m=2&text=MG",
    position: { lat: 19.0760, lng: 72.8777 }, // Mumbai
    aiHint: "card player avatar",
  },
  {
    id: "mapuser3",
    username: "bangalorebluffer",
    name: "Bangalore Bluffer",
    avatar: "https://placehold.co/40x40.png?m=3&text=BB",
    position: { lat: 12.9716, lng: 77.5946 }, // Bangalore
    aiHint: "strategy gamer avatar",
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


// Helper function to generate a round SVG marker with a border
const generateRoundMarkerIcon = (avatarUrl: string, borderColor: string = 'hsl(36, 100%, 50%)', diameter: number = 35) => {
  const radius = diameter / 2;
  const strokeWidth = 2; // Border thickness
  const imageRadius = radius - strokeWidth; // Image will be clipped to this radius
  const imageDiameter = imageRadius * 2;
  const imageOffset = strokeWidth; // Image x,y offset from top-left of SVG

  // Using a unique ID for clipPath is good practice, especially if SVGs were inlined.
  // For data URIs, it's less critical but doesn't hurt.
  const clipPathId = `clip_${Math.random().toString(36).substr(2, 9)}`;

  const svg = `
    <svg width="${diameter}" height="${diameter}" viewBox="0 0 ${diameter} ${diameter}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>
        <clipPath id="${clipPathId}">
          <circle cx="${radius}" cy="${radius}" r="${imageRadius}" />
        </clipPath>
      </defs>
      {/* Optional: A white background circle if avatars might have transparency, helps with visibility */}
      <circle cx="${radius}" cy="${radius}" r="${imageRadius}" fill="white" />
      <image
        href="${avatarUrl}"
        x="${imageOffset}"
        y="${imageOffset}"
        width="${imageDiameter}"
        height="${imageDiameter}"
        clip-path="url(#${clipPathId})"
        preserveAspectRatio="xMidYMid slice"
      />
      {/* Border circle */}
      <circle
        cx="${radius}"
        cy="${radius}"
        r="${imageRadius + strokeWidth / 2 - 0.5}" // Adjusted for stroke alignment (center of stroke)
        fill="none"
        stroke="${borderColor}"
        stroke-width="${strokeWidth}"
      />
    </svg>
  `.replace(/\n\s*/g, "").replace(/\s\s+/g, " "); // Basic minification

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: typeof window !== 'undefined' && window.google?.maps?.Size ? new window.google.maps.Size(diameter, diameter) : undefined,
    anchor: typeof window !== 'undefined' && window.google?.maps?.Point ? new window.google.maps.Point(radius, radius) : undefined,
  };
};


export default function MapPage() {
  const [selectedUser, setSelectedUser] = useState<MockUserPin | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Ensure window-dependent Google Maps objects are only created client-side
  useEffect(() => {
    if (typeof window !== 'undefined' && window.google) {
      setMapReady(true);
    }
  }, []);


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
          <CardTitle>Interactive Player Map - India</CardTitle>
        </CardHeader>
        <CardContent>
          <LoadScript googleMapsApiKey={googleMapsApiKey} onLoad={() => setMapReady(true)}>
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={center}
              zoom={5} // Adjusted zoom level for India
            >
              {mapReady && mockUsersOnMap.map((user) => (
                <Marker
                  key={user.id}
                  position={user.position}
                  onClick={() => setSelectedUser(user)}
                  icon={generateRoundMarkerIcon(user.avatar, 'hsl(36, 100%, 50%)', 35)}
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
            This map shows approximate locations of PokerConnect users in India. Click on an avatar to see more details.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
