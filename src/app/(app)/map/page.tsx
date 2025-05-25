
"use client";

import { useState, useEffect } from "react";
import { GoogleMap, LoadScript, Marker, InfoWindow } from "@react-google-maps/api";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const containerStyle = {
  width: "100%",
  height: "600px",
};

const initialCenter = {
  lat: 28.6139, // New Delhi
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

const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// COMMON ERROR: RefererNotAllowedMapError
// To fix this:
// 1. Go to Google Cloud Console > APIs & Services > Credentials.
// 2. Select your API key.
// 3. Under "Application restrictions", choose "HTTP referrers (web sites)".
// 4. Add the current development URL (e.g., https://YOUR_DEV_DOMAIN.cloudworkstations.dev/* or http://localhost:PORT/*)
// 5. Save changes. It might take a few minutes to propagate.

// Helper function to generate a round SVG marker
const generateRoundMarkerIcon = (
  fillColor: string,
  borderColor: string,
  diameter: number
): google.maps.Icon | undefined => {
  const radius = diameter / 2;
  const strokeWidth = 2;

  const svg = `
    <svg width="${diameter}" height="${diameter}" viewBox="0 0 ${diameter} ${diameter}" xmlns="http://www.w3.org/2000/svg">
      <circle 
        cx="${radius}" 
        cy="${radius}" 
        r="${radius - strokeWidth}" 
        fill="${fillColor}" 
      />
      <circle
        cx="${radius}"
        cy="${radius}"
        r="${radius - strokeWidth / 2}"
        fill="none"
        stroke="${borderColor}"
        stroke-width="${strokeWidth}"
      />
    </svg>
  `.replace(/\n\s*/g, "").replace(/\s\s+/g, " ");

  // Ensure google.maps objects are only accessed when defined (client-side after API load)
  if (typeof window !== 'undefined' && window.google?.maps) {
    const size = new window.google.maps.Size(diameter, diameter);
    const anchorPoint = new window.google.maps.Point(radius, radius);
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: size,
      anchor: anchorPoint,
    };
  }
  console.warn("Google Maps API objects (Size/Point) not ready for marker icon generation, or not on client.");
  return undefined; // Fallback to default marker if Google Maps API objects are not ready
};


export default function MapPage() {
  const [selectedUser, setSelectedUser] = useState<MockUserPin | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [resolvedPrimaryColor, setResolvedPrimaryColor] = useState<string | null>(null);

  useEffect(() => {
    // This effect runs once on the client after initial mount.
    if (typeof window !== 'undefined') {
      const rootStyle = getComputedStyle(document.documentElement);
      const primaryVar = rootStyle.getPropertyValue('--primary').trim(); // Expected format: "H S L" e.g., "36 100% 50%"
      if (primaryVar) {
        const [h, s, l] = primaryVar.split(' ');
        if (h && s && l) {
          setResolvedPrimaryColor(`hsl(${h}, ${s}, ${l})`);
        } else {
          console.warn("Could not parse --primary CSS variable. Falling back to default marker color.");
          setResolvedPrimaryColor('orange'); // Fallback
        }
      } else {
        console.warn("--primary CSS variable not found. Falling back to default marker color.");
        setResolvedPrimaryColor('orange'); // Fallback
      }
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
          <LoadScript 
            googleMapsApiKey={googleMapsApiKey}
            onLoad={() => {
              console.log("Google Maps API script loaded successfully.");
              setMapReady(true);
            }}
            onError={(error) => {
                console.error("Error loading Google Maps script:", error);
                setMapReady(false); // Ensure mapReady is false on error
            }}
            loadingElement={<div style={{ height: "100%" }}>Loading map...</div>}
          >
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={initialCenter}
              zoom={5}
              onLoad={() => console.log("GoogleMap component mounted.")}
              onUnmount={() => console.log("GoogleMap component unmounted.")}
            >
              {mapReady && resolvedPrimaryColor && mockUsersOnMap.map((user) => {
                // Use resolvedPrimaryColor for fill, and a fixed color for border
                const icon = generateRoundMarkerIcon(resolvedPrimaryColor, 'hsl(240, 50%, 50%)', 35);
                
                if (!icon) {
                  console.warn(`Custom icon not generated for user ${user.id}, Google Maps should use default marker.`);
                }
                
                return (
                  <Marker
                    key={user.id}
                    position={user.position}
                    onClick={() => setSelectedUser(user)}
                    // If icon is undefined, Google Maps API uses its default marker icon
                    icon={icon} 
                  />
                );
              })}

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
            This map shows approximate locations of PokerConnect users in India. Click on a marker to see more details.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

